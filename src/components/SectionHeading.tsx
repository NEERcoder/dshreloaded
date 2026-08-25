import type { ReactNode } from "react";
import { useReveal } from "../hooks/useReveal";

type SectionHeadingProps = {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
};

export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  description,
  align = "center",
  className = "",
}: SectionHeadingProps) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "is-visible" : ""} ${
        align === "center" ? "mx-auto text-center" : "text-left"
      } max-w-2xl ${className}`}
    >
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-balance">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-lg font-semibold text-brand-blue">{subtitle}</p>
      )}
      {description && (
        <p className="mt-3 text-ink-500 text-base sm:text-lg leading-relaxed">
          {description}
        </p>
      )}
      <div className="accent-line mt-6" />
    </div>
  );
}
