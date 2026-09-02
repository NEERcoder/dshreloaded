type SkeletonProps = {
  className?: string;
};

export function SkeletonPulse({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-surface-border/60 ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card overflow-hidden" aria-hidden="true">
      <div className="animate-pulse">
        <div className="h-32 bg-surface-border/40" />
        <div className="p-5 space-y-3">
          <div className="h-3 w-20 rounded bg-surface-border/60" />
          <div className="h-5 w-3/4 rounded bg-surface-border/60" />
          <div className="h-3 w-full rounded bg-surface-border/60" />
          <div className="h-3 w-2/3 rounded bg-surface-border/60" />
          <div className="flex gap-2 pt-2">
            <div className="h-6 w-16 rounded-full bg-surface-border/60" />
            <div className="h-6 w-20 rounded-full bg-surface-border/60" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonCollegeGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading colleges">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonCollegePage() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="bg-brand-blue-pale border-b border-surface-border">
        <div className="container-px py-8 sm:py-12">
          <div className="h-4 w-32 rounded bg-surface-border/60" />
          <div className="mt-8 space-y-4">
            <div className="h-3 w-40 rounded bg-surface-border/60" />
            <div className="h-10 w-3/4 rounded bg-surface-border/60" />
            <div className="h-5 w-full max-w-xl rounded bg-surface-border/60" />
            <div className="h-5 w-2/3 max-w-xl rounded bg-surface-border/60" />
          </div>
        </div>
      </div>
      <div className="container-px py-14">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="h-3 w-20 rounded bg-surface-border/60" />
              <div className="h-5 w-full rounded bg-surface-border/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonOpportunityGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-label="Loading opportunities">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card p-5 animate-pulse space-y-3" aria-hidden="true">
          <div className="h-5 w-20 rounded-md bg-surface-border/60" />
          <div className="h-6 w-3/4 rounded bg-surface-border/60" />
          <div className="h-4 w-1/2 rounded bg-surface-border/60" />
          <div className="h-3 w-full rounded bg-surface-border/60" />
          <div className="h-3 w-2/3 rounded bg-surface-border/60" />
          <div className="flex gap-3 pt-2">
            <div className="h-3 w-16 rounded bg-surface-border/60" />
            <div className="h-3 w-24 rounded bg-surface-border/60" />
          </div>
        </div>
      ))}
    </div>
  );
}
