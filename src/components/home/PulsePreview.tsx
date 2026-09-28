import { useEffect, useState } from "react";
import SectionHeader from "./SectionHeader";
import { categoryById } from "../../lib/categories";
import CompactOpportunityCard from "./CompactOpportunityCard";
import EmptyState from "./EmptyState";
import CardRowSkeleton from "./CardRowSkeleton";
import { getOpportunities, type OpportunityRecord } from "../../lib/dataAccess";

export default function PulsePreview() {
  const [items, setItems] = useState<OpportunityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getOpportunities().then((result) => {
      if (cancelled) return;
      const latest = [...result.data]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 4);
      setItems(latest);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="pulse" className="scroll-mt-24 border-t glass-panel">
      <div className="container-px py-10 sm:py-14">
        <SectionHeader
          eyebrow="PULSE"
          title="See what's happening."
          description="Updates, stories and opportunities worth knowing about."
          viewAllHref="/pulse"
          viewAllLabel="See What's Happening"
          iconSrc={categoryById("pulse")?.iconSrc}
        />
        <div className="mt-6">
          {loading ? (
            <CardRowSkeleton />
          ) : items.length === 0 ? (
            <EmptyState
              icon="play"
              title="Nothing here yet."
              description="Keep exploring — updates, stories and opportunities land here as they happen."
            />
          ) : (
            <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-4 lg:overflow-visible">
              {items.map((item) => (
                <CompactOpportunityCard key={item.id} item={item} href="/pulse" isNew />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
