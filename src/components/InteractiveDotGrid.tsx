import { useEffect, useRef } from "react";
import "./InteractiveDotGrid.css";

const DOT_RADIUS = 9;
const DOT_SPACING = 48;
const INTERACTION_RADIUS = 100;
const BASE_OPACITY = 0.78;
const BASE_SCALE = 1;

type Dot = {
  x: number;
  y: number;
  scale: number;
  opacity: number;
};

type InteractiveDotGridProps = {
  background?: boolean;
};

export default function InteractiveDotGrid({ background = false }: InteractiveDotGridProps) {
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
      const easing = prefersReducedMotion ? 1 : 1 - Math.exp(-elapsed / 180);

      context.clearRect(0, 0, width, height);

      for (const dot of dots) {
        const dx = dot.x - pointer.x;
        const dy = dot.y - pointer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const influence = pointer.active
          ? Math.max(0, 1 - distance / INTERACTION_RADIUS)
          : 0;
        const targetScale = BASE_SCALE + influence * 0.82;
        const targetOpacity = BASE_OPACITY + influence * 0.22;

        dot.scale += (targetScale - dot.scale) * easing;
        dot.opacity += (targetOpacity - dot.opacity) * easing;

        const redInfluence = influence * 0.9;
        const red = Math.round(255 + (230 - 255) * redInfluence);
        const green = Math.round(255 + (0 - 255) * redInfluence);
        const blue = Math.round(255 + (35 - 255) * redInfluence);

        context.beginPath();
        context.arc(dot.x, dot.y, DOT_RADIUS * dot.scale, 0, Math.PI * 2);
        context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${dot.opacity})`;
        context.shadowColor = `rgba(230, 0, 35, ${influence * 0.85})`;
        context.shadowBlur = influence * 22;
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
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("blur", handlePointerLeave);
    frame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("blur", handlePointerLeave);
    };
  }, []);

  const canvas = (
    <canvas
      ref={canvasRef}
      className="dot-grid-canvas"
      aria-hidden="true"
    />
  );

  if (background) {
    return <div className="dot-grid-background">{canvas}</div>;
  }

  return (
    <main className="dot-grid-page">
      {canvas}
      <p className="sr-only">
        Interactive white dots on a blue background. Move the pointer across the page to activate nearby dots.
      </p>
    </main>
  );
}