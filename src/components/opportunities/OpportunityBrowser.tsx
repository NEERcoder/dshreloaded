import { useEffect, useMemo, useState } from "react";
import Icon from "../Icon";
import { SkeletonOpportunityGrid } from "../Skeleton";
import OpportunityCard from "./OpportunityCard";
import { getOpportunities, type OpportunityRecord } from "../../lib/dataAccess";
import { opportunityCategoryIcon } from "../../data/opportunityCategories";

export type CategoryChip = {
  id: string;
  label: string;
  category: OpportunityRecord["category"] | null;
};

type SortKey = "featured" | "deadline" | "newest";

type OpportunityBrowserProps = {
  categories: OpportunityRecord["category"][];
  chips?: CategoryChip[];
  showCompensation?: boolean;
  showMode?: boolean;
  showField?: boolean;
  showCourse?: boolean;
  searchPlaceholder?: string;
  emptyTitle: string;
  emptyDescription: string;
  noResultsTitle?: string;
  noResultsDescription?: string;
};

function distinct(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function deadlineTime(value: string | null): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function isPaidOpportunity(item: OpportunityRecord): boolean {
  return Boolean(item.stipend && !/unpaid|voluntary|stipend\s*:\s*no/i.test(item.stipend));
}

export default function OpportunityBrowser({
  categories,
  chips,
  showCompensation = false,
  showMode = true,
  showField = true,
  showCourse = false,
  searchPlaceholder = "Search by title, organisation, field or location…",
  emptyTitle,
  emptyDescription,
  noResultsTitle = "No matches for those filters",
  noResultsDescription = "Try a broader search or clear the filters.",
}: OpportunityBrowserProps) {
  const [items, setItems] = useState<OpportunityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chip, setChip] = useState(chips ? chips[0].id : "");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("");
  const [field, setField] = useState("");
  const [course, setCourse] = useState("");
  const [compensation, setCompensation] = useState("");
  const [sort, setSort] = useState<SortKey>("featured");

  const categoriesKey = categories.join("|");

  useEffect(() => {
    let cancelled = false;
    const scopedCategories = categoriesKey.split("|") as OpportunityRecord["category"][];
    setLoading(true);
    Promise.all(scopedCategories.map((category) => getOpportunities(category))).then((results) => {
      if (cancelled) return;
      const merged: OpportunityRecord[] = [];
      const seen = new Set<string>();
      let firstError: string | null = null;
      for (const result of results) {
        if (result.error && !firstError) firstError = result.error;
        for (const item of result.data) {
          if (seen.has(item.id)) continue;
          seen.add(item.id);
          merged.push(item);
        }
      }
      setItems(merged);
      setError(firstError);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [categoriesKey]);

  // Filter options are derived from the live rows only — never a hardcoded taxonomy.
  const modeOptions = useMemo(() => distinct(items.map((i) => i.mode ?? "")), [items]);
  const fieldOptions = useMemo(() => distinct(items.map((i) => i.field ?? "")), [items]);
  const courseOptions = useMemo(() => distinct(items.flatMap((i) => i.eligibleCourses)), [items]);

  const activeChip = chips?.find((c) => c.id === chip) ?? chips?.[0];
  const scoped = activeChip?.category
    ? items.filter((item) => item.category === activeChip.category)
    : items;

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return scoped
      .filter((item) => {
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
        if (mode && item.mode !== mode) return false;
        if (field && item.field !== field) return false;
        if (course && !item.eligibleCourses.includes(course)) return false;
        if (compensation && isPaidOpportunity(item) !== (compensation === "paid")) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "deadline") {
          const aTime = deadlineTime(a.deadline);
          const bTime = deadlineTime(b.deadline);
          if (aTime === null && bTime === null) return 0;
          if (aTime === null) return 1;
          if (bTime === null) return -1;
          return aTime - bTime;
        }
        if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
        return Number(b.featured) - Number(a.featured);
      });
  }, [scoped, search, mode, field, course, compensation, sort]);

  const filtersActive = Boolean(search || mode || field || course || compensation);
  const showModeFilter = showMode && modeOptions.length > 1;
  const showFieldFilter = showField && fieldOptions.length > 1;
  const showCourseFilter = showCourse && courseOptions.length > 1;

  function clearFilters() {
    setSearch("");
    setMode("");
    setField("");
    setCourse("");
    setCompensation("");
  }

  const controls = [
    showModeFilter && (
      <label key="mode" className="block">
        <span className="sr-only">Work mode</span>
        <select value={mode} onChange={(e) => setMode(e.target.value)} className="filter-select text-xs">
          <option value="">All Modes</option>
          {modeOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
    ),
    showFieldFilter && (
      <label key="field" className="block">
        <span className="sr-only">Field</span>
        <select value={field} onChange={(e) => setField(e.target.value)} className="filter-select text-xs">
          <option value="">All Fields</option>
          {fieldOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
    ),
    showCourseFilter && (
      <label key="course" className="block">
        <span className="sr-only">Eligible course</span>
        <select value={course} onChange={(e) => setCourse(e.target.value)} className="filter-select text-xs">
          <option value="">All Courses</option>
          {courseOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
    ),
    showCompensation && (
      <label key="compensation" className="block">
        <span className="sr-only">Compensation</span>
        <select value={compensation} onChange={(e) => setCompensation(e.target.value)} className="filter-select text-xs">
          <option value="">Any Pay</option>
          <option value="paid">Paid only</option>
          <option value="unpaid">Unpaid / Voluntary</option>
        </select>
      </label>
    ),
    (
      <label key="sort" className="block">
        <span className="sr-only">Sort</span>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="filter-select text-xs">
          <option value="featured">Sort: Featured first</option>
          <option value="deadline">Sort: Closing soonest</option>
          <option value="newest">Sort: Newest added</option>
        </select>
      </label>
    ),
  ].filter(Boolean);

  return (
    <div className="mt-6">
      {chips && chips.length > 1 && (
        <div className="-mx-4 overflow-x-auto no-scrollbar px-4 sm:mx-0 sm:px-0">
          <div className="flex w-max sm:flex-wrap sm:w-auto gap-2">
            {chips.map((c) => (
              <button
                key={c.id}
                onClick={() => setChip(c.id)}
                aria-pressed={chip === c.id}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition-colors duration-200 min-h-[44px] ${
                  chip === c.id
                    ? "bg-brand-blue text-white shadow-soft"
                    : "bg-white text-ink-600 border border-surface-border hover:text-brand-blue hover:border-brand-blue/40"
                }`}
              >
                {c.category && <Icon name={opportunityCategoryIcon(c.category)} className="h-3.5 w-3.5" />}
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="filter-bar mt-4 card p-3 sm:p-3.5">
        <div className="relative min-w-0 flex-1 basis-full sm:basis-auto">
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="field-input filter-search pl-11"
            aria-label="Search opportunities"
          />
        </div>
        {controls}
        <div className="flex w-full flex-wrap items-center justify-between gap-2 pt-1">
          <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-500" aria-live="polite">
            {loading ? (
              <>
                <Icon name="loader" className="h-3.5 w-3.5 animate-spin" />
                Loading…
              </>
            ) : (
              `${filtered.length} listing${filtered.length === 1 ? "" : "s"}`
            )}
          </p>
          {filtersActive && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-brand-blue hover:underline min-h-[44px]"
            >
              <Icon name="close" className="h-3.5 w-3.5" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
          <SkeletonOpportunityGrid count={6} />
        ) : error && items.length === 0 ? (
          <div className="card border-dashed p-6 text-center bg-white sm:p-10">
            <Icon name="alert-triangle" className="mx-auto h-8 w-8 text-brand-red-ink" />
            <p className="mt-3 text-base font-bold text-ink-900">This feed needs attention</p>
            <p className="mt-1 text-sm text-ink-500">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="card border-dashed p-6 text-center bg-white sm:p-10">
            <Icon name="flag" className="mx-auto h-8 w-8 text-ink-400" />
            <p className="mt-3 text-base font-bold text-ink-900">{emptyTitle}</p>
            <p className="mt-1 text-sm text-ink-500">{emptyDescription}</p>
          </div>
        ) : filtered.length ? (
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {filtered.map((item) => (
              <OpportunityCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="card border-dashed p-6 text-center bg-white sm:p-10">
            <Icon name="filter" className="mx-auto h-8 w-8 text-ink-400" />
            <p className="mt-3 text-base font-bold text-ink-900">{noResultsTitle}</p>
            <p className="mt-1 text-sm text-ink-500">{noResultsDescription}</p>
          </div>
        )}
      </div>
    </div>
  );
}
