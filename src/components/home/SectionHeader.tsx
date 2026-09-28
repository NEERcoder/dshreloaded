import Icon from "../Icon";
import { Link } from "../../lib/router";

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  /** Optional 3D category icon rendered as section identity. */
  iconSrc?: string;
};

export default function SectionHeader({
  eyebrow,
  title,
  description,
  viewAllHref,
  viewAllLabel,
  iconSrc,
}: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="flex max-w-2xl items-center gap-3 sm:gap-4">
        {iconSrc && (
          <span className="glass-card flex h-12 w-12 shrink-0 items-center justify-center bg-white p-1.5 sm:h-14 sm:w-14">
            <img
              src={iconSrc}
              alt=""
              width={668}
              height={668}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain mix-blend-multiply"
            />
          </span>
        )}
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="font-display mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900 leading-tight">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-ink-600 font-medium">{description}</p>
          ) : null}
        </div>
      </div>
      {viewAllHref ? (
        <Link
          href={viewAllHref}
          className="group inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-brand-blue hover:text-brand-blue-dark transition-colors"
        >
          {viewAllLabel ?? "View All"}
          <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  );
}
