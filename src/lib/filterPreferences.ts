import {
  ALL_FILTERS_OFFERED,
  DEFAULT_FILTERS,
  manageableKeys,
  sanitizeFilters,
  validateStoredPayload,
  type FilterOffering,
  type FilterOptions,
  type OpportunityFilters,
  type PersistedFilterKey,
} from "./opportunityFilters";
import { getUserPreferences, saveUserPreferences } from "./dataAccess";

/**
 * Where filter and sort preferences live.
 *
 * Guests keep them in this browser under a versioned key; signed-in students
 * keep them in `public.user_preferences`, one row per owner, readable and
 * writable only by that owner (migration 015). Search text is never part of the
 * stored shape, so it cannot come back later.
 *
 * The row is one payload shared by every section, so a write is scoped: the keys
 * the current section can offer are replaced and every other stored value is
 * carried through untouched. A section with no Course control must not be able
 * to delete a course choice saved from another one. Reset uses the same scope —
 * it clears what this section offers and leaves the rest saved.
 *
 * The module is built around one rule: **an async result is only allowed to
 * affect the identity it was requested for.** Every read and write carries the
 * user id it belongs to, every cache entry is keyed by that id, and every
 * identity change bumps a generation counter that in-flight work is checked
 * against on completion. That is what stops a slow request for student A from
 * being cached as student B's preferences, or a queued write landing after A has
 * signed out.
 *
 * It is deliberately free of React and of `AuthContext` — the auth layer calls
 * in with a user id, so the dependency stays one-way. `createPreferenceStore`
 * is exported so the identity and race behaviour can be exercised against a fake
 * client without a database.
 */

const GUEST_KEY = "javlin.filterPrefs.v1";
const GUEST_VERSION = 1;

export type StoredFilters = Record<string, unknown>;

type GuestEnvelope = { version: number; filters: StoredFilters };

/** What the persistence client reports back for a read. */
export type PreferenceLoadResult = {
  filters: StoredFilters | null;
  /**
   * True when there is no usable account store at all — no backend configured,
   * or `user_preferences` not yet created. Distinct from "available, no row",
   * which must NOT fall back to browser storage.
   */
  unavailable?: boolean;
  error?: string;
};

export type PreferenceSaveResult = { ok: boolean; unavailable?: boolean; error?: string };

export type PreferenceClient = {
  load: (userId: string) => Promise<PreferenceLoadResult>;
  save: (userId: string, filters: StoredFilters) => Promise<PreferenceSaveResult>;
};

export type PreferenceSource = "account" | "guest" | "default";

/**
 * The section on screen, described by what it can offer.
 *
 * The stored payload is shared by every section, so a write needs to know which
 * keys this one is allowed to change. Without it, a section that happens not to
 * show a control would delete the preference behind it.
 */
export type FilterSection = {
  options: FilterOptions;
  streamEnabled: boolean;
  /**
   * The controls this section actually renders. A key it does not offer is
   * neither applied nor written, which is what keeps a page that dropped its
   * pay select from erasing the pay choice saved from another one.
   */
  offering?: FilterOffering;
};

export type LoadedPreferences = {
  filters: OpportunityFilters;
  dropped: boolean;
  source: PreferenceSource;
};

/**
 * Combine the complete stored payload with this section's fresh values.
 *
 * Both sides go through the schema first, so what survives a merge is what the
 * format accepts: a corrupt or hand-edited row is pruned rather than preserved,
 * and an unknown key can never be carried forward.
 */
function mergeManagedPayload(
  base: StoredFilters | null,
  incoming: StoredFilters,
  managed: PersistedFilterKey[]
): StoredFilters {
  const permitted = new Set<string>(managed);
  const merged: StoredFilters = {};
  for (const [key, value] of Object.entries(validateStoredPayload(base))) {
    if (!permitted.has(key)) merged[key] = value;
  }
  for (const key of managed) {
    if (key in incoming) merged[key] = incoming[key];
  }
  return merged;
}

export type PersistResult =
  | { ok: true; scope: "account" | "guest" }
  | { ok: false; reason: "superseded" | "error"; unavailable?: boolean; error?: string };

export type MergeOutcome = "merged" | "no-guest" | "skipped" | "failed" | "unavailable";

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Private mode / disabled storage: preferences simply stay in-memory.
    return null;
  }
}

/** Only the persisted keys, with empty values omitted. */
export function toStoredFilters(filters: OpportunityFilters): StoredFilters {
  const stored: StoredFilters = {};
  if (filters.stream) stored.stream = filters.stream;
  if (filters.modes.length) stored.modes = filters.modes;
  if (filters.fields.length) stored.fields = filters.fields;
  if (filters.courses.length) stored.courses = filters.courses;
  if (filters.locations.length) stored.locations = filters.locations;
  if (filters.compensation) stored.compensation = filters.compensation;
  // Only the "on" position is storable: `false` is the default, and writing it
  // would keep a key alive in a shared payload that another section then has to
  // carry through every write for no reason.
  if (filters.remoteOnly) stored.remoteOnly = true;
  if (filters.featuredOnly) stored.featuredOnly = true;
  if (filters.sort && filters.sort !== DEFAULT_FILTERS.sort) stored.sort = filters.sort;
  return stored;
}

export function readGuestFilters(): StoredFilters | null {
  const store = storage();
  if (!store) return null;
  let raw: string | null = null;
  try {
    raw = store.getItem(GUEST_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    const envelope = parsed as Partial<GuestEnvelope>;
    // A future version is ignored rather than guessed at.
    if (typeof envelope.version === "number" && envelope.version > GUEST_VERSION) return null;
    const filters = envelope.filters;
    if (typeof filters !== "object" || filters === null) return null;
    return filters as StoredFilters;
  } catch {
    // Malformed JSON is dropped, not thrown: a broken blob must never break a page.
    try {
      store.removeItem(GUEST_KEY);
    } catch {
      /* nothing else to do */
    }
    return null;
  }
}

export function writeGuestFilters(filters: StoredFilters): void {
  const store = storage();
  if (!store) return;
  try {
    const envelope: GuestEnvelope = { version: GUEST_VERSION, filters };
    if (Object.keys(filters).length === 0) store.removeItem(GUEST_KEY);
    else store.setItem(GUEST_KEY, JSON.stringify(envelope));
  } catch {
    /* quota or private mode — the in-memory choice still stands for this visit */
  }
}

export function clearGuestFilters(): void {
  try {
    storage()?.removeItem(GUEST_KEY);
  } catch {
    /* nothing to clear */
  }
}

export type PreferenceStore = ReturnType<typeof createPreferenceStore>;

/**
 * The store. `client` is injectable so the identity rules can be tested against
 * a fake with controlled latency and failures.
 */
export function createPreferenceStore(client: PreferenceClient) {
  /** Who the application believes is looking right now. */
  let activeUserId: string | null = null;
  /** Bumped on every identity change. In-flight work is compared against it. */
  let generation = 0;
  /** Per-user account rows. Keyed, never shared between ids. */
  const cache = new Map<string, StoredFilters | null>();
  /** Per-user in-flight reads, so a second caller joins the right request. */
  const inflight = new Map<string, Promise<StoredFilters | null>>();
  /** Ids whose guest copy has already been merged this session (rule 5). */
  const merged = new Set<string>();
  /** Set once a read or write reports "no account store", to stop retry spam. */
  let accountUnavailable = false;
  const listeners = new Set<() => void>();

  function notify(): void {
    for (const listener of listeners) {
      try {
        listener();
      } catch {
        /* one bad listener must not break the others */
      }
    }
  }

  function accountFiltersFor(userId: string): Promise<StoredFilters | null> {
    const cached = cache.get(userId);
    if (cache.has(userId)) return Promise.resolve(cached ?? null);
    const running = inflight.get(userId);
    if (running) return running;

    const startedAt = generation;
    const request: Promise<StoredFilters | null> = client
      .load(userId)
      .then((result) => {
        // The identity moved on while this was in flight. Its answer is not
        // this session's business any more: it is neither cached nor returned,
        // so it can never be handed to a later reader as their own row.
        if (startedAt !== generation) return null;
        if (result.error) {
          if (result.unavailable) accountUnavailable = true;
          // A failed read is not an empty row: do not cache, so a later
          // attempt can still succeed.
          return null;
        }
        cache.set(userId, result.filters);
        return result.filters ?? null;
      })
      .catch(() => null)
      .finally(() => {
        // Only clear the slot this request owns; a newer one for the same
        // user must survive.
        if (inflight.get(userId) === request) inflight.delete(userId);
      });

    inflight.set(userId, request);
    return request;
  }

  return {
    /** The auth layer's single point of truth about who is looking. */
    setActiveUser(userId: string | null): number {
      if (userId === activeUserId) return generation;
      activeUserId = userId;
      generation += 1;
      return generation;
    },

    activeUser(): string | null {
      return activeUserId;
    },

    currentGeneration(): number {
      return generation;
    },

    /**
     * Read the effective preferences for `userId`, validated against the
     * options this section can honour.
     *
     * Returns `null` when the identity changed mid-flight — the caller must
     * discard the result rather than apply it.
     */
    async loadPreferences(
      userId: string | null,
      options: FilterOptions,
      offering: FilterOffering = ALL_FILTERS_OFFERED
    ): Promise<LoadedPreferences | null> {
      const startedAt = generation;
      let stored: StoredFilters | null = null;
      let source: PreferenceSource = "default";

      if (userId) {
        stored = await accountFiltersFor(userId);
        if (startedAt !== generation) return null;
        if (stored) source = "account";
      }

      // Browser storage is used for a signed-in reader only when there is no
      // account store to talk to. Otherwise another person's leftovers on this
      // machine could surface as this student's preferences.
      if (!stored && (!userId || accountUnavailable || !activeUserId)) {
        const guest = readGuestFilters();
        if (guest && Object.keys(guest).length > 0) {
          stored = guest;
          source = "guest";
        }
      }

      if (!stored) return { filters: { ...DEFAULT_FILTERS }, dropped: false, source: "default" };
      return { ...sanitizeFilters(stored, options, offering), source };
    },

    /**
     * Persist for `userId`. The id is re-checked against the active identity at
     * execution time, so a write queued before a sign-out or a switch is
     * dropped instead of landing on the wrong account or in shared storage.
     *
     * Only the keys `section` can offer are written; everything else in the
     * stored payload is carried through untouched, which is what keeps a value
     * saved from another section from being erased by a change made here.
     */
    async persistPreferences(
      userId: string | null,
      filters: OpportunityFilters,
      section: FilterSection
    ): Promise<PersistResult> {
      const incoming = toStoredFilters(filters);
      const managed = manageableKeys(
        section.options,
        section.streamEnabled,
        section.offering ?? ALL_FILTERS_OFFERED
      );

      if (!userId) {
        const merged = mergeManagedPayload(readGuestFilters(), incoming, managed);
        writeGuestFilters(merged);
        return { ok: true, scope: "guest" };
      }
      if (userId !== activeUserId) return { ok: false, reason: "superseded" };

      const startedAt = generation;
      // Scoping a write needs the complete payload. Hydration normally supplies
      // it, but a viewer who changes a control before that read lands must not
      // pay for it with the loss of another section's values, so the payload is
      // fetched first when nothing is known about this owner yet.
      let known: StoredFilters | null = null;
      if (cache.has(userId)) {
        known = cache.get(userId) ?? null;
      } else if (!accountUnavailable) {
        known = await accountFiltersFor(userId);
        if (startedAt !== generation || userId !== activeUserId) {
          return { ok: false, reason: "superseded" };
        }
      }
      const merged = mergeManagedPayload(known, incoming, managed);
      const result = await client.save(userId, merged);
      if (startedAt !== generation || userId !== activeUserId) {
        return { ok: false, reason: "superseded" };
      }
      if (!result.ok) {
        // With no account store, browser storage IS this person's store, so
        // falling back is correct. When the account exists and the write
        // failed, the shared guest key must not receive their data — the
        // in-memory choice stands and the next change retries.
        if (result.unavailable) {
          accountUnavailable = true;
          writeGuestFilters(mergeManagedPayload(readGuestFilters(), incoming, managed));
          return { ok: false, reason: "error", unavailable: true, error: result.error };
        }
        return { ok: false, reason: "error", error: result.error };
      }
      cache.set(userId, merged);
      return { ok: true, scope: "account" };
    },

    /**
     * The agreed sign-in rule: the guest's saved filters win wholesale over the
     * account's, and the guest copy is cleared only once the account write has
     * succeeded. A failure keeps everything and releases the guard so a later
     * auth event can retry.
     */
    async mergeGuestPreferencesIntoAccount(userId: string): Promise<MergeOutcome> {
      if (merged.has(userId)) return "skipped";
      // Claim the id before awaiting: `SIGNED_IN` and `INITIAL_SESSION` can both
      // fire, and a second concurrent merge would be a duplicate write.
      merged.add(userId);

      const guest = validateStoredPayload(readGuestFilters());
      if (Object.keys(guest).length === 0) return "no-guest";
      if (accountUnavailable) {
        merged.delete(userId);
        return "unavailable";
      }

      const result = await client.save(userId, guest);
      if (!result.ok) {
        merged.delete(userId);
        if (result.unavailable) accountUnavailable = true;
        return "failed";
      }
      cache.set(userId, guest);
      clearGuestFilters();
      notify();
      return "merged";
    },

    /**
     * Sign-out / user switch. Bumps the generation so any in-flight read or
     * write is discarded, and drops cached account rows so nothing from the
     * previous identity can be re-served.
     */
    resetSession(): void {
      activeUserId = null;
      generation += 1;
      cache.clear();
      inflight.clear();
      notify();
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** Test/diagnostic view of the internal state. */
    inspect(): { activeUserId: string | null; generation: number; cachedUsers: string[]; mergedUsers: string[] } {
      return {
        activeUserId,
        generation,
        cachedUsers: [...cache.keys()],
        mergedUsers: [...merged],
      };
    },
  };
}

// ----------------------------------------------------------------- the default

const defaultClient: PreferenceClient = {
  async load(userId) {
    const result = await getUserPreferences(userId);
    if (result.status === "ok") return { filters: result.filters };
    return {
      filters: null,
      unavailable: result.status === "unavailable",
      error: result.error,
    };
  },
  async save(userId, filters) {
    const result = await saveUserPreferences(userId, filters);
    if (result.status === "ok") return { ok: true };
    return { ok: false, unavailable: result.status === "unavailable", error: result.error };
  },
};

export const preferences = createPreferenceStore(defaultClient);

// ------------------------------------------------- module-level convenience API

export function loadPreferences(
  userId: string | null,
  options: FilterOptions,
  offering?: FilterOffering
): Promise<LoadedPreferences | null> {
  return preferences.loadPreferences(userId, options, offering);
}

export function persistPreferences(
  userId: string | null,
  filters: OpportunityFilters,
  section: FilterSection
): Promise<PersistResult> {
  return preferences.persistPreferences(userId, filters, section);
}

export function mergeGuestPreferencesIntoAccount(userId: string): Promise<MergeOutcome> {
  return preferences.mergeGuestPreferencesIntoAccount(userId);
}

export function setActivePreferenceUser(userId: string | null): number {
  return preferences.setActiveUser(userId);
}

export function resetPreferenceSession(): void {
  preferences.resetSession();
}

export function subscribePreferences(listener: () => void): () => void {
  return preferences.subscribe(listener);
}
