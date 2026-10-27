import Icon from "../Icon";
import { Link } from "../../lib/router";
import { CATEGORY_BADGE } from "../opportunities/OpportunityCard";
import PosterFrame from "../opportunities/PosterFrame";
import DeadlinePill from "../opportunities/DeadlinePill";
import RewardPill from "../opportunities/RewardPill";
import { opportunityHref } from "../../lib/opportunityRoute";
import { listingFacts } from "../../lib/opportunityFacts";
import type { OpportunityRecord } from "../../lib/dataAccess";

type CompactOpportunityCardProps = {
  item: OpportunityRecord;
  isNew?: boolean;
  imageForward?: boolean;
};

/**
 * The Trending and rail card.
 *
 * Poster, title, organiser, mode, prize, countdown — the six things that decide
 * whether to open the listing. The paragraph that used to sit here competed
 * with the title on a poster-forward card, and the detail page carries it in
 * full.
 */
export default function CompactOpportunityCard({ item, isNew, imageForward = false }: CompactOpportunityCardProps) {
  /* Read from the same fact list the feed cards use, so the homepage cannot
     disagree with the section page about what the same listing offers. The old
     `prizeLabel` joined prize and rewards into one string, which then clipped
     mid-value inside this narrow card — "₹25,000 + Certifi…". Two separate
     pills say more in less room. */
  const money = listingFacts(item)
    .filter((fact) => fact.tone)
    .slice(0, 2);

  return (
    <Link
      href={opportunityHref(item.id)}
      data-cursor="view"
      className={`glass-card card-interactive group flex snap-start flex-col overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue ${
        imageForward ? "homepage-opportunity-card" : "min-w-[78%] p-4 sm:min-w-0 sm:p-5"
      }`}
    >
      {imageForward && <PosterFrame item={item} className="shrink-0" />}
      <div className={imageForward ? "flex flex-1 flex-col p-4" : "flex flex-1 flex-col"}>
        <div className="flex items-center justify-between gap-2">
          <span
            className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider ${
              CATEGORY_BADGE[item.category] ?? "bg-surface-soft text-ink-600"
            }`}
          >
            {item.category}
          </span>
          <div className="flex items-center gap-1.5">
            {item.teamFormationEnabled && (
              <span className="rounded-full bg-brand-blue-soft px-2 py-0.5 text-[11px] font-bold text-brand-blue">
                Teams
              </span>
            )}
            {isNew && (
              <span className="rounded-full bg-brand-red-soft px-2 py-0.5 text-[11px] font-bold text-brand-red-ink">
                New
              </span>
            )}
          </div>
        </div>
        <h3 className="card-title mt-2.5 line-clamp-2 text-ink-900 transition-colors group-hover:text-brand-blue sm:mt-3">
          {item.title}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs font-semibold text-ink-600">{item.organization}</p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
          {item.mode && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-500">
              <Icon name="monitor" className="h-3.5 w-3.5" />
              {item.mode}
            </span>
          )}
          {money.map((fact) => (
            <RewardPill key={fact.key} tone={fact.tone!} value={fact.value} />
          ))}
          <DeadlinePill opportunity={item} />
        </div>
      </div>
    </Link>
  );
}
