import { useEffect, useRef, useState } from "react";
import Icon from "../Icon";
import { toggleFacetValue } from "../../lib/opportunityFilters";

/**
 * The wireframe's keyword rail: a slow right-to-left strip of one facet's real
 * values with ‹ › controls at its ends.
 *
 * The values come from the listings on screen — for Certifications and Research
 * that is the `field` column, which is what those two rails are labelled as in
 * the design notes ("keywords from listings"). Nothing is invented to fill the
 * rail, so a rail with no values renders nothing at all.
 *
 * The glide is a scroll-position timer rather than a CSS marquee so the arrows,
 * the keyboard and a click all work on the same element the animation moves. It
 * pauses for hover, focus and touch, and never runs at all under
 * `prefers-reduced-motion`.
 */

const GLIDE_MS = 60;
const GLIDE_STEP_PX = 1;

export default function KeywordRail({
  label,
  keywords,
  selected,
  onToggle,
}: {
  label: string;
  keywords: string[];
  selected: string[];
  onToggle: (next: string[]) => void;
}) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const measure = () => setScrollable(el.scrollWidth > el.clientWidth + 1);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [keywords.length]);

  useEffect(() => {
    const el = stripRef.current;
    if (!el || paused || !scrollable) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      el.scrollLeft = el.scrollLeft >= max - 1 ? 0 : el.scrollLeft + GLIDE_STEP_PX;
    }, GLIDE_MS);
    return () => window.clearInterval(id);
  }, [paused, scrollable]);

  function step(direction: number) {
    const el = stripRef.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const width = first ? first.offsetWidth + 6 : 160;
    el.scrollBy({ left: direction * width, behavior: "smooth" });
  }

  if (keywords.length === 0) return null;

  return (
    <div
      className="kw-rail"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onPointerDown={() => setPaused(true)}
    >
      <p className="kw-rail__label">{label}</p>
      <div className="kw-rail__body">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={!scrollable}
          aria-label={`Scroll ${label} backwards`}
          className="kw-rail__arrow"
        >
          <Icon name="chevron-down" className="h-4 w-4 -rotate-90" />
        </button>
        <div ref={stripRef} className="h-scroll no-scrollbar kw-rail__strip">
          {keywords.map((keyword) => {
            const on = selected.includes(keyword);
            return (
              <button
                key={keyword}
                type="button"
                aria-pressed={on}
                onClick={() => onToggle(toggleFacetValue(selected, keyword))}
                className={`kw-chip ${on ? "is-on" : ""}`}
              >
                {keyword}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={!scrollable}
          aria-label={`Scroll ${label} forwards`}
          className="kw-rail__arrow"
        >
          <Icon name="chevron-down" className="h-4 w-4 rotate-90" />
        </button>
      </div>
    </div>
  );
}
