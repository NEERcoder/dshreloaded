import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  DEFAULT_FILTERS,
  type FilterOffering,
  type FilterOptions,
  type OpportunityFilters,
} from "../lib/opportunityFilters";
import {
  loadPreferences,
  persistPreferences,
  subscribePreferences,
  type FilterSection,
} from "../lib/filterPreferences";

const WRITE_DEBOUNCE_MS = 500;

export type OpportunityFilterState = {
  filters: OpportunityFilters;
  /** Apply a change and persist it for whoever is looking. */
  setFilters: (next: OpportunityFilters) => void;
  /** Back to the documented defaults for this section, persisted the same way. */
  resetFilters: () => void;
  /** True once stored preferences have been read and validated for this feed. */
  restored: boolean;
  /** A saved choice was not available here, so it was left out of this feed. */
  droppedNotice: boolean;
  dismissDroppedNotice: () => void;
};

/**
 * Filter state for one opportunity feed, hydrated from the viewer's stored
 * preferences and written back whenever they change.
 *
 * Restoration waits for `optionsReady` because a stored value is only honoured
 * if the current section can actually offer it; validating against an option
 * set that has not loaded yet would throw every saved choice away.
 *
 * `streamEnabled` completes that picture for the write side: it says which
 * controls this section owns, so a change here can never store away a value the
 * viewer saved from a different section.
 *
 * `offering` says the same thing for the sections that render only part of the
 * toolbar — a page that shows no pay select neither applies a saved pay choice
 * nor writes over it. Pass a module-level constant: a fresh object each render
 * would re-run the hydration.
 */
export function useOpportunityFilters(
  options: FilterOptions,
  optionsReady: boolean,
  streamEnabled = false,
  offering?: FilterOffering
): OpportunityFilterState {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [filters, setFiltersState] = useState<OpportunityFilters>(DEFAULT_FILTERS);
  const [restored, setRestored] = useState(false);
  const [droppedNotice, setDroppedNotice] = useState(false);
  const [revision, setRevision] = useState(0);

  const optionsRef = useRef(options);
  optionsRef.current = options;
  /** The controls this section owns, read at write time rather than capture time. */
  const sectionRef = useRef<FilterSection>({ options, streamEnabled, offering });
  sectionRef.current = { options: optionsRef.current, streamEnabled, offering };
  const writeTimer = useRef<number | undefined>(undefined);
  const lastWritten = useRef<string>("");
  /** Bumped by every viewer-initiated change; the stale-read guard reads it. */
  const interactionRef = useRef(0);

  // A merge or a sign-out re-runs the hydration below, so the feed always
  // reflects the preferences that now belong to this viewer.
  useEffect(() => subscribePreferences(() => setRevision((value) => value + 1)), []);

  // Declared before the hydration effect so it runs first on an identity change:
  // a write queued for the previous viewer is dropped, and the "already saved"
  // marker is forgotten so the new viewer's value can persist.
  useEffect(() => {
    window.clearTimeout(writeTimer.current);
    writeTimer.current = undefined;
    lastWritten.current = "";
  }, [userId]);

  useEffect(() => {
    if (!optionsReady) return;
    let cancelled = false;
    const interactionsAtStart = interactionRef.current;
    setRestored(false);
    loadPreferences(userId, optionsRef.current, offering).then((loaded) => {
      // `null` means the store saw the identity change mid-flight; a moved
      // interaction counter means the viewer already chose. Both make this
      // result stale — applying it would revert a newer decision.
      if (cancelled || !loaded) return;
      if (interactionRef.current !== interactionsAtStart) return;
      setFiltersState(loaded.filters);
      lastWritten.current = JSON.stringify(loaded.filters);
      setDroppedNotice(loaded.dropped);
      setRestored(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, optionsReady, revision, offering]);

  async function flushWrite(owner: string | null, next: OpportunityFilters) {
    const result = await persistPreferences(owner, next, sectionRef.current);
    if (!result.ok && result.reason === "superseded") {
      // This viewer is gone. Forget the bookkeeping so whoever is here now can
      // persist their own value instead of being told it is already saved.
      lastWritten.current = "";
    }
  }

  const persistLater = useCallback(
    (next: OpportunityFilters) => {
      const serialized = JSON.stringify(next);
      if (serialized === lastWritten.current) return;
      lastWritten.current = serialized;
      const owner = userId;
      window.clearTimeout(writeTimer.current);
      writeTimer.current = window.setTimeout(() => {
        void flushWrite(owner, next);
      }, WRITE_DEBOUNCE_MS);
    },
    [userId]
  );

  useEffect(() => () => window.clearTimeout(writeTimer.current), []);

  const setFilters = useCallback(
    (next: OpportunityFilters) => {
      interactionRef.current += 1;
      setFiltersState(next);
      setDroppedNotice(false);
      persistLater(next);
    },
    [persistLater]
  );

  const resetFilters = useCallback(() => {
    interactionRef.current += 1;
    setFiltersState(DEFAULT_FILTERS);
    setDroppedNotice(false);
    persistLater(DEFAULT_FILTERS);
  }, [persistLater]);

  const dismissDroppedNotice = useCallback(() => setDroppedNotice(false), []);

  return { filters, setFilters, resetFilters, restored, droppedNotice, dismissDroppedNotice };
}
