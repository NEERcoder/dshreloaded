import type { ReactNode } from "react";
import Icon from "../Icon";
import { Link } from "../../lib/router";
import { StudentAvatar, RECORD_CATEGORY_LABELS } from "./StudentCard";
import { resolveTier } from "../../lib/markTier";
import { profileCompletion } from "../../lib/profileCompletion";
import type { ProfileRecord, StudentRecordCategory } from "../../lib/dataAccess";

/**
 * The signed-in reader's own presence at the top of CIRCLE.
 *
 * Two cards, stacked in one column: the profile card (photo, name, college,
 * headline, the completion rule from `lib/profileCompletion` and the three
 * numbers that say where the student stands) and the MARK column beneath it,
 * counting the records and competitions the student actually has.
 *
 * The three numbers are deliberately not equal. Competitions entered is what
 * MARK's tier is derived from and what a reader is comparing, so it carries the
 * figure; the tier is a filled plate beside it; the connection count is the
 * smallest, because it is context rather than standing.
 *
 * Whether the profile is public is no longer decided here — the switch used to
 * sit in this card's header and take more room than the name did. It lives on
 * the dashboard and in settings, both of which write the same column.
 */

export type MarkSummary = {
  /** Distinct competitions entered — the number MARK's tier is resolved from. */
  competitions: number;
  records: { category: StudentRecordCategory; count: number }[];
};

export default function CircleYourProfile({
  profile,
  collegeName,
  connections,
  mark,
  adders,
}: {
  profile: ProfileRecord;
  collegeName: string | null;
  connections: number;
  mark: MarkSummary;
  /** The Mark column's add rows, built by the page so this card does not have
      to thread six write handlers through itself. */
  adders?: ReactNode;
}) {
  const completion = profileCompletion(profile, Boolean(collegeName));
  const tier = resolveTier(mark.competitions);
  const headline = profile.headline?.trim() ?? "";

  return (
    <div className="circle-col">
      <div className="card bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="eyebrow">Your profile</p>
          <Link
            href="/dashboard"
            className="btn-outline-blue inline-flex min-h-[32px] items-center gap-1.5 px-2.5 py-1 text-[11px]"
          >
            <Icon name="pen" className="h-3.5 w-3.5" />
            Edit profile
          </Link>
        </div>

        <div className="mt-3 flex flex-wrap items-start gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <StudentAvatar src={profile.avatarUrl} name={profile.fullName} className="h-16 w-16 text-lg" />
            <div className="min-w-0">
              <h2 className="card-title truncate text-lg text-ink-900">{profile.fullName || "Add your name"}</h2>
              <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-xs font-semibold text-ink-500">
                {/* The schoolhouse at the size of the word beside it, so the line
                    reads as one fact rather than an icon plus a fact. */}
                <Icon name="building" className="h-3 w-3 flex-none" aria-hidden="true" />
                <span className="min-w-0 truncate">
                  {collegeName ?? "College not listed"}
                  {profile.course ? ` · ${profile.course}` : ""}
                </span>
              </p>
            </div>
          </div>

          {/* Loud to quiet, left to right: what the student has entered, what
              that has earned them, who they reach. */}
          <div className="flex flex-none items-start gap-4">
            <div className="text-center">
              <p className="mark-figure">{mark.competitions}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-500">
                {mark.competitions === 1 ? "competition" : "competitions"} entered
              </p>
            </div>
            <div className="mark-tier text-center">
              <Icon name="trophy" className="mx-auto h-5 w-5 text-brand-blue" />
              <p className="mt-0.5 text-xs font-extrabold uppercase tracking-wider text-ink-700">
                {tier.tierLabel ?? "Not ranked"}
              </p>
            </div>
            <div className="text-center">
              <p className="mark-figure mark-figure--quiet">{connections}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-500">
                {connections === 1 ? "connection" : "connections"}
              </p>
            </div>
          </div>
        </div>

        {completion.missing.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-ink-500">
                Profile completion
              </p>
              <p className="text-[11px] font-extrabold text-ink-700">
                {completion.filled} of {completion.total} fields
              </p>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-soft"
              role="progressbar"
              aria-valuenow={completion.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Profile completion"
            >
              <div className="h-full rounded-full bg-brand-blue" style={{ width: `${completion.percent}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-ink-500">
              Still missing: {completion.missing.join(", ")}.{" "}
              <Link href="/dashboard" className="font-bold text-brand-blue hover:underline">
                Complete your profile
              </Link>
            </p>
          </div>
        )}

        <div className="headline-well mt-4">
          {headline ? (
            <p className="line-clamp-3 text-[13px] leading-relaxed text-ink-700">{headline}</p>
          ) : (
            <p className="text-[13px] font-semibold text-ink-500">
              No headline yet —{" "}
              <Link href="/dashboard" className="text-brand-blue hover:underline">
                write one
              </Link>{" "}
              so people know what to ask you about.
            </p>
          )}
        </div>
      </div>

      <div className="card bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow">Mark</p>
          <Link href="/mark" className="text-[11px] font-extrabold uppercase tracking-wider text-brand-blue hover:underline">
            Open MARK
          </Link>
        </div>

        {mark.records.length === 0 ? (
          <p className="mt-3 text-xs leading-relaxed text-ink-500">
            No records yet. Internships, achievements, competitions, projects, certifications, leadership,
            research, fellowships, scholarships and anything else you can name are all recordable on{" "}
            <Link href="/mark" className="font-bold text-brand-blue hover:underline">
              MARK
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {mark.records.map((entry) => (
              <li key={entry.category} className="flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex min-w-0 items-center gap-1.5 font-bold text-ink-700">
                  <Icon name="check" className="h-3.5 w-3.5 shrink-0 text-brand-blue" />
                  <span className="min-w-0 truncate">{RECORD_CATEGORY_LABELS[entry.category]}</span>
                </span>
                <span className="flex-none font-extrabold text-ink-900">{entry.count}</span>
              </li>
            ))}
          </ul>
        )}

        {adders}
      </div>
    </div>
  );
}
