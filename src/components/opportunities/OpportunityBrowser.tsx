import { useEffect, useMemo, useState } from "react";
import Icon from "../Icon";
import { SkeletonOpportunityGrid } from "../Skeleton";
import OpportunityCard from "./OpportunityCard";
import FilterControls from "./FilterControls";
import { getOpportunities, opportunitiesStreamAvailable, type OpportunityRecord } from "../../lib/dataAccess";
import {
  activeFilterChips,
  applyOpportunityFilters,
  deriveFilterOptions,
  filtersWithoutChip,
  isDefaultFilters,
} from "../../lib/opportunityFilters";
import { useOpportunityFilters } from "../../hooks/useOpportunityFilters";
import { CategoryGlyph } from "../FeatureIcon";

export type CategoryChip = {
  id: string;
  label: string;
  category: OpportunityRecord["category"] | null;
};

type OpportunityBrowserProps = {
  categories: OpportunityRecord["category"][];
  chips?: CategoryChip[];
  searchPlaceholder?: string;
  emptyTitle: string;
  emptyDescription: string;
  noResultsTitle?: string;
  noResultsDescription?: string;
};

/**
 * The shared opportunity feed. Fetching, the category chips and the search box
 * stay here; every filter, sort and persistence decision comes from
 * `lib/opportunityFilters` and `FilterControls`, so Internships, Competitions
 * and Certifications cannot drift apart.
 */
export default function OpportunityBrowser({
  categories,
  chips,
  searchPlaceholder = "Search by title, organisation, field or location…",
  emptyTitle,
  emptyDescription,
  noResultsTitle = "No matches for those filters",
  noResultsDescription = "Try a broader search or reset the filters.",
}: OpportunityBrowserProps) {
  const [items, setItems] = useState<OpportunityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chip, setChip] = useState(chips ? chips[0].id : "");
  // Search is never persisted — it is a question, not a preference.
  const [search, setSearch] = useState("");
  const [streamEnabled, setStreamEnabled] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    void opportunitiesStreamAvailable().then((available) => {
      if (!cancelled) setStreamEnabled(available);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Facet choices come only from the rows on hand, so a filter is never offered
  // for a value nothing in the feed carries.
  const options = useMemo(() => deriveFilterOptions(items), [items]);
  const { filters, setFilters, resetFilters, restored, droppedNotice, dismissDroppedNotice } =
    useOpportunityFilters(options, !loading && items.length > 0, streamEnabled);

  const activeChip = chips?.find((c) => c.id === chip) ?? chips?.[0];
  const scoped = activeChip?.category
    ? items.filter((item) => item.category === activeChip.category)
    : items;

  const { items: visible, openTotal } = useMemo(
    () => applyOpportunityFilters(scoped, filters, search, streamEnabled),
    [scoped, filters, search, streamEnabled]
  );

  const filtersActive = !isDefaultFilters(filters);
  const showReset = filtersActive || search.length > 0;
  // Every filter that is narrowing the feed, as a removable token. Derived from
  // the same state the controls write, so the chip row and the sheet can never
  // disagree about what is on.
  const activeChips = activeFilterChips(filters);

  function handleReset() {
    setSearch("");
    resetFilters();
  }

  function countLabel() {
    if (loading) return null;
    if (showReset) return `${visible.length} of ${openTotal} open listings`;
    return `${openTotal} open listing${openTotal === 1 ? "" : "s"}`;
  }

  return (
    <div className="mt-6">
      {chips && chips.length > 1 && (
        <div className="-mx-4 overflow-x-auto no-scrollbar px-4 sm:mx-0 sm:px-0">
          <div className="flex w-max sm:flex-wrap sm:w-auto gap-2">
            {chips.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setChip(entry.id)}
                aria-pressed={chip === entry.id}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition-colors duration-200 min-h-[44px] ${
                  chip === entry.id
                    ? "bg-brand-blue text-white shadow-soft"
                    : "bg-white text-ink-600 border border-surface-border hover:text-brand-blue hover:border-brand-blue/40"
                }`}
              >
                {entry.category && <CategoryGlyph category={entry.category} className="h-3.5 w-3.5" />}
                {entry.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="filter-bar mt-4 card p-3 sm:p-3.5">
        <div className="relative min-w-0 flex-1 basis-full sm:basis-auto">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="field-input filter-search pl-11"
            aria-label="Search opportunities"
          />
        </div>

        <FilterControls
          value={filters}
          onChange={setFilters}
          onReset={resetFilters}
          options={options}
          streamEnabled={streamEnabled}
        />

        <div className="flex w-full flex-wrap items-center justify-between gap-2 pt-1">
          <p
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-500"
            aria-live="polite"
          >
            {loading ? (
              <>
                <Icon name="loader" className="h-3.5 w-3.5 animate-spin" />
                Loading…
              </>
            ) : (
              countLabel()
            )}
          </p>
          {showReset && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-brand-blue hover:underline min-h-[44px]"
            >
              <Icon name="close" className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>

        {activeChips.length > 0 && (
          <div className="flex w-full flex-wrap items-center gap-1.5 pt-1" role="group" aria-label="Active filters">
            {activeChips.map((chip) => (
              <button
                key={`${chip.key}:${chip.value ?? ""}`}
                type="button"
                onClick={() => setFilters(filtersWithoutChip(filters, chip))}
                aria-label={`Remove filter ${chip.label}`}
                className="inline-flex min-h-[44px] max-w-full items-center gap-1.5 rounded-xl border border-brand-blue/25 bg-brand-blue-soft px-3 text-xs font-bold text-brand-blue transition-colors hover:border-brand-blue/50 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
              >
                <span className="min-w-0 truncate">{chip.label}</span>
                <Icon name="close" className="h-3.5 w-3.5 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {droppedNotice && restored && (
          <p className="flex w-full flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-ink-500">
            <span>Some saved filters aren’t available in this section, so they aren’t applied here.</span>
            <button
              type="button"
              onClick={dismissDroppedNotice}
              className="flex min-h-[44px] items-center rounded-lg px-2 text-brand-blue hover:underline"
            >
              Dismiss
            </button>
          </p>
        )}
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
        ) : visible.length ? (
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
            {/* Two columns from `sm`, three only from `xl`: inside the desktop section
                shell the rail takes 224px, so three columns at `lg` squeezed every card
                to ~208px and made it taller than the screen. */}
            {visible.map((item) => (
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
