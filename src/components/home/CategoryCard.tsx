import Icon from "../Icon";
import { Link } from "../../lib/router";
import type { JavlinCategory } from "../../lib/categories";
import { CircleFlash, CrewFlash, MarkAddLink, PulseFlash } from "./launcher/LauncherExtras";

type CategoryCardProps = {
  category: JavlinCategory;
  index: number;
};

/** The live strip a tile shows in its spare middle space, if it has one. */
function extraFor(id: JavlinCategory["id"]) {
  switch (id) {
    case "crew":
      return <CrewFlash />;
    case "circle":
      return <CircleFlash />;
    case "pulse":
      return <PulseFlash />;
    case "mark":
      return <MarkAddLink />;
    default:
      return null;
  }
}

/**
 * One launcher tile, in three visually separate zones:
 *
 *   1. identity — the area's name over its supplied artwork, on a tinted wash
 *      with an underlined title, so the card reads as a place, not a button;
 *   2. the live strip — teams / people / headlines / the MARK shortcut, which
 *      only ever uses spare space and disappears when its source is empty;
 *   3. actions — small outline rows, each with its own 2D mark and a 45° jump
 *      arrow, pinned to the bottom so all six tiles align.
 *
 * The tile is not a link; each CTA is, so nothing depends on guessing what a
 * whole-card click would do. Heights are set by the tallest tile (AIM/FIELD with
 * three actions), so the live strips can never grow any of the six.
 */
export default function CategoryCard({ category, index }: CategoryCardProps) {
  const extra = extraFor(category.id);

  return (
    <div
      className={`cat-tile pillar-${category.id} h-full animate-fade-up`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="cat-tile__identity">
        <span className="cat-tile__label justify-center text-center uppercase tracking-[0.12em]">
          <span className="truncate">{category.label}</span>
        </span>
        <span className="cat-tile__well mt-0.5 w-full p-0 sm:p-0.5">
          <img
            src={category.iconSrc}
            alt=""
            width={668}
            height={668}
            loading="eager"
            decoding="async"
            className="cat-tile__art h-5 w-5 object-contain mix-blend-multiply sm:h-6 sm:w-6 lg:h-7 lg:w-7"
          />
        </span>
      </div>

      <div className="cat-tile__extra">{extra}</div>

      <div className="mt-auto flex w-full min-w-0 flex-col gap-[3px] pt-1">
        {category.ctas.map((cta) => (
          <Link
            key={`${category.id}:${cta.href}:${cta.label}`}
            href={cta.href}
            className="btn-outline-blue cat-tile__cta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-1"
          >
            <Icon name={cta.icon} className="hidden h-2.5 w-2.5 shrink-0 xl:inline-block" />
            <span className="min-w-0 break-words">{cta.label}</span>
            <Icon
              name="arrow"
              className="cat-tile__cta-arrow order-first h-2 w-2 shrink-0 sm:order-last sm:h-2.5 sm:w-2.5"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
