import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../lib/motion";

interface ScrollRevealOptions {
  /** IntersectionObserver threshold (0-1). Default: 0.15 */
  threshold?: number;
  /** Root margin. Carries no negative bottom inset — see the note below. */
  rootMargin?: string;
  /** Unobserve after first intersection. Default: true */
  once?: boolean;
  /**
   * Milliseconds after which content is shown whether or not the observer ever
   * reported. Default: 1500
   */
  failsafeMs?: number;
}

/**
 * Scroll reveal that can never strand content.
 *
 * The previous version used `rootMargin: "0px 0px -40px 0px"`, shrinking the
 * bottom of the observation area by 40px — a real slice of the viewport on a
 * 375x667 phone — and it bailed out silently whenever the ref was not yet
 * attached or `IntersectionObserver` was unavailable. Because `.reveal` starts
 * at `opacity: 0`, each of those paths left the section permanently invisible
 * instead of merely un-animated.
 *
 * The rule here: animation is an enhancement, and every failure path resolves
 * to "show the content".
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options?: ScrollRevealOptions
) {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  const { threshold = 0.15, rootMargin = "0px", once = true, failsafeMs = 1500 } = options ?? {};

  useEffect(() => {
    const reveal = () => setIsVisible(true);

    // Reduced motion: the content is simply there.
    if (prefersReducedMotion()) {
      reveal();
      return;
    }

    // With no element to watch, nothing will ever add `is-visible`, so the
    // caller must not be left holding a permanently hidden node.
    const el = ref.current;
    if (!el) {
      reveal();
      return;
    }

    // Older Android WebViews have no IntersectionObserver at all.
    if (typeof IntersectionObserver === "undefined") {
      reveal();
      return;
    }

    let observer: IntersectionObserver | null = null;
    try {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              reveal();
              if (once) observer?.unobserve(entry.target);
            }
          }
        },
        { threshold, rootMargin }
      );
      observer.observe(el);
    } catch {
      observer?.disconnect();
      reveal();
      return;
    }

    // Last line of defence: a section must never wait on an observer to appear.
    const failsafe = window.setTimeout(reveal, failsafeMs);

    return () => {
      window.clearTimeout(failsafe);
      observer?.disconnect();
    };
  }, [threshold, rootMargin, once, failsafeMs]);

  return { ref, isVisible };
}
