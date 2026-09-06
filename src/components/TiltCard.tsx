import { useRef, useState, useEffect, type ReactNode, type MouseEvent } from "react";
import { prefersReducedMotion } from "../lib/motion";

type TiltCardProps = {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
};

export default function TiltCard({ children, className = "", maxTilt = 6 }: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<string>("");
  const [isHovered, setIsHovered] = useState(false);
  const rafId = useRef<number | null>(null);
  const isTouch = useRef(false);

  useEffect(() => {
    isTouch.current = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
  }, []);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isTouch.current || prefersReducedMotion()) return;

    const card = cardRef.current;
    if (!card) return;

    if (rafId.current) cancelAnimationFrame(rafId.current);

    const clientX = e.clientX;
    const clientY = e.clientY;

    rafId.current = requestAnimationFrame(() => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -maxTilt;
      const rotateY = ((x - centerX) / centerX) * maxTilt;

      cardRef.current.style.setProperty("--shine-x", `${((x / rect.width) * 100).toFixed(1)}%`);
      cardRef.current.style.setProperty("--shine-y", `${((y / rect.height) * 100).toFixed(1)}%`);

      setTransform(
        `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.015, 1.015, 1.015)`
      );
    });
  };

  const handleMouseEnter = () => {
    if (isTouch.current || prefersReducedMotion()) return;
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    setIsHovered(false);
    setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`card-shine transition-transform duration-200 ease-out will-change-transform active:scale-[0.98] ${className}`}
      style={{
        transform: transform || undefined,
        transformStyle: "preserve-3d",
      }}
    >
      <div
        className="h-full w-full"
        style={{
          transform: isHovered ? "translateZ(8px)" : "translateZ(0px)",
          transition: "transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
