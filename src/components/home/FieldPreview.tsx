import { useEffect, useState } from "react";
import SectionHeader from "./SectionHeader";
import { categoryById } from "../../lib/categories";
import CompactOpportunityCard from "./CompactOpportunityCard";
import EmptyState from "./EmptyState";
import CardRowSkeleton from "./CardRowSkeleton";
import { getOpportunities, type OpportunityRecord } from "../../lib/dataAccess";

export default function FieldPreview() {
  const [items, setItems] = useState<OpportunityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getOpportunities("competition").then((result) => {
      if (cancelled) return;
      setItems(result.data.slice(0, 4));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="field" className="scroll-mt-24 border-t glass-panel">
      <div className="container-px py-10 sm:py-14">
        <SectionHeader
          eyebrow="FIELD"
          title="Ready for a challenge?"
          description="Hackathons, case competitions, and contests where you can test your skills."
          viewAllHref="/field"
          viewAllLabel="Explore FIELD"
          iconSrc={categoryById("field")?.iconSrc}
        />
        <div className="mt-6">
          {loading ? (
            <CardRowSkeleton />
          ) : items.length === 0 ? (
            <EmptyState
              icon="trophy"
              title="No challenges live right now"
              description="New competitions land on FIELD as soon as they open. Check back soon."
            />
          ) : (
            <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-4 lg:overflow-visible">
              {items.map((item) => (
                <CompactOpportunityCard key={item.id} item={item} href="/field" />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
