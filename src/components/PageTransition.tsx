import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "../lib/router";
import { prefersReducedMotion, DURATION } from "../lib/motion";

type Phase = "idle" | "exit" | "enter";

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Lightweight page transition wrapper.
 *
 * On route change:
 *   1. phase = "exit" → 200ms opacity fade-out
 *   2. Swap content + scroll to top
 *   3. phase = "enter" → 280ms fade-up entrance
 *   4. phase = "idle"
 *
 * Skips animation for /admin, /dot-grid, and prefers-reduced-motion.
 */
export default function PageTransition({ children }: PageTransitionProps) {
  const { path } = useLocation();
  const [phase, setPhase] = useState<Phase>("idle");
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const prevPath = useRef(path);
  const timerRef = useRef<number>(0);

  // Skip animation for these routes
  const skipAnimation =
    path === "/admin" ||
    path === "/dot-grid" ||
    prevPath.current === "/admin" ||
    prevPath.current === "/dot-grid";

  useEffect(() => {
    // Same path or initial mount — no transition
    if (prevPath.current === path) {
      setDisplayedChildren(children);
      return;
    }

    // Clean up any pending timers
    if (timerRef.current) cancelAnimationFrame(timerRef.current);

    if (skipAnimation || prefersReducedMotion()) {
      // Instant swap
      prevPath.current = path;
      setDisplayedChildren(children);
      setPhase("idle");
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }

    // Start exit phase (fade out current content)
    setPhase("exit");

    const exitDuration = DURATION.micro + 50; // 200ms

    const exitTimer = window.setTimeout(() => {
      // Swap content & scroll to top
      setDisplayedChildren(children);
      prevPath.current = path;
      window.scrollTo({ top: 0, behavior: "instant" });

      // Start enter phase (fade up new content)
      setPhase("enter");

      // Use rAF to ensure the "enter" class is painted before transitioning to idle
      timerRef.current = requestAnimationFrame(() => {
        timerRef.current = requestAnimationFrame(() => {
          setPhase("idle");
        });
      });
    }, exitDuration);

    return () => {
      window.clearTimeout(exitTimer);
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, [path, children, skipAnimation]);

  const phaseClass =
    phase === "exit"
      ? "page-exit"
      : phase === "enter"
        ? "page-enter"
        : "page-idle";

  return (
    <div className={`page-transition ${phaseClass}`}>
      {displayedChildren}
    </div>
  );
}
