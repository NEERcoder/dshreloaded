#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const loadTs = async (path) => {
  const result = ts.transpileModule(read(path), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 },
    fileName: path,
    reportDiagnostics: true,
  });
  assert.equal(result.diagnostics?.length ?? 0, 0, `Unable to transpile ${path}`);
  return import(`data:text/javascript;base64,${Buffer.from(result.outputText).toString("base64")}`);
};
let passed = 0;
function check(name, test) {
  test();
  passed++;
  console.log(`PASS ${name}`);
}

const { sanitizeExternalUrl, getYouTubeEmbedUrl, extractYouTubeVideoId } = await loadTs("src/lib/urlSafety.ts");
const blocked = [
  "javascript:alert(1)", "JaVaScRiPt:alert(1)", "java\tscript:alert(1)",
  "java\nscript:alert(1)", "\u0001javascript:alert(1)", "  javascript:alert(1)",
  "data:text/html,<script>alert(1)</script>", "vbscript:msgbox(1)",
  "blob:https://example.invalid/x", "file:///test", "//example.invalid/path", "", null, undefined,
];
blocked.forEach((input, i) => check(`URL rejects unsafe or empty input ${i + 1}`, () => assert.equal(sanitizeExternalUrl(input), undefined)));
check("URL permits HTTPS", () => assert.equal(sanitizeExternalUrl("https://example.invalid/a?b=1"), "https://example.invalid/a?b=1"));
check("URL permits HTTP", () => assert.equal(sanitizeExternalUrl("http://example.invalid"), "http://example.invalid/"));

const id = "dQw4w9WgXcQ";
for (const url of [
  `https://youtube.com/watch?v=${id}`, `https://www.youtube.com/embed/${id}`,
  `https://m.youtube.com/shorts/${id}`, `https://youtu.be/${id}?t=42`,
  `https://www.youtu.be/${id}`, `https://www.youtube.com/live/${id}`,
]) {
  check("YouTube canonical embed", () => assert.equal(getYouTubeEmbedUrl(url), `https://www.youtube.com/embed/${id}`));
}
for (const url of ["https://youtube.com.evil.invalid/watch?v=" + id, "https://youtube.com/watch?v=../x", "javascript:alert(1)", "https://youtube.com/"]) {
  check("YouTube rejects invalid host or ID", () => {
    assert.equal(extractYouTubeVideoId(url), null);
    assert.equal(getYouTubeEmbedUrl(url), undefined);
  });
}

const { friendlyAuthError } = await loadTs("src/lib/authErrors.ts");
check("Unknown auth errors are not echoed", () => assert.equal(friendlyAuthError("PRIVATE_DIAGNOSTIC_MARKER"), "Something went wrong. Please try again."));
check("Missing user and wrong password share copy", () => assert.equal(friendlyAuthError("User not found"), friendlyAuthError("Invalid login credentials")));
check("Duplicate signup does not claim email delivery", () => assert.equal(friendlyAuthError("User already registered"), "Unable to create an account with these details. Try signing in or resetting your password."));
check("Empty auth error has fixed fallback", () => assert.equal(friendlyAuthError(null), "Something went wrong. Please try again."));
check("Known network and rate errors remain actionable", () => {
  assert.match(friendlyAuthError("Failed to fetch"), /connection/);
  assert.match(friendlyAuthError("Too many requests"), /wait/);
});
check("Auth translator does not log raw diagnostics", () => assert.doesNotMatch(read("src/lib/authErrors.ts"), /console\./));

console.log("Source invariants below are not browser or database authorization tests.");
check("Proof render validates stored URL", () => {
  const source = read("src/components/circle/StudentCard.tsx");
  assert.match(source, /sanitizeExternalUrl\(record\.proofUrl\)/);
  assert.match(source, /href=\{safeProof\}/);
  assert.doesNotMatch(source, /href=\{record\.proofUrl\}/);
});
check("Supporting video render validates stored URL", () => {
  const source = read("src/pages/ExplorePage.tsx");
  assert.match(source, /sanitizeExternalUrl\(video\.youtubeUrl\)/);
  assert.match(source, /href=\{safeHref\}/);
  assert.match(source, /getYouTubeEmbedUrl\(featuredVideo\.youtubeUrl\)/);
});
const data = read("src/lib/dataAccess.ts");
check("Video write validates URL", () => assert.match(data.slice(data.indexOf("export async function saveVideo("), data.indexOf("export async function saveVideo(") + 2300), /youtube_url:\s*optionalUrl\(input\.youtubeUrl\)/));
check("Directory explicitly requests public rows", () => {
  const start = data.indexOf("export async function getStudentDirectory(");
  const end = data.indexOf("export async function getStudentProfile(", start);
  assert.ok(start >= 0 && end > start);
  assert.match(data.slice(start, end), /\.eq\("is_public", true\)/);
});

// Phase 2.1 / R-1: the client must not depend on privileges that migration 029
// removes. These invariants are the client half of the privacy rules; they are
// source checks, not behavioural ones, and the note at the bottom of this file
// still applies to all of them.
check("Owner profile read uses the definer path", () => assert.match(data, /\.rpc\("get_own_profile"\)/));
check("Owner read fallback is gated on a missing function only", () => {
  assert.match(data, /isMissingFunctionError\(rpc\.error\)/);
  // Anything else in that branch must not swallow errors: a real privilege
  // failure has to surface, not degrade to a table read.
  assert.match(data, /else \{\s*\n\s*return failure\(null, rpc\.error\);/);
});
check("Profile writes do not project the whole row back", () => {
  assert.doesNotMatch(data, /\.update\(payload\)[\s\S]{0,90}?\.select\(\)/);
  assert.doesNotMatch(data, /\.upsert\(payload, \{ onConflict: "user_id" \}\)[\s\S]{0,90}?\.select\(\)/);
  assert.match(data, /const refreshed = await getCurrentUserProfile\(\);/);
});
check("Connected peer names come only from the relationship-scoped RPC", () => {
  assert.match(data, /\.rpc\("get_connected_peer_names"\)/);
  assert.match(data, /export async function getConnectedPeerNames/);
});
check("mapProfile tolerates a privilege-filtered column", () => {
  assert.match(data, /id: row\.id \? String\(row\.id\) : ""/);
  assert.match(data, /userId: row\.user_id \? String\(row\.user_id\) : ""/);
});
check("Directory projection is a subset of the granted profile columns", () => {
  // The whole privacy design rests on the client never needing a column that
  // 029 does not grant. This compares the two lists instead of trusting either.
  const sql = read("supabase/security-review/029_profile_privacy_enforcement.sql");
  const grant = /grant select \(([\s\S]*?)\) on public\.profiles to authenticated;/.exec(sql);
  assert.ok(grant, "029 must contain the authenticated column grant");
  const granted = new Set(grant[1].split(",").map((s) => s.trim()).filter(Boolean));
  const cols = /const DIRECTORY_COLUMNS =\s*\n?\s*"([^"]+)"/.exec(data);
  assert.ok(cols, "DIRECTORY_COLUMNS not found");
  const requested = cols[1].split(",").map((s) => s.trim().replace(/\(.*\)$/, "")).filter(Boolean);
  const missing = requested.filter((c) => c !== "colleges" && !granted.has(c));
  assert.deepEqual(missing, [], `directory asks for columns 029 does not grant: ${missing.join(", ")}`);
  for (const hidden of ["gender", "id", "created_at", "updated_at"])
    assert.ok(!requested.includes(hidden), `the directory must never request ${hidden}`);
});

// Phase 2.1 / 030-033: the client half of the captain-only phone rule, the
// registration projection, RPC-only approval and the join concurrency lock.
// Source invariants only — the behavioural proof lives in the PGlite suites.
check("Team roster phone is captain-gated in the UI", () => {
  const team = read("src/pages/TeamPage.tsx");
  assert.match(team, /isCaptain && member\.phone/);
});
check("030 returns roster phone only to the captain", () => {
  const sql = read("supabase/security-review/030_contact_captain_only.sql");
  assert.match(sql, /create policy "Captains can read team member contacts"/);
  assert.match(sql, /t\.captain_user_id = auth\.uid\(\)/);
  assert.match(sql, /then c\.phone_number else null end as phone_number/);
});
check("Student registration projection is a subset of the 031 grant", () => {
  const sql = read("supabase/security-review/031_registration_privacy.sql");
  const grant = /grant select \(([\s\S]*?)\)\s*on public\.competition_registrations to authenticated;/.exec(sql);
  assert.ok(grant, "031 must contain the authenticated column grant");
  const granted = new Set(grant[1].split(",").map((s) => s.trim()).filter(Boolean));
  const start = data.indexOf("export async function getMyCompetitionRegistrations(");
  const end = data.indexOf("export async function getCompetitionRegisteredTeamCount(", start);
  assert.ok(start >= 0 && end > start);
  const sel = /\.select\(\s*\n?\s*"([^"]+)"/.exec(data.slice(start, end));
  assert.ok(sel, "registration select not found");
  const projection = sel[1].replace(/,\s*opportunities\([^)]*\)/, "");
  const requested = projection.split(",").map((s) => s.trim()).filter(Boolean);
  const missing = requested.filter((c) => !granted.has(c));
  assert.deepEqual(missing, [], `registration asks for columns 031 does not grant: ${missing.join(", ")}`);
  for (const hidden of ["roster_snapshot", "participant_user_id", "updated_at"])
    assert.ok(!requested.includes(hidden), `the student registration read must never request ${hidden}`);
});
check("Join-request approval is RPC-only; the client never UPDATEs status to approved", () => {
  assert.match(data, /\.rpc\("approve_team_join_request"/);
  assert.match(data, /\.update\(\{ status: "rejected" \}\)/);
  assert.doesNotMatch(data, /\.update\(\{ status: "approved" \}\)/);
});
check("032 forbids direct approval in the join-request UPDATE policy", () => {
  const sql = read("supabase/security-review/032_join_request_integrity.sql");
  assert.match(sql, /status <> 'approved'/);
  assert.match(sql, /grant update \(status\) on public\.competition_team_join_requests to authenticated;/);
});
check("033 membership guard serializes joins with a transaction advisory lock", () => {
  const sql = read("supabase/security-review/033_membership_concurrency.sql");
  assert.match(sql, /pg_catalog\.pg_advisory_xact_lock\(/);
  assert.match(sql, /pg_catalog\.hashtextextended\(new\.user_id::text/);
});
check("Metadata excludes query and fragment", () => assert.match(read("src/components/PageShell.tsx"), /updateMeta\("og:url", window\.location\.origin \+ window\.location\.pathname/));
check("Admin auth uses shared translator", () => assert.match(read("src/pages/AdminPage.tsx"), /friendlyAuthError\(result\.error\.message\)/));
check("All builds strip application console calls", () => assert.match(read("vite.config.ts"), /command === "build" \? \{ drop: \["console", "debugger"\]/));
check("Dev server restricts host and binds loopback", () => {
  const config = read("vite.config.ts");
  assert.match(config, /host: "127\.0\.0\.1"/);
  assert.match(config, /allowedHosts: \["localhost"\]/);
});

const headers = new Map(read("public/_headers").split(/\r?\n/).filter((line) => /^\s+[A-Za-z-]+:/.test(line)).map((line) => {
  const split = line.indexOf(":");
  return [line.slice(0, split).trim().toLowerCase(), line.slice(split + 1).trim()];
}));
for (const name of ["x-frame-options", "x-content-type-options", "referrer-policy", "permissions-policy", "content-security-policy", "strict-transport-security"]) {
  check(`Candidate header ${name}`, () => assert.ok(headers.get(name)));
}
check("Candidate CSP allows only self + the approved Google tag, denies script inline/eval and framing", () => {
  const csp = headers.get("content-security-policy");
  assert.match(csp, /(?:^|;)\s*script-src 'self' https:\/\/www\.googletagmanager\.com 'sha256-SADd6CkTx5zK\+SH3J\+XEB5MHv9cpDyKQRn0\/OMLvuMw=';/);
  const scriptSrc = csp.match(/(?:^|;)\s*script-src ([^;]*);/)[1];
  assert.doesNotMatch(scriptSrc, /unsafe-inline|unsafe-eval/);
  assert.doesNotMatch(csp, /unsafe-eval/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /frame-src https:\/\/www\.youtube\.com/);
});
console.log(`${passed} checks passed. Live auth, RLS, storage and hosting are not certified by this script.`);
