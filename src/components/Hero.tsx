import { useEffect, useState } from "react";

const heroPhrases = [
  "Delhi University",
  "Internships",
  "Competitions",
  "Certifications",
  "Jobs",
  "Research",
  "Campus Life",
  "Scholarships",
];

const PHRASE_DURATION = 1400;

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
    <section className="relative overflow-hidden pt-28 pb-10 sm:pt-36 sm:pb-14 lg:pt-40 lg:pb-16">
      <div className="container-px">
        <div className="max-w-4xl mx-auto text-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-white/90 backdrop-blur-md px-4 py-1.5 text-xs font-bold text-ink-700 shadow-soft">
            <span className="h-2 w-2 rounded-full bg-brand-red animate-pulse" />
            <span className="text-brand-blue font-extrabold uppercase tracking-wider">The Living Digital Campus</span>
          </div>

          {/* Signature Animated Headline: Explore [Rotating Phrase] */}
          <div className="mt-6">
            <h1 className="text-3xl sm:text-6xl lg:text-7xl font-black tracking-tight text-ink-900 leading-[1.15] break-words">
              <span className="text-brand-blue">Explore </span>
              <span className="phrase-track text-brand-red font-black">
                <span key={index} className="phrase-item-modern">
                  {heroPhrases[index]}
                </span>
              </span>
            </h1>
          </div>

          {/* Simple Supporting Line */}
          <p className="mt-5 max-w-2xl mx-auto text-base sm:text-lg lg:text-xl leading-relaxed text-ink-600 font-medium">
            Everything you need to explore DU, represent your college, and find your next opportunity.
          </p>
        </div>
      </div>
    </section>
  );
}
