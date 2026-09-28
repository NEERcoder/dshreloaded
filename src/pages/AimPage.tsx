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
      <section className="border-b border-surface-border bg-brand-blue-pale/60 backdrop-blur-[2px] pt-10 pb-8 sm:pt-14 sm:pb-10">
        <div className="container-px">
          <p className="eyebrow text-brand-red">AIM</p>
          <h1 className="font-display mt-2 text-3xl sm:text-5xl font-extrabold tracking-tight text-ink-900 leading-tight">
            Find something worth going after.
          </h1>
          <p className="mt-3 max-w-2xl text-base sm:text-lg leading-relaxed text-ink-600 font-medium">
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
