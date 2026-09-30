import type { CollegeRecord } from "../data/colleges";

/**
 * JAVLIN's college search engine.
 *
 * Pure functions, no React and no Supabase: the navbar type-ahead, the /explore
 * directory and the /college-reviews index all build one index from the college
 * list and ask this module to score it. Aliases are search metadata only — a
 * college's displayed name is never rewritten here.
 */

const COMBINING_MARKS = /[̀-ͯ]/g;
/** Hyphen-like characters from across Unicode, folded to a plain dash. */
const UNICODE_DASHES = /[‐-‒–—―−－᐀⸺⸻﹘﹣]/g;
const APOSTROPHE_LIKE = [`‘`, `’`, `‚`, `‛`, "`", "´", `'`].join("");
const APOSTROPHE_RE = new RegExp(`[${APOSTROPHE_LIKE}]`, "g");
const NON_ALNUM = /[^a-z0-9]+/g;

/**
 * Fold a display string into a comparable key: curly quotes and dashes become
 * ASCII, diacritics are dropped, apostrophes vanish so that "St. Stephen's"
 * and "St Stephens" agree, and every other run of punctuation collapses to a
 * single space.
 */
export function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .replace(UNICODE_DASHES, "-")
    .replace(APOSTROPHE_RE, "")
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(NON_ALNUM, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Words that carry no identifying weight in an institution name. "Sri" and
 * "Shri" are deliberately absent: dropping them would turn Shri Ram College of
 * Commerce into RCC, and everyone who types SRCC would miss it.
 */
const STOP_WORDS = new Set(["of", "and", "the", "for", "at", "in", "a", "an", "to", "on"]);

/**
 * Institution families — one acronym standing for a whole naming pattern.
 * Matching runs on the expanded phrase, never on the acronym as a substring,
 * so "IIT" reaches "Indian Institute of Technology Delhi" without also
 * swallowing "Indian Institute of Information Technology" or the "All India
 * Institute of Ayurveda". Spelling variants (Subhas/Subhash) are listed
 * explicitly because both appear on official Indian institution names.
 */
const INSTITUTION_FAMILIES: { acronym: string; patterns: string[] }[] = [
  { acronym: "iiit", patterns: ["indian institute of information technology"] },
  { acronym: "iim", patterns: ["indian institute of management"] },
  { acronym: "iit", patterns: ["indian institute of technology"] },
  { acronym: "nit", patterns: ["national institute of technology"] },
  { acronym: "aiims", patterns: ["all india institute of medical sciences"] },
  { acronym: "nlu", patterns: ["national law university"] },
  { acronym: "jnu", patterns: ["jawaharlal nehru university"] },
  { acronym: "jmi", patterns: ["jamia millia islamia"] },
  {
    acronym: "bits",
    patterns: ["birla institute of technology and science", "birla institute of technology"],
  },
  {
    acronym: "srm",
    patterns: ["srm institute of science and technology", "srm university", "srm"],
  },
  { acronym: "vit", patterns: ["vellore institute of technology"] },
  { acronym: "dtu", patterns: ["delhi technological university"] },
  {
    acronym: "nsut",
    patterns: ["netaji subhas university of technology", "netaji subhash university of technology"],
  },
  {
    acronym: "nsit",
    patterns: ["netaji subhas institute of technology", "netaji subhash institute of technology"],
  },
];

/**
 * Curated aliases, keyed by normalized name, for the well-known short forms
 * that acronym generation genuinely gets wrong — LSR for Lady Shri Ram College
 * for Women, ARSD for Atma Ram Sanatan Dharma College, and so on. Everything a
 * name spells out for itself is left to the generator, and every family
 * acronym (IIT, NIT, JNU, AIIMS…) comes from INSTITUTION_FAMILIES above rather
 * than being repeated here.
 */
const EXPLICIT_ALIASES: Record<string, string[]> = {
  "lady shri ram college for women": ["lsr", "lady shri ram"],
  "atma ram sanatan dharma college": ["arsd"],
  "ramjas college": ["rjc"],
  "sri guru gobind singh college of commerce": ["sggscc", "sggs"],
  "indraprastha college for women": ["ip college", "ipc"],
  "bhim rao ambedkar college": ["bra college"],
  "shaheed sukhdev college of business studies": ["sscbs"],
  "delhi college of arts commerce": ["ducac"],
  "netaji subhash institute of technology": ["nsut"],
  "netaji subhas institute of technology": ["nsut"],
};

/** Initials of the significant words: "Kirori Mal College" -> kmc. */
function initialsOf(phrase: string): string {
  const words = phrase.split(" ").filter((word) => word && !STOP_WORDS.has(word));
  if (words.length < 2) return "";
  return words.map((word) => word[0]).join("");
}

/**
 * Acronyms a college earns from its own name, plus the family-aware forms
 * students really type. "Indian Institute of Management Jammu" yields both
 * "iimj" and "iim": the family prefix is kept whole and only the place word
 * contributes an initial.
 */
export function generateAcronyms(normalizedName: string): string[] {
  const out = new Set<string>();
  const plain = initialsOf(normalizedName);
  if (plain.length >= 2 && plain.length <= 6) out.add(plain);

  for (const family of INSTITUTION_FAMILIES) {
    const pattern = family.patterns.find((candidate) => normalizedName.includes(candidate));
    if (!pattern) continue;
    out.add(family.acronym);
    const place = initialsOf(normalizedName.replace(pattern, " "));
    if (place) out.add(`${family.acronym}${place}`);
  }
  return [...out];
}

/** Every alias a college answers to. Explicit entries win the ordering. */
export function aliasesFor(college: CollegeRecord): string[] {
  const key = normalize(college.name);
  const explicit = (EXPLICIT_ALIASES[key] ?? []).map(normalize);
  return [...new Set([...explicit, ...generateAcronyms(key)].filter(Boolean))];
}

export type IndexedCollege = {
  college: CollegeRecord;
  name: string;
  slug: string;
  location: string;
  campus: string;
  categories: string[];
  courses: string[];
  about: string;
  aliases: string[];
};

export type CollegeSearchIndex = { entries: IndexedCollege[] };

/**
 * One pass over the directory, done once per college list and never per
 * keystroke — callers hold the result in a useMemo keyed on the list.
 */
export function buildCollegeSearchIndex(colleges: CollegeRecord[]): CollegeSearchIndex {
  return {
    entries: colleges.map((college) => {
      const name = normalize(college.name);
      return {
        college,
        name,
        slug: normalize(college.slug),
        location: normalize(college.location),
        campus: normalize(college.campus),
        categories: college.academicAreas.map(normalize).filter(Boolean),
        courses: college.courses.map(normalize).filter(Boolean),
        about: normalize(college.about ?? ""),
        aliases: aliasesFor(college),
      };
    }),
  };
}

/**
 * Relevance hierarchy. A name or alias hit must outrank a college that merely
 * sits in the typed city, or teaches the typed subject.
 */
export const SCORE = {
  exactName: 1000,
  exactAlias: 950,
  exactSlug: 900,
  namePrefix: 850,
  aliasPrefix: 800,
  nameContains: 700,
  aliasContains: 650,
  slugContains: 500,
  location: 350,
  category: 300,
  course: 250,
  about: 150,
} as const;

export type ScoredCollege = {
  college: CollegeRecord;
  score: number;
  /** Which rule fired, so callers can group or debug without re-scoring. */
  reason: string;
};

/** Re-write a query that leads with a family acronym into its full phrase. */
function expandQuery(query: string): string[] {
  const out = [query];
  const first = query.split(" ")[0];
  const rest = query.slice(first.length).trim();
  for (const family of INSTITUTION_FAMILIES) {
    if (first !== family.acronym) continue;
    for (const pattern of family.patterns) {
      out.push(rest ? `${pattern} ${rest}` : pattern);
    }
  }
  return out;
}

/**
 * Containment at token boundaries. "iit" must not match inside "iiitdm", and
 * "jammu" must not match inside "ajammu". Names keep plain substring matching
 * so a partial word still autocompletes; initialisms and slugs do not, because
 * every acronym in the system is a substring of a longer one.
 */
const containsTokens = (haystack: string, phrase: string) =>
  ` ${haystack} `.includes(` ${phrase} `);

function phraseScore(
  entry: IndexedCollege,
  phrase: string
): { score: number; reason: string } | null {
  const { name, slug, aliases, location, campus, categories, courses, about } = entry;
  if (name === phrase) return { score: SCORE.exactName, reason: "exact-name" };
  if (aliases.includes(phrase)) return { score: SCORE.exactAlias, reason: "exact-alias" };
  if (slug === phrase) return { score: SCORE.exactSlug, reason: "exact-slug" };
  if (name.startsWith(phrase)) return { score: SCORE.namePrefix, reason: "name-prefix" };
  if (aliases.some((alias) => alias.startsWith(phrase)))
    return { score: SCORE.aliasPrefix, reason: "alias-prefix" };
  if (name.includes(phrase)) return { score: SCORE.nameContains, reason: "name-contains" };
  if (aliases.some((alias) => containsTokens(alias, phrase)))
    return { score: SCORE.aliasContains, reason: "alias-contains" };
  if (containsTokens(slug, phrase)) return { score: SCORE.slugContains, reason: "slug-contains" };
  if (location.includes(phrase) || campus.includes(phrase))
    return { score: SCORE.location, reason: "location" };
  if (categories.some((category) => category.includes(phrase)))
    return { score: SCORE.category, reason: "category" };
  if (courses.some((course) => course.includes(phrase)))
    return { score: SCORE.course, reason: "course" };
  if (about.includes(phrase)) return { score: SCORE.about, reason: "about" };
  return null;
}

/**
 * Token pass for multi-word queries no single phrase matched. Every token must
 * land somewhere, so "iit bombay" cannot surface a college that only says
 * "bombay". Tokens found in the name or an alias outweigh tokens found only in
 * a location or a course list.
 */
function tokenScore(
  entry: IndexedCollege,
  tokens: string[]
): { score: number; reason: string } | null {
  if (tokens.length < 2) return null;
  let total = 0;
  for (const token of tokens) {
    if (entry.name.includes(token) || entry.aliases.some((alias) => alias.includes(token))) {
      total += 60;
    } else if (entry.slug.includes(token)) {
      total += 40;
    } else if (entry.location.includes(token) || entry.campus.includes(token)) {
      total += 30;
    } else if (entry.categories.some((category) => category.includes(token))) {
      total += 25;
    } else if (entry.courses.some((course) => course.includes(token))) {
      total += 20;
    } else if (entry.about.includes(token)) {
      total += 10;
    } else {
      return null;
    }
  }
  return { score: Math.min(total, SCORE.slugContains - 1), reason: "all-tokens" };
}

/**
 * Score the directory against a query and return the ranked slice. Each query
 * is tried as typed and again with any leading family acronym expanded into its
 * full phrase, so "IIM Jammu" reaches "Indian Institute of Management Jammu"
 * without the student knowing the long form.
 */
export function searchColleges(
  index: CollegeSearchIndex,
  query: string,
  limit = 8
): ScoredCollege[] {
  const normalized = normalize(query);
  if (!normalized) return [];
  const phrases = expandQuery(normalized);
  const tokens = normalized.split(" ").filter((token) => token.length > 1);

  const scored: ScoredCollege[] = [];
  for (const entry of index.entries) {
    let best: { score: number; reason: string } | null = null;
    for (const phrase of phrases) {
      const hit = phraseScore(entry, phrase);
      if (hit && (!best || hit.score > best.score)) best = hit;
      if (best && best.score >= SCORE.exactSlug) break;
    }
    if (!best) best = tokenScore(entry, tokens);
    if (best) scored.push({ college: entry.college, score: best.score, reason: best.reason });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.college.name.localeCompare(b.college.name))
    .slice(0, limit);
}
