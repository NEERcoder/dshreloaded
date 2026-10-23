import { useState } from "react";
import Icon from "../Icon";
import { Link } from "../../lib/router";
import { StudentAvatar, RECORD_CATEGORY_LABELS } from "./StudentCard";
import { resolveTier } from "../../lib/markTier";
import { profileCompletion } from "../../lib/profileCompletion";
import type { ProfileRecord, StudentRecordCategory } from "../../lib/dataAccess";

/**
 * The signed-in reader's own presence at the top of CIRCLE.
 *
 * Three things live here, all of them real: the profile card (photo, name,
 * headline, college, MARK tier and the completion rule from
 * `lib/profileCompletion`), the visibility switch that writes
 * `public.profiles.is_public`, and the MARK column, which counts the records and
 * competitions the student actually has.
 *
 * The reference sheet's Mark column also offers "Add skills" and "Add
 * experience". There is no column for either — `student_records` accepts ten
 * categories and skills and experience are not among them — so this card sends
 * those two to migration 020 instead of building a button that would have
 * nowhere to save. Everything the student *can* record is one click away on
 * /mark.
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
  onVisibilityChange,
}: {
  profile: ProfileRecord;
  collegeName: string | null;
  connections: number;
  mark: MarkSummary;
  onVisibilityChange: (next: boolean) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const completion = profileCompletion(profile, Boolean(collegeName));
  const tier = resolveTier(mark.competitions);
  const headline = profile.headline?.trim() ?? "";

  async function toggle() {
    setBusy(true);
    setFailure(null);
    try {
      await onVisibilityChange(!profile.isPublic);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "The switch could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="circle-you" aria-label="Your CIRCLE presence">
      <div className="card bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="eyebrow">Your profile</p>
          <button
            type="button"
            role="switch"
            aria-checked={profile.isPublic}
            disabled={busy}
            onClick={() => void toggle()}
            className={`rail-switch ${profile.isPublic ? "is-on" : ""}`}
            style={{ width: "auto", minWidth: 180 }}
          >
            <span>{profile.isPublic ? "Public" : "Private"}</span>
            <span className="rail-switch__track" aria-hidden="true">
              <span className="rail-switch__knob" />
            </span>
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-start gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <StudentAvatar src={profile.avatarUrl} name={profile.fullName} className="h-16 w-16 text-lg" />
            <div className="min-w-0">
              <h2 className="card-title truncate text-lg text-ink-900">{profile.fullName || "Add your name"}</h2>
              <p className="mt-0.5 truncate text-xs font-semibold text-ink-500">
                {collegeName ?? "College not listed"}
                {profile.course ? ` · ${profile.course}` : ""}
              </p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-ink-500">
                {connections} {connections === 1 ? "connection" : "connections"}
              </p>
            </div>
          </div>
          <div className="mark-tier flex-none text-center">
            <p className="rail-subtitle">Tier</p>
            <Icon name="trophy" className="mx-auto mt-1 h-6 w-6 text-brand-blue" />
            <p className="mt-0.5 text-xs font-extrabold uppercase tracking-wider text-ink-700">
              {tier.tierLabel ?? "Not ranked yet"}
            </p>
          </div>
        </div>

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
            {completion.missing.length === 0 ? (
              <>Your profile is complete.</>
            ) : (
              <>
                Still missing: {completion.missing.join(", ")}.{" "}
                <Link href="/dashboard" className="font-bold text-brand-blue hover:underline">
                  Complete your profile
                </Link>
              </>
            )}
          </p>
          {failure && (
            <p className="mt-1.5 text-xs font-semibold text-brand-red-ink" role="status">
              {failure}
            </p>
          )}
        </div>

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
        <div className="mt-3 flex items-center gap-3">
          <p className="mark-figure flex-none">{mark.competitions}</p>
          <p className="text-xs font-bold uppercase tracking-wider text-ink-500">
            {mark.competitions === 1 ? "competition" : "competitions"} entered
          </p>
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

        <p className="mt-3 border-t border-surface-border pt-3 text-[11px] leading-relaxed text-ink-500">
          Skills and work history have no column to live in yet, so they cannot be added here. Migration{" "}
          <code className="font-mono text-[10px]">019_student_skills_and_experience.sql</code> proposes the
          two tables; until it is applied, record the same things on MARK as certifications, projects or
          internships.
        </p>
      </div>
    </section>
  );
}
