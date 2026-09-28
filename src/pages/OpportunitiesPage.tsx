import Icon from "../components/Icon";
import PageShell from "../components/PageShell";
import SectionHeading from "../components/SectionHeading";
import TiltCard from "../components/TiltCard";
import OpportunityBrowser from "../components/opportunities/OpportunityBrowser";
import { Link } from "../lib/router";
import type { OpportunityRecord } from "../lib/dataAccess";

const categoryMap: Record<string, OpportunityRecord["category"]> = {
  internships: "internship",
  competitions: "competition",
  research: "research",
  certifications: "certification",
};

const ALL_CATEGORIES: OpportunityRecord["category"][] = [
  "internship",
  "job",
  "competition",
  "research",
  "certification",
  "fellowship",
  "scholarship",
];

const categoryVoice: Record<string, { eyebrow: string; title: string; subtitle: string }> = {
  internships: {
    eyebrow: "INTERNSHIPS",
    title: "Find experience worth applying for.",
    subtitle: "Verified industry and startup roles for Delhi University undergraduates.",
  },
  competitions: {
    eyebrow: "COMPETITIONS",
    title: "Put your skills to work.",
    subtitle: "National contests, hackathons, and challenges worth winning.",
  },
  research: {
    eyebrow: "RESEARCH",
    title: "Find opportunities to learn and contribute.",
    subtitle: "Faculty laboratory attachments, funded fellowships, and academic projects.",
  },
  certifications: {
    eyebrow: "CERTIFICATIONS",
    title: "Build skills that strengthen your next application.",
    subtitle: "Verified credentials recognized across academia and industry.",
  },
};

const mainCategories = [
  {
    id: "internships",
    tag: "INTERNSHIPS",
    headline: "Find experience worth applying for.",
    description: "Industry attachments, startup projects, and technical internships.",
    cta: "EXPLORE INTERNSHIPS",
    accent: "blue",
    icon: "briefcase",
  },
  {
    id: "competitions",
    tag: "COMPETITIONS",
    headline: "Put your skills to work.",
    description: "National hackathons, case challenges, and lab competitions.",
    cta: "EXPLORE COMPETITIONS",
    accent: "red",
    icon: "trophy",
  },
  {
    id: "research",
    tag: "RESEARCH",
    headline: "Opportunities to learn & contribute.",
    description: "Faculty lab attachments, fellowships, and academic paper co-authorship.",
    cta: "EXPLORE RESEARCH",
    accent: "blue",
    icon: "flask",
  },
  {
    id: "certifications",
    tag: "CERTIFICATIONS",
    headline: "Skills for your next application.",
    description: "Verified certifications in Python, Data Science, and laboratory techniques.",
    cta: "EXPLORE CERTIFICATIONS",
    accent: "blue",
    icon: "award",
  },
];

export default function OpportunitiesPage({ categoryId }: { categoryId?: string }) {
  const category = categoryId ? categoryMap[categoryId] : undefined;
  const currentVoice = categoryId && categoryVoice[categoryId]
    ? categoryVoice[categoryId]
    : {
        eyebrow: "OPPORTUNITY RADAR",
        title: "Find Things Worth Applying For.",
        subtitle: "Verified internships, hackathons, research fellowships, and credentials for DU students.",
      };

  return (
    <PageShell
      title={category ? `${category.toUpperCase()} | Opportunity Radar | JAVLIN` : "Find Opportunities | JAVLIN"}
      description="Find verified science internships, hackathons, research fellowships and certifications for DU students."
      backgroundPreset="opportunities"
    >
      {/* 1. EDITORIAL HEADER */}
      <section className="bg-brand-blue-pale/60 backdrop-blur-[2px] border-b border-surface-border pt-12 pb-16 sm:pt-16 sm:pb-20">
        <div className="container-px max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <p className="eyebrow text-brand-red">{currentVoice.eyebrow}</p>
            <h1 className="font-display mt-3 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-ink-900 leading-[1.1]">
              {currentVoice.title}
            </h1>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-ink-600 font-medium">
              {currentVoice.subtitle}
            </p>
          </div>

          {/* 2. THE 4 MAIN CATEGORIES (DOORS) WHEN AT ROOT /OPPORTUNITIES */}
          {!categoryId && (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {mainCategories.map((cat) => {
                const isRed = cat.accent === "red";
                return (
                  <TiltCard key={cat.id} className="h-full">
                    <Link
                      href={`/opportunities/${cat.id}`}
                      data-cursor="view"
                      className="card card-hover p-6 sm:p-7 h-full flex flex-col justify-between bg-white border border-surface-border shadow-card group"
                    >
                      <div>
                        <span
                          className={`inline-block rounded-lg px-3 py-1 text-[11px] font-black uppercase tracking-wider ${
                            isRed
                              ? "bg-brand-red text-white shadow-sm"
                              : "bg-brand-blue text-white shadow-sm"
                          }`}
                        >
                          {cat.tag}
                        </span>

                        <h2 className="mt-5 text-xl font-black text-ink-900 group-hover:text-brand-blue transition-colors leading-snug">
                          {cat.headline}
                        </h2>

                        <p className="mt-3 text-sm text-ink-500 leading-relaxed font-normal">
                          {cat.description}
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider ${
                            isRed ? "text-brand-red" : "text-brand-blue"
                          }`}
                        >
                          {cat.cta} <Icon name="arrow" className="h-3.5 w-3.5" />
                        </span>
                        <div
                          className="h-8 w-8 rounded-xl bg-surface-soft flex items-center justify-center text-ink-600 group-hover:bg-brand-blue-soft group-hover:text-brand-blue transition-colors"
                          aria-hidden="true"
                        >
                          <Icon name={cat.icon} className="h-4 w-4" />
                        </div>
                      </div>
                    </Link>
                  </TiltCard>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 3. OPPORTUNITY RADAR FEED */}
      <section id="radar-feed" className="py-14 sm:py-20">
        <div className="container-px max-w-7xl mx-auto">
          {categoryId ? (
            <div className="mb-6 flex items-center justify-between">
              <Link
                href="/opportunities"
                className="inline-flex items-center gap-2 text-xs font-black text-brand-blue hover:underline uppercase tracking-wider"
              >
                <Icon name="arrow-left" className="h-4 w-4" /> Back to All 4 Categories
              </Link>
              <span className="text-xs font-bold text-ink-500 uppercase tracking-wider">
                Showing {category} listings
              </span>
            </div>
          ) : (
            <SectionHeading
              eyebrow="OPPORTUNITY RADAR"
              title="All Active Listings"
              subtitle="Filter and search across all verified science opportunities."
              description="Real deadlines, verified partner organizations, and student-eligible openings."
            />
          )}

          <OpportunityBrowser
            categories={category ? [category] : ALL_CATEGORIES}
            showCompensation
            showCourse
            searchPlaceholder="Search by role, company, skills, or department…"
            emptyTitle="No listings on the radar yet"
            emptyDescription="Verified openings show up here as soon as they are published."
            noResultsTitle="No opportunities match those filters"
            noResultsDescription="Try clearing filters or search terms."
          />
        </div>
      </section>
    </PageShell>
  );
}
