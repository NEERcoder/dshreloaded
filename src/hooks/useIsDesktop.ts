import { useEffect, useState } from "react";

/**
 * JAVLIN's rail layout (and the desktop navbar/sidebar toggle) starts at `lg`.
 * Components that must know whether the rail is on screen — the navbar's
 * hamburger and the homepage shell — read it from here so one breakpoint
 * definition drives all of them.
 */
export const DESKTOP_QUERY = "(min-width: 1024px)";

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}
