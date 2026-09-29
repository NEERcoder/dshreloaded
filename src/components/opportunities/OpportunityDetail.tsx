import { useEffect, useState } from "react";
import Icon from "../Icon";
import { Link } from "../../lib/router";
import { getOpportunityById, type OpportunityRecord } from "../../lib/dataAccess";
import { sanitizeExternalUrl } from "../../lib/urlSafety";
import { opportunityCategoryParam } from "../../lib/opportunityRoute";
import { CATEGORY_BADGE } from "./OpportunityCard";
import { opportunityCategoryIcon } from "../../data/opportunityCategories";

/**
 * The route body behind /opportunities/:id. Team creation and rosters live on
 * CREW and /teams/:id — a listing page only ever points at them.
 */
export default function OpportunityDetail({ opportunityId }: { opportunityId: string }) {
  const [opp, setOpp] = useState<OpportunityRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMessage(null);
    getOpportunityById(opportunityId).then((res) => {
      if (cancelled) return;
      setOpp(res.data);
      setErrorMessage(res.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [opportunityId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-sm font-semibold text-ink-500">
        <Icon name="loader" className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (!opp) {
    return (
      <div className="card border-dashed bg-white p-10 text-center">
        <Icon name="alert-triangle" className="mx-auto h-8 w-8 text-brand-red" />
        <p className="mt-3 text-base font-bold text-ink-900">
          {errorMessage ? "This listing needs attention" : "We couldn't find that opportunity"}
        </p>
        <p className="mt-1 text-sm text-ink-500">
          {errorMessage ?? "It may have closed or been unpublished."}
        </p>
        <Link href="/opportunities" className="btn-primary mt-5 inline-flex min-h-[40px] px-4 text-sm">
          <Icon name="arrow-left" className="h-4 w-4" /> Back to Opportunity Radar
        </Link>
      </div>
    );
  }

  const safeUrl = sanitizeExternalUrl(opp.applicationUrl);
  const isTeamCompetition = opp.category === "competition" && opp.teamFormationEnabled;
  const categoryParam = opportunityCategoryParam(opp.category);
  const teamSizeLabel = opp.minTeamSize && opp.maxTeamSize
    ? `${opp.minTeamSize}–${opp.maxTeamSize} members`
    : opp.maxTeamSize
    ? `Up to ${opp.maxTeamSize} members`
    : opp.minTeamSize
    ? `Min ${opp.minTeamSize} members`
    : null;

  const facts: { icon: string; label: string; value: string }[] = [];
  if (opp.mode) facts.push({ icon: "monitor", label: "Mode", value: opp.mode });
  if (opp.location) facts.push({ icon: "map-pin", label: "Location", value: opp.location });
  if (opp.deadline) facts.push({ icon: "calendar", label: "Deadline", value: opp.deadline });
  if (opp.stipend) facts.push({ icon: "wallet", label: "Stipend", value: opp.stipend });
  if (opp.duration) facts.push({ icon: "clock", label: "Duration", value: opp.duration });
  if (opp.field) facts.push({ icon: "target", label: "Field", value: opp.field });

  const categoryBadgeClass = CATEGORY_BADGE[opp.category] ?? "bg-surface-soft text-ink-600";

  return (
    <article>
      {opp.imageUrl && (
        <div className="h-44 w-full overflow-hidden rounded-t-3xl bg-surface-soft sm:h-52">
          <img src={opp.imageUrl} alt={`${opp.title} poster`} className="h-full w-full object-cover" />
        </div>
      )}

      <div className="p-6 sm:p-8">
        {categoryParam ? (
          <Link
            href={`/opportunities/${categoryParam}`}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider transition-opacity hover:opacity-80 ${categoryBadgeClass}`}
          >
            <Icon name={opportunityCategoryIcon(opp.category)} className="h-3.5 w-3.5" />
            {opp.category}
          </Link>
        ) : (
          <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider ${categoryBadgeClass}`}>
            <Icon name={opportunityCategoryIcon(opp.category)} className="h-3.5 w-3.5" />
            {opp.category}
          </span>
        )}
        <h1 className="font-display mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900 leading-tight">
          {opp.title}
        </h1>
        <p className="mt-1 text-base font-semibold text-ink-600">{opp.organization}</p>

        {facts.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {facts.map((fact) => (
              <div key={fact.label} className="rounded-xl bg-surface-soft p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                  <Icon name={fact.icon} className="h-3.5 w-3.5" /> {fact.label}
                </p>
                <p className={`mt-1 text-sm font-semibold ${fact.label === "Stipend" ? "text-emerald-700" : "text-ink-800"}`}>
                  {fact.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {opp.eligibleCourses.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {opp.eligibleCourses.map((course) => (
              <span
                key={course}
                className="rounded-lg bg-surface-soft px-2.5 py-1 text-[11px] font-bold text-ink-600"
              >
                {course}
              </span>
            ))}
          </div>
        )}

        <p className="mt-5 text-sm leading-relaxed text-ink-600">{opp.description}</p>

        {opp.eligibility && (
          <div className="mt-4 rounded-xl border border-surface-border bg-surface-soft p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-400">
              <Icon name="info" className="h-3.5 w-3.5" /> Eligibility
            </p>
            <p className="mt-1 text-sm text-ink-700">{opp.eligibility}</p>
          </div>
        )}

        {isTeamCompetition && (
          <div className="mt-6 rounded-xl border border-surface-border p-4">
            <p className="eyebrow text-brand-red">TEAM COMPETITION</p>
            <h2 className="mt-2 text-base font-extrabold text-ink-900">This one takes a team</h2>
            {teamSizeLabel && <p className="mt-1 text-sm text-ink-500">Team size: {teamSizeLabel}</p>}
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              Head to CREW to find a crew short on members for this competition, request to join one, or start your
              own team.
            </p>
            <Link href="/crew" className="btn-outline-blue mt-4 w-full justify-center min-h-[40px] text-sm">
              Find a team on CREW <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        )}

        {safeUrl && (
          <a
            href={safeUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary mt-6 w-full justify-center"
          >
            Apply Now <Icon name="external" className="h-4 w-4" />
          </a>
        )}
      </div>
    </article>
  );
}
