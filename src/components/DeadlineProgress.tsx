type DeadlineProgressProps = {
  deadline?: string | null;
  createdAt?: string | null;
};

export default function DeadlineProgress({ deadline, createdAt }: DeadlineProgressProps) {
  if (!deadline) {
    return (
      <div className="flex items-center gap-2 text-xs text-ink-500">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span>Applications open · Rolling basis</span>
      </div>
    );
  }

  let daysRemaining: number | null = null;
  let percent = 50;
  let isPast = false;

  try {
    const deadlineDate = new Date(deadline);
    if (!isNaN(deadlineDate.getTime())) {
      const now = new Date();
      const diffMs = deadlineDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (daysRemaining < 0) {
        isPast = true;
        percent = 100;
      } else {
        // Estimate window: if createdAt exists use that, otherwise default to 30 days window
        const createdDate = createdAt ? new Date(createdAt) : new Date(deadlineDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        const totalDuration = Math.max(1, deadlineDate.getTime() - createdDate.getTime());
        const elapsed = Math.max(0, now.getTime() - createdDate.getTime());
        percent = Math.min(95, Math.max(8, Math.round((elapsed / totalDuration) * 100)));
      }
    }
  } catch {
    // If parsing fails, fall back gracefully
  }

  if (isPast) {
    return (
      <div className="text-xs font-semibold text-ink-400">
        Applications closed
      </div>
    );
  }

  const isUrgent = daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0;

  return (
    <div className="space-y-1.5 py-1">
      {/* Track line: OPEN ─────●──── DEADLINE */}
      <div className="relative flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
        <span>Open</span>
        <span className={isUrgent ? "text-brand-red font-black" : "text-ink-500"}>
          {daysRemaining === 0 ? "Closing today" : daysRemaining !== null ? `${daysRemaining}d left` : "Deadline"}
        </span>
      </div>

      <div className="relative h-1.5 w-full rounded-full bg-surface-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isUrgent ? "bg-brand-red animate-pulse" : "bg-brand-blue"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
