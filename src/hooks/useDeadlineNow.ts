import { useEffect, useState } from "react";

/**
 * A single shared clock for every countdown on a page.
 *
 * Each card owning its own `setInterval` is the obvious implementation and the
 * wrong one: a FIELD grid can hold dozens of listings, and they all change
 * their label at the same moment. Instead one interval is created for the whole
 * document, only while at least one component is watching, and every watcher
 * re-renders from the same tick.
 *
 * Minute granularity is deliberate — the finest label shown is "35m remaining",
 * so a faster tick buys nothing and costs battery.
 */
const TICK_MS = 30_000;

const watchers = new Set<(now: number) => void>();
let timer: number | null = null;

function broadcast() {
  const now = Date.now();
  for (const watcher of watchers) watcher(now);
}

function ensureTimer() {
  if (timer !== null || typeof window === "undefined") return;
  timer = window.setInterval(broadcast, TICK_MS);
  // While the tab is hidden the interval still fires and wakes the CPU for
  // labels nobody can see. Resync once, on return, instead.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") broadcast();
  });
}

function subscribe(watcher: (now: number) => void) {
  watchers.add(watcher);
  ensureTimer();
  return () => {
    watchers.delete(watcher);
    if (watchers.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/**
 * The current time, advancing on the shared tick.
 *
 * `until`, when given, stops the ticking for that consumer once the deadline
 * has passed — a closed listing shows a static label, so there is no reason to
 * keep re-rendering it, and once every watcher is closed the interval tears
 * itself down.
 */
export function useDeadlineNow(until?: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until !== null && until !== undefined && until <= Date.now()) return;
    return subscribe(setNow);
  }, [until]);

  return now;
}
