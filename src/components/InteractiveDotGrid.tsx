import { useEffect, useRef } from "react";
import "./InteractiveDotGrid.css";

const DOT_RADIUS = 9;
const DOT_SPACING = 48;
const INTERACTION_RADIUS = 100;
const BASE_OPACITY = 0.84;
const BASE_SCALE = 1;

type Dot = {
  x: number;
  y: number;
  scale: number;
  opacity: number;
};

export default function InteractiveDotGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { x: -Infinity, y: -Infinity, active: false };
    let dots: Dot[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastTime = performance.now();

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const columns = Math.ceil(width / DOT_SPACING);
      const rows = Math.ceil(height / DOT_SPACING);
      const xOffset = (width - (columns - 1) * DOT_SPACING) / 2;
      const yOffset = (height - (rows - 1) * DOT_SPACING) / 2;

      dots = Array.from({ length: columns * rows }, (_, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        return {
          x: xOffset + column * DOT_SPACING,
          y: yOffset + row * DOT_SPACING,
          scale: BASE_SCALE,
          opacity: BASE_OPACITY,
        };
      });
    };

    const draw = (time: number) => {
      const elapsed = Math.min(time - lastTime, 40);
      lastTime = time;
      const easing = prefersReducedMotion ? 1 : 1 - Math.exp(-elapsed / 120);

      context.clearRect(0, 0, width, height);

      for (const dot of dots) {
        const dx = dot.x - pointer.x;
        const dy = dot.y - pointer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const influence = pointer.active
          ? Math.max(0, 1 - distance / INTERACTION_RADIUS)
          : 0;
        const targetScale = BASE_SCALE + influence * 0.58;
        const targetOpacity = BASE_OPACITY + influence * 0.16;

        dot.scale += (targetScale - dot.scale) * easing;
        dot.opacity += (targetOpacity - dot.opacity) * easing;

        context.beginPath();
        context.arc(dot.x, dot.y, DOT_RADIUS * dot.scale, 0, Math.PI * 2);
        context.fillStyle = `rgba(255, 255, 255, ${dot.opacity})`;
        context.shadowColor = `rgba(255, 255, 255, ${influence * 0.8})`;
        context.shadowBlur = influence * 14;
        context.fill();
      }

      context.shadowBlur = 0;
      frame = window.requestAnimationFrame(draw);
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
    };

    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    frame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  return (
    <main className="dot-grid-page">
      <canvas
        ref={canvasRef}
        className="dot-grid-canvas"
        aria-hidden="true"
      />
      <p className="sr-only">
        Interactive white dots on a blue background. Move the pointer across the page to activate nearby dots.
      </p>
    </main>
  );
}