import Icon from "../Icon";
import { useDeadlineNow } from "../../hooks/useDeadlineNow";
import { deadlineInstant, formatDeadlineCountdown } from "../../lib/deadline";
import type { OpportunityRecord } from "../../lib/dataAccess";

const TONE_CLASS: Record<ReturnType<typeof formatDeadlineCountdown>["tone"], string> = {
  none: "bg-surface-soft text-ink-500",
  open: "bg-emerald-50 text-emerald-700",
  soon: "bg-brand-red-soft text-brand-red-ink",
  urgent: "bg-brand-red text-brand-navy",
  closed: "bg-surface-border text-ink-600",
};

/**
 * The live deadline label.
 *
 * It subscribes to the one shared clock rather than owning a timer, and stops
 * subscribing the moment its own deadline passes — a closed listing shows a
 * static label, so nothing here should keep the tab waking up.
 */
export default function DeadlinePill({
  opportunity,
  className = "",
}: {
  opportunity: Pick<OpportunityRecord, "deadlineAt" | "deadline">;
  className?: string;
}) {
  const instant = deadlineInstant(opportunity.deadlineAt, opportunity.deadline);
  const now = useDeadlineNow(instant);
  const { text, tone } = formatDeadlineCountdown(instant, now);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-extrabold uppercase tracking-wider ${TONE_CLASS[tone]} ${className}`}
    >
      <Icon name={tone === "closed" ? "lock" : "clock"} className="h-3.5 w-3.5" />
      {text}
    </span>
  );
}
