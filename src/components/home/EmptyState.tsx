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
    <div className="w-full rounded-2xl border-2 border-dashed border-surface-border bg-white/80 px-6 py-10 sm:py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue-soft text-brand-blue">
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-extrabold text-ink-900">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-ink-500">{description}</p>
      {ctaLabel && ctaHref ? (
        <Link href={ctaHref} className="btn-outline-blue mt-5">
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}
