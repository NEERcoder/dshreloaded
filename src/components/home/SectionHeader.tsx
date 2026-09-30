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
    <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
      <div className="flex max-w-2xl items-center gap-2.5 sm:gap-4">
        {iconSrc && (
          <span className="icon-well h-11 w-11 shrink-0 p-1.5 sm:h-14 sm:w-14">
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
          <h2 className="section-title font-display mt-1.5 sm:mt-2">{title}</h2>
          {description ? <p className="section-lede mt-1.5 sm:mt-2">{description}</p> : null}
        </div>
      </div>
      {viewAllHref ? (
        <Link href={viewAllHref} className="link-pill group shrink-0">
          {viewAllLabel ?? "View All"}
          <Icon name="arrow" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  );
}
