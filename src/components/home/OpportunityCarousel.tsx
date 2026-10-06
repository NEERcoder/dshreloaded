import CompactOpportunityCard from "./CompactOpportunityCard";
import type { OpportunityRecord } from "../../lib/dataAccess";

type OpportunityCarouselProps = {
  items: OpportunityRecord[];
};

/**
 * One poster-forward card row, two ways: a snap-scroll strip below lg and a
 * continuous right-to-left loop on desktop. Items are duplicated only for the
 * loop, so the scroll strip never shows the same opportunity twice.
 */
export default function OpportunityCarousel({ items }: OpportunityCarouselProps) {
  const shouldLoop = items.length > 1;
  const loopItems = shouldLoop ? [...items, ...items] : items;

  return (
    <div aria-label="Opportunities">
      <div className="h-scroll no-scrollbar flex snap-x snap-proximity gap-3 overflow-x-auto overflow-y-hidden pb-1 sm:gap-4 lg:hidden">
        {items.map((item) => (
          <CompactOpportunityCard key={item.id} item={item} imageForward />
        ))}
      </div>

      <div className="homepage-carousel-window hidden lg:block">
        <div className={`homepage-carousel-track ${shouldLoop ? "homepage-carousel-animate" : ""}`}>
          {loopItems.map((item, index) => (
            <CompactOpportunityCard key={`${item.id}-${index}`} item={item} imageForward />
          ))}
        </div>
      </div>
    </div>
  );
}
