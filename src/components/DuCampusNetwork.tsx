import { useState } from "react";
import { Link } from "../lib/router";
import Icon from "./Icon";

type NetworkCollege = {
  name: string;
  slug: string;
  campus: "North Campus" | "South Campus" | "Off Campus";
  vibe: string;
  courses: string[];
  x: number; // percentage coordinates within the abstract canvas
  y: number;
};

const networkColleges: NetworkCollege[] = [
  // North Campus Cluster
  { name: "Hindu College", slug: "hindu-college", campus: "North Campus", vibe: "Academic rigor & political heritage", courses: ["BSc (Hons) Physics", "BSc (Hons) Chemistry"], x: 28, y: 24 },
  { name: "Miranda House", slug: "miranda-house", campus: "North Campus", vibe: "NIRF #1 premier science laboratories", courses: ["BSc (Hons) Mathematics", "BSc Life Sciences"], x: 38, y: 18 },
  { name: "St. Stephen's College", slug: "st-stephens-college", campus: "North Campus", vibe: "Centuries of heritage & elite discourse", courses: ["BSc (Hons) Physics", "BSc (Hons) Chemistry"], x: 20, y: 35 },
  { name: "SRCC", slug: "shri-ram-college-of-commerce", campus: "North Campus", vibe: "India's highest commerce benchmark", courses: ["BCom (Hons)", "BA (Hons) Economics"], x: 44, y: 32 },
  { name: "Hansraj College", slug: "hansraj-college", campus: "North Campus", vibe: "Lively campus center & strong science wing", courses: ["BSc (Hons) Computer Science", "BSc (Hons) Zoology"], x: 32, y: 45 },
  { name: "Ramjas College", slug: "ramjas-college", campus: "North Campus", vibe: "Vibrant society culture & sports ground", courses: ["BSc (Hons) Statistics", "BSc Physical Sciences"], x: 18, y: 52 },
  { name: "Kirori Mal College", slug: "kirori-mal-college", campus: "North Campus", vibe: "Stage societies & dedicated faculty", courses: ["BSc (Hons) Physics", "BSc (Hons) Botany"], x: 46, y: 50 },

  // South Campus Cluster
  { name: "Sri Venkateswara", slug: "sri-venkateswara-college", campus: "South Campus", vibe: "Venkys rock & South Campus crown", courses: ["BSc (Hons) Biological Sciences", "BSc (Hons) Chemistry"], x: 68, y: 30 },
  { name: "Gargi College", slug: "gargi-college", campus: "South Campus", vibe: "Dynamic student societies & science research", courses: ["BSc (Hons) Microbiology", "BSc Life Sciences"], x: 78, y: 22 },
  { name: "Lady Shri Ram", slug: "lady-shri-ram-college-for-women", campus: "South Campus", vibe: "Critical thinking & student publications", courses: ["BSc (Hons) Mathematics", "BSc (Hons) Statistics"], x: 84, y: 40 },
  { name: "ARSD College", slug: "atma-ram-sanatan-dharma-college", campus: "South Campus", vibe: "Top NIRF research rankings & modern labs", courses: ["BSc (Hons) Computer Science", "BSc (Hons) Chemistry"], x: 62, y: 48 },
  { name: "Maitreyi College", slug: "maitreyi-college", campus: "South Campus", vibe: "Botanical gardens & peaceful science campus", courses: ["BSc (Hons) Botany", "BSc Life Sciences"], x: 74, y: 60 },

  // Off-Campus Cluster
  { name: "Deen Dayal Upadhyaya", slug: "deen-dayal-upadhyaya-college", campus: "Off Campus", vibe: "State-of-the-art Dwarka campus infrastructure", courses: ["BSc (Hons) Computer Science", "BSc (Hons) Physics"], x: 26, y: 78 },
  { name: "Acharya Narendra Dev", slug: "acharya-narendra-dev-college", campus: "Off Campus", vibe: "Heavy research focus & DBT star college", courses: ["BSc (Hons) Biomedical Science", "BSc (Hons) Chemistry"], x: 50, y: 80 },
  { name: "Keshav Mahavidyalaya", slug: "keshav-mahavidyalaya", campus: "Off Campus", vibe: "Tech culture & North-West campus anchor", courses: ["BSc (Hons) Computer Science", "BSc (Hons) Electronics"], x: 76, y: 82 },
];

export default function DuCampusNetwork() {
  const [activeCampus, setActiveCampus] = useState<string>("All");
  const [hoveredCollege, setHoveredCollege] = useState<NetworkCollege | null>(null);

  const filteredColleges = activeCampus === "All"
    ? networkColleges
    : networkColleges.filter((c) => c.campus === activeCampus);

  return (
    <section className="relative py-16 sm:py-24 border-t border-surface-border overflow-hidden">
      <div className="container-px relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="eyebrow text-brand-red">Interactive Campus Network</span>
            <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-ink-900">
              The DU Constellation.
            </h2>
            <p className="mt-2 text-sm sm:text-base text-ink-500 max-w-xl">
              An abstract network of prominent Delhi University campuses. Hover over any node to discover its identity, or click to enter the profile.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {["All", "North Campus", "South Campus", "Off Campus"].map((campus) => (
              <button
                key={campus}
                type="button"
                onClick={() => setActiveCampus(campus)}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  activeCampus === campus
                    ? "bg-brand-blue text-white shadow-soft"
                    : "bg-white border border-surface-border text-ink-700 hover:border-brand-blue/40"
                }`}
              >
                {campus}
              </button>
            ))}
          </div>
        </div>

        {/* Abstract Network Graph */}
        <div className="mt-10 relative min-h-[420px] sm:min-h-[500px] rounded-3xl border border-surface-border bg-white/70 backdrop-blur-md shadow-card overflow-hidden p-6 sm:p-10 flex items-center justify-center">
          {/* Subtle constellation lines */}
          <svg className="absolute inset-0 h-full w-full pointer-events-none opacity-25" aria-hidden="true">
            <line x1="28%" y1="24%" x2="38%" y2="18%" stroke="#1D4E89" strokeWidth="1.5" strokeDasharray="3 3" />
            <line x1="28%" y1="24%" x2="20%" y2="35%" stroke="#1D4E89" strokeWidth="1.5" strokeDasharray="3 3" />
            <line x1="38%" y1="18%" x2="44%" y2="32%" stroke="#1D4E89" strokeWidth="1.5" strokeDasharray="3 3" />
            <line x1="20%" y1="35%" x2="32%" y2="45%" stroke="#1D4E89" strokeWidth="1.5" strokeDasharray="3 3" />
            <line x1="32%" y1="45%" x2="46%" y2="50%" stroke="#1D4E89" strokeWidth="1.5" strokeDasharray="3 3" />
            <line x1="44%" y1="32%" x2="68%" y2="30%" stroke="#E63946" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="68%" y1="30%" x2="78%" y2="22%" stroke="#1D4E89" strokeWidth="1.5" strokeDasharray="3 3" />
            <line x1="78%" y1="22%" x2="84%" y2="40%" stroke="#1D4E89" strokeWidth="1.5" strokeDasharray="3 3" />
            <line x1="68%" y1="30%" x2="62%" y2="48%" stroke="#1D4E89" strokeWidth="1.5" strokeDasharray="3 3" />
            <line x1="62%" y1="48%" x2="74%" y2="60%" stroke="#1D4E89" strokeWidth="1.5" strokeDasharray="3 3" />
            <line x1="32%" y1="45%" x2="26%" y2="78%" stroke="#E63946" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="26%" y1="78%" x2="50%" y2="80%" stroke="#1D4E89" strokeWidth="1.5" strokeDasharray="3 3" />
            <line x1="50%" y1="80%" x2="76%" y2="82%" stroke="#1D4E89" strokeWidth="1.5" strokeDasharray="3 3" />
          </svg>

          {/* Node Elements */}
          <div className="relative h-full w-full min-h-[400px]">
            {filteredColleges.map((college) => {
              const isHovered = hoveredCollege?.slug === college.slug;
              const isNorth = college.campus === "North Campus";
              const isSouth = college.campus === "South Campus";

              const nodeColor = isNorth ? "#E63946" : isSouth ? "#1D4E89" : "#64748B";
              const nodeBg = isNorth ? "bg-brand-red-soft text-brand-red" : isSouth ? "bg-brand-blue-soft text-brand-blue" : "bg-surface-soft text-ink-700";

              return (
                <div
                  key={college.slug}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 transition-all duration-300 ${
                    hoveredCollege && !isHovered ? "opacity-35 scale-90" : "opacity-100"
                  }`}
                  style={{ left: `${college.x}%`, top: `${college.y}%` }}
                  onMouseEnter={() => setHoveredCollege(college)}
                  onMouseLeave={() => setHoveredCollege((prev) => (prev?.slug === college.slug ? null : prev))}
                >
                  <Link
                    href={`/explore/${college.slug}`}
                    data-cursor="explore"
                    className="flex items-center gap-2 group"
                    aria-label={`Explore ${college.name}`}
                  >
                    <div className="relative">
                      <div
                        className={`h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 border-white shadow-soft transition-all duration-300 ${
                          isHovered ? "scale-150 ring-4 ring-brand-blue/30" : "group-hover:scale-125"
                        }`}
                        style={{ backgroundColor: nodeColor }}
                      />
                      {isHovered && (
                        <span className="absolute -inset-2 rounded-full animate-ping bg-brand-red/30 pointer-events-none" />
                      )}
                    </div>
                    <span
                      className={`text-[11px] sm:text-xs font-bold transition-all truncate max-w-[110px] sm:max-w-[140px] px-2 py-0.5 rounded-md ${
                        isHovered
                          ? `${nodeBg} shadow-card ring-1 ring-black/5 scale-105`
                          : "text-ink-700 bg-white/90 group-hover:text-brand-blue border border-surface-border/60"
                      }`}
                    >
                      {college.name}
                    </span>
                  </Link>
                </div>
              );
            })}

            {/* Hover Card Detail Overlay */}
            {hoveredCollege && (
              <div
                className="absolute z-30 pointer-events-none animate-fade-in bottom-4 left-4 right-4 sm:right-auto sm:max-w-xs card p-4 bg-white/95 backdrop-blur-md shadow-lift border border-surface-border"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-brand-blue-soft px-2.5 py-0.5 text-[10px] font-bold text-brand-blue uppercase tracking-wider">
                    {hoveredCollege.campus}
                  </span>
                  <span className="text-[11px] font-semibold text-brand-red">Click to enter →</span>
                </div>
                <h4 className="mt-2 font-bold text-ink-900 text-sm leading-snug">{hoveredCollege.name}</h4>
                <p className="mt-1 text-xs text-ink-500 line-clamp-2">{hoveredCollege.vibe}</p>
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {hoveredCollege.courses.map((course) => (
                    <span key={course} className="text-[10px] font-medium bg-surface-soft text-ink-700 px-2 py-0.5 rounded">
                      {course}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Link to Full Directory */}
        <div className="mt-6 flex items-center justify-between text-xs text-ink-500">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-red" /> North Campus
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-blue" /> South Campus
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-ink-400" /> Off Campus
            </span>
          </div>
          <Link href="/explore" className="font-bold text-brand-blue hover:underline inline-flex items-center gap-1">
            Search full 91 college directory <Icon name="arrow" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
