import { useState } from "react";
import { Link } from "../lib/router";
import Icon from "./Icon";
import TiltCard from "./TiltCard";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { staggerDelay } from "../lib/motion";

// Primary opportunity categories shown on homepage
const opportunityCategories = [
  {
    id: "internships",
    tag: "INTERNSHIPS",
    headline: "Find experience worth applying for.",
    description: "Industry and startup roles for DU undergraduates.",
    href: "/opportunities/internships",
    icon: "briefcase",
    accent: "blue" as const,
  },
  {
    id: "competitions",
    tag: "COMPETITIONS",
    headline: "Put your skills to work.",
    description: "National hackathons, case challenges, and lab competitions.",
    href: "/opportunities/competitions",
    icon: "target",
    accent: "red" as const,
  },
  {
    id: "research",
    tag: "RESEARCH",
    headline: "Learn and contribute.",
    description: "Faculty lab attachments, fellowships, and co-authorship.",
    href: "/opportunities/research",
    icon: "flask",
    accent: "blue" as const,
  },
  {
    id: "certifications",
    tag: "CERTIFICATIONS",
    headline: "Skills for your next application.",
    description: "Verified credentials in science and technology.",
    href: "/opportunities/certifications",
    icon: "award",
    accent: "blue" as const,
  },
];

export default function HomeChoices() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const { ref: oppRef, isVisible: oppVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.06 });
  const { ref: exploreRef, isVisible: exploreVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.06 });

  return (
    <>
      {/* =====================================================
          SECTION 1 — OPPORTUNITIES (PRIMARY / DOMINANT)
          ===================================================== */}
      <section className="pb-16 sm:pb-24">
        <div className="container-px max-w-7xl mx-auto">
          {/* Section heading */}
          <div className="mb-8 sm:mb-10">
            <p className="eyebrow text-brand-red">OPPORTUNITY RADAR</p>
            <div className="mt-3 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-ink-900 leading-[1.1]">
                Find things worth<br className="hidden sm:block" /> applying for.
              </h2>
              <Link
                href="/opportunities"
                className="inline-flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-brand-blue hover:text-brand-blue-dark shrink-0"
              >
                View all opportunities <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-3 text-base text-ink-500 max-w-2xl">
              Internships, competitions, research positions and certifications — verified and curated for Delhi University students.
            </p>
          </div>

          {/* 4 category cards — large and prominent */}
          <div
            ref={oppRef}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {opportunityCategories.map((cat, idx) => {
              const isHovered = hoveredIdx === idx;
              const isOtherHovered = hoveredIdx !== null && hoveredIdx !== idx;
              const isRed = cat.accent === "red";

              return (
                <div
                  key={cat.id}
                  className={`reveal-stagger ${oppVisible ? "is-visible" : ""}`}
                  style={{ transitionDelay: staggerDelay(idx, 70) }}
                >
                  <TiltCard className="h-full">
                    <Link
                      href={cat.href}
                      data-cursor="view"
                      onMouseEnter={() => setHoveredIdx(idx)}
                      className={`group relative flex flex-col justify-between rounded-2xl p-6 sm:p-7 border bg-white transition-all duration-300 h-full min-h-[260px] sm:min-h-[300px] ${
                        isHovered
                          ? `scale-[1.03] z-20 shadow-lift ${isRed ? "border-brand-red ring-2 ring-brand-red/10" : "border-brand-blue ring-2 ring-brand-blue/10"}`
                          : isOtherHovered
                          ? "opacity-60 scale-[0.98] border-surface-border shadow-soft"
                          : "border-surface-border shadow-card hover:shadow-lift"
                      }`}
                    >
                      {/* Accent top bar */}
                      <div className={`absolute top-0 left-5 right-5 h-1.5 rounded-b-full transition-all duration-300 ${isHovered ? (isRed ? "bg-brand-red h-2" : "bg-brand-blue h-2") : isRed ? "bg-brand-red/40" : "bg-brand-blue/40"}`} />

                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-block rounded-lg px-3 py-1 text-[11px] font-black uppercase tracking-wider ${isRed ? "bg-brand-red text-white" : "bg-brand-blue text-white"}`}>
                            {cat.tag}
                          </span>
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300 ${isHovered ? (isRed ? "bg-brand-red text-white scale-110" : "bg-brand-blue text-white scale-110") : isRed ? "bg-brand-red-soft text-brand-red" : "bg-brand-blue-soft text-brand-blue"}`}>
                            <Icon name={cat.icon} className="h-5 w-5" />
                          </div>
                        </div>
                        <h3 className="mt-5 text-lg sm:text-xl font-extrabold text-ink-900 leading-snug group-hover:text-brand-blue transition-colors">
                          {cat.headline}
                        </h3>
                        <p className="mt-2 text-sm text-ink-500 leading-relaxed">{cat.description}</p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between">
                        <span className={`text-xs font-extrabold uppercase tracking-wider ${isRed ? "text-brand-red" : "text-brand-blue"}`}>
                          Explore →
                        </span>
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all duration-300 ${isHovered ? (isRed ? "bg-brand-red text-white translate-x-1" : "bg-brand-blue text-white translate-x-1") : "bg-surface-soft text-ink-500"}`}>
                          <Icon name="arrow" className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </Link>
                  </TiltCard>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================
          SECTION 2 — EXPLORE DU (SECONDARY)
          ===================================================== */}
      <section className="pb-16 sm:pb-24 border-t border-surface-border pt-16 sm:pt-24 bg-brand-blue-pale/40">
        <div ref={exploreRef} className="container-px max-w-7xl mx-auto">
          <div className="mb-8">
            <p className="eyebrow text-brand-blue">EXPLORE DU</p>
            <div className="mt-3 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900">
                Know your university.
              </h2>
              <Link href="/explore" className="text-sm font-extrabold uppercase tracking-wider text-brand-blue hover:text-brand-blue-dark shrink-0">
                Explore all colleges →
              </Link>
            </div>
          </div>

          <div className={`grid gap-5 sm:grid-cols-2 reveal-stagger ${exploreVisible ? "is-visible" : ""}`}>
            {/* College Directory */}
            <TiltCard className="h-full">
              <Link
                href="/explore"
                data-cursor="explore"
                className="group card card-hover flex flex-col gap-4 p-7 h-full bg-white border border-surface-border shadow-card"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-brand-blue-soft flex items-center justify-center shrink-0 group-hover:bg-brand-blue group-hover:text-white transition-colors">
                    <Icon name="building" className="h-6 w-6 text-brand-blue group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-brand-blue">DU COLLEGES</span>
                    <h3 className="mt-0.5 text-xl font-extrabold text-ink-900 group-hover:text-brand-blue transition-colors">
                      College Directory
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-ink-500 leading-relaxed">
                  Profiles, campus info, student reviews and real experiences across all 91 Delhi University colleges.
                </p>
                <div className="mt-auto pt-4 border-t border-surface-border flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-brand-blue">Browse colleges →</span>
                </div>
              </Link>
            </TiltCard>

            {/* College Reviews */}
            <TiltCard className="h-full">
              <Link
                href="/explore"
                data-cursor="explore"
                className="group card card-hover flex flex-col gap-4 p-7 h-full bg-white border border-surface-border shadow-card"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-brand-red-soft flex items-center justify-center shrink-0 group-hover:bg-brand-red transition-colors">
                    <Icon name="star" className="h-6 w-6 text-brand-red group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-brand-red">STUDENT REVIEWS</span>
                    <h3 className="mt-0.5 text-xl font-extrabold text-ink-900 group-hover:text-brand-blue transition-colors">
                      College Reviews
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-ink-500 leading-relaxed">
                  Real experiences from students across DU campuses — academics, facilities, faculty and culture.
                </p>
                <div className="mt-auto pt-4 border-t border-surface-border flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-brand-red">Read reviews →</span>
                </div>
              </Link>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* =====================================================
          SECTION 3 — JOIN OUR TEAM (COMPACT / TERTIARY)
          ===================================================== */}
      <section className="py-12 sm:py-16 border-t border-surface-border">
        <div className="container-px max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 rounded-2xl border border-surface-border bg-white p-6 sm:p-8 shadow-soft">
            <div className="flex items-center gap-5">
              <div className="h-12 w-12 rounded-2xl bg-brand-red-soft flex items-center justify-center shrink-0">
                <Icon name="users" className="h-6 w-6 text-brand-red" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-brand-red">JOIN OUR TEAM</p>
                <h3 className="mt-0.5 text-lg font-extrabold text-ink-900">Want to represent your college?</h3>
                <p className="mt-0.5 text-sm text-ink-500">
                  Join the DU Science Hub student network and help build the platform.
                </p>
              </div>
            </div>
            <Link
              href="/join"
              data-cursor="join"
              className="btn-primary shrink-0 whitespace-nowrap"
            >
              Join Our Team
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
