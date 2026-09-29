import Icon from "../Icon";
import { Link } from "../../lib/router";
import { CATEGORY_BADGE } from "../opportunities/OpportunityCard";
import { opportunityHref } from "../../lib/opportunityRoute";
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
      className={`glass-card group flex snap-start flex-col overflow-hidden hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue ${
        imageForward ? "homepage-opportunity-card" : "min-w-[78%] p-5 sm:min-w-0"
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
            <span className="flex h-full items-center justify-center text-ink-300">
              <Icon name="image" className="h-10 w-10" />
            </span>
          )}
        </div>
      )}
      <div className={imageForward ? "flex flex-1 flex-col p-4" : "flex flex-1 flex-col"}>
        <div className="flex items-center justify-between gap-2">
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
              CATEGORY_BADGE[item.category] ?? "bg-surface-soft text-ink-600"
            }`}
          >
            {item.category}
          </span>
          <div className="flex items-center gap-1.5">
            {item.teamFormationEnabled && (
              <span className="rounded-full bg-brand-blue-soft px-2 py-0.5 text-[10px] font-bold text-brand-blue">
                Teams
              </span>
            )}
            {isNew && (
              <span className="rounded-full bg-brand-red-soft px-2 py-0.5 text-[10px] font-bold text-brand-red">
                New
              </span>
            )}
          </div>
        </div>
        <h3 className="mt-3 line-clamp-2 text-sm font-extrabold leading-snug text-ink-900 transition-colors group-hover:text-brand-blue">
          {item.title}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs font-semibold text-ink-600">{item.organization}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-[11px] font-semibold text-ink-400">
          {item.mode && <span className="text-ink-600">{item.mode}</span>}
          {item.stipend && <span className="truncate">{item.stipend}</span>}
          {deadline && (
            <span className={`inline-flex items-center gap-1 ${deadline.urgent ? "text-brand-red font-extrabold" : ""}`}>
              <Icon name="flag" className="h-3 w-3" />
              {deadline.text}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
