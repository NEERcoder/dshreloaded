import Icon from "./Icon";
import { useDeadlineNow } from "../hooks/useDeadlineNow";
import { deadlineInstant, formatDeadlineCountdown } from "../lib/deadline";
import type { OpportunityRecord } from "../lib/dataAccess";

type DeadlineProgressProps = {
  deadline?: string | null;
  deadlineAt?: OpportunityRecord["deadlineAt"];
  createdAt?: string | null;
};

/**
 * The deadline line with its open → deadline track.
 *
 * Reads the same two columns the database does — `deadline_at` when it exists,
 * otherwise the legacy date taken as end-of-day IST — so the bar, the words and
 * the server's yes/no on a registration can never disagree about when a listing
 * closes. The label re-renders off the shared clock, so a listing crosses from
 * days into hours on its own while the page stays open.
 */
export default function DeadlineProgress({ deadline, deadlineAt, createdAt }: DeadlineProgressProps) {
  const instant = deadlineInstant(deadlineAt, deadline);
  const now = useDeadlineNow(instant);

  if (!deadline && !deadlineAt) {
    return (
      <div className="flex items-center gap-2 text-xs text-ink-500">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span>Applications open · Rolling basis</span>
      </div>
    );
  }

  const { text, tone } = formatDeadlineCountdown(instant, now);
  const closed = tone === "closed";
  const urgent = tone === "urgent" || tone === "soon";

  // The track needs a start to measure against. `created_at` is the honest one;
  // without it the bar would be inventing a window, so the bar is simply
  // omitted rather than drawn from a guess.
  const createdMs = createdAt ? Date.parse(createdAt) : Number.NaN;
  const track =
    !Number.isNaN(createdMs) && instant !== null && instant > createdMs
      ? Math.min(97, Math.max(6, Math.round(((now - createdMs) / (instant - createdMs)) * 100)))
      : null;

  return (
    <div className="space-y-1.5 py-1">
      <div className="relative flex items-center justify-between gap-2 text-[11px] font-extrabold uppercase tracking-wider text-ink-500">
        <span className="inline-flex items-center gap-1.5">
          <Icon name={closed ? "lock" : "clock"} className="h-3.5 w-3.5" />
          Open
        </span>
        <span className={urgent ? "text-brand-red-ink font-black" : closed ? "text-ink-500" : "text-ink-600"}>
          {text}
        </span>
      </div>

      {track !== null && (
        <div className="relative h-1.5 w-full rounded-full bg-surface-border overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              urgent ? "bg-brand-red" : closed ? "bg-ink-500" : "bg-brand-blue"
            }`}
            style={{ width: `${closed ? 100 : track}%` }}
          />
        </div>
      )}

      {instant !== null && (
        <p className="text-[11px] text-ink-500">Closes {formatCloses(instant)} IST</p>
      )}
    </div>
  );
}

function formatCloses(instant: number): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(instant));
}
