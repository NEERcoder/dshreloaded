import { useRef } from "react";
import Icon from "../Icon";
import { Link } from "../../lib/router";
import ConnectControl from "./ConnectControl";
import { StudentAvatar, yearLabel } from "./StudentCard";
import type { ConnectionRef, StudentProfileRecord } from "../../lib/dataAccess";

/**
 * Who else is out there — a sideways rail in CIRCLE's right column.
 *
 * "Suggested" means *who is in the directory*, not a recommendation: nothing in
 * the schema ranks people, so the rail shows the public profiles the page
 * already loaded, minus the viewer, in the order the directory returned them.
 * Inventing a score to order them by would be the one thing here that could
 * actually mislead somebody.
 *
 * Each card is a stretched link — the anchor covers the card and only the
 * Connect button is raised above it — because a `<Link>` cannot contain a
 * `<button>` and still be valid HTML, which is why this is not simply
 * `StudentCard` again.
 *
 * Signed-out readers get the same rail with no Connect control: connecting needs
 * an account, and a dead button would be a promise the page cannot keep.
 */

export default function CircleSuggestedProfiles({
  people,
  connections,
  onChanged,
  canConnect = false,
}: {
  people: StudentProfileRecord[];
  connections: Record<string, ConnectionRef>;
  onChanged: () => void;
  canConnect?: boolean;
}) {
  const stripRef = useRef<HTMLUListElement>(null);

  if (people.length === 0) return null;

  function step(direction: number) {
    const strip = stripRef.current;
    if (!strip) return;
    const card = strip.querySelector<HTMLElement>("[data-suggest-card]");
    // One card at a time, whatever the current width makes that.
    const amount = card ? card.offsetWidth + 12 : strip.clientWidth * 0.8;
    strip.scrollBy({ left: amount * direction, behavior: "smooth" });
  }

  return (
    <section className="circle-rail card bg-white p-4 sm:p-5" aria-label="Other students">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="eyebrow">People in CIRCLE</p>
          <p className="mt-0.5 text-[11px] text-ink-500">
            {people.length} public {people.length === 1 ? "profile" : "profiles"}, in directory order.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Scroll to earlier profiles"
            className="kw-rail__arrow"
          >
            <Icon name="chevron-down" className="h-4 w-4 -rotate-90" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Scroll to later profiles"
            className="kw-rail__arrow"
          >
            <Icon name="chevron-down" className="h-4 w-4 rotate-90" />
          </button>
        </div>
      </div>

      <ul
        ref={stripRef}
        className="circle-rail__strip h-scroll no-scrollbar mt-3 flex gap-3 pb-1"
      >
        {people.map((person) => (
          <li key={person.userId} data-suggest-card className="circle-suggest">
            <Link href={`/circle/${person.userId}`} className="circle-suggest__link">
              <span className="sr-only">Open {person.fullName}'s profile</span>
            </Link>
            <div className="flex items-start justify-between gap-2">
              <StudentAvatar src={person.avatarUrl} name={person.fullName} className="h-10 w-10 text-xs" />
              {canConnect && (
                <div className="relative z-[1] flex-none">
                  <ConnectControl
                    variant="compact"
                    peerUserId={person.userId}
                    connection={connections[person.userId] ?? null}
                    onChanged={onChanged}
                  />
                </div>
              )}
            </div>
            <p className="card-title mt-2 line-clamp-1 text-[13px] text-ink-900">{person.fullName}</p>
            <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-ink-500">
              {person.course}
              {person.yearOfStudy ? ` · ${yearLabel(person.yearOfStudy)}` : ""}
            </p>
            {person.collegeName && (
              <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-500">{person.collegeName}</p>
            )}
            {person.headline?.trim() && (
              <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-ink-600">{person.headline}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
