import { useEffect, useRef, useState } from "react";
import { useCursor, type CursorType } from "../context/CursorContext";

export default function CustomCursor() {
  const { cursorType, setCursorType } = useCursor();
  const [isVisible, setIsVisible] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const dotRef = useRef<HTMLDivElement>(null);
  const trailDotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  const mouse = useRef({ x: -100, y: -100 });
  const trailPos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const frameRef = useRef<number>(0);

  useEffect(() => {
    // Check if device is touch-primary
    if (window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window) {
      setIsTouch(true);
      return;
    }

    const onMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;

      if (!isVisible) setIsVisible(true);

      // Direct transform for the primary dot to achieve zero lag
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }

      // Check hovered element for context-aware cursor
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const cursorEl = target.closest("[data-cursor]") as HTMLElement | null;
      if (cursorEl) {
        const val = cursorEl.getAttribute("data-cursor") as CursorType;
        setCursorType(val || "hover");
      } else if (target.closest("button, a, input, select, textarea")) {
        setCursorType("hover");
      } else {
        setCursorType("default");
      }
    };

    const onMouseDown = () => setIsPressed(true);
    const onMouseUp = () => setIsPressed(false);
    const onMouseLeave = () => setIsVisible(false);
    const onMouseEnter = () => setIsVisible(true);

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mousedown", onMouseDown, { passive: true });
    window.addEventListener("mouseup", onMouseUp, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseenter", onMouseEnter);

    // Render loop for smooth outer ring & trailing ghost dot interpolation
    const render = () => {
      // Outer ring easing
      const ringEase = 0.2;
      ringPos.current.x += (mouse.current.x - ringPos.current.x) * ringEase;
      ringPos.current.y += (mouse.current.y - ringPos.current.y) * ringEase;

      // Trailing micro-dot easing (satellite delay)
      const trailEase = 0.35;
      trailPos.current.x += (mouse.current.x - trailPos.current.x) * trailEase;
      trailPos.current.y += (mouse.current.y - trailPos.current.y) * trailEase;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0)`;
      }

      if (trailDotRef.current) {
        trailDotRef.current.style.transform = `translate3d(${trailPos.current.x}px, ${trailPos.current.y}px, 0)`;
      }

      frameRef.current = requestAnimationFrame(render);
    };

    frameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
      cancelAnimationFrame(frameRef.current);
    };
  }, [isVisible, setCursorType]);

  if (isTouch) return null;

  const labelMap: Record<string, string> = {
    explore: "EXPLORE",
    play: "PLAY",
    view: "VIEW",
    join: "JOIN",
    open: "OPEN",
    hover: "",
  };

  const currentLabel = labelMap[cursorType] || "";
  const isLabelActive = Boolean(currentLabel);
  const isRedBadge = cursorType === "explore" || cursorType === "play" || cursorType === "join";

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[9999] transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden="true"
    >
      {/* Primary Dot (Zero-Lag) */}
      <div
        ref={dotRef}
        className={`fixed top-0 left-0 -ml-1 -mt-1 h-2 w-2 rounded-full transition-transform duration-75 ease-out ${
          isLabelActive ? "scale-0" : "scale-100 bg-brand-red shadow-sm"
        }`}
      />

      {/* Trailing Satellite Micro-Dot */}
      {!isLabelActive && (
        <div
          ref={trailDotRef}
          className="fixed top-0 left-0 -ml-0.5 -mt-0.5 h-1 w-1 rounded-full bg-brand-blue/50 transition-opacity duration-150"
        />
      )}

      {/* Outer Contextual Capsule / Ring */}
      <div
        ref={ringRef}
        className={`fixed top-0 left-0 flex items-center justify-center rounded-full transition-all duration-200 ease-out border will-change-transform ${
          isPressed ? "scale-90" : "scale-100"
        } ${
          isLabelActive
            ? isRedBadge
              ? "h-14 w-14 -ml-7 -mt-7 bg-brand-red text-white border-brand-red shadow-lift ring-2 ring-brand-red/20"
              : "h-14 w-14 -ml-7 -mt-7 bg-brand-blue text-white border-brand-blue shadow-lift ring-2 ring-brand-blue/20"
            : cursorType === "hover"
            ? "h-9 w-9 -ml-4.5 -mt-4.5 bg-brand-blue/10 border-brand-blue/40 shadow-soft"
            : "h-6 w-6 -ml-3 -mt-3 bg-transparent border-brand-blue/35"
        }`}
      >
        {currentLabel && (
          <span className="text-[10px] font-black uppercase tracking-wider select-none animate-fade-in">
            {currentLabel}
          </span>
        )}
      </div>
    </div>
  );
}
