import { useEffect, useState } from "react";
import Icon from "../Icon";
import { Link } from "../../lib/router";
import {
  getCompetitionRegisteredTeamCount,
  getOpportunityById,
  type OpportunityRecord,
} from "../../lib/dataAccess";
import { sanitizeExternalUrl, sanitizeMailto, sanitizeWhatsAppUrl } from "../../lib/urlSafety";
import { opportunityCategoryParam } from "../../lib/opportunityRoute";
import { CATEGORY_BADGE } from "./OpportunityCard";
import DeadlinePill from "./DeadlinePill";
import ShareOpportunity from "./ShareOpportunity";
import CompetitionRegistration from "./CompetitionRegistration";
import { opportunityCategoryIcon } from "../../data/opportunityCategories";
import { prizeLabel, teamSizeLabel } from "../../lib/prize";

/**
 * The route body behind /opportunities/:id.
 *
 * The order below is the order a student reads a competition in: what it is,
 * who runs it, what it costs them to be eligible, what they win, when it
 * shuts, who to ask, then the entry itself. Team creation and rosters stay on
 * CREW and /teams/:id — this page points at them rather than rebuilding them.
 */
export default function OpportunityDetail({ opportunityId }: { opportunityId: string }) {
  const [opp, setOpp] = useState<OpportunityRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredTeams, setRegisteredTeams] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMessage(null);
    setRegisteredTeams(null);
    getOpportunityById(opportunityId).then((res) => {
      if (cancelled) return;
      setOpp(res.data);
      setErrorMessage(res.error);
      setLoading(false);
      if (res.data && res.data.category === "competition" && res.data.teamFormationEnabled) {
        getCompetitionRegisteredTeamCount(res.data.id).then((count) => {
          // A failed count stays null: the page then says the number is
          // unavailable rather than claiming nobody has entered.
          if (!cancelled) setRegisteredTeams(count.error ? null : count.data);
        });
      }
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
        <Icon name="alert-triangle" className="mx-auto h-8 w-8 text-brand-red-ink" />
        <p className="mt-3 text-base font-bold text-ink-900">
          {errorMessage ? "This listing needs attention" : "We couldn't find that opportunity"}
        </p>
        <p className="mt-1 text-sm text-ink-500">
          {errorMessage ?? "It may have closed or been unpublished."}
        </p>
        <Link href="/opportunities" className="btn-primary mt-5 inline-flex min-h-[44px] px-4 text-sm">
          <Icon name="arrow-left" className="h-4 w-4" /> Back to Opportunity Radar
        </Link>
      </div>
    );
  }

  const safeUrl = sanitizeExternalUrl(opp.applicationUrl);
  const organizerEmail = sanitizeMailto(opp.organizerEmail);
  const organizerWhatsapp = sanitizeWhatsAppUrl(opp.organizerWhatsapp);
  const organizerWebsite = sanitizeExternalUrl(opp.organizerWebsite);
  const prize = prizeLabel(opp);
  const teamSize = teamSizeLabel(opp);
  const rounds = opp.rounds ?? [];
  const categoryParam = opportunityCategoryParam(opp.category);
  const isCompetition = opp.category === "competition";

  const facts: { icon: string; label: string; value: string }[] = [];
  // Mode is already a pill above, so repeating it in the grid is noise.
  if (opp.location) facts.push({ icon: "map-pin", label: "Location", value: opp.location });
  if (opp.duration) facts.push({ icon: "clock", label: "Duration", value: opp.duration });
  if (opp.field) facts.push({ icon: "target", label: "Field", value: opp.field });

  const categoryBadgeClass = CATEGORY_BADGE[opp.category] ?? "bg-surface-soft text-ink-600";

  return (
    <article>
      {/* 1. Poster — the detail page keeps the presentation it already had: a
          fixed band of the original image, not the card's 676:451 crop. */}
      {opp.imageUrl && (
        <div className="h-44 w-full overflow-hidden rounded-t-3xl bg-surface-soft sm:h-52">
          <img src={opp.imageUrl} alt={`${opp.title} poster`} className="h-full w-full object-cover" />
        </div>
      )}

      <div className="p-5 sm:p-6">
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

        {/* 2–3. Title and organiser */}
        <h1 className="font-display mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900 leading-tight">
          {opp.title}
        </h1>
        <p className="mt-1 text-base font-semibold text-ink-600">{opp.organization}</p>

        {/* 4–6. Mode, prize, deadline — the three things that decide interest */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <DeadlinePill opportunity={opp} />
          {prize && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
              <Icon name="trophy" className="h-3.5 w-3.5" />
              {prize}
            </span>
          )}
          {opp.mode && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-soft px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-ink-600">
              <Icon name="monitor" className="h-3.5 w-3.5" />
              {opp.mode}
            </span>
          )}
        </div>

        {facts.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {facts.map((fact) => (
              <div key={fact.label} className="rounded-xl bg-surface-soft p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-500">
                  <Icon name={fact.icon} className="h-3.5 w-3.5" /> {fact.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-ink-800">{fact.value}</p>
              </div>
            ))}
          </div>
        )}

        {opp.eligibleCourses.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {opp.eligibleCourses.map((course) => (
              <span key={course} className="rounded-lg bg-surface-soft px-2.5 py-1 text-[11px] font-bold text-ink-600">
                {course}
              </span>
            ))}
          </div>
        )}

        <p className="mt-5 text-sm leading-relaxed text-ink-600">{opp.description}</p>

        {/* 7. Eligibility */}
        <div className="mt-4 rounded-xl border border-surface-border bg-surface-soft p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-500">
            <Icon name="info" className="h-3.5 w-3.5" /> Eligibility
          </p>
          <p className="mt-1 text-sm text-ink-700">
            {opp.eligibility?.trim() ? opp.eligibility : "Eligibility not specified by the organiser."}
          </p>
        </div>

        {/* 8–9. Team size and how many teams are already in */}
        {isCompetition && opp.teamFormationEnabled && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-surface-border p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-500">
                <Icon name="users" className="h-3.5 w-3.5" /> Team size
              </p>
              <p className="mt-1 text-sm font-semibold text-ink-800">
                {teamSize ?? "Team size not specified"}
              </p>
            </div>
            <div className="rounded-xl border border-surface-border p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-500">
                <Icon name="trophy" className="h-3.5 w-3.5" /> Registered teams
              </p>
              <p className="mt-1 text-sm font-semibold text-ink-800">
                {registeredTeams === null ? "Not available yet" : `${registeredTeams} registered`}
              </p>
            </div>
          </div>
        )}

        {/* 10. Rounds */}
        {isCompetition && rounds.length > 0 && (
          <div className="mt-5 rounded-xl border border-surface-border p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-500">
              <Icon name="flag" className="h-3.5 w-3.5" /> Rounds ({rounds.length})
            </p>
            <ol className="mt-3 space-y-3">
              {rounds.map((round, index) => (
                <li key={round.id} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-blue-soft text-[11px] font-extrabold text-brand-blue">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink-900">{round.title || `Round ${index + 1}`}</p>
                    {round.details && <p className="mt-0.5 text-sm leading-relaxed text-ink-600">{round.details}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* 11. Organiser contact — only what was actually provided */}
        {(organizerEmail || organizerWhatsapp || organizerWebsite) && (
          <div className="mt-5 rounded-xl border border-surface-border p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-500">
              <Icon name="handshake" className="h-3.5 w-3.5" /> Ask the organiser
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {organizerEmail && (
                <a href={organizerEmail} className="btn-outline-blue min-h-[44px] px-4 text-sm">
                  <Icon name="mail" className="h-4 w-4" /> Email Organizer
                </a>
              )}
              {organizerWhatsapp && (
                <a href={organizerWhatsapp} target="_blank" rel="noreferrer" className="btn-outline-blue min-h-[44px] px-4 text-sm">
                  <Icon name="message" className="h-4 w-4" /> WhatsApp Organizer
                </a>
              )}
              {organizerWebsite && (
                <a href={organizerWebsite} target="_blank" rel="noreferrer" className="btn-ghost min-h-[44px] px-4 text-sm font-bold">
                  <Icon name="external" className="h-4 w-4" /> Official Website
                </a>
              )}
            </div>
            <p className="mt-2 text-[11px] text-ink-500">
              These reach the organiser directly. Registering on JAVLIN and contacting the organiser
              are separate things.
            </p>
          </div>
        )}

        {/* 12. Share */}
        <div className="mt-6">
          <ShareOpportunity opportunityId={opp.id} title={opp.title} organization={opp.organization} />
        </div>

        {/* 13. Register Now */}
        <CompetitionRegistration opportunity={opp} />

        {safeUrl && (
          <a
            href={safeUrl}
            target="_blank"
            rel="noreferrer"
            className={`${isCompetition && opp.teamFormationEnabled ? "btn-outline-blue" : "btn-primary"} mt-6 w-full justify-center`}
          >
            {isCompetition && opp.teamFormationEnabled ? "Continue to Official Registration" : "Apply Now"}{" "}
            <Icon name="external" className="h-4 w-4" />
          </a>
        )}
      </div>
    </article>
  );
}
