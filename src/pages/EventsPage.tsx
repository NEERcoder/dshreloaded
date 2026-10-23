import { useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";
import PageShell from "../components/PageShell";
import { Link } from "../lib/router";
import { SkeletonOpportunityGrid } from "../components/Skeleton";
import { deadlineInstant, formatDeadlineInIst } from "../lib/deadline";
import { sanitizeExternalUrl } from "../lib/urlSafety";
import { ORGANIZER_FORM_URL } from "../lib/organizerCta";
import { getPublishedEvents, type EventRecord, type EventsRead } from "../lib/eventsAccess";

/**
 * /events — the college-event destination.
 *
 * The layout follows its wireframe: the count and the listing CTA on one line,
 * a chip row of the filters that actually work, a city rail on the left, then a
 * three-up grid of poster cards reading organiser, poster, date range, title,
 * venue and price with its ticket action.
 *
 * What it does not do is invent events. There is no events model in the applied
 * schema, so until migration 017 is applied the read reports `unavailable` and
 * the page says exactly that, with the two places that do hold live listings —
 * Competitions and FIELD — one click away.
 */

function dateRange(event: EventRecord): string | null {
  const start = deadlineInstant(event.startsAt, null);
  const end = deadlineInstant(event.endsAt, null);
  if (start === null && end === null) return null;
  const from = start === null ? null : formatDeadlineInIst(start);
  const to = end === null ? null : formatDeadlineInIst(end);
  if (from && to) return `${from} → ${to}`;
  return from ?? to ?? null;
}

/** "Open to all" is only claimed when the organiser's own eligibility says so. */
function isOpenForAll(event: EventRecord): boolean {
  const text = (event.eligibility ?? "").trim();
  if (!text) return false;
  return /\bopen (?:to |for )?all\b|\ball colleges\b|\ball students\b|\bany (?:college|student|discipline)\b/i.test(
    text
  );
}

function EventCard({ event }: { event: EventRecord }) {
  const range = dateRange(event);
  const tickets = sanitizeExternalUrl(event.ticketUrl);
  const place = [event.city, event.venue].filter(Boolean).join(" · ");

  return (
    <article className="card flex h-full flex-col overflow-hidden bg-white p-0">
      <p className="m-0 flex items-center gap-1.5 border-b border-surface-border bg-surface-soft px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-ink-600">
        <Icon name="building" className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 break-words">{event.organizer}</span>
      </p>
      <div className="relative w-full overflow-hidden bg-surface-soft" style={{ aspectRatio: "16 / 9" }}>
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={`${event.title} poster`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="poster-empty flex h-full w-full items-center justify-center px-3 text-center text-[11px] font-extrabold uppercase tracking-[0.16em]">
            {event.category ?? "Event poster"}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-500">
          <Icon name="calendar" className="h-3.5 w-3.5 shrink-0" />
          {range ?? "Dates to be announced"}
        </p>
        <h3 className="card-title text-[17px] leading-snug text-ink-900">{event.title}</h3>
        <p className="flex items-start gap-1.5 text-[12px] font-semibold text-ink-600">
          <Icon name="map-pin" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 break-words">
            {place || event.mode || "Venue not stated"}
          </span>
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="text-[12px] font-extrabold uppercase tracking-wider text-ink-700">
            {event.ticketPrice ?? "Price not stated"}
          </span>
          {tickets ? (
            <a href={tickets} target="_blank" rel="noreferrer" className="btn-primary min-h-[40px] text-[12px]">
              Tickets <Icon name="external" className="h-3.5 w-3.5" />
            </a>
          ) : (
            <span className="chip chip-quiet">No ticket link</span>
          )}
        </div>
      </div>
    </article>
  );
}

export default function EventsPage() {
  const [result, setResult] = useState<EventsRead | null>(null);
  const [search, setSearch] = useState("");
  const [trendingOnly, setTrendingOnly] = useState(false);
  const [openForAllOnly, setOpenForAllOnly] = useState(false);
  const [city, setCity] = useState("");

  useEffect(() => {
    let cancelled = false;
    void getPublishedEvents().then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const events = result?.status === "ok" ? result.events : [];

  const cities = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of events) {
      const value = (event.city ?? "").trim();
      if (!value) continue;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  }, [events]);

  const anyOpenForAll = events.some(isOpenForAll);
  const needle = search.trim().toLowerCase();

  const visible = events.filter((event) => {
    if (trendingOnly && !event.featured) return false;
    if (openForAllOnly && !isOpenForAll(event)) return false;
    if (city && (event.city ?? "") !== city) return false;
    if (needle) {
      const haystack = `${event.title} ${event.organizer} ${event.description} ${event.category ?? ""}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  const loading = result === null;

  return (
    <PageShell
      title="College Events | JAVLIN"
      description="Fests, summits, workshops and cultural nights from colleges across India, with dates, venue and tickets."
      backgroundPreset="opportunities"
    >
      <section className="bg-brand-blue-pale/60 backdrop-blur-[2px] border-b border-surface-border pt-6 pb-6 sm:pt-10 sm:pb-8">
        <div className="container-px max-w-7xl mx-auto">
          <p className="eyebrow">Events</p>
          <div className="feed-head mt-2">
            <div className="min-w-0">
              <h1 className="feed-count" aria-live="polite">
                {loading
                  ? "Loading college events…"
                  : `${visible.length} of ${events.length} college events`}
              </h1>
              <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-ink-600 sm:text-sm">
                Fests, summits and workshops from colleges across India — dates, venue and tickets as the
                host published them.
              </p>
            </div>
            <div className="post-cta">
              <a href={ORGANIZER_FORM_URL} target="_blank" rel="noreferrer" className="post-cta__button">
                List your college event
                <Icon name="external" className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-surface-border pb-3">
            <button
              type="button"
              aria-pressed={trendingOnly}
              onClick={() => setTrendingOnly((value) => !value)}
              className={`chip-toggle ${trendingOnly ? "is-on" : ""}`}
            >
              <Icon name="star" className="h-3.5 w-3.5" />
              Trending
            </button>
            {anyOpenForAll && (
              <button
                type="button"
                aria-pressed={openForAllOnly}
                onClick={() => setOpenForAllOnly((value) => !value)}
                className={`chip-toggle ${openForAllOnly ? "is-on" : ""}`}
              >
                Open for all
              </button>
            )}
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <label className="sr-only" htmlFor="events-search">
                Search events by name
              </label>
              <input
                id="events-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search events by name…"
                className="rail-input pr-8"
              />
              <Icon
                name="search"
                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
              />
            </div>
          </div>

          <div className="feed-layout mt-4">
            <aside className="location-rail" aria-label="Event locations">
              <h4 className="rail-title">Location</h4>
              {cities.length === 0 ? (
                <p className="mt-1 text-xs text-ink-500">
                  No event here names a city yet, so there is nothing to filter by.
                </p>
              ) : (
                <>
                  <p className="rail-subtitle mt-2">Cities in this feed</p>
                  <ul className="mt-1 space-y-1.5">
                    <li>
                      <button
                        type="button"
                        aria-pressed={city === ""}
                        onClick={() => setCity("")}
                        className={`rail-city ${city === "" ? "is-on" : ""}`}
                      >
                        <span>All cities</span>
                        <span className="rail-city__count">{events.length}</span>
                      </button>
                    </li>
                    {cities.map((entry) => (
                      <li key={entry.value}>
                        <button
                          type="button"
                          aria-pressed={city === entry.value}
                          onClick={() => setCity(city === entry.value ? "" : entry.value)}
                          className={`rail-city ${city === entry.value ? "is-on" : ""}`}
                        >
                          <span className="min-w-0 truncate">{entry.value}</span>
                          <span className="rail-city__count">{entry.count}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </aside>

            <div className="min-w-0">
              {loading ? (
                <SkeletonOpportunityGrid count={6} />
              ) : result?.status === "unavailable" ? (
                <div className="card border-dashed p-6 text-center bg-white sm:p-10">
                  <Icon name="calendar" className="mx-auto h-8 w-8 text-ink-400" />
                  <p className="mt-3 text-base font-bold text-ink-900">
                    College events have no listing model yet
                  </p>
                  <p className="mx-auto mt-1 max-w-xl text-sm text-ink-500">
                    An event needs a start and end datetime, a venue and a ticket link, and none of those
                    columns exist on the listings this site publishes today. The page is wired to read them
                    as soon as migration <code>017_college_events.sql</code> is applied — until then nothing
                    is invented here.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <Link href="/opportunities/competitions" className="btn-outline-blue text-[13px]">
                      Open competitions
                    </Link>
                    <Link href="/hackathons" className="btn-outline-blue text-[13px]">
                      Hackathons
                    </Link>
                    <Link href="/field" className="btn-ghost text-[13px]">
                      Campus teams &amp; FIELD
                    </Link>
                  </div>
                  <p className="mt-4 text-[12px] font-semibold text-ink-500">
                    Hosting an event?{" "}
                    <a href={ORGANIZER_FORM_URL} target="_blank" rel="noreferrer" className="text-brand-blue hover:underline">
                      Tell us about it
                    </a>
                    .
                  </p>
                </div>
              ) : result?.status === "error" ? (
                <div className="card border-dashed p-6 text-center bg-white sm:p-10">
                  <Icon name="alert-triangle" className="mx-auto h-8 w-8 text-brand-red-ink" />
                  <p className="mt-3 text-base font-bold text-ink-900">Events could not be loaded</p>
                  <p className="mt-1 text-sm text-ink-500">{result.error}</p>
                </div>
              ) : visible.length === 0 ? (
                <div className="card border-dashed p-6 text-center bg-white sm:p-10">
                  <Icon name="flag" className="mx-auto h-8 w-8 text-ink-400" />
                  <p className="mt-3 text-base font-bold text-ink-900">
                    {events.length === 0 ? "No college events are published yet" : "No event matches those filters"}
                  </p>
                  <p className="mt-1 text-sm text-ink-500">
                    {events.length === 0
                      ? "Published events appear here as soon as a host submits one."
                      : "Clear the search, the city or the chips to see everything open."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visible.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
