import { useEffect, useState } from "react";
import Icon from "./Icon";
import { heroPhrases } from "../data/heroPhrases";

const PHRASE_DURATION = 2800;

export default function Hero() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % heroPhrases.length);
    }, PHRASE_DURATION);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="top" className="relative overflow-hidden pt-28 pb-16 sm:pt-32 lg:pt-40 lg:pb-24">
      {/* Soft background accents */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-blue-soft/50 rounded-full blur-3xl" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-brand-red-soft/40 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-blue-pale rounded-full blur-3xl" />
      </div>

      <div className="container-px">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-white px-4 py-1.5 text-xs font-semibold text-ink-700 shadow-soft animate-fade-in">
            <span className="h-2 w-2 rounded-full bg-brand-red animate-pulse" />
            Student-powered · Delhi University
          </span>

          <h1 className="mt-6 text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-balance">
            DU SCIENCE HUB
          </h1>

          <div className="mt-6 sm:mt-8 flex flex-col items-center gap-1">
            <span className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-ink-900">
              EXPLORE
            </span>
            <div
              className="relative h-[1.3em] overflow-hidden w-full"
              style={{ minHeight: "1.3em" }}
            >
              <span
                key={index}
                className="phrase-item absolute inset-0 flex items-center justify-center text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-brand-red to-brand-blue bg-clip-text text-transparent"
              >
                {heroPhrases[index]}
              </span>
            </div>
          </div>

          <p className="mt-8 text-base sm:text-lg text-ink-500 leading-relaxed max-w-xl mx-auto text-balance">
            A student-powered platform for discovering DU, learning from seniors and finding
            opportunities that help you move forward.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#explore-du" className="btn-primary w-full sm:w-auto">
              Explore DU
              <Icon name="arrow" className="h-4 w-4" />
            </a>
            <a href="#find-opportunities" className="btn-secondary w-full sm:w-auto">
              Find Opportunities
            </a>
          </div>
        </div>

        {/* Floating preview cards */}
        <div className="mt-14 lg:mt-20 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
          <FloatingCard
            icon="building"
            label="College Guide"
            sublabel="Hindu College"
            accent="blue"
            className="animate-fade-up"
            style={{ animationDelay: "0.1s" }}
          />
          <FloatingCard
            icon="briefcase"
            label="Internship"
            sublabel="Remote · Apply now"
            accent="red"
            className="animate-fade-up"
            style={{ animationDelay: "0.2s" }}
          />
          <FloatingCard
            icon="trophy"
            label="Competition"
            sublabel="National Science Quiz"
            accent="blue"
            className="animate-fade-up"
            style={{ animationDelay: "0.3s" }}
          />
          <FloatingCard
            icon="play"
            label="Campus Video"
            sublabel="Student interview"
            accent="red"
            className="animate-fade-up"
            style={{ animationDelay: "0.4s" }}
          />
        </div>
      </div>
    </section>
  );
}

type FloatingCardProps = {
  icon: string;
  label: string;
  sublabel: string;
  accent: "red" | "blue";
  className?: string;
  style?: React.CSSProperties;
};

function FloatingCard({ icon, label, sublabel, accent, className, style }: FloatingCardProps) {
  const accentBg = accent === "red" ? "bg-brand-red-soft text-brand-red" : "bg-brand-blue-soft text-brand-blue";
  return (
    <div
      className={`card card-hover p-4 sm:p-5 flex items-center gap-3 ${className ?? ""}`}
      style={style}
    >
      <div className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${accentBg}`}>
        <Icon name={icon} className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-ink-900 truncate">{label}</p>
        <p className="text-xs text-ink-500 truncate">{sublabel}</p>
      </div>
    </div>
  );
}
