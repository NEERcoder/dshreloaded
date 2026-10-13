import Icon from "../Icon";
import type { OpportunityRecord } from "../../lib/dataAccess";
import { posterCropStyle } from "../../lib/posterCrop";
import { opportunityCategoryIcon } from "../../data/opportunityCategories";

/**
 * The 676:451 card poster.
 *
 * `object-cover` alone would crop whatever it liked, so an admin-saved framing
 * is applied over it. The image itself is the untouched original — the crop is
 * geometry, and the detail page keeps rendering the whole poster.
 */
export default function PosterFrame({
  item,
  className = "",
}: {
  item: Pick<OpportunityRecord, "title" | "category" | "imageUrl" | "posterCrop">;
  className?: string;
}) {
  return (
    <div className={`relative w-full overflow-hidden bg-surface-soft ${className}`} style={{ aspectRatio: "676 / 451" }}>
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={`${item.title} poster`}
          loading="lazy"
          decoding="async"
          className="max-w-none"
          style={posterCropStyle(item.posterCrop)}
        />
      ) : (
        <span aria-hidden="true" className="poster-empty flex h-full w-full flex-col items-center justify-center gap-1.5">
          <Icon name={opportunityCategoryIcon(item.category)} className="h-9 w-9" />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.16em]">{item.category}</span>
        </span>
      )}
    </div>
  );
}
