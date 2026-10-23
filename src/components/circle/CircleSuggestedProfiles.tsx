import { useEffect, useRef, useState } from "react";
import Icon from "../Icon";
import { Link } from "../../lib/router";
import ConnectControl from "./ConnectControl";
import { StudentAvatar, yearLabel } from "./StudentCard";
import type { ConnectionRef, StudentProfileRecord } from "../../lib/dataAccess";

/**
 * Suggested profiles — three students at a time, with the connect action on the
 * card itself.
 *
 * "Suggested" here means *who is in the directory*, not a recommendation: there
 * is no ranking signal stored anywhere, so the rail shows the public profiles
 * the page already loaded, minus the viewer, in the order the directory returns
 * them. Nothing is invented to fill a slot, and when fewer than one page of
 * people exists the arrows are disabled rather than looping emptily.
 *
 * The strip advances on its own, but stops for hover, focus, keyboard use and
 * any click, and never moves at all under `prefers-reduced-motion` — a card you
 * are trying to click must not slide out from under the pointer.
 */

const PER_PAGE = 3;
const ADVANCE_MS = 5000;

export default function CircleSuggestedProfiles({
  people,
  connections,
  onChanged,
}: {
  people: StudentProfileRecord[];
  connections: Record<string, ConnectionRef>;
  onChanged: () => void;
}) {
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const interaction = useRef(Date.now());

  const pages = Math.max(1, Math.ceil(people.length / PER_PAGE));
  const current = Math.min(page, pages - 1);
  const slice = people.slice(current * PER_PAGE, current * PER_PAGE + PER_PAGE);

  useEffect(() => {
    if (paused || pages < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      // A fresh interaction buys the reader time; the strip only moves once
      // they have left it alone.
      if (Date.now() - interaction.current < ADVANCE_MS) return;
      setPage((value) => (value + 1) % pages);
    }, ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [paused, pages]);

  function step(direction: number) {
    interaction.current = Date.now();
    setPage((value) => (value + direction + pages) % pages);
  }

  if (people.length === 0) return null;

  return (
    <section
      className="card bg-white p-4 sm:p-5"
      aria-label="Suggested profiles"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="eyebrow">Suggested profiles</p>
          <p className="mt-0.5 text-xs text-ink-500">
            {people.length} public {people.length === 1 ? "profile" : "profiles"} in the directory, three at a
            time.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={pages < 2}
            aria-label="Previous suggested profiles"
            className="kw-rail__arrow"
          >
            <Icon name="chevron-down" className="h-4 w-4 -rotate-90" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={pages < 2}
            aria-label="Next suggested profiles"
            className="kw-rail__arrow"
          >
            <Icon name="chevron-down" className="h-4 w-4 rotate-90" />
          </button>
        </div>
      </div>

      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {slice.map((person) => (
          <li key={person.userId} className="suggested-card">
            <Link
              href={`/circle/${person.userId}`}
              className="flex min-w-0 flex-1 items-start gap-2.5"
              aria-label={`Open ${person.fullName}'s profile`}
            >
              <StudentAvatar src={person.avatarUrl} name={person.fullName} className="h-10 w-10 text-xs" />
              <span className="min-w-0">
                <span className="card-title block truncate text-[13px] text-ink-900">{person.fullName}</span>
                <span className="block truncate text-[11px] font-semibold text-ink-500">
                  {person.course}
                  {person.yearOfStudy ? ` · ${yearLabel(person.yearOfStudy)}` : ""}
                </span>
                {person.headline?.trim() && (
                  <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-ink-600">
                    {person.headline}
                  </span>
                )}
              </span>
            </Link>
            <ConnectControl
              peerUserId={person.userId}
              connection={connections[person.userId] ?? null}
              onChanged={onChanged}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
