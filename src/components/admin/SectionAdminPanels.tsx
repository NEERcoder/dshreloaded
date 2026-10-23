import { useCallback, useEffect, useState } from "react";
import Icon from "../Icon";
import { Link } from "../../lib/router";
import { istWallClockToIso, isoToIstWallClock } from "../../lib/deadline";
import { getStudentDirectory } from "../../lib/dataAccess";
import {
  deleteEvent,
  getAdminEvents,
  saveEvent,
  setEventStatus,
  type EventRecord,
} from "../../lib/eventsAccess";

/**
 * The two destination sections whose data model is not the `opportunities`
 * table — and the honest state of each.
 */

/**
 * The form's own shape: every text box holds a `string`, because an empty input
 * is not `null`. `EventInput` accepts both, so saving needs no conversion — the
 * blank string is written to the column as typed.
 */
type EventForm = {
  title: string;
  organizer: string;
  description: string;
  category: string;
  venue: string;
  city: string;
  mode: string;
  startsAt: string;
  endsAt: string;
  registrationDeadline: string;
  ticketPrice: string;
  ticketUrl: string;
  eligibility: string;
  imageUrl: string;
  featured: boolean;
  status: EventRecord["status"];
};

const blankEvent: EventForm = {
  title: "",
  organizer: "",
  description: "",
  category: "",
  venue: "",
  city: "",
  mode: "",
  startsAt: "",
  endsAt: "",
  registrationDeadline: "",
  ticketPrice: "",
  ticketUrl: "",
  eligibility: "",
  imageUrl: "",
  featured: false,
  status: "draft",
};

function toForm(event: EventRecord): EventForm {
  return {
    title: event.title,
    organizer: event.organizer,
    description: event.description,
    category: event.category ?? "",
    venue: event.venue ?? "",
    city: event.city ?? "",
    mode: event.mode ?? "",
    startsAt: event.startsAt ? isoToIstWallClock(event.startsAt) : "",
    endsAt: event.endsAt ? isoToIstWallClock(event.endsAt) : "",
    registrationDeadline: event.registrationDeadline ?? "",
    ticketPrice: event.ticketPrice ?? "",
    ticketUrl: event.ticketUrl ?? "",
    eligibility: event.eligibility ?? "",
    imageUrl: event.imageUrl ?? "",
    featured: event.featured,
    status: event.status,
  };
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="field-label">
        {label}
        {required ? "" : " (optional)"}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="field-input"
      />
    </div>
  );
}

/**
 * Events manager.
 *
 * The form is complete and wired to `public.events`, which is the table
 * migration 017 proposes. Until that migration is applied every read and write
 * comes back `unavailable`, and this panel says so instead of showing a form
 * whose Save button would fail. Nothing is faked to make the section look
 * populated, and applying 017 turns it on with no code change.
 */
export function EventManager({ onSaved }: { onSaved: (message: string) => void }) {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "unavailable" | "error">("loading");
  const [failure, setFailure] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>(blankEvent);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const result = await getAdminEvents();
    if (result.status === "ok") {
      setEvents(result.events);
      setState("ready");
    } else {
      setFailure(result.error);
      setState(result.status);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    setBusy(true);
    // A `datetime-local` box holds a wall clock, and the wall clock an organiser
    // types is IST — the same conversion every other deadline field on this site
    // uses before it writes a `timestamptz`.
    const result = await saveEvent(
      {
        ...form,
        startsAt: istWallClockToIso(form.startsAt) ?? form.startsAt,
        endsAt: istWallClockToIso(form.endsAt) ?? form.endsAt,
      },
      editingId
    );
    setBusy(false);
    if (result.status !== "ok") {
      onSaved(result.error);
      return;
    }
    onSaved(editingId ? "Event updated." : "Event created.");
    setForm(blankEvent);
    setEditingId(undefined);
    await load();
  }

  async function publish(event: EventRecord) {
    const next = event.status === "published" ? "draft" : "published";
    const result = await setEventStatus(event.id, next);
    onSaved(result.status === "ok" ? `Event moved to ${next}.` : result.error);
    await load();
  }

  async function remove(event: EventRecord) {
    if (!window.confirm(`Delete “${event.title}”? This cannot be undone.`)) return;
    const result = await deleteEvent(event.id);
    onSaved(result.status === "ok" ? "Event deleted." : result.error);
    await load();
  }

  if (state === "loading") {
    return (
      <div className="card p-6 text-center">
        <Icon name="loader" className="mx-auto h-6 w-6 animate-spin text-ink-400" />
        <p className="mt-2 text-sm font-semibold text-ink-500">Loading events…</p>
      </div>
    );
  }

  if (state === "unavailable") {
    return (
      <div className="card border-dashed p-6 sm:p-8">
        <p className="eyebrow">Events</p>
        <h2 className="mt-2 text-2xl font-extrabold text-ink-900">No events table on this project yet</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
          This panel is wired to <code className="font-mono text-[12px]">public.events</code>, the table{" "}
          <code className="font-mono text-[12px]">017_college_events.sql</code> proposes. That migration has
          been written but <strong>not applied</strong>, so nothing can be saved here yet — and no listing has
          been invented to make this screen look finished.
        </p>
        {failure && <p className="mt-2 text-xs text-ink-500">The database said: {failure}</p>}
        <p className="mt-3 text-sm text-ink-600">
          Meanwhile, fests and summits that are entered or applied to are filed as{" "}
          <Link href="/opportunities/competitions" className="font-extrabold text-brand-blue hover:underline">
            competitions
          </Link>
          .
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="card border border-brand-red/20 bg-brand-red-soft p-6">
        <h2 className="text-lg font-extrabold text-brand-red-ink">Events could not be loaded</h2>
        <p className="mt-1 text-sm text-brand-red-ink">{failure}</p>
        <button type="button" onClick={() => void load()} className="btn-outline-blue mt-4 text-sm">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Content management</p>
          <h2 className="mt-2 text-2xl font-extrabold text-ink-900">Events</h2>
          <p className="mt-1 text-sm text-ink-500">
            Drafts stay invisible to students; only a published row reaches /events.
          </p>
        </div>
        <span className="text-sm text-ink-500">{events.length} total</span>
      </div>

      <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="card mt-6 p-5 sm:p-6">
        <h3 className="text-lg font-bold text-ink-900">{editingId ? "Edit event" : "Create event"}</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Title" required value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <Field label="Organizer" required value={form.organizer} onChange={(v) => setForm({ ...form, organizer: v })} />
          <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} placeholder="Delhi" />
          <Field label="Venue" value={form.venue} onChange={(v) => setForm({ ...form, venue: v })} />
          <Field label="Mode" value={form.mode} onChange={(v) => setForm({ ...form, mode: v })} placeholder="Online / In person / Hybrid" />
          <Field label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder="Festival / Summit / Workshop" />
          <Field label="Starts at" type="datetime-local" value={form.startsAt} onChange={(v) => setForm({ ...form, startsAt: v })} />
          <Field label="Ends at" type="datetime-local" value={form.endsAt} onChange={(v) => setForm({ ...form, endsAt: v })} />
          <Field label="Registration deadline" type="date" value={form.registrationDeadline} onChange={(v) => setForm({ ...form, registrationDeadline: v })} />
          <Field label="Ticket price" value={form.ticketPrice} onChange={(v) => setForm({ ...form, ticketPrice: v })} placeholder="Free / ₹250" />
          <Field label="Ticket URL" type="url" value={form.ticketUrl} onChange={(v) => setForm({ ...form, ticketUrl: v })} />
          <Field label="Poster URL" type="url" value={form.imageUrl} onChange={(v) => setForm({ ...form, imageUrl: v })} />
          <div className="sm:col-span-2">
            <Field label="Eligibility" value={form.eligibility} onChange={(v) => setForm({ ...form, eligibility: v })} placeholder="Open to all colleges" />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Description</label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="field-input"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-semibold text-ink-700">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(event) => setForm({ ...form, featured: event.target.checked })}
              className="h-4 w-4 accent-brand-blue"
            />
            Feature on /events
          </label>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-semibold text-ink-700">
            <span className="sr-only">Status</span>
            <select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as EventForm["status"] })}
              className="filter-select text-sm"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="closed">Closed</option>
            </select>
          </label>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className="btn-primary min-h-[44px] text-sm">
            {busy ? "Saving…" : editingId ? "Save changes" : "Create event"}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn-ghost min-h-[44px] text-sm"
              onClick={() => { setEditingId(undefined); setForm(blankEvent); }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {events.length === 0 ? (
        <p className="mt-6 text-sm text-ink-500">No events stored yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {events.map((event) => (
            <li key={event.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-ink-900">{event.title}</p>
                <p className="truncate text-xs font-semibold text-ink-500">
                  {event.organizer} · {event.status}
                  {event.startsAt ? ` · ${event.startsAt.slice(0, 10)}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-outline-blue min-h-[40px] text-xs" onClick={() => void publish(event)}>
                  {event.status === "published" ? "Unpublish" : "Publish"}
                </button>
                <button
                  type="button"
                  className="btn-ghost min-h-[40px] text-xs"
                  onClick={() => { setEditingId(event.id); setForm(toForm(event)); }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn-ghost min-h-[40px] text-xs text-brand-red-ink hover:text-brand-red-ink"
                  onClick={() => void remove(event)}
                >
                  <Icon name="trash" className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Circle management.
 *
 * There is nothing to write here, and that is the honest answer rather than an
 * omission. What the schema actually allows:
 *
 *   * `public.profiles` — readable by any signed-in user (002) and by visitors
 *     when the owner opted in (007), but only ever writable by its owner.
 *   * `public.student_records` — owner-writable; an admin may read every row for
 *     moderation (008) but not change one.
 *   * `public.student_connections` — visible to exactly the two students in it
 *     (005). Not an admin at all.
 *
 * So the directory's content can be inspected with the reads below, and no
 * management form can be offered without either writing another student's row or
 * widening a policy — which this change does not do. Migration 021 proposes the
 * moderation path that fits: a flag beside a profile, never inside it.
 */
export function CircleAdminSection() {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getStudentDirectory().then((result) => {
      if (cancelled) return;
      if (result.error) setError(result.error);
      setCount(result.data.length);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="card p-5 sm:p-6">
      <p className="eyebrow">Community</p>
      <h2 className="mt-2 text-2xl font-extrabold text-ink-900">Circle</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
        {count === null
          ? "Checking the public directory…"
          : error
            ? `The public directory could not be read: ${error}`
            : `${count} student ${count === 1 ? "profile is" : "profiles are"} publicly listed on /circle right now.`}
      </p>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-600">
        Writing is owner-only everywhere in this area: a student edits their own profile, their own MARK
        records and their own connections. An admin may <em>read</em> profiles and records for moderation —
        which is what the count above is — but connection rows are visible only to the two students in them,
        and no admin row can change that.
      </p>
      <ul className="mt-4 space-y-1.5 text-sm text-ink-600">
        <li className="flex items-center gap-2">
          <Icon name="check" className="h-4 w-4 flex-none text-brand-blue" />
          <Link href="/circle" className="font-extrabold text-brand-blue hover:underline">
            Open the public directory
          </Link>
        </li>
        <li className="flex items-center gap-2">
          <Icon name="lock" className="h-4 w-4 flex-none text-ink-400" />
          Connection requests stay private to the two students in them.
        </li>
        <li className="flex items-center gap-2">
          <Icon name="lock" className="h-4 w-4 flex-none text-ink-400" />
          Flagging a profile for review has no table yet — migration{" "}
          <code className="font-mono text-[11px]">021_profile_moderation.sql</code> proposes one, and it is
          not applied.
        </li>
      </ul>
    </div>
  );
}
