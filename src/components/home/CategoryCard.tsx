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
      className={`cat-tile pillar-${category.id} group animate-fade-up focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue`}
      style={{ animationDelay: `${index * 60}ms` }}
      aria-label={`${category.label} — ${category.description}`}
    >
      <span className="cat-tile__well w-full px-1.5 py-1.5 sm:px-2 sm:py-2.5">
        <img
          src={category.iconSrc}
          alt=""
          width={668}
          height={668}
          loading="eager"
          decoding="async"
          className="h-[3.25rem] w-[3.25rem] object-contain mix-blend-multiply transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-[1.06] sm:h-16 sm:w-16 lg:h-[5.5rem] lg:w-[5.5rem]"
        />
      </span>

      <span className="cat-tile__label mt-1.5 gap-0.5 uppercase tracking-[0.12em] sm:mt-3">
        <span className="truncate">{category.label}</span>
        <Icon
          name="arrow"
          className="h-3 w-3 shrink-0 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 sm:h-3.5 sm:w-3.5"
        />
      </span>
      <span className="mt-1 hidden text-xs font-medium leading-snug text-ink-500 sm:block">
        {category.description}
      </span>
    </Link>
  );
}
