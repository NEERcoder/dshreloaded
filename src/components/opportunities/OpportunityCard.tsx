import TiltCard from "../TiltCard";
import Icon from "../Icon";
import DeadlineProgress from "../DeadlineProgress";
import { sanitizeExternalUrl } from "../../lib/urlSafety";
import { opportunityCategoryIcon } from "../../data/opportunityCategories";
import type { OpportunityRecord } from "../../lib/dataAccess";

export const CATEGORY_BADGE: Record<string, string> = {
  internship: "bg-brand-blue-soft text-brand-blue",
  competition: "bg-brand-red-soft text-brand-red",
  research: "bg-brand-blue-soft text-brand-blue",
  certification: "bg-brand-blue-soft text-brand-blue",
  job: "bg-brand-blue-soft text-brand-blue",
  fellowship: "bg-brand-red-soft text-brand-red",
  scholarship: "bg-brand-red-soft text-brand-red",
};

export default function OpportunityCard({
  item,
  onSelect,
}: {
  item: OpportunityRecord;
  onSelect: (id: string) => void;
}) {
  const safeUrl = sanitizeExternalUrl(item.applicationUrl);
  const isTeamCompetition = item.category === "competition" && item.teamFormationEnabled;

  return (
    <TiltCard className="h-full">
      <article
        data-cursor="view"
        className="card card-hover h-full flex flex-col bg-white border border-surface-border shadow-card overflow-hidden"
      >
        {/* Poster */}
        {item.imageUrl ? (
          <div className="h-36 w-full overflow-hidden bg-surface-soft cursor-pointer" onClick={() => onSelect(item.id)}>
            <img
              src={item.imageUrl}
              alt={`${item.title} poster`}
              className="h-full w-full object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
        ) : null}

        <div className="p-6 flex flex-col flex-1 justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider ${CATEGORY_BADGE[item.category] ?? "bg-surface-soft text-ink-600"}`}>
                <Icon name={opportunityCategoryIcon(item.category)} className="h-3.5 w-3.5" />
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
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-red-soft px-2.5 py-0.5 text-[11px] font-bold text-brand-red">
                    <Icon name="star" className="h-3 w-3" fill="currentColor" />
                    Featured
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => onSelect(item.id)}
              className="mt-4 text-left font-bold text-lg leading-snug text-ink-900 hover:text-brand-blue transition-colors w-full"
            >
              {item.title}
            </button>
            <p className="mt-1 text-sm font-semibold text-ink-600">{item.organization}</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-500 line-clamp-3">{item.description}</p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-400">
              {item.mode && (
                <span className="inline-flex items-center gap-1 font-semibold text-ink-600">
                  <Icon name="monitor" className="h-3.5 w-3.5" />
                  {item.mode}
                </span>
              )}
              {item.field && (
                <span className="inline-flex items-center gap-1">
                  <Icon name="target" className="h-3.5 w-3.5" />
                  {item.field}
                </span>
              )}
              {item.stipend && (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                  <Icon name="wallet" className="h-3.5 w-3.5" />
                  {item.stipend}
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-surface-border">
            <DeadlineProgress deadline={item.deadline} createdAt={item.createdAt} />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => onSelect(item.id)}
                className="btn-ghost flex-1 justify-center text-xs font-bold"
              >
                Details {isTeamCompetition ? "& Teams" : ""}
              </button>
              {safeUrl && (
                <a
                  href={safeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline-blue flex-1 justify-center text-xs font-bold"
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
