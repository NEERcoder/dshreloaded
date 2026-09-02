import { useState } from "react";
import { Link } from "../lib/router";
import Icon from "./Icon";
import TiltCard from "./TiltCard";

type ChoiceDoor = {
  id: string;
  categoryLabel: string;
  headline: string;
  description: string;
  ctaText: string;
  href: string;
  accent: "blue" | "red";
  icon: string;
  cursorAction: "explore" | "join" | "view";
};

const doors: ChoiceDoor[] = [
  {
    id: "colleges",
    categoryLabel: "DU COLLEGES",
    headline: "Explore DU Colleges",
    description: "Explore all 91 Delhi University colleges, campus information, student reviews and real experiences.",
    ctaText: "EXPLORE COLLEGES",
    href: "/explore",
    accent: "blue",
    icon: "building",
    cursorAction: "explore",
  },
  {
    id: "team",
    categoryLabel: "JOIN OUR TEAM",
    headline: "Represent Your College",
    description: "Become the DU Science Hub voice on your campus. Cover stories, create content and help build the platform.",
    ctaText: "JOIN OUR TEAM",
    href: "/join",
    accent: "red",
    icon: "users",
    cursorAction: "join",
  },
  {
    id: "opportunities",
    categoryLabel: "INTERNSHIPS & COMPETITIONS",
    headline: "Find Opportunities",
    description: "Discover internships, competitions, research and certifications made for students.",
    ctaText: "FIND OPPORTUNITIES",
    href: "/opportunities",
    accent: "blue",
    icon: "target",
    cursorAction: "view",
  },
];

export default function HomeChoices() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <section className="pb-20 sm:pb-28 lg:pb-36">
      <div className="container-px max-w-7xl mx-auto">
        {/* Three Grand Doors */}
        <div
          className="grid gap-6 lg:gap-8 lg:grid-cols-3 items-stretch"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {doors.map((door, idx) => {
            const isHovered = hoveredIdx === idx;
            const isOtherHovered = hoveredIdx !== null && hoveredIdx !== idx;
            const isRed = door.accent === "red";

            return (
              <TiltCard key={door.id} className="h-full">
                <Link
                  href={door.href}
                  data-cursor={door.cursorAction}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  className={`group relative flex flex-col justify-between rounded-3xl p-6 sm:p-10 lg:p-11 border bg-white/95 backdrop-blur-md transition-all duration-300 ease-out will-change-transform active:scale-[0.98] h-full min-h-[380px] sm:min-h-[460px] ${
                    isHovered
                      ? `scale-[1.03] z-20 shadow-lift ${
                          isRed
                            ? "border-brand-red ring-4 ring-brand-red/10"
                            : "border-brand-blue ring-4 ring-brand-blue/10"
                        }`
                      : isOtherHovered
                      ? "opacity-60 scale-[0.98] border-surface-border shadow-soft"
                      : "opacity-100 border-surface-border shadow-card hover:shadow-lift"
                  }`}
                >
                  {/* Top Solid Accent Bar */}
                  <div
                    className={`absolute top-0 left-6 right-6 sm:left-8 sm:right-8 h-1.5 rounded-b-full transition-all duration-300 ${
                      isHovered
                        ? isRed
                          ? "bg-brand-red h-2"
                          : "bg-brand-blue h-2"
                        : isRed
                        ? "bg-brand-red/40"
                        : "bg-brand-blue/40"
                    }`}
                  />

                  {/* Upper Content Area */}
                  <div>
                    {/* Visual Category Label Badge */}
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`inline-block rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-black tracking-wider uppercase ${
                          isRed
                            ? "bg-brand-red text-white shadow-sm"
                            : "bg-brand-blue text-white shadow-sm"
                        }`}
                      >
                        {door.categoryLabel}
                      </span>
                      <div
                        className={`h-11 w-11 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                          isHovered
                            ? isRed
                              ? "bg-brand-red text-white scale-110 shadow-soft"
                              : "bg-brand-blue text-white scale-110 shadow-soft"
                            : isRed
                            ? "bg-brand-red-soft text-brand-red"
                            : "bg-brand-blue-soft text-brand-blue"
                        }`}
                      >
                        <Icon name={door.icon} className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                    </div>

                    {/* Prominent Large Headline */}
                    <h2 className="mt-6 sm:mt-8 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-ink-900 leading-snug group-hover:text-brand-blue transition-colors">
                      {door.headline}
                    </h2>

                    {/* Clear, Plain-Language Description */}
                    <p className="mt-3 sm:mt-4 text-base sm:text-lg leading-relaxed text-ink-600 font-normal">
                      {door.description}
                    </p>
                  </div>

                  {/* Obvious Action CTA */}
                  <div className="mt-8 sm:mt-10 pt-5 sm:pt-6 border-t border-surface-border flex items-center justify-between">
                    <span
                      className={`text-sm sm:text-base font-extrabold tracking-wide uppercase transition-colors ${
                        isRed ? "text-brand-red" : "text-brand-blue"
                      }`}
                    >
                      {door.ctaText} →
                    </span>
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-300 ${
                        isHovered
                          ? isRed
                            ? "bg-brand-red text-white translate-x-1.5 shadow-soft"
                            : "bg-brand-blue text-white translate-x-1.5 shadow-soft"
                          : "bg-surface-soft text-ink-600 group-hover:bg-brand-blue-soft group-hover:text-brand-blue"
                      }`}
                    >
                      <Icon
                        name="arrow"
                        className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5"
                      />
                    </div>
                  </div>
                </Link>
              </TiltCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
