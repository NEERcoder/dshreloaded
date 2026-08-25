import Icon from "./Icon";
import type { ReviewCardData } from "../data/reviews";

type ReviewCardProps = ReviewCardData;

export default function ReviewCard({ initials, college, course, rating, review }: ReviewCardProps) {
  return (
    <div className="card card-hover p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-brand-blue-soft text-brand-blue font-bold flex items-center justify-center text-sm">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink-900">Student Review</p>
          <p className="text-xs text-ink-500 truncate">{college} · {course}</p>
        </div>
      </div>

      <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Icon
            key={i}
            name="star"
            className={`h-4 w-4 ${i < rating ? "text-brand-red fill-brand-red" : "text-surface-border"}`}
          />
        ))}
      </div>

      <p className="text-sm text-ink-700 leading-relaxed flex-1">"{review}"</p>

      <button
        className="self-start inline-flex items-center gap-1.5 text-xs font-medium text-ink-400 hover:text-ink-700 transition-colors"
        aria-label="Report this review"
      >
        <Icon name="flag" className="h-3.5 w-3.5" />
        Report
      </button>
    </div>
  );
}
