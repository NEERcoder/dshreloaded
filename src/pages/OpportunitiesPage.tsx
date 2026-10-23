import Icon from "../components/Icon";
import PageShell from "../components/PageShell";
import OpportunityBrowser from "../components/opportunities/OpportunityBrowser";
import FeatureIcon, { type FeatureIconName } from "../components/FeatureIcon";
import { Link } from "../lib/router";
import { type OpportunityCategoryParam } from "../lib/opportunityRoute";
import type { OpportunityRecord } from "../lib/dataAccess";

type CategoryLink = {
  param: OpportunityCategoryParam;
  label: string;
  icon: string;
  /** Supplied artwork; wins over `icon` when present. */
  feature?: FeatureIconName;
};

/**
 * The four category destinations. Each is a page of its own now — heading, rail
 * and card layout to its own wireframe — so this index only has to say what the
 * whole feed holds and hand the reader to the right one.
 */
const CATEGORY_LINKS: CategoryLink[] = [
  { param: "internships", label: "Internships", icon: "briefcase", feature: "internship" },
  { param: "competitions", label: "Competitions", icon: "trophy", feature: "competition" },
  { param: "research", label: "Research", icon: "flask" },
  { param: "certifications", label: "Certifications", icon: "award", feature: "certification" },
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

export default function OpportunitiesPage() {
  return (
    <PageShell
      title="Find Opportunities | JAVLIN"
      description="Find verified internships, hackathons, research fellowships and certifications for students across India."
      backgroundPreset="opportunities"
    >
      {/* The listing is the point of this page, so the band above it keeps the
          phone rhythm as tight as the design system allows. */}
      <section className="bg-brand-blue-pale/60 backdrop-blur-[2px] border-b border-surface-border pt-6 pb-6 sm:pt-12 sm:pb-10">
        <div className="container-px max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <p className="eyebrow">OPPORTUNITY RADAR</p>
            <h1 className="page-title font-display mt-2 sm:mt-3">
              Find Things Worth Applying For.
            </h1>
            <p className="mt-3 text-[15px] sm:text-lg leading-relaxed text-ink-600 font-medium sm:mt-4">
              Verified internships, hackathons, research fellowships, and credentials for students.
            </p>
          </div>

          {/* CATEGORY LINKS — each is a canonical /opportunities/:categoryId route */}
          <nav aria-label="Opportunity categories" className="mt-5 -mx-4 overflow-x-auto no-scrollbar px-4 sm:mx-0 sm:mt-7 sm:px-0">
            <div className="flex w-max sm:flex-wrap sm:w-auto gap-2">
              {CATEGORY_LINKS.map((filter) => (
                <CategoryChip
                  key={filter.param}
                  label={filter.label}
                  icon={filter.icon}
                  feature={filter.feature}
                  href={`/opportunities/${filter.param}`}
                />
              ))}
            </div>
          </nav>
        </div>
      </section>

      <section id="radar-feed" className="py-6 sm:py-14">
        <div className="container-px max-w-7xl mx-auto">
          <OpportunityBrowser
            categories={ALL_CATEGORIES}
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
  feature,
  href,
}: {
  label: string;
  icon: string;
  feature?: FeatureIconName;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition-colors duration-200 min-h-[44px] bg-white text-ink-600 border border-surface-border hover:text-brand-blue hover:border-brand-blue/40"
    >
      {feature ? <FeatureIcon name={feature} className="h-3.5 w-3.5" /> : <Icon name={icon} className="h-3.5 w-3.5" />}
      {label}
    </Link>
  );
}
