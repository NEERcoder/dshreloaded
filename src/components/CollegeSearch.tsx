import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import Icon from "./Icon";
import { searchColleges, type CollegeSearchResult } from "../lib/dataAccess";
import { buildCollegeSearchIndex, searchColleges as scoreLocalColleges } from "../lib/collegeSearch";
import type { CollegeRecord } from "../lib/localProvider";
import { useLocation } from "../lib/router";

const DEBOUNCE_MS = 200;
const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 8;

/** `location` is the precise address; `campus` is the only honest fallback. */
function placeOf(result: CollegeSearchResult): string {
  return result.location.trim() || result.campus.trim();
}

type CollegeSearchProps = {
  className?: string;
  /**
   * Controlled "select" mode. When `colleges` + `onChange` are supplied the
   * component becomes a searchable field that reports the chosen college's id
   * instead of navigating to its profile. It scores the passed list with the
   * same `collegeSearch` engine the directory uses — no second dataset, no
   * second selector implementation. Without these props it stays the navbar
   * type-ahead it always was.
   */
  colleges?: CollegeRecord[];
  value?: string;
  onChange?: (collegeId: string, college: CollegeRecord | null) => void;
  label?: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
};

/**
 * JAVLIN's college type-ahead, in two modes:
 *
 *   * navigate (default) — the navbar / explore / reviews search. Selections
 *     land on a real college profile route (/explore/:slug).
 *   * select (controlled) — the signup / dashboard profile forms. Selections
 *     report the college id so the caller can persist `college_id`.
 *
 * Both modes share one scoring engine and one result list; the data source is
 * the same college directory the rest of the app already loads.
 */
export default function CollegeSearch({
  className = "",
  colleges,
  value,
  onChange,
  label,
  placeholder = "Search your college...",
  id,
  disabled = false,
}: CollegeSearchProps) {
  const { navigate } = useLocation();
  const baseId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const inputId = id ?? `${baseId}-college-input`;
  const listboxId = `${baseId}-college-results`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const isSelectMode = Boolean(colleges && onChange);

  const containerRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<CollegeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [editing, setEditing] = useState(false);

  const selectedIndex = isSelectMode
    ? colleges?.find((college) => college.id === value) ?? null
    : null;

  const localIndex = useMemo(
    () => buildCollegeSearchIndex(colleges ?? []),
    [colleges]
  );

  const isTyping = term.trim().length >= MIN_QUERY_LENGTH;
  const showPanel = open && isTyping && !(isSelectMode && !editing);

  // One debounced contains search per burst of keystrokes, never per keypress.
  useEffect(() => {
    const trimmed = term.trim();
    if (isSelectMode) {
      // Select mode scores the already-loaded list locally; only while typing.
      if (!editing || trimmed.length < MIN_QUERY_LENGTH) {
        setResults([]);
        setActiveIndex(-1);
        setLoading(false);
        return;
      }
      setResults(scoreLocalColleges(localIndex, trimmed, MAX_RESULTS).map((m) => m.college));
      setActiveIndex(-1);
      setLoading(false);
      return;
    }
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setActiveIndex(-1);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setResults([]);
    setActiveIndex(-1);
    setLoading(true);
    const timer = window.setTimeout(() => {
      searchColleges(trimmed, MAX_RESULTS)
        .then((result) => {
          if (cancelled) return;
          setResults(result.data.slice(0, MAX_RESULTS));
        })
        .catch(() => {
          // The helper already degrades to the local seed list; if even that
          // fails the honest answer is "nothing matched", never a stuck spinner.
          if (cancelled) return;
          setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [term, isSelectMode, editing, localIndex]);

  // Dismiss when the pointer goes anywhere outside the combobox.
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      const container = containerRef.current;
      if (container && !container.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  function choose(result: CollegeSearchResult) {
    setOpen(false);
    setActiveIndex(-1);
    setResults([]);
    setLoading(false);
    setTerm("");
    navigate(`/explore/${result.slug}`);
  }

  function selectCollege(college: CollegeRecord) {
    onChange?.(college.id, college);
    setOpen(false);
    setActiveIndex(-1);
    setResults([]);
    setLoading(false);
    setTerm("");
    setEditing(false);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isTyping) return;
      setOpen(true);
      if (!results.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => {
        if (current === -1) return step === 1 ? 0 : results.length - 1;
        return (current + step + results.length) % results.length;
      });
      return;
    }
    if (event.key === "Enter") {
      if (!showPanel || loading) return;
      const chosen =
        activeIndex >= 0 && activeIndex < results.length ? results[activeIndex] : results[0];
      if (chosen) {
        event.preventDefault();
        if (isSelectMode) {
          const match = colleges?.find((college) => college.id === chosen.id);
          if (match) selectCollege(match);
        } else {
          choose(chosen);
        }
      }
      return;
    }
    if (event.key === "Tab") setOpen(false);
  }

  function handleFocusOut(event: FocusEvent<HTMLDivElement>) {
    // An option click must still register; the real blur leaves the container.
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const statusText = loading
    ? "Searching colleges"
    : results.length === 0
      ? "No colleges match that search"
      : `${results.length} ${results.length === 1 ? "college" : "colleges"} found`;

  // Select mode renders a labelled, full-width field; navigate mode keeps its
  // compact navbar pill untouched.
  if (isSelectMode) {
    const showClear = Boolean(selectedIndex) && !editing;
    return (
      <div ref={containerRef} className={`relative min-w-0 ${className}`} onBlur={handleFocusOut}>
        {label && (
          <label className="field-label" htmlFor={inputId}>
            {label}
          </label>
        )}
        <div className="relative flex w-full items-center">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
          />
          <input
            id={inputId}
            type="text"
            role="combobox"
            aria-label={label ?? "Search colleges"}
            aria-haspopup="listbox"
            aria-expanded={showPanel}
            aria-controls={showPanel ? listboxId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={showPanel && activeIndex >= 0 ? optionId(activeIndex) : undefined}
            autoComplete="off"
            spellCheck={false}
            disabled={disabled}
            enterKeyHint="search"
            placeholder={selectedIndex ? selectedIndex.name : placeholder}
            value={editing ? term : ""}
            onChange={(event) => {
              const next = event.target.value;
              setEditing(true);
              setTerm(next);
              setActiveIndex(-1);
              setOpen(next.trim().length >= MIN_QUERY_LENGTH);
            }}
            onFocus={() => setOpen(isTyping && editing)}
            onKeyDown={handleKeyDown}
            className="field-input w-full pl-9 pr-9 disabled:opacity-60 disabled:cursor-not-allowed"
          />
          {showClear ? (
            <button
              type="button"
              aria-label="Clear selected college"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange?.("", null);
                setTerm("");
                setEditing(false);
                setResults([]);
                setActiveIndex(-1);
                setOpen(false);
              }}
              className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-400 transition-colors hover:text-ink-700"
            >
              <Icon name="close" className="h-3.5 w-3.5" />
            </button>
          ) : (
            editing &&
            term && (
              <button
                type="button"
                aria-label="Clear college search"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setTerm("");
                  setResults([]);
                  setActiveIndex(-1);
                  setOpen(false);
                }}
                className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-400 transition-colors hover:text-ink-700"
              >
                <Icon name="close" className="h-3.5 w-3.5" />
              </button>
            )
          )}
        </div>

        <p className="sr-only" role="status" aria-live="polite">
          {showPanel ? statusText : ""}
        </p>

        {showPanel && (
          <div
            id={listboxId}
            role="listbox"
            aria-label="Colleges matching your search"
            className="card absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden shadow-lift"
          >
            {results.length ? (
              <ul role="presentation" className="max-h-72 overflow-y-auto py-1">
                {results.map((result, index) => {
                  const isActive = index === activeIndex;
                  const place = placeOf(result);
                  return (
                    <li
                      key={`${result.slug}-${index}`}
                      id={optionId(index)}
                      role="option"
                      aria-selected={isActive}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => {
                        const match = colleges?.find((college) => college.id === result.id);
                        if (match) selectCollege(match);
                      }}
                      className={`mx-1 flex min-w-0 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors ${
                        isActive ? "bg-brand-blue-soft" : "hover:bg-brand-blue-pale"
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-blue-pale text-xs font-black text-brand-blue">
                        {result.name.charAt(0)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-bold text-ink-900">
                          {result.name}
                        </span>
                        {place && (
                          <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] font-medium text-ink-500">
                            <Icon name="map-pin" className="h-3 w-3 shrink-0" />
                            <span className="truncate">{place}</span>
                          </span>
                        )}
                      </span>
                      <Icon
                        name="arrow"
                        className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-brand-blue" : "text-ink-400"}`}
                      />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-4 py-4 text-[13px] font-semibold text-ink-500">
                No colleges match that search.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative min-w-0 max-w-[168px] flex-1 sm:max-w-[240px] lg:max-w-[300px] ${className}`}
      onBlur={handleFocusOut}
    >
      <div className="relative flex w-full items-center">
        <Icon
          name="search"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
        />
        <input
          type="text"
          enterKeyHint="search"
          role="combobox"
          aria-label="Search colleges"
          aria-haspopup="listbox"
          aria-expanded={showPanel}
          aria-controls={showPanel ? listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={showPanel && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="Search your college..."
          value={term}
          onChange={(event) => {
            const next = event.target.value;
            setTerm(next);
            setActiveIndex(-1);
            setOpen(next.trim().length >= MIN_QUERY_LENGTH);
          }}
          onFocus={() => setOpen(isTyping)}
          onKeyDown={handleKeyDown}
          className="h-11 w-full min-w-0 rounded-full border border-surface-border bg-white/85 py-2 pl-9 pr-9 text-[13px] font-medium text-ink-900 placeholder:text-ink-500 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/25"
        />
        {loading ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-brand-blue">
            <Icon name="loader" className="h-4 w-4 animate-spin" />
          </span>
        ) : (
          term && (
            <button
              type="button"
              aria-label="Clear college search"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setTerm("");
                setResults([]);
                setActiveIndex(-1);
                setLoading(false);
                setOpen(false);
              }}
              className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-400 transition-colors hover:text-ink-700"
            >
              <Icon name="close" className="h-3.5 w-3.5" />
            </button>
          )
        )}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {showPanel ? statusText : ""}
      </p>

      {showPanel && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Colleges matching your search"
          className="card absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden shadow-lift"
        >
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-3.5 text-[13px] font-semibold text-ink-500">
              <Icon name="loader" className="h-4 w-4 shrink-0 animate-spin text-brand-blue" />
              Searching colleges…
            </div>
          ) : results.length ? (
            <ul role="presentation" className="max-h-72 overflow-y-auto py-1">
              {results.map((result, index) => {
                const isActive = index === activeIndex;
                const place = placeOf(result);
                return (
                  <li
                    key={`${result.slug}-${index}`}
                    id={optionId(index)}
                    role="option"
                    aria-selected={isActive}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(result)}
                    className={`mx-1 flex min-w-0 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors ${
                      isActive ? "bg-brand-blue-soft" : "hover:bg-brand-blue-pale"
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-blue-pale text-xs font-black text-brand-blue">
                      {result.name.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-ink-900">
                        {result.name}
                      </span>
                      {place && (
                        <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] font-medium text-ink-500">
                          <Icon name="map-pin" className="h-3 w-3 shrink-0" />
                          <span className="truncate">{place}</span>
                        </span>
                      )}
                    </span>
                    <Icon
                      name="arrow"
                      className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-brand-blue" : "text-ink-400"}`}
                    />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-4 text-[13px] font-semibold text-ink-500">
              No colleges match that search.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
