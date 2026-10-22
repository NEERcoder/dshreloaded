import { isListingOpen, type OpportunityRecord } from "./dataAccess";

/**
 * The one filtering implementation behind Internships, Competitions and
 * Certifications. Pure functions only — no React, no storage, no queries — so
 * the same rules drive the desktop toolbar, the mobile sheet, the result count
 * and the persisted preference object.
 */

export type OpportunitySortKey = "featured" | "deadline" | "newest";

export const OPPORTUNITY_SORT_LABELS: Record<OpportunitySortKey, string> = {
  featured: "Featured first",
  deadline: "Closing soonest",
  newest: "Newest added",
};

/** `""` means "any". `unstated` is a real choice, not a fallback for "unknown". */
export type CompensationChoice = "" | "paid" | "unpaid" | "unstated";

export type OpportunityFilters = {
  /** Single-select. Only offered when the database has the `stream` column. */
  stream: string;
  /** Multi-select facets. Values are read from the live rows, never invented. */
  modes: string[];
  fields: string[];
  courses: string[];
  locations: string[];
  /** Single-select. Derived from the free-text `stipend`, so it is a heuristic. */
  compensation: CompensationChoice;
  sort: OpportunitySortKey;
};

export const DEFAULT_FILTERS: OpportunityFilters = {
  stream: "",
  modes: [],
  fields: [],
  courses: [],
  locations: [],
  compensation: "",
  sort: "featured",
};

/** The preference-bearing keys. Search text is deliberately absent. */
export const PERSISTED_FILTER_KEYS = [
  "stream",
  "modes",
  "fields",
  "courses",
  "locations",
  "compensation",
  "sort",
] as const;

export type FilterOptions = {
  stream: string[];
  modes: string[];
  fields: string[];
  courses: string[];
  locations: string[];
};

export const EMPTY_FILTER_OPTIONS: FilterOptions = {
  stream: [],
  modes: [],
  fields: [],
  courses: [],
  locations: [],
};

/** Cap on a facet's stored values, so a corrupt blob cannot grow unbounded. */
const MAX_SELECTED_PER_FACET = 12;
const MAX_OPTION_LENGTH = 120;

function sortedUnique(values: (string | null | undefined)[]): string[] {
  return Array.from(
    new Set(values.map((value) => (value ?? "").trim()).filter((value) => value.length > 0))
  ).sort((a, b) => a.localeCompare(b));
}

/**
 * Facet choices come only from the rows already on screen. That keeps every
 * option truthful — a filter is never offered for a value no listing carries —
 * which matters most for `mode`, `field` and `location`, all free text.
 */
export function deriveFilterOptions(items: OpportunityRecord[]): FilterOptions {
  return {
    stream: sortedUnique(items.map((item) => item.stream)),
    modes: sortedUnique(items.map((item) => item.mode)),
    fields: sortedUnique(items.map((item) => item.field)),
    courses: sortedUnique(items.flatMap((item) => item.eligibleCourses)),
    locations: sortedUnique(items.map((item) => item.location)),
  };
}

function stringList(value: unknown, allowed: string[]): string[] {
  if (!Array.isArray(value)) return [];
  const permitted = new Set(allowed);
  const kept = value
    .filter((entry): entry is string => typeof entry === "string" && entry.length <= MAX_OPTION_LENGTH)
    .filter((entry) => permitted.has(entry));
  return sortedUnique(kept).slice(0, MAX_SELECTED_PER_FACET);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | "" {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : "";
}

export type SanitizeResult = {
  filters: OpportunityFilters;
  /** True when stored values existed but were dropped as unsupported. */
  dropped: boolean;
};

/**
 * Validate a stored (or untrusted) object against the options this section can
 * actually honour. Anything unknown is dropped rather than applied, so a stale
 * or hand-edited blob can never produce a silently empty feed.
 */
export function sanitizeFilters(raw: unknown, options: FilterOptions): SanitizeResult {
  if (typeof raw !== "object" || raw === null) {
    return { filters: { ...DEFAULT_FILTERS }, dropped: false };
  }
  const source = raw as Record<string, unknown>;
  const sortValue = oneOf<OpportunitySortKey>(
    source.sort,
    Object.keys(OPPORTUNITY_SORT_LABELS) as OpportunitySortKey[]
  );
  const filters: OpportunityFilters = {
    stream: oneOf(source.stream, options.stream) || "",
    modes: stringList(source.modes, options.modes),
    fields: stringList(source.fields, options.fields),
    courses: stringList(source.courses, options.courses),
    locations: stringList(source.locations, options.locations),
    compensation: (oneOf<CompensationChoice>(
      source.compensation,
      ["paid", "unpaid", "unstated"]
    ) || "") as CompensationChoice,
    sort: sortValue || DEFAULT_FILTERS.sort,
  };

  // A value was dropped when the blob carried it but this section cannot honour
  // it — a facet saved from another section, or a stream chosen before
  // migration 016 is applied. The caller tells the user rather than leaving an
  // unexplained empty feed.
  const dropped = (["stream", "modes", "fields", "courses", "locations", "compensation"] as const).some(
    (key) => rawPresent(source[key]) && isEmptyValue(filters[key])
  );

  return { filters, dropped };
}

function rawPresent(value: unknown): boolean {
  if (Array.isArray(value)) return value.some((entry) => typeof entry === "string" && entry.trim() !== "");
  return typeof value === "string" && value.trim() !== "";
}

function isEmptyValue(value: string | string[]): boolean {
  return Array.isArray(value) ? value.length === 0 : value === "";
}

/** The keys the persistence layer may hold. Anything else is discarded. */
export type PersistedFilterKey = (typeof PERSISTED_FILTER_KEYS)[number];

/**
 * Validate a stored payload against the schema alone — no option lists.
 *
 * `sanitizeFilters` answers "what can this section show?"; this answers "is this
 * value storable at all?". A value for another section is legitimate here even
 * though the current section cannot offer it, which is exactly why it must still
 * be type-checked, length-capped and limited to known keys: the payload may have
 * come from a hand-edited row or an older client. Unknown keys, malformed
 * entries and empty values are dropped rather than carried forward.
 */
export function validateStoredPayload(raw: unknown): Record<string, unknown> {
  const valid: Record<string, unknown> = {};
  if (typeof raw !== "object" || raw === null) return valid;
  const source = raw as Record<string, unknown>;

  const bounded = (value: unknown): string | null =>
    typeof value === "string" && value.length > 0 && value.length <= MAX_OPTION_LENGTH ? value : null;

  const stream = bounded(source.stream);
  // The stream vocabulary belongs to migration 016, so it is not validated
  // against a list that this file does not own — only bounded.
  if (stream) valid.stream = stream;

  for (const facet of ["modes", "fields", "courses", "locations"] as const) {
    const value = source[facet];
    if (!Array.isArray(value)) continue;
    const kept = sortedUnique(
      value.filter((entry): entry is string => typeof entry === "string" && entry.length <= MAX_OPTION_LENGTH)
    ).slice(0, MAX_SELECTED_PER_FACET);
    if (kept.length) valid[facet] = kept;
  }

  const compensation = oneOf<CompensationChoice>(source.compensation, ["paid", "unpaid", "unstated"]);
  if (compensation) valid.compensation = compensation;

  const sort = oneOf<OpportunitySortKey>(
    source.sort,
    Object.keys(OPPORTUNITY_SORT_LABELS) as OpportunitySortKey[]
  );
  if (sort) valid.sort = sort;

  return valid;
}

/**
 * Which persisted keys the section on screen is allowed to write.
 *
 * A facet is managed only when the loaded rows actually populate its option
 * list, and `stream` only when the column exists. Every other key is somebody
 * else's preference and must be carried through a write untouched; `compensation`
 * and `sort` are offered in every section, so they are always managed.
 */
export function manageableKeys(options: FilterOptions, streamEnabled: boolean): PersistedFilterKey[] {
  const managed: PersistedFilterKey[] = ["compensation", "sort"];
  if (streamEnabled) managed.push("stream");
  for (const facet of ["modes", "fields", "courses", "locations"] as const) {
    if (options[facet].length > 0) managed.push(facet);
  }
  return managed;
}

/**
 * The pay choices, in one place: the selects and the active-filter chips cannot
 * then drift apart in wording. `chipLabel` is short because it sits in a token.
 */
export const COMPENSATION_CHOICES: {
  value: Exclude<CompensationChoice, "">;
  selectLabel: string;
  chipLabel: string;
}[] = [
  { value: "paid", selectLabel: "Paid (as stated)", chipLabel: "Paid" },
  { value: "unpaid", selectLabel: "Unpaid / voluntary", chipLabel: "Unpaid" },
  { value: "unstated", selectLabel: "Pay not stated", chipLabel: "Pay not stated" },
];

const FACET_LABELS: Record<"modes" | "fields" | "courses" | "locations", string> = {
  modes: "Work mode",
  fields: "Field",
  courses: "Course",
  locations: "Location",
};

/**
 * A filter that is narrowing the feed, described once per value so it can be
 * shown as a removable token. Sort is not a filter and is never listed.
 */
export type ActiveFilterChip = {
  key: "stream" | "modes" | "fields" | "courses" | "locations" | "compensation";
  /** The value inside a multi-select facet; null for the single-select ones. */
  value: string | null;
  label: string;
};

export function activeFilterChips(filters: OpportunityFilters): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  if (filters.stream) chips.push({ key: "stream", value: null, label: `Stream: ${filters.stream}` });
  for (const facet of ["modes", "fields", "courses", "locations"] as const) {
    for (const value of filters[facet]) chips.push({ key: facet, value, label: `${FACET_LABELS[facet]}: ${value}` });
  }
  const pay = COMPENSATION_CHOICES.find((choice) => choice.value === filters.compensation);
  if (pay) chips.push({ key: "compensation", value: null, label: `Pay: ${pay.chipLabel}` });
  return chips;
}

/**
 * The next filter state with one chip removed. Shared by the chip row and the
 * controls so removing a value is the same operation everywhere.
 */
export function filtersWithoutChip(filters: OpportunityFilters, chip: ActiveFilterChip): OpportunityFilters {
  if (chip.value === null) {
    return chip.key === "stream"
      ? { ...filters, stream: "" }
      : { ...filters, compensation: "" };
  }
  const list = filters[chip.key] as string[];
  return { ...filters, [chip.key]: list.filter((entry) => entry !== chip.value) };
}

/** Toggle one value inside a multi-select facet. */
export function toggleFacetValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

/** How many filters are narrowing the feed right now (sort excluded). */
export function countActiveFilters(filters: OpportunityFilters): number {
  return (
    (filters.stream ? 1 : 0) +
    filters.modes.length +
    filters.fields.length +
    filters.courses.length +
    filters.locations.length +
    (filters.compensation ? 1 : 0)
  );
}

export function isDefaultFilters(filters: OpportunityFilters): boolean {
  return countActiveFilters(filters) === 0 && filters.sort === DEFAULT_FILTERS.sort;
}

/**
 * Read the free-text `stipend` honestly.
 *
 * There is no `is_paid` column, so this is a reading of what an admin typed, not
 * a stored fact. The rules are deliberately narrow and negative-first:
 *
 *   * explicit unpaid wording → `unpaid`
 *   * a currency symbol, an amount, or paid/stipend/salary wording → `paid`
 *   * anything else, including a blank, → `unstated`
 *
 * A blank therefore never counts as unpaid, and a stray "no" in a phrase like
 * "₹40,000 / month (no travel cover)" or "No registration fee" cannot flip a
 * listing into the unpaid bucket — the earlier broad `\bno\b` test did exactly
 * that, which is how this function came to be.
 */
export type CompensationState = "paid" | "unpaid" | "unstated";

const UNPAID_PATTERN =
  /unpaid|voluntary|no\s+(?:paid\s+)?(?:stipend|salary|pay|wage|remuneration|compensation)|stipend\s*[:\-]?\s*(?:no|none|nil|zero)\b|\bnil\b|\bzero\s+(?:stipend|pay|salary)\b/i;
const PAID_PATTERN = /[₹$€]|(?:^|[^a-z])(?:rs|inr|usd)\.?[\s:]*\d|\d+\s*(?:per|\/|a)\s*(?:month|week|day|hour)|\bpaid\b|\bstipend\b|\bsalary\b|\bhonorari|\bremunerat/i;

export function compensationState(stipend: string | null | undefined): CompensationState {
  const text = (stipend ?? "").trim();
  if (!text) return "unstated";
  if (UNPAID_PATTERN.test(text)) return "unpaid";
  if (PAID_PATTERN.test(text)) return "paid";
  return "unstated";
}

function deadlineTime(value: string | null): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function compareBySort(a: OpportunityRecord, b: OpportunityRecord, sort: OpportunitySortKey): number {
  if (sort === "deadline") {
    const aTime = deadlineTime(a.deadlineAt ?? a.deadline);
    const bTime = deadlineTime(b.deadlineAt ?? b.deadline);
    if (aTime === null && bTime === null) return 0;
    if (aTime === null) return 1;
    if (bTime === null) return -1;
    return aTime - bTime;
  }
  if (sort === "newest") return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  return Number(b.featured) - Number(a.featured);
}

export type ApplyResult = {
  items: OpportunityRecord[];
  /** Rows that are open right now, ignoring every filter — the honest count. */
  openTotal: number;
};

/**
 * Facets combine as AND across groups and OR within a group, which is what a
 * reader expects from a faceted list. `stream` is only honoured when the column
 * is live; otherwise a stored stream value is ignored rather than silently
 * emptying the feed.
 */
export function applyOpportunityFilters(
  items: OpportunityRecord[],
  filters: OpportunityFilters,
  search: string,
  streamEnabled: boolean
): ApplyResult {
  // The public feeds already exclude expired listings server-side, and
  // `isListingOpen` repeats that check client-side. Counting through the same
  // helper means the number and the cards can never disagree.
  const openTotal = items.filter((item) => isListingOpen(item)).length;
  const query = search.toLowerCase().trim();

  const matched = items.filter((item) => {
    if (query) {
      const searchable = [
        item.title,
        item.organization,
        item.field,
        item.location,
        item.description,
        ...item.eligibleCourses,
      ]
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(query)) return false;
    }
    if (streamEnabled && filters.stream && (item.stream ?? "") !== filters.stream) return false;
    if (filters.modes.length && !filters.modes.includes(item.mode ?? "")) return false;
    if (filters.fields.length && !filters.fields.includes(item.field ?? "")) return false;
    if (filters.courses.length && !filters.courses.some((course) => item.eligibleCourses.includes(course)))
      return false;
    if (filters.locations.length && !filters.locations.includes(item.location ?? "")) return false;
    if (filters.compensation && compensationState(item.stipend) !== filters.compensation) return false;
    return true;
  });

  return {
    items: matched.sort((a, b) => compareBySort(a, b, filters.sort)),
    openTotal,
  };
}
