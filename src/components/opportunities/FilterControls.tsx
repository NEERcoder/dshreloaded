import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "../Icon";
import {
  COMPENSATION_CHOICES,
  DEFAULT_FILTERS,
  OPPORTUNITY_SORT_LABELS,
  countActiveFilters,
  toggleFacetValue,
  type FilterOptions,
  type OpportunityFilters,
  type OpportunitySortKey,
} from "../../lib/opportunityFilters";

/**
 * The filter controls shared by Internships, Competitions and Certifications.
 *
 * Desktop keeps the existing inline toolbar: multi-select facets open as a
 * popover and only one is ever expanded, while the genuinely single-select
 * controls (stream, pay, sort) stay native selects. Phones get the same
 * controls in a bottom sheet with explicit Apply and Reset, so several
 * selections can be made before the feed changes.
 *
 * Every control is rendered as a direct child of the caller's `.filter-bar`, so
 * the existing `.filter-bar > label` sizing keeps working — no wrapper element.
 */

type MultiFacet = "modes" | "fields" | "courses" | "locations";

const FACETS: { key: MultiFacet; label: string; anyLabel: string }[] = [
  { key: "modes", label: "Work mode", anyLabel: "Any mode" },
  { key: "fields", label: "Field", anyLabel: "Any field" },
  { key: "courses", label: "Eligible course", anyLabel: "Any course" },
  { key: "locations", label: "Location", anyLabel: "Any location" },
];

/** The approved stream vocabulary. Offered only when the column is live. */
const STREAM_OPTIONS = ["Science", "Commerce", "Arts", "Analytics"];

type Props = {
  value: OpportunityFilters;
  onChange: (next: OpportunityFilters) => void;
  onReset: () => void;
  options: FilterOptions;
  /** Stream is only offered once migration 016 is live on this project. */
  streamEnabled: boolean;
};

export default function FilterControls({ value, onChange, onReset, options, streamEnabled }: Props) {
  const [openFacet, setOpenFacet] = useState<MultiFacet | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<OpportunityFilters>(value);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const active = countActiveFilters(value);
  const visibleFacets = FACETS.filter((facet) => options[facet.key].length > 1);
  const showStream = streamEnabled && (options.stream.length > 0 || Boolean(value.stream));

  useEffect(() => {
    if (openFacet === null) return;
    function onPointerDown(event: MouseEvent) {
      // Clicks inside any facet (including its own popover) stay open; anywhere
      // else dismisses, which is also how a second facet replaces the first.
      const target = event.target as HTMLElement | null;
      if (!target?.closest?.("[data-facet-root]")) setOpenFacet(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenFacet(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openFacet]);

  // Opening the sheet copies the live filters into a draft, so Apply is the only
  // moment the feed changes. Scroll lock and focus return live here, keyed on
  // the open flag alone, so nothing steals focus while the user is drafting.
  useEffect(() => {
    if (!sheetOpen) return;
    setDraft(valueRef.current);
    sheetRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSheetOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus();
    };
  }, [sheetOpen]);

  const patch = useCallback(
    (next: Partial<OpportunityFilters>) => onChange({ ...valueRef.current, ...next }),
    [onChange]
  );

  const facetControl = (facet: (typeof FACETS)[number]) => (
    <div key={facet.key} data-facet-root className="relative hidden min-w-0 sm:block">
      <button
        type="button"
        onClick={() => setOpenFacet(openFacet === facet.key ? null : facet.key)}
        aria-expanded={openFacet === facet.key}
        className="filter-select flex min-h-[44px] w-full items-center justify-between gap-2 text-xs"
      >
        <span className="min-w-0 truncate">
          {value[facet.key].length ? `${facet.label}: ${value[facet.key].length}` : facet.anyLabel}
        </span>
        <Icon
          name="chevron-down"
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${openFacet === facet.key ? "rotate-180" : ""}`}
        />
      </button>
      {openFacet === facet.key && (
        <div className="card absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto p-1.5 shadow-lift">
          <fieldset className="space-y-0.5">
            <legend className="sr-only">{facet.label}</legend>
            {options[facet.key].map((option) => (
              <label
                key={option}
                className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-lg px-2 text-xs font-semibold text-ink-700 hover:bg-brand-blue-soft/60"
              >
                <input
                  type="checkbox"
                  checked={value[facet.key].includes(option)}
                  onChange={() => onChange({ ...value, [facet.key]: toggleFacetValue(value[facet.key], option) })}
                  className="h-4 w-4 shrink-0 accent-brand-blue"
                />
                <span className="min-w-0 truncate">{option}</span>
              </label>
            ))}
          </fieldset>
        </div>
      )}
    </div>
  );

  const singleSelects = (target: OpportunityFilters, apply: (next: OpportunityFilters) => void) => (
    <>
      {showStream && (
        <label className="hidden min-w-0 sm:block">
          <span className="sr-only">Stream</span>
          <select
            value={target.stream}
            onChange={(event) => apply({ ...target, stream: event.target.value })}
            className="filter-select text-xs"
          >
            <option value="">Any stream</option>
            {Array.from(new Set([...STREAM_OPTIONS, ...options.stream])).map((stream) => (
              <option key={stream} value={stream}>{stream}</option>
            ))}
          </select>
        </label>
      )}
      <label className="hidden min-w-0 sm:block">
        <span className="sr-only">Compensation</span>
        <select
          value={target.compensation}
          onChange={(event) => apply({ ...target, compensation: event.target.value as OpportunityFilters["compensation"] })}
          className="filter-select text-xs"
        >
          <option value="">Any pay</option>
          {COMPENSATION_CHOICES.map((choice) => (
            <option key={choice.value} value={choice.value}>{choice.selectLabel}</option>
          ))}
        </select>
      </label>
      <label className="hidden min-w-0 sm:block">
        <span className="sr-only">Sort order</span>
        <select
          value={target.sort}
          onChange={(event) => apply({ ...target, sort: event.target.value as OpportunitySortKey })}
          className="filter-select text-xs"
        >
          {(Object.keys(OPPORTUNITY_SORT_LABELS) as OpportunitySortKey[]).map((key) => (
            <option key={key} value={key}>{`Sort: ${OPPORTUNITY_SORT_LABELS[key]}`}</option>
          ))}
        </select>
      </label>
    </>
  );

  return (
    <>
      {visibleFacets.map(facetControl)}
      {singleSelects(value, patch)}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-haspopup="dialog"
        className="filter-select flex min-h-[44px] items-center justify-between gap-2 text-xs sm:hidden"
      >
        <span className="min-w-0 truncate">Filters{active ? ` (${active})` : ""}</span>
        <Icon name="filter" className="h-4 w-4 shrink-0" />
      </button>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:hidden" role="dialog" aria-modal="true" aria-label="Filter listings">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setSheetOpen(false)} />
          <div
            ref={sheetRef}
            tabIndex={-1}
            className="relative z-10 flex max-h-[85vh] w-full flex-col rounded-t-3xl bg-white shadow-lift focus:outline-none"
          >
            <div className="flex items-center justify-between gap-3 px-5 pt-5">
              <h2 className="text-base font-extrabold text-ink-900">Filter listings</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Close filters"
                className="-mr-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-ink-600 hover:bg-surface-soft"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-2 flex-1 space-y-5 overflow-y-auto px-5 pb-6">
              {visibleFacets.map((facet) => (
                <fieldset key={facet.key}>
                  <legend className="text-[11px] font-black uppercase tracking-[0.14em] text-ink-500">{facet.label}</legend>
                  <div className="mt-1 space-y-0.5">
                    {options[facet.key].map((option) => (
                      <label
                        key={option}
                        className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-lg px-1 text-sm font-semibold text-ink-700 hover:bg-brand-blue-soft/60"
                      >
                        <input
                          type="checkbox"
                          checked={draft[facet.key].includes(option)}
                          onChange={() => setDraft({ ...draft, [facet.key]: toggleFacetValue(draft[facet.key], option) })}
                          className="h-4 w-4 shrink-0 accent-brand-blue"
                        />
                        <span className="min-w-0 truncate">{option}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}

              <div className="space-y-3">
                {showStream && (
                  <label className="block">
                    <span className="field-label mt-0">Stream</span>
                    <select
                      value={draft.stream}
                      onChange={(event) => setDraft({ ...draft, stream: event.target.value })}
                      className="filter-select text-sm"
                    >
                      <option value="">Any stream</option>
                      {Array.from(new Set([...STREAM_OPTIONS, ...options.stream])).map((stream) => (
                        <option key={stream} value={stream}>{stream}</option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="block">
                  <span className="field-label mt-0">Compensation</span>
                  <select
                    value={draft.compensation}
                    onChange={(event) => setDraft({ ...draft, compensation: event.target.value as OpportunityFilters["compensation"] })}
                    className="filter-select text-sm"
                  >
                    <option value="">Any pay</option>
                    {COMPENSATION_CHOICES.map((choice) => (
                      <option key={choice.value} value={choice.value}>{choice.selectLabel}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="field-label mt-0">Sort</span>
                  <select
                    value={draft.sort}
                    onChange={(event) => setDraft({ ...draft, sort: event.target.value as OpportunitySortKey })}
                    className="filter-select text-sm"
                  >
                    {(Object.keys(OPPORTUNITY_SORT_LABELS) as OpportunitySortKey[]).map((key) => (
                      <option key={key} value={key}>{OPPORTUNITY_SORT_LABELS[key]}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="flex gap-2 border-t border-surface-border px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setDraft({ ...DEFAULT_FILTERS });
                  onReset();
                }}
                className="btn-secondary min-h-[44px] flex-1 text-sm"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(draft);
                  setSheetOpen(false);
                }}
                className="btn-primary min-h-[44px] flex-1 text-sm"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
