import Icon from "../Icon";
import { Link } from "../../lib/router";
import type { JavlinCategory } from "../../lib/categories";

type CategoryCardProps = {
  category: JavlinCategory;
  index: number;
};

/**
 * The uploaded 3D icons are RGB PNGs with a white ground, so they sit in a
 * white well with multiply blending — that keeps the icon's own shadow while
 * stopping the square background from reading against the glass.
 */
export default function CategoryCard({ category, index }: CategoryCardProps) {
  return (
    <Link
      href={category.href}
      data-cursor="view"
      className="glass-card glass-edge group flex animate-fade-up flex-col p-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue sm:p-4"
      style={{ animationDelay: `${index * 60}ms` }}
      aria-label={`${category.label} — ${category.description}`}
    >
      <span className="flex w-full items-center justify-center rounded-xl bg-white px-2 py-2 ring-1 ring-inset ring-surface-border/50 sm:py-3">
        <img
          src={category.iconSrc}
          alt=""
          width={668}
          height={668}
          loading="eager"
          decoding="async"
          className="h-16 w-16 object-contain mix-blend-multiply transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-[1.06] sm:h-20 sm:w-20"
        />
      </span>

      <span className="mt-3 flex items-center gap-1 text-[13px] font-extrabold uppercase tracking-[0.14em] text-ink-900 transition-colors group-hover:text-brand-blue sm:mt-3.5 sm:text-sm">
        {category.label}
        <Icon
          name="arrow"
          className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
        />
      </span>
      <span className="mt-1 text-[11px] font-medium leading-snug text-ink-500 sm:text-xs">
        {category.description}
      </span>
    </Link>
  );
}
