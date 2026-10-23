import { supabase, isSupabaseConfigured } from "./supabase";
import { sanitizeExternalUrl } from "./urlSafety";

/**
 * College events.
 *
 * There is no events model in the applied schema: `opportunities.category`
 * accepts seven values and none of them is an event, and nothing else on a live
 * row carries a start-and-end datetime, a venue or a ticket price. Rather than
 * bend a competition into an event — or ship a page full of invented dates —
 * this module reads the table migration 017 proposes, and reports
 * `unavailable` until that migration is applied. The page then says so plainly.
 *
 * The read is wired end to end on purpose: applying 017 turns this into a live
 * feed with no further code change, and until then no control here pretends to
 * work.
 */

export type EventRecord = {
  id: string;
  title: string;
  organizer: string;
  description: string;
  category: string | null;
  venue: string | null;
  city: string | null;
  /** "Online" | "In person" | "Hybrid" — the organiser's own wording. */
  mode: string | null;
  startsAt: string | null;
  endsAt: string | null;
  registrationDeadline: string | null;
  /** Free text, exactly like `opportunities.stipend`: "Free", "₹250", "₹250 / team". */
  ticketPrice: string | null;
  ticketUrl: string | null;
  eligibility: string | null;
  imageUrl: string | null;
  status: "draft" | "published" | "closed" | "archived";
  featured: boolean;
  createdAt: string;
};

export type EventInput = Omit<EventRecord, "id" | "createdAt" | "status"> & {
  status?: EventRecord["status"];
};

export type EventsRead =
  | { status: "ok"; events: EventRecord[] }
  | { status: "unavailable"; error: string }
  | { status: "error"; error: string };

export type EventWrite =
  | { status: "ok"; id: string | null }
  | { status: "unavailable"; error: string }
  | { status: "error"; error: string };

const EVENTS_TABLE = "events";

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

function missingTable(message: string): boolean {
  return /events|relation .* does not exist|does not exist|incomplete|schema cache/i.test(message);
}

/** One probe per tab: a cached "no" expires on the next visit, not never. */
const EVENTS_TABLE_KEY = "javlin.events-table.available";
let tablePresent: boolean | null = null;

function readProbe(): boolean | null {
  try {
    const stored = window.sessionStorage.getItem(EVENTS_TABLE_KEY);
    if (stored === "1") return true;
    if (stored === "0") return false;
  } catch {
    /* private mode: fall through to the in-memory answer */
  }
  return null;
}

function writeProbe(present: boolean): void {
  try {
    window.sessionStorage.setItem(EVENTS_TABLE_KEY, present ? "1" : "0");
  } catch {
    /* the in-memory answer still stands for this page */
  }
}

const EVENT_SELECT =
  "id, title, organizer, description, category, venue, city, mode, starts_at, ends_at, registration_deadline, ticket_price, ticket_url, eligibility, image_url, status, featured, created_at";

function mapEvent(row: Record<string, unknown>): EventRecord {
  const text = (value: unknown): string | null =>
    typeof value === "string" && value.trim() ? value : null;
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    organizer: String(row.organizer ?? ""),
    description: String(row.description ?? ""),
    category: text(row.category),
    venue: text(row.venue),
    city: text(row.city),
    mode: text(row.mode),
    startsAt: text(row.starts_at),
    endsAt: text(row.ends_at),
    registrationDeadline: text(row.registration_deadline),
    ticketPrice: text(row.ticket_price),
    ticketUrl: text(row.ticket_url),
    eligibility: text(row.eligibility),
    imageUrl: text(row.image_url),
    status: (text(row.status) ?? "published") as EventRecord["status"],
    featured: row.featured === true,
    createdAt: String(row.created_at ?? ""),
  };
}

/**
 * Published events, soonest first.
 *
 * Drafts are excluded in the query, not in the client, so an unpublished event
 * never reaches the browser at all — the same rule the published-opportunities
 * read follows.
 */
export async function getPublishedEvents(limit = 120): Promise<EventsRead> {
  if (!supabase || !isSupabaseConfigured) {
    return { status: "unavailable", error: "No backend is configured." };
  }
  const probed = readProbe();
  if (probed === false || tablePresent === false) {
    return { status: "unavailable", error: "The events listing model is not applied on this project." };
  }
  try {
    const result = await supabase
      .from(EVENTS_TABLE)
      .select(EVENT_SELECT)
      .eq("status", "published")
      .order("starts_at", { ascending: true, nullsFirst: false })
      .limit(limit);
    if (result.error) {
      if (missingTable(result.error.message ?? "")) {
        tablePresent = false;
        writeProbe(false);
        return { status: "unavailable", error: describeError(result.error) };
      }
      return { status: "error", error: describeError(result.error) };
    }
    tablePresent = true;
    writeProbe(true);
    return { status: "ok", events: (result.data ?? []).map((row) => mapEvent(row as Record<string, unknown>)) };
  } catch (err) {
    if (missingTable(describeError(err))) {
      tablePresent = false;
      writeProbe(false);
      return { status: "unavailable", error: describeError(err) };
    }
    return { status: "error", error: describeError(err) };
  }
}

/** Every event an admin can see, whatever its status. Admin RLS gates this read. */
export async function getAdminEvents(limit = 200): Promise<EventsRead> {
  if (!supabase || !isSupabaseConfigured) {
    return { status: "unavailable", error: "No backend is configured." };
  }
  try {
    const result = await supabase
      .from(EVENTS_TABLE)
      .select(EVENT_SELECT)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (result.error) {
      if (missingTable(result.error.message ?? "")) {
        return { status: "unavailable", error: describeError(result.error) };
      }
      return { status: "error", error: describeError(result.error) };
    }
    return { status: "ok", events: (result.data ?? []).map((row) => mapEvent(row as Record<string, unknown>)) };
  } catch (err) {
    return { status: "error", error: describeError(err) };
  }
}

function toEventRow(input: EventInput): Record<string, unknown> {
  return {
    title: input.title,
    organizer: input.organizer,
    description: input.description,
    category: input.category,
    venue: input.venue,
    city: input.city,
    mode: input.mode,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    registration_deadline: input.registrationDeadline,
    ticket_price: input.ticketPrice,
    ticket_url: sanitizeExternalUrl(input.ticketUrl) ?? input.ticketUrl,
    eligibility: input.eligibility,
    image_url: input.imageUrl,
    status: input.status ?? "draft",
    featured: input.featured,
  };
}

/** Insert or update one event. `id` present means update. */
export async function saveEvent(input: EventInput, id?: string): Promise<EventWrite> {
  if (!supabase || !isSupabaseConfigured) {
    return { status: "unavailable", error: "No backend is configured." };
  }
  try {
    const row = toEventRow(input);
    const payload = id ? { ...row, id } : row;
    const result = await supabase.from(EVENTS_TABLE).upsert(payload).select("id").maybeSingle();
    if (result.error) {
      if (missingTable(result.error.message ?? "")) {
        return { status: "unavailable", error: describeError(result.error) };
      }
      return { status: "error", error: describeError(result.error) };
    }
    return { status: "ok", id: result.data ? String(result.data.id) : (id ?? null) };
  } catch (err) {
    return { status: "error", error: describeError(err) };
  }
}

export async function setEventStatus(
  id: string,
  status: EventRecord["status"]
): Promise<EventWrite> {
  if (!supabase || !isSupabaseConfigured) {
    return { status: "unavailable", error: "No backend is configured." };
  }
  try {
    const result = await supabase.from(EVENTS_TABLE).update({ status }).eq("id", id).select("id").maybeSingle();
    if (result.error) {
      if (missingTable(result.error.message ?? "")) {
        return { status: "unavailable", error: describeError(result.error) };
      }
      return { status: "error", error: describeError(result.error) };
    }
    return { status: "ok", id: result.data ? String(result.data.id) : id };
  } catch (err) {
    return { status: "error", error: describeError(err) };
  }
}

export async function deleteEvent(id: string): Promise<EventWrite> {
  if (!supabase || !isSupabaseConfigured) {
    return { status: "unavailable", error: "No backend is configured." };
  }
  try {
    const result = await supabase.from(EVENTS_TABLE).delete().eq("id", id);
    if (result.error) {
      if (missingTable(result.error.message ?? "")) {
        return { status: "unavailable", error: describeError(result.error) };
      }
      return { status: "error", error: describeError(result.error) };
    }
    return { status: "ok", id };
  } catch (err) {
    return { status: "error", error: describeError(err) };
  }
}
