/**
 * A minimal `.xlsx` writer with no dependency.
 *
 * An `.xlsx` file is a ZIP of XML parts. Excel and LibreOffice both accept a
 * ZIP whose entries are *stored* rather than deflated, so this writes a plain
 * container plus OOXML sheets and avoids pulling in JSZip and a spreadsheet
 * library for one admin button.
 *
 * Injection matters here: registration rows contain names and team names typed
 * by other people. Every cell is therefore emitted as `inlineStr` text, never as
 * a formula, and characters that would start a formula in a CSV are prefixed so
 * a spreadsheet treats them as data.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

type ZipEntry = { name: string; data: Uint8Array };

function encodeText(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function uint16(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff];
}

function uint32(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
}

/** DOS date/time. Fixed to a valid stamp — the parts carry no timestamp of their own. */
const DOS_TIME = 0;
const DOS_DATE = 0x21; // 1980-01-01, the epoch DOS expects

function buildZip(entries: ZipEntry[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encodeText(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const local = [
      ...uint32(0x04034b50),
      ...uint16(20),
      ...uint16(0),
      ...uint16(0), // method 0 = stored
      ...uint16(DOS_TIME),
      ...uint16(DOS_DATE),
      ...uint32(crc),
      ...uint32(size),
      ...uint32(size),
      ...uint16(name.length),
      ...uint16(0),
    ];
    chunks.push(Uint8Array.from(local), name, entry.data);

    const centralHeader = [
      ...uint32(0x02014b50),
      ...uint16(20),
      ...uint16(20),
      ...uint16(0),
      ...uint16(0),
      ...uint16(DOS_TIME),
      ...uint16(DOS_DATE),
      ...uint32(crc),
      ...uint32(size),
      ...uint32(size),
      ...uint16(name.length),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint32(0),
      ...uint32(offset),
    ];
    central.push(Uint8Array.from(centralHeader), name);
    offset += local.length + name.length + size;
  }

  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const eocd = Uint8Array.from([
    ...uint32(0x06054b50),
    ...uint16(0),
    ...uint16(0),
    ...uint16(entries.length),
    ...uint16(entries.length),
    ...uint32(centralSize),
    ...uint32(offset),
    ...uint16(0),
  ]);

  const total = offset + centralSize + eocd.length;
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const chunk of chunks) { out.set(chunk, cursor); cursor += chunk.length; }
  for (const chunk of central) { out.set(chunk, cursor); cursor += chunk.length; }
  out.set(eocd, cursor);
  return out;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // Control characters are illegal in XML 1.0, not just ugly.
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
}

const FORMULA_LEAD = /^[=+\-@\t\r]/;

/**
 * Neutralises text that a spreadsheet would otherwise try to evaluate.
 *
 * A leading apostrophe is how Excel itself displays a forced-text cell, so the
 * value still reads correctly in the sheet while `=HYPERLINK(...)` from a
 * hand-typed team name stays inert.
 */
export function sanitizeCellText(value: string): string {
  if (!value) return value;
  return FORMULA_LEAD.test(value) ? `'${value}` : value;
}

function columnLetter(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export type SheetCell = string | number | null | undefined;
export type SheetRow = SheetCell[];
export type SheetSpec = { name: string; headers: string[]; rows: SheetRow[] };

function cellXml(value: SheetCell, ref: string): string {
  if (value === null || value === undefined || value === "") return `<c r="${ref}"/>`;
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}"><v>${value}</v></c>`;
  }
  const text = sanitizeCellText(String(value));
  // `xml:space="preserve"` keeps a leading space or apostrophe intact.
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
}

function rowXml(cells: SheetCell[], rowIndex: number): string {
  const ref = rowIndex + 1;
  const body = cells.map((cell, col) => cellXml(cell, `${columnLetter(col)}${ref}`)).join("");
  return `<row r="${ref}">${body}</row>`;
}

/** Excel caps a sheet name at 31 characters and forbids a few of them. */
function safeSheetName(name: string, fallback: string): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31);
  return cleaned || fallback;
}

function sheetXml(spec: SheetSpec): string {
  const rows = [spec.headers, ...spec.rows];
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
    `<sheetData>${rows.map((row, index) => rowXml(row, index)).join("")}</sheetData>`,
    "</worksheet>",
  ].join("");
}

export function buildWorkbook(sheets: SheetSpec[]): Blob {
  const entries: ZipEntry[] = [];
  const push = (name: string, text: string) => entries.push({ name, data: encodeText(text) });

  const contentTypes = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
    sheets
      .map(
        (_, index) =>
          `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
      )
      .join(""),
    "</Types>",
  ].join("");
  push("[Content_Types].xml", contentTypes);

  push(
    "_rels/.rels",
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>',
      "</Relationships>",
    ].join("")
  );

  push(
    "xl/workbook.xml",
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
      `<sheets>${sheets
        .map((sheet, index) => `<sheet name="${escapeXml(safeSheetName(sheet.name, `Sheet${index + 1}`))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
        .join("")}</sheets>`,
      "</workbook>",
    ].join("")
  );

  push(
    "xl/_rels/workbook.xml.rels",
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
      sheets
        .map(
          (_, index) =>
            `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
        )
        .join(""),
      `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`,
      "</Relationships>",
    ].join("")
  );

  push(
    "xl/styles.xml",
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
      '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>',
      '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>',
      '<borders count="1"><border/></borders>',
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>',
      '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>',
      "</styleSheet>",
    ].join("")
  );

  sheets.forEach((sheet, index) => push(`xl/worksheets/sheet${index + 1}.xml`, sheetXml(sheet)));

  const zip = buildZip(entries);
  return new Blob([zip as unknown as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/** `YYYY-MM-DD` in Indian Standard Time, which is how a deadline is read. */
export function istDateStamp(now: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/**
 * `JAVLIN_<Competition>_Registrations_<YYYY-MM-DD>.xlsx` with anything that a
 * filesystem would reject — or a shell would interpret — removed.
 */
export function registrationFileName(competitionTitle: string, now?: Date): string {
  const safe = competitionTitle
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 60);
  return `JAVLIN_${safe || "Competition"}_Registrations_${istDateStamp(now)}.xlsx`;
}

/**
 * Triggers a browser download.
 *
 * The object URL is revoked on the next tick: keeping it alive would leave the
 * workbook reachable for the life of the tab, and it contains contact details.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
