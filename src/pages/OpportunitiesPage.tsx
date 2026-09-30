import Icon from "../components/Icon";
import PageShell from "../components/PageShell";
import OpportunityBrowser from "../components/opportunities/OpportunityBrowser";
import { Link } from "../lib/router";
import { type OpportunityCategoryParam } from "../lib/opportunityRoute";
import type { OpportunityRecord } from "../lib/dataAccess";

type CategoryFilter = {
  param: OpportunityCategoryParam;
  label: string;
  category: OpportunityRecord["category"];
  icon: string;
  eyebrow: string;
  title: string;
  subtitle: string;
};

const CATEGORY_FILTERS: CategoryFilter[] = [
  {
    param: "internships",
    label: "Internships",
    category: "internship",
    icon: "briefcase",
    eyebrow: "INTERNSHIPS",
    title: "Find experience worth applying for.",
    subtitle: "Verified industry and startup roles for Delhi University undergraduates.",
  },
  {
    param: "competitions",
    label: "Competitions",
    category: "competition",
    icon: "trophy",
    eyebrow: "COMPETITIONS",
    title: "Put your skills to work.",
    subtitle: "National contests, hackathons, and challenges worth winning.",
  },
  {
    param: "research",
    label: "Research",
    category: "research",
    icon: "flask",
    eyebrow: "RESEARCH",
    title: "Find opportunities to learn and contribute.",
    subtitle: "Faculty laboratory attachments, funded fellowships, and academic projects.",
  },
  {
    param: "certifications",
    label: "Certifications",
    category: "certification",
    icon: "award",
    eyebrow: "CERTIFICATIONS",
    title: "Build skills that strengthen your next application.",
    subtitle: "Verified credentials recognized across academia and industry.",
  },
];

const ALL_CATEGORIES: OpportunityRecord["category"][] = [
  "internship",
  "job",
  "competition",
  "research",
  "certification",
  "fellowship",
  "scholarship",
];

const DEFAULT_VOICE = {
  eyebrow: "OPPORTUNITY RADAR",
  title: "Find Things Worth Applying For.",
  subtitle: "Verified internships, hackathons, research fellowships, and credentials for DU students.",
};

export default function OpportunitiesPage({ categoryId }: { categoryId?: string }) {
  const activeFilter = CATEGORY_FILTERS.find((filter) => filter.param === categoryId);
  const voice = activeFilter ?? DEFAULT_VOICE;

  return (
    <PageShell
      title={activeFilter ? `${activeFilter.label} | Opportunity Radar | JAVLIN` : "Find Opportunities | JAVLIN"}
      description="Find verified science internships, hackathons, research fellowships and certifications for DU students."
      backgroundPreset="opportunities"
    >
      <section className="bg-brand-blue-pale/60 backdrop-blur-[2px] border-b border-surface-border pt-8 pb-8 sm:pt-12 sm:pb-10">
        <div className="container-px max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <p className="eyebrow">{voice.eyebrow}</p>
            <h1 className="font-display mt-3 text-[1.875rem] sm:text-5xl lg:text-6xl font-black tracking-tight text-ink-900 leading-[1.1]">
              {voice.title}
            </h1>
            <p className="mt-4 text-[15px] sm:text-lg leading-relaxed text-ink-600 font-medium">
              {voice.subtitle}
            </p>
          </div>

          {/* CATEGORY FILTERS — each is a canonical /opportunities/:categoryId route */}
          <nav aria-label="Opportunity categories" className="mt-7 -mx-4 overflow-x-auto no-scrollbar px-4 sm:mx-0 sm:px-0">
            <div className="flex w-max sm:flex-wrap sm:w-auto gap-2">
              <CategoryChip label="All listings" icon="grid" active={!activeFilter} href="/opportunities" />
              {CATEGORY_FILTERS.map((filter) => (
                <CategoryChip
                  key={filter.param}
                  label={filter.label}
                  icon={filter.icon}
                  active={activeFilter?.param === filter.param}
                  href={`/opportunities/${filter.param}`}
                />
              ))}
            </div>
          </nav>
        </div>
      </section>

      <section id="radar-feed" className="py-10 sm:py-14">
        <div className="container-px max-w-7xl mx-auto">
          <OpportunityBrowser
            categories={activeFilter ? [activeFilter.category] : ALL_CATEGORIES}
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

function CategoryChip({
  label,
  icon,
  href,
  active,
}: {
  label: string;
  icon: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition-colors duration-200 min-h-[44px] ${
        active
          ? "bg-brand-blue text-white shadow-soft"
          : "bg-white text-ink-600 border border-surface-border hover:text-brand-blue hover:border-brand-blue/40"
      }`}
    >
      <Icon name={icon} className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
