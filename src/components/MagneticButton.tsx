import { useRef, useState, type ReactNode, type MouseEvent } from "react";
import { Link } from "../lib/router";

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

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;

    // Subtly pull toward cursor (max 8px)
    setOffset({
      x: distanceX * 0.18,
      y: distanceY * 0.18,
    });
  };

  const handleMouseLeave = () => {
    setOffset({ x: 0, y: 0 });
  };

  const variantClasses = {
    primary: "btn-primary shadow-card hover:shadow-lift",
    secondary: "btn-secondary shadow-card hover:shadow-lift",
    ghost: "btn-ghost",
    outline: "btn-outline-blue",
  }[variant];

  const style = {
    transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`inline-block transition-transform duration-200 ease-out will-change-transform ${className}`}
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
