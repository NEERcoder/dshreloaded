import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../lib/motion";

interface ScrollRevealOptions {
  /** IntersectionObserver threshold (0-1). Default: 0.1 */
  threshold?: number;
  /** Root margin for earlier/later triggering. Default: "0px 0px -40px 0px" */
  rootMargin?: string;
  /** Unobserve after first intersection. Default: true */
  once?: boolean;
}

/**
 * Enhanced scroll-reveal hook with reduced-motion support.
 *
 * Usage:
 *   const { ref, isVisible } = useScrollReveal<HTMLDivElement>();
 *   <div ref={ref} className={`reveal-stagger ${isVisible ? "is-visible" : ""}`}>
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options?: ScrollRevealOptions
) {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  const {
    threshold = 0.1,
    rootMargin = "0px 0px -40px 0px",
    once = true,
  } = options ?? {};

  useEffect(() => {
    // Respect reduced motion — show everything immediately
    if (prefersReducedMotion()) {
      setIsVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (once) observer.unobserve(entry.target);
          }
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, isVisible };
}
