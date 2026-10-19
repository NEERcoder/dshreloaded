import { useEffect, useState } from "react";
import { Link } from "../lib/router";
import { opportunityHref } from "../lib/opportunityRoute";
import { getFeaturedOpportunities, type OpportunityRecord } from "../lib/dataAccess";
import { useScrollReveal } from "../hooks/useScrollReveal";
import OpportunityCarousel from "./home/OpportunityCarousel";
import Icon from "./Icon";

/**
 * The Trending section's one call to action. On phones it rides the eyebrow row
 * (where it fits inline beside "Trending" and wraps under it on the narrowest
 * handsets) instead of being pushed below the headline; from 640px up the
 * desktop copy below is used so the header layout stays exactly as it was.
 */
function ViewAllLink({ className = "" }: { className?: string }) {
  return (
    <Link href="/opportunities" className={`link-pill group w-fit shrink-0 ${className}`}>
      View all opportunities <Icon name="arrow" className="h-3.5 w-3.5" />
    </Link>
  );
}

/**
 * A single poster-card skeleton. Reuses the live `homepage-opportunity-card`
 * class so the loading row is measured exactly like the populated cards, and is
 * placed inside the same mobile-strip / desktop-window layout the loaded state
 * uses — otherwise the skeleton widths diverge from the real cards and the row
 * clips them.
 */
function SkeletonCard() {
  return (
    <div className="card homepage-opportunity-card overflow-hidden shadow-soft">
      <div className="h-48 skeleton-shimmer sm:h-56" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-16 rounded skeleton-shimmer" />
        <div className="h-4 w-full rounded skeleton-shimmer" />
        <div className="h-3 w-32 rounded skeleton-shimmer" />
      </div>
    </div>
  );
}

export default function FeaturedOpportunityTicker() {
  const [items, setItems] = useState<OpportunityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { ref: sectionRef, isVisible } = useScrollReveal<HTMLElement>({ threshold: 0.05 });

  useEffect(() => {
    let cancelled = false;
    getFeaturedOpportunities()
      .then((result) => {
        if (cancelled) return;
        setItems(result.data ?? []);
      })
      .catch(() => {
        // Don't let a fetch failure break the homepage
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Don't render the section at all if there's nothing to show (and not loading)
  if (!loading && items.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className={`on-navy tone-dark reveal pb-6 pt-1 sm:pb-8 sm:pt-2 lg:pb-9 ${isVisible ? "is-visible" : ""}`}
      aria-label="Trending opportunities"
    >
      <div className="container-px mb-3">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          {/* "Trending" is the section's live indicator and the homepage's h1;
              the large "Discover…" subheading was removed by request. */}
          <h1 className="eyebrow flex items-center gap-2 text-2xl">
            <span className="live-dot" aria-hidden="true" />
            Trending
          </h1>
          <ViewAllLink className="shrink-0" />
        </div>
      </div>

      {loading ? (
        <div className="container-px" aria-hidden="true">
          {/* Mirror OpportunityCarousel's two layouts so the skeleton is measured
              identically: a scroll strip below lg, a static window at lg+ (no
              loop yet). The old single `flex overflow-hidden` row clipped the
              78%-wide cards with no way to reach them. */}
          <div className="h-scroll no-scrollbar flex gap-3 overflow-x-auto overflow-y-hidden pb-1 sm:gap-4 lg:hidden">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <div className="homepage-carousel-window hidden lg:block">
            <div className="homepage-carousel-track">
              {[...Array(4)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="container-px">
          <OpportunityCarousel items={items} />
        </div>
      )}

      <ul className="sr-only">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={opportunityHref(item.id)}>{item.title} at {item.organization}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
