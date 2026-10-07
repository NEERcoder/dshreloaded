import { useEffect, useState } from "react";
import SectionHeader from "./SectionHeader";
import { categoryById } from "../../lib/categories";
import OpportunityCarousel from "./OpportunityCarousel";
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
    <section id="aim" className="band pillar-aim scroll-mt-24">
      <div className="container-px py-6 sm:py-8 lg:py-10">
        <SectionHeader
          eyebrow="AIM"
          title="Internships, jobs, certifications"
          description="Verified openings worth your application."
          viewAllHref="/aim"
          viewAllLabel="View All AIM"
          iconSrc={categoryById("aim")?.iconSrc}
        />
        <div className="mt-5">
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
            <OpportunityCarousel items={items} />
          )}
        </div>
      </div>
    </section>
  );
}
