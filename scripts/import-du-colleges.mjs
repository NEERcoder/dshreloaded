#!/usr/bin/env node

import { officialDuColleges } from "../src/data/colleges.js";

const SOURCE_URL = "https://www.du.ac.in/index.php?page=colleges-at-du";
const APPLY = process.argv.includes("--apply");
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_READ_KEY = process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY;

if (APPLY && (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
  throw new Error(
    "Applying requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Do not use the publishable VITE_SUPABASE_ANON_KEY for imports."
  );
}

function normalizeName(value) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

async function request(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY || SUPABASE_READ_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY || SUPABASE_READ_KEY}`,
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

const records = officialDuColleges.map((c) => ({
  name: c.name,
  slug: c.slug,
  short_description: c.about,
  campus: c.campus,
  location: c.location,
  categories: c.academicAreas,
  popular_courses: c.courses,
  college_type: c.type,
  hero_image_url: c.heroImageUrl,
}));

if (!SUPABASE_URL || !SUPABASE_READ_KEY) {
  console.log(
    JSON.stringify(
      {
        source: SOURCE_URL,
        officialCount: records.length,
        mode: "source-only",
        message:
          "Set Supabase URL and a read key to compare existing rows; use --apply with a service-role key to write.",
      },
      null,
      2
    )
  );
  process.exit(0);
}

const existingRows = await request("/rest/v1/colleges?select=id,name,slug&order=name.asc&limit=1000");
const existingSlugs = new Set(existingRows.map((row) => row.slug));
const missingSlugs = records.filter((r) => !existingSlugs.has(r.slug));

if (!APPLY) {
  console.log(
    JSON.stringify(
      {
        source: SOURCE_URL,
        officialCount: records.length,
        existingCount: existingRows.length,
        missingCount: missingSlugs.length,
        mode: "dry-run",
        message: "Re-run with --apply and a service-role key in the environment to write or update official records.",
      },
      null,
      2
    )
  );
  process.exit(0);
}

if (records.length) {
  await request("/rest/v1/colleges", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(records),
  });
}

console.log(
  JSON.stringify(
    {
      source: SOURCE_URL,
      officialCount: records.length,
      existingCount: existingRows.length,
      upsertedCount: records.length,
    },
    null,
    2
  )
);
