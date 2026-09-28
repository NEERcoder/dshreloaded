import Icon from "../Icon";
import { Link } from "../../lib/router";
import { ConnectionBadge } from "./ConnectControl";
import type { ConnectionRef, StudentProfileRecord } from "../../lib/dataAccess";

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  if (parts.length === 0 || !parts[0]) return "J";
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

const YEAR_LABELS: Record<number, string> = {
  1: "1st year",
  2: "2nd year",
  3: "3rd year",
  4: "4th year",
  5: "5th year",
};

export function yearLabel(year: number): string {
  return YEAR_LABELS[year] ?? (year ? `Year ${year}` : "");
}

type StudentCardProps = {
  student: StudentProfileRecord;
  isSelf?: boolean;
  /** The viewer's relationship with this student, when they are signed in. */
  connectionState?: ConnectionRef["state"];
};

export function StudentCardSkeleton() {
  return (
    <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-card">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-surface-soft" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-2/3 animate-pulse rounded bg-surface-soft" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-surface-soft" />
        </div>
      </div>
      <div className="mt-4 h-3 w-3/4 animate-pulse rounded bg-surface-soft" />
      <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-surface-soft" />
    </div>
  );
}

export default function StudentCard({ student, isSelf, connectionState }: StudentCardProps) {
  return (
    <Link
      href={`/circle/${student.userId}`}
      data-cursor="view"
      className="group flex min-w-0 flex-col rounded-2xl border border-surface-border bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-blue-soft text-sm font-extrabold text-brand-blue">
          {initialsOf(student.fullName)}
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-extrabold leading-snug text-ink-900 group-hover:text-brand-blue transition-colors">
            {student.fullName}
          </h3>
          <p className="mt-0.5 truncate text-xs font-semibold text-ink-500">
            {student.course}
            {student.yearOfStudy ? ` · ${yearLabel(student.yearOfStudy)}` : ""}
          </p>
        </div>
        {isSelf && (
          <span className="ml-auto shrink-0 rounded-full bg-brand-red-soft px-2 py-0.5 text-[10px] font-bold text-brand-red-dark">
            You
          </span>
        )}
        {!isSelf && connectionState && <ConnectionBadge state={connectionState} />}
      </div>

      <p className="mt-4 line-clamp-2 text-xs font-semibold text-ink-600">
        {student.collegeName || "College not listed yet"}
      </p>

      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        {student.graduationYear ? (
          <span className="text-[11px] font-semibold text-ink-400">Graduates {student.graduationYear}</span>
        ) : (
          <span />
        )}
        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-brand-blue">
          View Profile
          <Icon name="arrow" className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
