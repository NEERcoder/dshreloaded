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
      aria-label={`${category.label} — ${category.title} ${category.description}`}
    >
      <span className="cat-tile__well w-full p-1 sm:px-2 sm:py-2">
        <img
          src={category.iconSrc}
          alt=""
          width={668}
          height={668}
          loading="eager"
          decoding="async"
          className="h-10 w-10 object-contain mix-blend-multiply transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.06] sm:h-12 sm:w-12 lg:h-14 lg:w-14"
        />
      </span>

      <span className="cat-tile__label mt-1 gap-0.5 uppercase tracking-[0.12em] sm:mt-1.5">
        <span className="truncate">{category.label}</span>
        <Icon
          name="arrow"
          className="h-3 w-3 shrink-0 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 sm:h-3 sm:w-3"
        />
      </span>
      {/* The promise line never clamps, so an area's promise stays readable in
          full at every width. The description below it is visually clamped to
          two lines on the mobile tiles only; the full string is always in the
          DOM text and repeated in the tile's accessible name. */}
      <span className="cat-tile__title">{category.title}</span>
      <span className="cat-tile__desc">{category.description}</span>
    </Link>
  );
}
