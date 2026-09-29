import PageShell from "../components/PageShell";
import OpportunityBrowser from "../components/opportunities/OpportunityBrowser";

export default function FieldPage() {
  return (
    <PageShell
      title="FIELD — Competitions & Challenges | JAVLIN"
      description="Hackathons, case competitions and contests worth entering. Find the challenge that fits you."
      backgroundPreset="opportunities"
    >
      <section className="border-b border-surface-border bg-brand-blue-pale/60 backdrop-blur-[2px] pt-10 pb-8 sm:pt-14 sm:pb-10">
        <div className="container-px">
          <p className="eyebrow text-brand-red">FIELD</p>
          <h1 className="font-display mt-2 text-3xl sm:text-5xl font-extrabold tracking-tight text-ink-900 leading-tight">
            Pick your challenge.
          </h1>
          <p className="mt-3 max-w-2xl text-base sm:text-lg leading-relaxed text-ink-600 font-medium">
            Hackathons, case competitions and contests — filter by what you want to prove. Need a team? CREW has you
            covered.
          </p>
        </div>
      </section>

      <section className="container-px py-8 sm:py-10">
        <OpportunityBrowser
          categories={["competition"]}
          showCompensation
          showCourse
          searchPlaceholder="Search competitions, organisers or domains…"
          emptyTitle="No competitions on the field right now"
          emptyDescription="New competitions are listed here as soon as they open. Check back soon."
          noResultsTitle="No competitions match those filters"
          noResultsDescription="Try a wider search or clear the filters."
        />
      </section>
    </PageShell>
  );
}
