import TiltCard from "../TiltCard";
import Icon from "../Icon";
import DeadlineProgress from "../DeadlineProgress";
import PosterFrame from "./PosterFrame";
import { Link } from "../../lib/router";
import { sanitizeExternalUrl } from "../../lib/urlSafety";
import { opportunityHref } from "../../lib/opportunityRoute";
import { CategoryGlyph } from "../FeatureIcon";
import { listingFacts } from "../../lib/opportunityFacts";
import type { OpportunityRecord } from "../../lib/dataAccess";

export const CATEGORY_BADGE: Record<string, string> = {
  internship: "bg-brand-blue-soft text-brand-blue",
  competition: "bg-brand-red-soft text-brand-red-ink",
  research: "bg-brand-blue-soft text-brand-blue",
  certification: "bg-brand-blue-soft text-brand-blue",
  job: "bg-brand-blue-soft text-brand-blue",
  fellowship: "bg-brand-red-soft text-brand-red-ink",
  scholarship: "bg-brand-red-soft text-brand-red-ink",
};

/**
 * The scanning unit of every opportunity feed. It shows what a listing *is* —
 * title, organiser, and the five facts most likely to decide whether to open it —
 * and leaves the description, eligibility and application detail to
 * `OpportunityDetail`. Which five, and what each is called, comes from
 * `lib/opportunityFacts`, so a card and its detail page cannot disagree.
 */
export default function OpportunityCard({ item }: { item: OpportunityRecord }) {
  const safeUrl = sanitizeExternalUrl(item.applicationUrl);
  const isTeamCompetition = item.category === "competition" && item.teamFormationEnabled;
  const href = opportunityHref(item.id);
  const facts = listingFacts(item).slice(0, 5);

  return (
    <TiltCard className="h-full">
      <article
        data-cursor="view"
        className="card card-interactive h-full flex flex-col overflow-hidden bg-white"
      >
        {/* Poster */}
        {item.imageUrl ? (
          <Link href={href} className="block w-full overflow-hidden bg-surface-soft">
            <PosterFrame item={item} />
          </Link>
        ) : null}

        <div className="p-4 flex flex-col flex-1 justify-between sm:p-6">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider ${CATEGORY_BADGE[item.category] ?? "bg-surface-soft text-ink-600"}`}>
                <CategoryGlyph category={item.category} className="h-3.5 w-3.5" />
                {item.category}
              </span>
              <div className="flex items-center gap-1.5">
                {isTeamCompetition && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-blue-soft px-2 py-0.5 text-[11px] font-bold text-brand-blue">
                    <Icon name="users" className="h-3 w-3" />
                    Teams
                  </span>
                )}
                {item.featured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-red-soft px-2.5 py-0.5 text-[11px] font-bold text-brand-red-ink">
                    <Icon name="star" className="h-3 w-3" fill="currentColor" />
                    Featured
                  </span>
                )}
              </div>
            </div>
            {/* The title is the primary target, so it keeps a 44px box at every
                width — a one-line title on desktop used to collapse to ~28px. */}
            <Link
              href={href}
              className="card-title mt-1 flex min-h-[44px] items-center text-left text-ink-900 hover:text-brand-blue transition-colors w-full line-clamp-2 sm:mt-2 sm:text-lg"
            >
              {item.title}
            </Link>
            <p className="mt-1 truncate text-sm font-semibold text-ink-600">{item.organization}</p>

            {/* What a student scans for. The description, eligibility and everything
                else live on the detail view — a feed of prose cards is not skimmable,
                and this mirrors the homepage's compact card. Values are the record's
                own text, never a guess, and each token is read by its icon (the same
                icon set the detail page already uses for these fields). */}
            {facts.length > 0 && (
              <ul className="mt-2.5 flex flex-wrap gap-1.5">
                {facts.map((fact) => (
                  <li
                    key={fact.key}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-surface-soft px-2 py-1 text-[11px] font-bold text-ink-700"
                  >
                    <Icon name={fact.icon} className="h-3.5 w-3.5 shrink-0 text-ink-500" />
                    <span className="min-w-0 truncate">{fact.value}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-surface-border sm:mt-6">
            <DeadlineProgress deadline={item.deadline} deadlineAt={item.deadlineAt} createdAt={item.createdAt} />
            <div className="mt-3 flex gap-2 sm:mt-4">
              <Link
                href={href}
                className="btn-ghost flex-1 justify-center text-[13px] font-bold"
              >
                Details {isTeamCompetition ? "& Teams" : ""}
              </Link>
              {safeUrl && (
                <a
                  href={safeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline-blue flex-1 justify-center text-[13px] font-bold"
                >
                  Apply <Icon name="external" className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </article>
    </TiltCard>
  );
}
