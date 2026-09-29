import Icon from "../components/Icon";
import OpportunityDetail from "../components/opportunities/OpportunityDetail";
import PageShell from "../components/PageShell";
import { Link } from "../lib/router";

export default function OpportunityDetailPage({ opportunityId }: { opportunityId: string }) {
  return (
    <PageShell
      title="Opportunity | JAVLIN"
      description="Full details, eligibility and application link for this verified opportunity."
      backgroundPreset="opportunities"
    >
      <div className="container-px max-w-3xl mx-auto py-8 sm:py-12">
        <Link
          href="/opportunities"
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-brand-blue hover:underline"
        >
          <Icon name="arrow-left" className="h-4 w-4" />
          Back to Opportunity Radar
        </Link>

        <div className="mt-5 card overflow-hidden rounded-3xl bg-white border border-surface-border shadow-card">
          <OpportunityDetail opportunityId={opportunityId} />
        </div>
      </div>
    </PageShell>
  );
}
