import { useMemo, useState, type ReactNode } from "react";
import Icon from "../Icon";
import { Link } from "../../lib/router";
import { ConnectionBadge } from "./ConnectControl";
import { resolveTier } from "../../lib/markTier";
import {
  STUDENT_RECORD_CATEGORIES,
  type ConnectionRef,
  type StudentProfileRecord,
  type StudentRecord,
  type StudentRecordCategory,
} from "../../lib/dataAccess";

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

/** Human labels for MARK record categories, in the order the data layer lists them. */
export const RECORD_CATEGORY_LABELS: Record<StudentRecordCategory, string> = {
  internship: "Internship",
  achievement: "Achievement",
  competition: "Competition",
  project: "Project",
  certification: "Certification",
  leadership: "Leadership",
  research: "Research",
  fellowship: "Fellowship",
  scholarship: "Scholarship",
  other: "Other",
};

export const RECORD_CATEGORY_ICONS: Record<StudentRecordCategory, string> = {
  internship: "briefcase",
  achievement: "trophy",
  competition: "target",
  project: "palette",
  certification: "award",
  leadership: "users",
  research: "flask",
  fellowship: "gift",
  scholarship: "wallet",
  other: "bookmark",
};

type StudentAvatarProps = {
  /** profiles.avatar_url — null when the student hasn't chosen a photo. */
  src: string | null;
  name: string;
  /** Size + type classes for the circle, e.g. "h-11 w-11 text-sm". */
  className?: string;
};

/** Photo when there is one, coloured initials otherwise. Never a placeholder service. */
export function StudentAvatar({ src, name, className = "h-11 w-11 text-sm" }: StudentAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (src && src !== failedSrc) {
    return (
      <img
        src={src}
        alt={name ? `${name}'s profile photo` : "Profile photo"}
        onError={() => setFailedSrc(src)}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-blue-soft font-extrabold text-brand-blue ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}

/**
 * The student's real MARK level. `competitions` comes from get_javlin_levels —
 * thresholds are resolved in lib/markTier, never re-derived here.
 */
export function LevelBadge({ competitions, className = "" }: { competitions: number; className?: string }) {
  const tier = resolveTier(competitions);
  if (!tier.tierLabel) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-blue-pale px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand-blue-dark ${className}`}
    >
      <Icon name="trophy" className="h-3 w-3" />
      {tier.tierLabel}
    </span>
  );
}

/** The owner made their profile public. Separate from the level badge on purpose. */
export function VerifiedMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 text-[10px] font-bold text-ink-500 ${className}`}>
      <img
        src="/brand/javlin-favicon.png"
        alt=""
        width={14}
        height={14}
        draggable={false}
        className="h-3.5 w-3.5 rounded-full object-cover"
      />
      Verified
    </span>
  );
}

type StudentCardProps = {
  student: StudentProfileRecord;
  isSelf?: boolean;
  /** The viewer's relationship with this student, when they are signed in. */
  connectionState?: ConnectionRef["state"];
  /** Distinct competitions joined, from one batched getStudentLevels call. */
  competitions?: number;
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

export default function StudentCard({ student, isSelf, connectionState, competitions = 0 }: StudentCardProps) {
  const hasLevel = resolveTier(competitions).tierLabel !== null;

  return (
    <Link
      href={`/circle/${student.userId}`}
      data-cursor="view"
      className="group flex min-w-0 flex-col rounded-2xl border border-surface-border bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
    >
      <div className="flex items-center gap-3">
        <StudentAvatar src={student.avatarUrl} name={student.fullName} className="h-11 w-11 text-sm ring-2 ring-white" />
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

      {(hasLevel || student.isPublic) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <LevelBadge competitions={competitions} />
          {student.isPublic && <VerifiedMark />}
        </div>
      )}

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

type StudentRecordListProps = {
  records: StudentRecord[];
  /** Owner view: RLS also returns private rows there, so label them. */
  showPrivacyFlag?: boolean;
  /** Owner-only affordances (edit / delete) rendered under each row. */
  renderActions?: (record: StudentRecord) => ReactNode;
};

/** Public records of a public profile for visitors; everything for the owner. */
export function StudentRecordList({ records, showPrivacyFlag = false, renderActions }: StudentRecordListProps) {
  const groups = useMemo(() => {
    const byCategory = new Map<StudentRecordCategory, StudentRecord[]>();
    records.forEach((record) => {
      const bucket = byCategory.get(record.category);
      if (bucket) bucket.push(record);
      else byCategory.set(record.category, [record]);
    });
    return STUDENT_RECORD_CATEGORIES.filter((category) => byCategory.has(category)).map((category) => ({
      category,
      items: byCategory.get(category) ?? [],
    }));
  }, [records]);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.category}>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-blue-pale text-brand-blue-dark">
              <Icon name={RECORD_CATEGORY_ICONS[group.category]} className="h-3.5 w-3.5" />
            </span>
            <p className="text-[10px] font-black uppercase tracking-widest text-ink-400">
              {RECORD_CATEGORY_LABELS[group.category]}
            </p>
          </div>
          <ul className="mt-2.5 space-y-3">
            {group.items.map((record) => (
              <li key={record.id} className="rounded-2xl border border-surface-border bg-surface-soft/60 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="min-w-0 break-words text-sm font-bold text-ink-900">{record.title}</h4>
                  {record.year ? <span className="shrink-0 text-[11px] font-bold text-ink-400">{record.year}</span> : null}
                </div>
                {record.organization && (
                  <p className="mt-0.5 text-xs font-semibold text-ink-600">{record.organization}</p>
                )}
                {record.description && (
                  <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-ink-500">{record.description}</p>
                )}
                {(showPrivacyFlag || record.proofUrl) && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-3">
                    {showPrivacyFlag && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          record.isPublic
                            ? "bg-brand-blue-pale text-brand-blue-dark"
                            : "bg-surface-border text-ink-500"
                        }`}
                      >
                        {record.isPublic ? "Public" : "Private"}
                      </span>
                    )}
                    {record.proofUrl && (
                      <a
                        href={record.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-brand-blue hover:text-brand-blue-dark"
                      >
                        Proof
                        <Icon name="external" className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                )}
                {renderActions && <div className="mt-3 flex flex-wrap items-center gap-2">{renderActions(record)}</div>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
