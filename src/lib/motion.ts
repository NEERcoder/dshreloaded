/**
 * DU Science Hub — Motion System Constants & Utilities
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
