import { useEffect, useState } from "react";
import SectionHeader from "./SectionHeader";
import ReviewSnippetCard from "./ReviewSnippetCard";
import EmptyState from "./EmptyState";
import CardRowSkeleton from "./CardRowSkeleton";
import { getApprovedReviews, type ReviewRecord } from "../../lib/dataAccess";

export default function ReviewsPreview() {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getApprovedReviews(4).then((result) => {
      if (cancelled) return;
      setReviews(result.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="college-reviews" className="scroll-mt-24 border-t glass-panel">
      <div className="container-px py-10 sm:py-14">
        <SectionHeader
          eyebrow="COLLEGE REVIEWS"
          title="Before you choose, hear from students."
          description="Real reviews from students who've lived it — academics, campus life, and everything in between."
          viewAllHref="/college-reviews"
          viewAllLabel="Explore College Reviews"
        />
        <div className="mt-6">
          {loading ? (
            <CardRowSkeleton />
          ) : reviews.length === 0 ? (
            <EmptyState
              icon="star"
              title="No reviews yet"
              description="Student reviews are moderated before they appear here. Check back soon."
              ctaLabel="Browse Colleges"
              ctaHref="/explore"
            />
          ) : (
            <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-4 lg:overflow-visible">
              {reviews.map((review) => (
                <ReviewSnippetCard
                  key={review.id}
                  collegeName={review.collegeName}
                  authorName={review.name}
                  rating={review.rating}
                  excerpt={review.review}
                  href={review.collegeSlug ? `/explore/${review.collegeSlug}` : "/explore"}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
