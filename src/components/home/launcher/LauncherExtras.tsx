import { useEffect, useState, type ReactNode } from "react";
import Icon from "../../Icon";
import { Link } from "../../../lib/router";
import { StudentAvatar } from "../../circle/StudentCard";
import {
  getPublicTeamNames,
  getPulsePosts,
  getStudentDirectory,
  type PublicTeamName,
  type PulsePostRecord,
  type StudentProfileRecord,
} from "../../../lib/dataAccess";

/**
 * The live strips that fill the spare middle space of a launcher tile.
 *
 * Each one reads a real public source — team names (public by policy 002), the
 * CIRCLE directory projection, or published PULSE rows — and renders nothing at
 * all when that source is empty or unreachable. Nothing here invents a team, a
 * person or a headline; an unconfigured backend simply leaves the space blank.
 *
 * The strip scrolls continuously and is decorative in pace only: the same text
 * is present without motion under `prefers-reduced-motion`.
 */
function FlashStrip({
  label,
  items,
  duration = 6,
}: {
  label: string;
  items: ReactNode[];
  duration?: number;
}) {
  if (items.length === 0) return null;
  // Duplicated once so translating by -50% loops seamlessly.
  const loop = [...items, ...items];
  return (
    <div className="cat-flash">
      <span className="cat-flash__head">
        {label}
        <span aria-hidden="true" className="cat-flash__dot" />
      </span>
      <div className="cat-flash__window">
        <ul className="cat-flash__track" style={{ animationDuration: `${duration}s` }}>
          {loop.map((item, index) => (
            <li key={index} className="cat-flash__row">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function CrewFlash() {
  const [teams, setTeams] = useState<PublicTeamName[]>([]);
  useEffect(() => {
    let cancelled = false;
    getPublicTeamNames(10).then((result) => {
      if (!cancelled) setTeams(result.data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <FlashStrip
      label="Teams"
      duration={5}
      items={teams.map((team) => (
        <span key={team.id} className="cat-flash__text">
          {team.name}
        </span>
      ))}
    />
  );
}

export function CircleFlash() {
  const [people, setPeople] = useState<StudentProfileRecord[]>([]);
  useEffect(() => {
    let cancelled = false;
    getStudentDirectory(24).then((result) => {
      if (!cancelled) setPeople((result.data ?? []).slice(0, 10));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <FlashStrip
      label="People"
      duration={6}
      items={people.map((person) => (
        <span key={person.userId} className="cat-flash__person">
          <StudentAvatar src={person.avatarUrl} name={person.fullName} className="h-3.5 w-3.5 text-[7px]" />
          <span className="cat-flash__text">{person.fullName}</span>
        </span>
      ))}
    />
  );
}

export function PulseFlash() {
  const [posts, setPosts] = useState<PulsePostRecord[]>([]);
  useEffect(() => {
    let cancelled = false;
    getPulsePosts(6).then((result) => {
      if (!cancelled) setPosts(result.data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <FlashStrip
      label="News"
      duration={6}
      items={posts.map((post) => (
        <span key={post.id} className="cat-flash__text">
          {post.title}
        </span>
      ))}
    />
  );
}

/** MARK's spare space: a real shortcut into the existing record form. */
export function MarkAddLink() {
  return (
    <Link href="/mark?add=record" className="cat-add" aria-label="Add an achievement on MARK">
      <span aria-hidden="true" className="cat-add__plus">
        <Icon name="plus" className="h-3 w-3" />
      </span>
      <span className="cat-add__label">Add achievement</span>
    </Link>
  );
}
