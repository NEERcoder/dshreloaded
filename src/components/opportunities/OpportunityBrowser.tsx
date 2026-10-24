import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../Icon";
import { SkeletonOpportunityGrid } from "../Skeleton";
import OpportunityCard from "./OpportunityCard";
import FilterControls from "./FilterControls";
import LocationRail from "./LocationRail";
import KeywordRail from "./KeywordRail";
import {
  CertificationListingCard,
  HackathonListingCard,
  CompetitionListingCard,
  ResearchListingCard,
  WideListingCard,
} from "./ListingCards";
import { getOpportunities, opportunitiesStreamAvailable, getCompetitionRegisteredTeamCount, type OpportunityRecord } from "../../lib/dataAccess";
import {
  activeFilterChips,
  applyOpportunityFilters,
  deriveFilterOptions,
  filtersWithoutChip,
  isDefaultFilters,
  type ActiveFilterChip,
  type FilterOffering,
  type FilterOptions,
} from "../../lib/opportunityFilters";
import { ORGANIZER_FORM_URL } from "../../lib/organizerCta";
import { useOpportunityFilters } from "../../hooks/useOpportunityFilters";
import { CategoryGlyph } from "../FeatureIcon";

export type CategoryChip = {
  id: string;
  label: string;
  category: OpportunityRecord["category"] | null;
};

/**
 * How one destination presents the shared feed. The data path is identical for
 * all six — one fetch, one filter engine, one preference store — and only the
 * presentation differs, so the pages read as a family without collapsing into
 * one template.
 */
export type FeedLayout = "grid" | "wide" | "research" | "competition" | "hackathon" | "certification";

export type PostingCta = {
  label: string;
  /** The reference draws two small tabs around the posting button. */
  above?: string;
  below?: string;
};

type OpportunityBrowserProps = {
  categories: OpportunityRecord["category"][];
  chips?: CategoryChip[];
  /**
   * The redesign dropped the general search box from the eight section pages, so
   * the box renders only for a caller that supplies a placeholder — which today
   * is `/opportunities`, where it is the page's main control. The `search` state
   * stays either way: it is an argument to the shared filter function, not a
   * feature that was removed with the input.
   */
  searchPlaceholder?: string;
  emptyTitle: string;
  emptyDescription: string;
  noResultsTitle?: string;
  noResultsDescription?: string;
  layout?: FeedLayout;
  /** `location` is the Remote/cities rail; `filters` mirrors the active chips. */
  sidebar?: "none" | "location" | "filters";
  /**
   * When set, the count moves into the page heading. Both forms are given
   * because the noun is the page's own wording — "1 open internship" and "4
   * open internships" both have to read correctly.
   */
  countNoun?: { one: string; many: string };
  posting?: PostingCta;
  /** Label for the featured chip — the reference's "Trending" pill. */
  featuredChipLabel?: string;
  /** Render one chip per stream value the listings actually carry. */
  streamChips?: boolean;
  /** Auto-scrolling rail bound to the `fields` facet. */
  keywordRailLabel?: string;
  /** A page that shows a subset of a category, e.g. hackathons inside competitions. */
  belongs?: (item: OpportunityRecord) => boolean;
  /**
   * `classic` is the shared toolbar (search, facets, pay, sort) that
   * `/opportunities`, AIM and FIELD still use. `section` is the redesign's
   * chrome: the wireframe's own chips and rail, with no generic bar.
   */
  chrome?: "classic" | "section";
  /**
   * Which filters this page offers a control for. Anything else is neither
   * applied nor written, so a preference saved on another page cannot narrow
   * this feed invisibly — and cannot be erased from here either.
   */
  offering?: FilterOffering;
};

const GRID_CLASS: Record<FeedLayout, string> = {
  grid: "grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3",
  wide: "flex flex-col gap-4",
  research: "grid gap-4 lg:grid-cols-2",
  competition: "grid gap-4 xl:grid-cols-2",
  hackathon: "grid gap-4 xl:grid-cols-2",
  certification: "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4",
};

function PostingButton({ posting }: { posting: PostingCta }) {
  return (
    <div className="post-cta">
      {posting.above && <span className="post-cta__tab">{posting.above}</span>}
      <a href={ORGANIZER_FORM_URL} target="_blank" rel="noreferrer" className="post-cta__button">
        {posting.label}
        <Icon name="external" className="h-4 w-4" />
      </a>
      {posting.below && <span className="post-cta__tab">{posting.below}</span>}
    </div>
  );
}

/** One removable row inside the Certifications Filters pane. */
function ChipRow({ chip, onRemove }: { chip: ActiveFilterChip; onRemove: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${chip.label}`}
        className="rail-city is-on"
      >
        <span className="min-w-0 truncate">{chip.label}</span>
        <Icon name="close" className="h-3.5 w-3.5 shrink-0" />
      </button>
    </li>
  );
}

/**
 * The shared opportunity feed. Fetching, the category chips and the search box
 * stay here; every filter, sort and persistence decision comes from
 * `lib/opportunityFilters` and `FilterControls`, so the six section pages cannot
 * drift apart.
 */
export default function OpportunityBrowser({
  categories,
  chips,
  searchPlaceholder,
  emptyTitle,
  emptyDescription,
  noResultsTitle = "No matches for those filters",
  noResultsDescription = "Try a broader search or reset the filters.",
  layout = "grid",
  sidebar = "none",
  countNoun,
  posting,
  featuredChipLabel,
  streamChips = false,
  keywordRailLabel,
  belongs,
  chrome = "classic",
  offering,
}: OpportunityBrowserProps) {
  const [items, setItems] = useState<OpportunityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chip, setChip] = useState(chips ? chips[0].id : "");
  // Search is never persisted — it is a question, not a preference.
  const [search, setSearch] = useState("");
  const [streamEnabled, setStreamEnabled] = useState(false);
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const countsRequested = useRef(new Set<string>());

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

  // The page's own slice of rows, before any filter. Facet options derive from
  // these, so a hackathon page never offers a field no hackathon carries.
  // `belongs` must be a module-level function: an inline arrow would rebuild
  // `owned` (and so every facet list) on each render.
  const owned = useMemo(
    () => (belongs ? items.filter((item) => belongs(item)) : items),
    [items, belongs]
  );

  // Facet choices come only from the rows on hand, so a filter is never offered
  // for a value nothing in the feed carries.
  const options: FilterOptions = useMemo(() => deriveFilterOptions(owned), [owned]);
  const { filters, setFilters, resetFilters, restored, droppedNotice, dismissDroppedNotice } =
    useOpportunityFilters(options, !loading && owned.length > 0, streamEnabled, offering);

  const activeChip = chips?.find((c) => c.id === chip) ?? chips?.[0];
  const scoped = activeChip?.category
    ? owned.filter((item) => item.category === activeChip.category)
    : owned;

  const { items: visible, openTotal } = useMemo(
    () => applyOpportunityFilters(scoped, filters, search, streamEnabled),
    [scoped, filters, search, streamEnabled]
  );

  // Registered-team counts come from the same RPC the detail page uses, fetched
  // once per competition and only for the rows on screen. A failed count stays
  // `null` — the card then shows nothing rather than a misleading zero.
  const countIds = useMemo(
    () =>
      layout === "competition" || layout === "hackathon"
        ? visible.filter((item) => item.teamFormationEnabled).map((item) => item.id)
        : [],
    [layout, visible]
  );
  useEffect(() => {
    const missing = countIds.filter((id) => !countsRequested.current.has(id));
    if (missing.length === 0) return;
    for (const id of missing) countsRequested.current.add(id);
    let cancelled = false;
    Promise.all(
      missing.map(async (id) => [id, await getCompetitionRegisteredTeamCount(id)] as const)
    ).then((entries) => {
      if (cancelled) return;
      setCounts((current) => {
        const next = { ...current };
        for (const [id, result] of entries) next[id] = result.error ? null : result.data;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [countIds]);

  const filtersActive = !isDefaultFilters(filters);
  const showReset = filtersActive || search.length > 0;
  // Every filter that is narrowing the feed, as a removable token. Derived from
  // the same state the controls write, so the chip row and the sheet can never
  // disagree about what is on.
  const activeChips = activeFilterChips(filters);

  const streamValues = streamChips && streamEnabled ? options.stream.slice(0, 4) : [];
  const hasQuickRow = Boolean(featuredChipLabel) || streamValues.length > 0;

  function handleReset() {
    setSearch("");
    resetFilters();
  }

  function countLabel() {
    if (loading) return null;
    if (showReset) return `${visible.length} of ${openTotal} open listings`;
    return `${openTotal} open listing${openTotal === 1 ? "" : "s"}`;
  }

  function headingCount() {
    if (!countNoun) return "";
    if (loading) return `Loading ${countNoun.many}…`;
    const noun = openTotal === 1 ? countNoun.one : countNoun.many;
    if (showReset) return `${visible.length} of ${openTotal} ${noun}`;
    return `${openTotal} ${noun}`;
  }

  function renderCard(item: OpportunityRecord) {
    switch (layout) {
      case "wide":
        return <WideListingCard key={item.id} item={item} />;
      case "research":
        return <ResearchListingCard key={item.id} item={item} />;
      case "competition":
        return (
          <CompetitionListingCard key={item.id} item={item} registeredTeams={counts[item.id] ?? null} />
        );
      case "hackathon":
        return (
          <HackathonListingCard key={item.id} item={item} registeredTeams={counts[item.id] ?? null} />
        );
      case "certification":
        return <CertificationListingCard key={item.id} item={item} />;
      default:
        return <OpportunityCard key={item.id} item={item} />;
    }
  }

  // The three state surfaces, built once and shared by both chrome modes, so a
  // section page can drop the generic toolbar without losing the ability to see
  // or clear what is narrowing its feed.
  const countAndReset = (
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
        ) : countNoun ? (
          showReset && `${visible.length} of ${openTotal} open listings`
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
  );

  const chipStrip =
    activeChips.length > 0 && sidebar !== "filters" ? (
      <div className="flex w-full flex-wrap items-center gap-1.5 pt-1" role="group" aria-label="Active filters">
        {activeChips.map((activeChip) => (
          <button
            key={`${activeChip.key}:${activeChip.value ?? ""}`}
            type="button"
            onClick={() => setFilters(filtersWithoutChip(filters, activeChip))}
            aria-label={`Remove filter ${activeChip.label}`}
            className="inline-flex min-h-[44px] max-w-full items-center gap-1.5 rounded-xl border border-brand-blue/25 bg-brand-blue-soft px-3 text-xs font-bold text-brand-blue transition-colors hover:border-brand-blue/50 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
          >
            <span className="min-w-0 truncate">{activeChip.label}</span>
            <Icon name="close" className="h-3.5 w-3.5 shrink-0" />
          </button>
        ))}
      </div>
    ) : null;

  const notice =
    droppedNotice && restored ? (
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
    ) : null;

  return (
    <div>
      {(countNoun || posting) && (
        <div className="feed-head">
          {countNoun ? (
            <div className="min-w-0">
              <h1 className="feed-count" aria-live="polite">
                {headingCount()}
              </h1>
            </div>
          ) : (
            <span />
          )}
          {posting ? <PostingButton posting={posting} /> : null}
        </div>
      )}

      {(hasQuickRow || keywordRailLabel) && (
        <div className="chip-row">
          {featuredChipLabel && (
            <button
              type="button"
              aria-pressed={filters.featuredOnly}
              title="Listings JAVLIN’s editors have featured"
              onClick={() => setFilters({ ...filters, featuredOnly: !filters.featuredOnly })}
              className={`chip-toggle ${filters.featuredOnly ? "is-on" : ""}`}
            >
              <Icon name="star" className="h-3.5 w-3.5" />
              {featuredChipLabel}
            </button>
          )}
          {streamValues.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filters.stream === value}
              onClick={() => setFilters({ ...filters, stream: filters.stream === value ? "" : value })}
              className={`chip-toggle ${filters.stream === value ? "is-on" : ""}`}
            >
              {value}
            </button>
          ))}
          {keywordRailLabel && (
            <KeywordRail
              label={keywordRailLabel}
              keywords={options.fields}
              selected={filters.fields}
              onToggle={(next) => setFilters({ ...filters, fields: next })}
            />
          )}
        </div>
      )}

      {chips && chips.length > 1 && (
        <div className="-mx-4 mt-4 overflow-x-auto no-scrollbar px-4 sm:mx-0 sm:px-0">
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

      <div className={`feed-layout ${sidebar === "none" ? "grid-cols-1 lg:grid-cols-1" : ""} mt-4`}>
        {sidebar === "location" && (
          <LocationRail
            items={scoped}
            filters={filters}
            onChange={setFilters}
            showRemote={options.remote}
          />
        )}
        {sidebar === "filters" && (
          <aside className="location-rail" aria-label="Selected filters">
            <h4 className="rail-title">Filters</h4>
            {activeChips.length === 0 ? (
              <p className="mt-1 text-xs text-ink-500">
                Nothing selected yet. Chips chosen above appear here, where you can remove them one at a
                time.
              </p>
            ) : (
              <>
                <p className="rail-subtitle mt-2">Selected — remove any one</p>
                <ul className="mt-1 space-y-1.5">
                  {activeChips.map((activeChip) => (
                    <ChipRow
                      key={`${activeChip.key}:${activeChip.value ?? ""}`}
                      chip={activeChip}
                      onRemove={() => setFilters(filtersWithoutChip(filters, activeChip))}
                    />
                  ))}
                </ul>
                <button type="button" onClick={resetFilters} className="rail-more">
                  Clear all
                </button>
              </>
            )}
          </aside>
        )}

        <div className="min-w-0">
          {chrome === "section" ? (
            /* The section pages carry no generic toolbar: the filters that
               survive are the wireframe's own chips and rail, and what is left
               here is the state readout — what is narrowing the feed, how many
               listings that leaves, and the one button that puts them back. */
            (showReset || activeChips.length > 0 || (droppedNotice && restored)) && (
              <div className="feed-dock">
                {chipStrip}
                {countAndReset}
                {notice}
              </div>
            )
          ) : (
            <div className="filter-bar card p-3 sm:p-3.5">
              {searchPlaceholder && (
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
              )}

              <FilterControls
                value={filters}
                onChange={setFilters}
                onReset={resetFilters}
                options={options}
                streamEnabled={streamEnabled}
              />

              {countAndReset}
              {chipStrip}
              {notice}
            </div>
          )}

          <div className="mt-6">
            {loading ? (
              <SkeletonOpportunityGrid count={6} />
            ) : error && owned.length === 0 ? (
              <div className="card border-dashed p-6 text-center bg-white sm:p-10">
                <Icon name="alert-triangle" className="mx-auto h-8 w-8 text-brand-red-ink" />
                <p className="mt-3 text-base font-bold text-ink-900">This feed needs attention</p>
                <p className="mt-1 text-sm text-ink-500">{error}</p>
              </div>
            ) : owned.length === 0 ? (
              <div className="card border-dashed p-6 text-center bg-white sm:p-10">
                <Icon name="flag" className="mx-auto h-8 w-8 text-ink-400" />
                <p className="mt-3 text-base font-bold text-ink-900">{emptyTitle}</p>
                <p className="mt-1 text-sm text-ink-500">{emptyDescription}</p>
              </div>
            ) : visible.length ? (
              <div className={GRID_CLASS[layout]}>{visible.map(renderCard)}</div>
            ) : (
              <div className="card border-dashed p-6 text-center bg-white sm:p-10">
                <Icon name="filter" className="mx-auto h-8 w-8 text-ink-400" />
                <p className="mt-3 text-base font-bold text-ink-900">{noResultsTitle}</p>
                <p className="mt-1 text-sm text-ink-500">{noResultsDescription}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
