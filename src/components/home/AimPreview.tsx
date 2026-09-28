import { useEffect, useState } from "react";
import SectionHeader from "./SectionHeader";
import CompactOpportunityCard from "./CompactOpportunityCard";
import EmptyState from "./EmptyState";
import CardRowSkeleton from "./CardRowSkeleton";
import { getOpportunities, type OpportunityRecord } from "../../lib/dataAccess";

const AIM_CATEGORIES: OpportunityRecord["category"][] = ["internship", "job", "certification"];

export default function AimPreview() {
  const [items, setItems] = useState<OpportunityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getOpportunities().then((result) => {
      if (cancelled) return;
      const aim = result.data
        .filter((item) => AIM_CATEGORIES.includes(item.category))
        .sort((a, b) => {
          if (a.featured !== b.featured) return a.featured ? -1 : 1;
          return b.createdAt.localeCompare(a.createdAt);
        })
        .slice(0, 4);
      setItems(aim);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="aim" className="scroll-mt-24 border-t border-surface-border bg-white/60 backdrop-blur-[2px]">
      <div className="container-px py-10 sm:py-14">
        <SectionHeader
          eyebrow="AIM"
          title="Find something worth going after."
          description="Internships, jobs, and certifications — verified openings worth your application."
          viewAllHref="/aim"
          viewAllLabel="View All AIM"
        />
        <div className="mt-6">
          {loading ? (
            <CardRowSkeleton />
          ) : items.length === 0 ? (
            <EmptyState
              icon="briefcase"
              title="No openings right now"
              description="New internships, jobs, and certifications are added regularly. Check back soon."
              ctaLabel="Browse FIELD"
              ctaHref="/field"
            />
          ) : (
            <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-4 lg:overflow-visible">
              {items.map((item) => (
                <CompactOpportunityCard key={item.id} item={item} href="/aim" />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
