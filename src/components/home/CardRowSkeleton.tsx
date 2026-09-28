export default function CardRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="flex gap-4 overflow-x-auto no-scrollbar sm:grid sm:grid-cols-2 lg:grid-cols-4 lg:overflow-visible"
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="min-w-[78%] sm:min-w-0 rounded-2xl border border-surface-border bg-white p-5 shadow-card"
        >
          <div className="skeleton-shimmer h-4 w-20 rounded-md" />
          <div className="skeleton-shimmer mt-4 h-4 w-full rounded-md" />
          <div className="skeleton-shimmer mt-2 h-4 w-3/4 rounded-md" />
          <div className="skeleton-shimmer mt-5 h-3 w-1/2 rounded-md" />
        </div>
      ))}
    </div>
  );
}
