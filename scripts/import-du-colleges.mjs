#!/usr/bin/env node

const SOURCE_URL = "https://www.du.ac.in/index.php?page=colleges-at-du";
const APPLY = process.argv.includes("--apply");
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_READ_KEY = process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY;

if (APPLY && (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
  throw new Error("Applying requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Do not use the publishable VITE_SUPABASE_ANON_KEY for imports.");
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeName(value) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

async function request(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_READ_KEY,
      Authorization: `Bearer ${SUPABASE_READ_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw new Error(`Supabase request failed (${response.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

function extractOfficialNames(markdown) {
  const start = markdown.indexOf("<h5>A</h5>");
  const end = markdown.indexOf("<h5>Faculty of Applied Social Sciences and Humanities</h5>");
  if (start < 0 || end < 0 || end <= start) {
    throw new Error("Could not identify the official DU college content block.");
  }
  const section = markdown.slice(start, end);
  const decode = (value) => value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/\s+/g, " ")
    .trim();
  const names = [...section.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => decode(match[1]))
    .filter((name) => name && !/^(A|B|C|D|G|H|I|J|K|L|M|P|R|S|V|Z|Other Institutions)$/.test(name));
  return [...new Set(names)];
}

const sourceResponse = await fetch(SOURCE_URL);
if (!sourceResponse.ok) {
  throw new Error(`Official DU source failed (${sourceResponse.status}).`);
}
const sourceHtml = await sourceResponse.text();
const officialNames = extractOfficialNames(sourceHtml);
if (officialNames.length < 80 || officialNames.length > 100) {
  throw new Error(`Unexpected official DU institution count: ${officialNames.length}. Aborting without writing.`);
}

const existingRows = await request("/rest/v1/colleges?select=id,name,slug&order=name.asc&limit=1000");
const existingNames = new Set(existingRows.map((row) => normalizeName(row.name)));
const missingNames = officialNames.filter((name) => !existingNames.has(normalizeName(name)));

const records = missingNames.map((name) => ({
  name,
  slug: slugify(name),
  short_description: null,
  campus: "",
  location: "",
  categories: [],
  popular_courses: [],
  college_type: "",
  hero_image_url: null,
}));
const slugs = new Set();
for (const record of records) {
  if (!record.slug || slugs.has(record.slug)) {
    throw new Error(`Slug collision detected for ${record.name}: ${record.slug}`);
  }
  slugs.add(record.slug);
}

if (!SUPABASE_URL || !SUPABASE_READ_KEY) {
  console.log(JSON.stringify({
    source: SOURCE_URL,
    officialCount: officialNames.length,
    mode: "source-only",
    message: "Set Supabase URL and a read key to compare existing rows; use --apply with a service-role key to write.",
  }, null, 2));
  process.exit(0);
}

if (!APPLY) {
  console.log(JSON.stringify({
    source: SOURCE_URL,
    officialCount: officialNames.length,
    existingCount: existingRows.length,
    missingCount: records.length,
    mode: "dry-run",
    message: "Re-run with --apply and a service-role key in the environment to write missing official records.",
  }, null, 2));
  process.exit(0);
}

if (records.length) {
  await request("/rest/v1/colleges", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(records),
  });
}

console.log(JSON.stringify({
  source: SOURCE_URL,
  officialCount: officialNames.length,
  existingCount: existingRows.length,
  insertedCount: records.length,
  skippedAsDuplicates: officialNames.length - records.length,
}, null, 2));
