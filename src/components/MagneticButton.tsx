import { useRef, useState, useEffect, type ReactNode, type MouseEvent } from "react";
import { Link } from "../lib/router";
import { prefersReducedMotion } from "../lib/motion";

type MagneticButtonProps = {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "outline";
  ariaLabel?: string;
};

export default function MagneticButton({
  href,
  onClick,
  children,
  className = "",
  variant = "primary",
  ariaLabel,
}: MagneticButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isTouch = useRef(false);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    isTouch.current = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
  }, []);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isTouch.current || prefersReducedMotion()) return;
    const el = containerRef.current;
    if (!el) return;

    if (rafId.current) cancelAnimationFrame(rafId.current);

    const clientX = e.clientX;
    const clientY = e.clientY;

    rafId.current = requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distanceX = clientX - centerX;
      const distanceY = clientY - centerY;

      // Subtly pull toward cursor (max 8px)
      setOffset({
        x: Math.max(-10, Math.min(10, distanceX * 0.18)),
        y: Math.max(-10, Math.min(10, distanceY * 0.18)),
      });
    });
  };

  const handleMouseLeave = () => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    setOffset({ x: 0, y: 0 });
  };

  const variantClasses = {
    primary: "btn-primary shadow-card hover:shadow-lift active:scale-[0.97]",
    secondary: "btn-secondary shadow-card hover:shadow-lift active:scale-[0.97]",
    ghost: "btn-ghost active:scale-[0.97]",
    outline: "btn-outline-blue active:scale-[0.97]",
  }[variant];

  const style = {
    transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
    transition: "transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`inline-block will-change-transform ${className}`}
      style={style}
    >
      {href ? (
        <Link href={href} className={variantClasses} aria-label={ariaLabel}>
          {children}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={variantClasses} aria-label={ariaLabel}>
          {children}
        </button>
      )}
    </div>
  );
}
