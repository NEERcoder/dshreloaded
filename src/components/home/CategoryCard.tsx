import Icon from "../Icon";
import { Link } from "../../lib/router";
import type { JavlinCategory } from "../../lib/categories";
import { CirclePreviewCarousel, PulsePreviewCarousel } from "./launcher/LauncherPreviews";

type CategoryCardProps = {
  category: JavlinCategory;
  index: number;
};

/**
 * One launcher card: the area's name, then either the supplied 3D artwork
 * (AIM, FIELD) or a live preview of what is actually inside it (CIRCLE
 * profiles, PULSE news), then its CTAs.
 *
 * The preview sits in the same slot as the artwork, so adding it cannot make a
 * card taller. The card itself is not a link; every action is its own link, and
 * the first action in each card is the filled primary.
 */
export default function CategoryCard({ category, index }: CategoryCardProps) {
  const preview =
    category.id === "circle" ? <CirclePreviewCarousel /> : category.id === "pulse" ? <PulsePreviewCarousel /> : null;

  return (
    <div
      className={`cat-tile pillar-${category.id} flex h-full animate-fade-up flex-col`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="cat-tile__identity">
        <span className="cat-tile__label justify-center gap-1.5 text-center tracking-[0.12em]">
          {preview && (
            <img
              src={category.iconSrc}
              alt=""
              width={668}
              height={668}
              loading="eager"
              decoding="async"
              className="h-4 w-4 shrink-0 object-contain mix-blend-multiply sm:h-[18px] sm:w-[18px]"
            />
          )}
          <span className="truncate">{category.label}</span>
        </span>
        {!preview && (
          <span className="cat-tile__well mt-1 w-full p-1 sm:mt-1.5 sm:p-1.5">
            <img
              src={category.iconSrc}
              alt=""
              width={668}
              height={668}
              loading="eager"
              decoding="async"
              className="cat-tile__art h-9 w-9 object-contain mix-blend-multiply sm:h-10 sm:w-10 lg:h-12 lg:w-12"
            />
          </span>
        )}
      </div>

      {preview && <div className="cat-preview-slot">{preview}</div>}

      <div className="mt-auto flex w-full min-w-0 flex-col gap-1.5 pt-3">
        {category.ctas.map((cta, ctaIndex) => (
          <Link
            key={`${category.id}:${cta.href}:${cta.label}`}
            href={cta.href}
            className={`cat-tile__cta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-1 ${
              ctaIndex === 0 ? "cat-tile__cta--primary" : ""
            }`}
          >
            <Icon name={cta.icon} className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
            <span className="min-w-0 flex-1 break-words">{cta.label}</span>
            <Icon name="arrow" className="cat-tile__cta-arrow h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}
