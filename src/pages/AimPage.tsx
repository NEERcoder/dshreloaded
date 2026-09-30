import PageShell from "../components/PageShell";
import OpportunityBrowser, { type CategoryChip } from "../components/opportunities/OpportunityBrowser";

const AIM_CATEGORIES = ["internship", "job", "certification"] as const;

const AIM_CHIPS: CategoryChip[] = [
  { id: "all", label: "All AIM", category: null },
  { id: "internship", label: "Internships", category: "internship" },
  { id: "job", label: "Jobs", category: "job" },
  { id: "certification", label: "Certifications", category: "certification" },
];

export default function AimPage() {
  return (
    <PageShell
      title="AIM — Internships, Jobs & Certifications | JAVLIN"
      description="Verified internships, jobs, and certifications for students. Find something worth going after."
      backgroundPreset="opportunities"
    >
      <section className="page-hero pillar-aim">
        <div className="container-px">
          <p className="eyebrow">AIM</p>
          <h1 className="page-title font-display mt-2">
            Find something worth going after.
          </h1>
          <p className="page-lede mt-3 max-w-2xl">
            Internships, jobs, and certifications — verified openings worth your application.
          </p>
        </div>
      </section>

      <section className="container-px py-8 sm:py-10">
        <OpportunityBrowser
          categories={[...AIM_CATEGORIES]}
          chips={AIM_CHIPS}
          showCompensation
          showCourse
          searchPlaceholder="Search by role, company, skills or field…"
          emptyTitle="No AIM openings listed yet"
          emptyDescription="Internships, jobs and certifications appear here as soon as they are verified and published."
          noResultsTitle="Nothing matches those filters"
          noResultsDescription="Clear a filter or widen your search to see more of AIM."
        />
      </section>
    </PageShell>
  );
}
