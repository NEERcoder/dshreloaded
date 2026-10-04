import { useScrollReveal } from "./useScrollReveal";

/**
 * Thin alias over `useScrollReveal` so its existing callers keep their shape.
 *
 * It used to carry its own copy of the observer, with the same two defects: a
 * silent `if (!el) return` that left `.reveal` stuck at `opacity: 0`, and a
 * -40px bottom root margin that eats real viewport height on phones. Both hooks
 * now share one implementation, so the guarantees are stated once.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const { ref, isVisible } = useScrollReveal<T>({ threshold: 0.12 });
  return { ref, visible: isVisible };
}
