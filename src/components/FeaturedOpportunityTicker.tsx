import { useEffect, useRef, useState } from "react";
import { Link } from "../lib/router";
import { getFeaturedOpportunities, type OpportunityRecord } from "../lib/dataAccess";
import { useScrollReveal } from "../hooks/useScrollReveal";

const CATEGORY_COLOR: Record<string, string> = {
  internship: "bg-brand-blue-soft text-brand-blue",
  competition: "bg-brand-red-soft text-brand-red",
  research: "bg-brand-blue-soft text-brand-blue",
  certification: "bg-brand-blue-soft text-brand-blue",
  job: "bg-brand-blue-soft text-brand-blue",
  fellowship: "bg-brand-red-soft text-brand-red",
  scholarship: "bg-brand-red-soft text-brand-red",
};

function TickerCard({ item }: { item: OpportunityRecord }) {
  return (
    <Link
      href={`/opportunities`}
      aria-label={`${item.title} at ${item.organization}`}
      className="ticker-card group relative flex-shrink-0 w-64 sm:w-72 rounded-2xl border border-surface-border bg-white shadow-card overflow-hidden hover:shadow-lift hover:-translate-y-0.5 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-brand-blue"
    >
      {/* Poster */}
      {item.imageUrl ? (
        <div className="h-32 w-full overflow-hidden bg-surface-soft">
          <img
            src={item.imageUrl}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      ) : (
        <div className="h-32 w-full bg-gradient-to-br from-brand-blue-pale to-brand-blue-soft flex items-center justify-center">
          <span className="text-3xl opacity-30">🎯</span>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider ${CATEGORY_COLOR[item.category] ?? "bg-surface-soft text-ink-600"}`}>
          {item.category}
        </span>
        <h3 className="mt-2 text-sm font-bold leading-snug text-ink-900 line-clamp-2 group-hover:text-brand-blue transition-colors">
          {item.title}
        </h3>
        <p className="mt-0.5 text-xs font-semibold text-ink-500 line-clamp-1">{item.organization}</p>
        {item.deadline && (
          <p className="mt-2 text-[11px] text-ink-400 font-medium">
            Deadline: {item.deadline}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function FeaturedOpportunityTicker() {
  const [items, setItems] = useState<OpportunityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);
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

  // Pause on hover by toggling CSS animation-play-state
  function pauseTrack() {
    if (trackRef.current) trackRef.current.style.animationPlayState = "paused";
  }
  function resumeTrack() {
    if (trackRef.current) trackRef.current.style.animationPlayState = "running";
  }

  // Don't render the section at all if there's nothing to show (and not loading)
  if (!loading && items.length === 0) return null;

  // Duplicate items for seamless loop only when there are enough cards
  const shouldLoop = items.length >= 3;
  const displayItems = shouldLoop ? [...items, ...items] : items;

  return (
    <section
      ref={sectionRef}
      className={`pb-16 sm:pb-24 reveal ${isVisible ? "is-visible" : ""}`}
      aria-label="Featured opportunities"
    >
      <div className="container-px max-w-7xl mx-auto mb-8">
        <p className="eyebrow text-brand-red">FEATURED OPPORTUNITIES</p>
        <div className="mt-3 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900">
            Discover what's open right now.
          </h2>
          <Link
            href="/opportunities"
            className="text-xs font-extrabold uppercase tracking-wider text-brand-blue hover:text-brand-blue-dark shrink-0"
          >
            View all opportunities →
          </Link>
        </div>
        <p className="mt-2 text-sm text-ink-500">
          Internships, competitions, research opportunities and more — curated for DU students.
        </p>
      </div>

      {loading ? (
        <div className="container-px max-w-7xl mx-auto">
          <div className="flex gap-4 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-64 sm:w-72 rounded-2xl border border-surface-border bg-white shadow-soft overflow-hidden">
                <div className="h-32 skeleton-shimmer" />
                <div className="p-4 space-y-2">
                  <div className="h-3 w-16 rounded skeleton-shimmer" />
                  <div className="h-4 w-full rounded skeleton-shimmer" />
                  <div className="h-3 w-32 rounded skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="opportunity-ticker-carousel overflow-hidden"
          onMouseEnter={shouldLoop ? pauseTrack : undefined}
          onMouseLeave={shouldLoop ? resumeTrack : undefined}
          onFocus={shouldLoop ? pauseTrack : undefined}
          onBlur={shouldLoop ? resumeTrack : undefined}
        >
          <div
            ref={trackRef}
            className={`opportunity-ticker-track ${shouldLoop ? "opportunity-ticker-animate" : ""} flex gap-4 pl-4 sm:pl-6 lg:pl-8`}
            style={{ width: "max-content" }}
          >
            {displayItems.map((item, i) => (
              <TickerCard key={`${item.id}-${i}`} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Static fallback list for reduced-motion / accessibility */}
      <div className="container-px max-w-7xl mx-auto mt-4 hidden" aria-hidden="false">
        <ul className="sr-only">
          {items.map((item) => (
            <li key={item.id}>
              <Link href="/opportunities">{item.title} at {item.organization}</Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
