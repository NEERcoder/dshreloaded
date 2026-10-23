import { useEffect, useState } from "react";
import { Link } from "../lib/router";
import { opportunityHref } from "../lib/opportunityRoute";
import { getFeaturedOpportunities, type OpportunityRecord } from "../lib/dataAccess";
import { useScrollReveal } from "../hooks/useScrollReveal";
import OpportunityCarousel from "./home/OpportunityCarousel";
import Icon from "./Icon";

/** The section's call to action, restored alongside the horizontal heading. */
function ViewAllLink() {
  return (
    <Link
      href="/opportunities"
      className="link-pill group w-fit shrink-0 max-sm:min-w-0 max-sm:shrink max-sm:justify-end max-sm:gap-1 max-sm:px-2.5 max-sm:text-right max-sm:text-[11px] max-sm:leading-tight"
    >
      View all opportunities{" "}
      <Icon name="arrow" className="h-3.5 w-3.5 shrink-0 max-sm:h-3 max-sm:w-3 max-sm:-rotate-45" />
    </Link>
  );
}

/**
 * The Trending section. The orange heading and its live dot sit above the
 * carousel; the arrows, track and loading state live in `OpportunityCarousel`.
 */
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
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 max-sm:flex-nowrap max-sm:gap-x-2">
          <h1 className="eyebrow flex items-center gap-2 text-2xl max-sm:text-xl">
            <span className="live-dot" aria-hidden="true" />
            Trending
          </h1>
          <ViewAllLink />
        </div>
      </div>

      <div className="container-px">
        <OpportunityCarousel items={items} trending={{ loading }} />
      </div>

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
