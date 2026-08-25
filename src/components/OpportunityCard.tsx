import Icon from "./Icon";
import type { OpportunityCardData } from "../data/opportunities";

type OpportunityCardProps = OpportunityCardData;

const categoryStyles: Record<OpportunityCardData["category"], string> = {
  Internship: "bg-brand-red-soft text-brand-red",
  Job: "bg-brand-blue-soft text-brand-blue",
  Competition: "bg-brand-red-soft text-brand-red",
  Certification: "bg-brand-blue-soft text-brand-blue",
};

export default function OpportunityCard({ category, title, organization, location, deadline, accent }: OpportunityCardProps) {
  const ctaColor = accent === "red" ? "text-brand-red hover:text-brand-red-dark" : "text-brand-blue hover:text-brand-blue-dark";
  return (
    <div className="card card-hover p-5 flex flex-col gap-3 group">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${categoryStyles[category]}`}>
          {category}
        </span>
        <span className="text-xs text-ink-400 flex items-center gap-1">
          <Icon name="flag" className="h-3.5 w-3.5" />
          {deadline}
        </span>
      </div>
      <h3 className="text-base font-bold text-ink-900 leading-snug">{title}</h3>
      <p className="text-sm text-ink-500">{organization}</p>
      <p className="text-xs text-ink-400">{location}</p>
      <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${ctaColor} mt-auto group-hover:gap-2.5 transition-all`}>
        View details
        <Icon name="arrow" className="h-4 w-4" />
      </span>
    </div>
  );
}
