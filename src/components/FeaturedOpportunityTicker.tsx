import { useEffect, useState } from "react";
import { Link } from "../lib/router";
import { opportunityHref } from "../lib/opportunityRoute";
import { getFeaturedOpportunities, type OpportunityRecord } from "../lib/dataAccess";
import { useScrollReveal } from "../hooks/useScrollReveal";
import OpportunityCarousel from "./home/OpportunityCarousel";
import Icon from "./Icon";

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
      className={`on-navy tone-dark reveal pb-7 pt-2 sm:pb-10 sm:pt-4 lg:pb-14 ${isVisible ? "is-visible" : ""}`}
      aria-label="Trending opportunities"
    >
      <div className="container-px mb-4">
        <p className="eyebrow flex items-center gap-2">
          <span className="live-dot" aria-hidden="true" />
          Trending
        </p>
        <div className="mt-2 flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
          <h2 className="section-title font-display">Discover the top things cooking up.</h2>
          <Link href="/opportunities" className="link-pill group w-fit shrink-0">
            View all opportunities <Icon name="arrow" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="container-px flex gap-4 overflow-hidden pb-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card homepage-opportunity-card overflow-hidden shadow-soft">
              <div className="h-48 skeleton-shimmer sm:h-56" />
              <div className="space-y-2 p-4">
                <div className="h-3 w-16 rounded skeleton-shimmer" />
                <div className="h-4 w-full rounded skeleton-shimmer" />
                <div className="h-3 w-32 rounded skeleton-shimmer" />
              </div>
            </div>
          ))}
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
