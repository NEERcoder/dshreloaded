/**
 * JAVLIN — Motion System Constants & Utilities
 *
 * Single source of truth for all animation timing, easing,
 * and motion preferences across the application.
 */

/** Canonical easing curve — smooth expo-out with slight overshoot feel */
export const EASE_OUT_EXPO = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * Motion hierarchy durations (ms).
 * Level 1 (micro): button feedback, toggles, hover state changes
 * Level 2 (normal): card reveals, panel slides, section entrances
 * Level 3 (macro): page transitions, modals, full-screen overlays
 */
export const DURATION = {
  micro: 150,
  normal: 280,
  macro: 420,
} as const;

/** Cached reduced-motion media query result */
let _reducedMotionQuery: MediaQueryList | null = null;

/** Returns true if the user prefers reduced motion */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  if (!_reducedMotionQuery) {
    _reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  }
  return _reducedMotionQuery.matches;
}

/** Calculate stagger delay string for the nth item */
export function staggerDelay(index: number, baseMs = 60): string {
  return `${index * baseMs}ms`;
}

/**
 * Smoothly scrolls an element to the top of the viewport (honoring its
 * scroll-margin). Driven by a timer chain rather than requestAnimationFrame or
 * compositor smooth scrolling, both of which can be throttled to never in
 * hidden/occluded pages. Cancels if the user starts scrolling themselves.
 * Respects prefers-reduced-motion.
 */
export function smoothScrollToElement(el: HTMLElement): void {
  if (prefersReducedMotion()) {
    el.scrollIntoView({ block: "start" });
    return;
  }

  const marginTop = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  const targetY = Math.max(
    0,
    el.getBoundingClientRect().top + window.scrollY - marginTop
  );
  const startY = window.scrollY;
  const delta = targetY - startY;
  if (Math.abs(delta) < 1) return;

  const duration = 450;
  let start: number | null = null;
  let timer = 0;
  let cancelled = false;

  const cancel = () => {
    cancelled = true;
    window.clearTimeout(timer);
    window.removeEventListener("wheel", cancel);
    window.removeEventListener("touchstart", cancel);
    window.removeEventListener("keydown", cancel);
  };

  window.addEventListener("wheel", cancel, { passive: true });
  window.addEventListener("touchstart", cancel, { passive: true });
  window.addEventListener("keydown", cancel);

  const step = () => {
    if (cancelled) return;
    const now = performance.now();
    if (start === null) start = now;
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    window.scrollTo({
      top: Math.round(startY + delta * eased),
      left: 0,
      behavior: "instant",
    });
    if (t < 1) {
      timer = window.setTimeout(step, 16);
    } else {
      cancel();
    }
  };

  timer = window.setTimeout(step, 16);
}
