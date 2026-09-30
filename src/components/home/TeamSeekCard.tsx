import type { ReactNode } from "react";
import Icon from "../Icon";
import { Link } from "../../lib/router";

export type TeamSeekItem = {
  teamId: string;
  teamName: string;
  competitionTitle: string;
  memberCount: number;
  maxTeamSize: number | null;
  competitionId?: string;
  createdAt?: string;
  deadline?: string | null;
};

type TeamSeekCardProps = {
  team: TeamSeekItem;
  /** Discovery-only extras: an action slot and a line of context under the meta. */
  action?: ReactNode;
  note?: string;
};

export function openSpotsFor(team: TeamSeekItem): number | null {
  if (team.maxTeamSize === null) return null;
  return Math.max(0, team.maxTeamSize - team.memberCount);
}

export default function TeamSeekCard({ team, action, note }: TeamSeekCardProps) {
  const openSpots = openSpotsFor(team);
  const isFull = openSpots === 0;

  return (
    <div className="glass-card card-rail group relative flex min-w-[78%] snap-start flex-col p-4 hover:-translate-y-0.5 hover:shadow-lift sm:min-w-0 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-md bg-brand-blue-soft px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-brand-blue">
          Team
        </span>
        {isFull ? (
          <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[11px] font-bold text-ink-500">Full</span>
        ) : openSpots !== null ? (
          <span className="rounded-full bg-brand-red-soft px-2 py-0.5 text-[11px] font-bold text-brand-red-ink">
            Needs {openSpots} member{openSpots === 1 ? "" : "s"}
          </span>
        ) : (
          <span className="rounded-full bg-brand-red-soft px-2 py-0.5 text-[11px] font-bold text-brand-red-ink">
            Open
          </span>
        )}
      </div>
      <Link
        href={`/teams/${team.teamId}`}
        data-cursor="view"
        className={`group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue ${
          action ? "" : "after:absolute after:inset-0 after:content-['']"
        }`}
      >
        <h3 className="mt-3 line-clamp-2 text-sm font-extrabold leading-snug text-ink-900 group-hover:text-brand-blue transition-colors">
          {team.teamName}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs font-semibold text-ink-600">{team.competitionTitle}</p>
      </Link>
      <div className="mt-auto flex items-center gap-1.5 pt-4 text-[11px] font-semibold text-ink-500">
        <Icon name="users" className="h-3.5 w-3.5 text-brand-blue" />
        <span>
          {team.maxTeamSize !== null
            ? `${team.memberCount} / ${team.maxTeamSize} members`
            : `${team.memberCount} member${team.memberCount === 1 ? "" : "s"}`}
        </span>
      </div>
      {note && <p className="mt-2 text-[11px] font-semibold leading-relaxed text-ink-500">{note}</p>}
      {action && <div className="mt-3 flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
