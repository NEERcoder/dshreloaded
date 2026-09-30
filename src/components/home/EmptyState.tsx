import Icon from "../Icon";
import { Link } from "../../lib/router";

type EmptyStateProps = {
  icon: string;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export default function EmptyState({ icon, title, description, ctaLabel, ctaHref }: EmptyStateProps) {
  return (
    <div className="w-full rounded-2xl border-2 border-dashed border-surface-border bg-white px-4 py-8 text-center sm:px-6 sm:py-12">
      <div className="icon-well mx-auto h-12 w-12 text-brand-blue">
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <h3 className="card-title mt-4 text-ink-900">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-ink-500 sm:text-sm">{description}</p>
      {ctaLabel && ctaHref ? (
        <Link href={ctaHref} className="btn-outline-blue mt-5">
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}
