import type { ReactNode } from "react";
import Icon from "./Icon";
import { useReveal } from "../hooks/useReveal";

export type PanelItem = {
  label: string;
  icon: string;
};

export type PlatformPanelData = {
  id: string;
  panelNumber: number;
  title: string;
  subtitle: string;
  description: string;
  items: PanelItem[];
  cta: string;
  ctaHref: string;
  accent: "red" | "blue";
  personality: "editorial" | "community" | "discovery";
};

type PlatformPanelProps = PlatformPanelData & {
  children?: ReactNode;
};

export default function PlatformPanel({
  panelNumber,
  title,
  subtitle,
  description,
  items,
  cta,
  ctaHref,
  accent,
  personality,
}: PlatformPanelProps) {
  const { ref, visible } = useReveal<HTMLDivElement>();

  const accentText = accent === "red" ? "text-brand-red" : "text-brand-blue";
  const accentBg = accent === "red" ? "bg-brand-red" : "bg-brand-blue";
  const accentSoftBg = accent === "red" ? "bg-brand-red-soft" : "bg-brand-blue-soft";
  const accentSoftText = accent === "red" ? "text-brand-red" : "text-brand-blue";
  const accentHoverBorder = accent === "red" ? "hover:border-brand-red/40" : "hover:border-brand-blue/40";
  const ctaClass = accent === "red" ? "btn-primary" : "btn-secondary";

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "is-visible" : ""} card ${accentHoverBorder} hover:shadow-lift flex flex-col relative overflow-hidden group`}
    >
      {/* Top accent bar */}
      <div className={`h-1.5 w-full ${accentBg}`} />

      <div className="p-6 sm:p-7 flex flex-col gap-5 flex-1">
        {/* Panel number badge */}
        <div className="flex items-center justify-between">
          <span className={`text-xs font-extrabold uppercase tracking-[0.15em] ${accentText}`}>
             {personality === "editorial" ? "Explore DU" : personality === "community" ? "Join Our Team" : "Opportunities"}
          </span>
          <span className={`flex items-center justify-center h-7 w-7 rounded-lg ${accentSoftBg} ${accentSoftText} text-xs font-extrabold`}>
            {panelNumber}
          </span>
        </div>

        <div>
          <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink-900">{title}</h3>
          <p className={`mt-1.5 text-sm font-bold ${accentText}`}>{subtitle}</p>
        </div>

        <p className="text-sm text-ink-500 leading-relaxed">{description}</p>

        {/* Items list */}
        <ul className="flex flex-col gap-2.5 mt-auto">
          {items.map((item) => (
            <li key={item.label} className="flex items-center gap-3">
              <div className={`shrink-0 h-8 w-8 rounded-lg ${accentSoftBg} ${accentSoftText} flex items-center justify-center`}>
                <Icon name={item.icon} className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-ink-700">{item.label}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <a href={ctaHref} className={`${ctaClass} w-full mt-2`}>
          {cta}
          <Icon name="arrow" className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
