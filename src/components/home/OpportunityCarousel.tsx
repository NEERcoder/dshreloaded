import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "../Icon";
import CompactOpportunityCard from "./CompactOpportunityCard";
import type { OpportunityRecord } from "../../lib/dataAccess";

const AUTO_ADVANCE_MS = 4000;
const TRANSITION_MS = 500;

/** Below this width the row is the native snap strip, not the animated track. */
const DESKTOP_QUERY = "(min-width: 1024px)";

function isDesktopViewport(): boolean {
  try {
    return window.matchMedia(DESKTOP_QUERY).matches;
  } catch {
    return true;
  }
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function ArrowButton({
  direction,
  label,
  onClick,
  className = "",
  disabled = false,
}: {
  direction: "prev" | "next";
  label: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className={`trending-arrow shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-soft focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy ${className}`}
    >
      <Icon name="chevron-down" className={`h-5 w-5 ${direction === "prev" ? "rotate-90" : "-rotate-90"}`} />
    </button>
  );
}

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

type OpportunityCarouselProps = {
  items: OpportunityRecord[];
  /**
   * Turns on the Trending treatment: the vertical banner, the previous/next
   * controls and stepped navigation instead of the continuous marquee. The AIM
   * and FIELD previews omit it and keep their existing marquee untouched.
   */
  trending?: { loading: boolean };
};

/**
 * One poster-forward card row, two ways: a snap-scroll strip below lg and a
 * poster track on desktop.
 *
 * In `trending` mode the desktop track is stepped one card at a time (by the
 * timer or the arrows) and the list is duplicated once, so the step from the
 * last card back to the first animates normally and then snaps silently to the
 * real first card. Hover or focus pauses the timer; reduced motion turns it off.
 */
export default function OpportunityCarousel({ items, trending }: OpportunityCarouselProps) {
  const controlled = Boolean(trending);
  const loading = trending?.loading ?? false;
  const count = items.length;
  const loopItems = count > 1 ? [...items, ...items] : items;

  const [index, setIndex] = useState(0);
  /** True for the single frame that repositions the track without animating. */
  const [instant, setInstant] = useState(false);
  const paused = useRef(false);
  const lastAction = useRef(Date.now());
  const stripRef = useRef<HTMLDivElement | null>(null);

  // After the slide onto the duplicate first card finishes, snap to the real
  // first card. The two positions look identical, so nothing jumps on screen.
  useEffect(() => {
    if (!controlled || count <= 1 || index < count) return;
    const timer = window.setTimeout(() => {
      setInstant(true);
      setIndex(0);
      window.setTimeout(() => setInstant(false), 32);
    }, TRANSITION_MS + 20);
    return () => window.clearTimeout(timer);
  }, [controlled, index, count]);

  const step = useCallback(
    (direction: 1 | -1) => {
      if (count <= 1) return;
      lastAction.current = Date.now();
      if (direction === 1) {
        if (index >= count) return; // a wrap reset is already in flight
        setInstant(false);
        setIndex(index + 1);
        return;
      }
      if (index > 0) {
        setInstant(false);
        setIndex(index - 1);
        return;
      }
      // From the first card: jump to the duplicate set instantly (same picture),
      // then animate one card back so the wrap reads as a normal backward step.
      setInstant(true);
      setIndex(count);
      window.setTimeout(() => {
        setInstant(false);
        setIndex(count - 1);
      }, 32);
    },
    [count, index]
  );

  const stepRef = useRef(step);
  stepRef.current = step;

  // One timer; it decides per tick so a manual press restarts the wait and a
  // hover/focus pause never has to re-arm anything.
  useEffect(() => {
    if (!controlled || loading || count <= 1) return;
    if (prefersReducedMotion()) return;
    const timer = window.setInterval(() => {
      if (paused.current || instant) return;
      if (Date.now() - lastAction.current < AUTO_ADVANCE_MS - 500) return;
      stepRef.current(1);
      lastAction.current = Date.now();
    }, 500);
    return () => window.clearInterval(timer);
  }, [controlled, loading, count, instant]);

  // The strip below lg is a native scroller, so the arrows move it by exactly one
  // card instead of driving the track state.
  const scrollStrip = useCallback((direction: 1 | -1) => {
    const strip = stripRef.current;
    if (!strip) return;
    const first = strip.firstElementChild as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(strip).columnGap || "12") || 12;
    const stepPx = first ? first.getBoundingClientRect().width + gap : strip.clientWidth * 0.8;
    strip.scrollBy({ left: direction * stepPx, behavior: "smooth" });
  }, []);

  const handlePrev = useCallback(() => {
    if (!controlled || isDesktopViewport()) step(-1);
    else scrollStrip(-1);
  }, [controlled, step, scrollStrip]);

  const handleNext = useCallback(() => {
    if (!controlled || isDesktopViewport()) step(1);
    else scrollStrip(1);
  }, [controlled, step, scrollStrip]);

  const pause = useCallback(() => {
    paused.current = true;
  }, []);
  const resume = useCallback(() => {
    paused.current = false;
    lastAction.current = Date.now();
  }, []);

  // The AIM and FIELD previews keep the original continuous marquee: no banner,
  // no arrows, no stepped state.
  if (!controlled) {
    return (
      <div aria-label="Opportunities">
        <div className="h-scroll no-scrollbar flex snap-x snap-proximity gap-3 overflow-x-auto overflow-y-hidden pb-1 sm:gap-4 lg:hidden">
          {items.map((item) => (
            <CompactOpportunityCard key={item.id} item={item} imageForward />
          ))}
        </div>
        <div className="homepage-carousel-window hidden lg:block">
          <div className={`homepage-carousel-track ${count > 1 ? "homepage-carousel-animate" : ""}`}>
            {loopItems.map((item, i) => (
              <CompactOpportunityCard key={`${item.id}-${i}`} item={item} imageForward />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex gap-2 lg:hidden">
        <ArrowButton direction="prev" label="Previous trending opportunities" onClick={handlePrev} disabled={loading || count <= 1} />
        <ArrowButton direction="next" label="Next trending opportunities" onClick={handleNext} disabled={loading || count <= 1} />
      </div>

      <div
        className="flex items-stretch gap-2.5 sm:gap-3 lg:gap-4"
        onMouseEnter={pause}
        onMouseLeave={resume}
        onFocus={pause}
        onBlur={resume}
      >
        <div className="hidden items-center lg:flex">
          <ArrowButton direction="prev" label="Previous trending opportunities" onClick={handlePrev} disabled={loading || count <= 1} />
        </div>

        <div className="min-w-0 flex-1" aria-label="Opportunities">
          {loading ? (
            <>
              <div className="h-scroll no-scrollbar flex gap-3 overflow-x-auto overflow-y-hidden pb-1 sm:gap-4 lg:hidden" aria-hidden="true">
                {[...Array(4)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
              <div className="homepage-carousel-window hidden lg:block" aria-hidden="true">
                <div className="homepage-carousel-track">
                  {[...Array(4)].map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div
                ref={stripRef}
                className="h-scroll no-scrollbar flex snap-x snap-proximity gap-3 overflow-x-auto overflow-y-hidden pb-1 sm:gap-4 lg:hidden"
              >
                {items.map((item) => (
                  <CompactOpportunityCard key={item.id} item={item} imageForward />
                ))}
              </div>

              <div className="homepage-carousel-window hidden lg:block">
                <div
                  className={`homepage-carousel-track trending-carousel-track ${
                    instant ? "trending-carousel-track--instant" : ""
                  }`}
                  style={{
                    translate: `calc(-${index} * (100% + 1rem) / ${loopItems.length}) 0`,
                  }}
                >
                  {loopItems.map((item, i) => (
                    <CompactOpportunityCard key={`${item.id}-${i}`} item={item} imageForward />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="hidden items-center lg:flex">
          <ArrowButton direction="next" label="Next trending opportunities" onClick={handleNext} disabled={loading || count <= 1} />
        </div>
      </div>
    </div>
  );
}
