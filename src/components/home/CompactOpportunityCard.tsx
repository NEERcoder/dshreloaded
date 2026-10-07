import Icon from "../Icon";
import { Link } from "../../lib/router";
import { CATEGORY_BADGE } from "../opportunities/OpportunityCard";
import { opportunityHref } from "../../lib/opportunityRoute";
import { opportunityCategoryIcon } from "../../data/opportunityCategories";
import type { OpportunityRecord } from "../../lib/dataAccess";

function deadlineLabel(deadline: string | null): { text: string; urgent: boolean } | null {
  if (!deadline) return null;
  const date = new Date(deadline);
  if (isNaN(date.getTime())) return { text: deadline, urgent: false };
  const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: "Closed", urgent: false };
  if (days === 0) return { text: "Closing today", urgent: true };
  return { text: `${days}d left`, urgent: days <= 7 };
}

type CompactOpportunityCardProps = {
  item: OpportunityRecord;
  isNew?: boolean;
  imageForward?: boolean;
};

export default function CompactOpportunityCard({ item, isNew, imageForward = false }: CompactOpportunityCardProps) {
  const deadline = deadlineLabel(item.deadline);

  return (
    <Link
      href={opportunityHref(item.id)}
      data-cursor="view"
      className={`glass-card card-interactive group flex snap-start flex-col overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue ${
        imageForward ? "homepage-opportunity-card" : "min-w-[78%] p-4 sm:min-w-0 sm:p-5"
      }`}
    >
      {imageForward && (
        <div className="h-48 w-full shrink-0 overflow-hidden bg-surface-soft sm:h-56">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            /* A listing without a poster used to show a small grey picture icon
               floating in a white void, which read as a broken image. The empty
               field now carries the section's own accent and the category it
               belongs to, so it says "no poster yet" instead of "something
               failed". */
            <span
              aria-hidden="true"
              className="poster-empty flex h-full w-full flex-col items-center justify-center gap-1.5"
            >
              <Icon name={opportunityCategoryIcon(item.category)} className="h-9 w-9" />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.16em]">{item.category}</span>
            </span>
          )}
        </div>
      )}
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
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-[11px] font-semibold text-ink-500">
          {item.mode && <span className="text-ink-600">{item.mode}</span>}
          {item.stipend && <span className="truncate">{item.stipend}</span>}
          {deadline && (
            <span className={`inline-flex items-center gap-1 ${deadline.urgent ? "text-brand-red-ink font-extrabold" : ""}`}>
              <Icon name="flag" className="h-3 w-3" />
              {deadline.text}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
