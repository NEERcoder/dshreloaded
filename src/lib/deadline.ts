/**
 * One place that decides what a deadline means and how it is shown.
 *
 * The database has two deadline columns and they are not the same shape:
 * `deadline_at` is a precise UTC instant, while the legacy `deadline` is a bare
 * `date` with no time and no zone. Migration 013 resolves that as
 *
 *   coalesce(deadline_at, (deadline::timestamp + 23:59:59) AT TIME ZONE 'Asia/Kolkata')
 *
 * i.e. "a date-only deadline means the end of that day in Indian Standard
 * Time". `deadlineInstant` below is the exact mirror of that expression. If the
 * two ever drift, the card says one thing and the database rejects a
 * registration at another time, so they are deliberately kept side by side.
 */

/** IST is +05:30 and has never observed a DST change, so a fixed offset is exact. */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/** `YYYY-MM-DD` with no zone information attached. */
function isPlainDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

/**
 * Turns a stored deadline into an epoch-millisecond instant, or null when the
 * listing genuinely has no deadline. A missing deadline is never guessed at:
 * there is no default, no end-of-month, and no fabricated countdown.
 */
export function deadlineInstant(
  deadlineAt: string | null | undefined,
  legacyDate: string | null | undefined
): number | null {
  if (deadlineAt) {
    const exact = Date.parse(deadlineAt);
    if (!Number.isNaN(exact)) return exact;
  }
  if (legacyDate) {
    const trimmed = legacyDate.trim();
    if (isPlainDate(trimmed)) {
      // Read as midnight IST, then push to the last second of that same IST day.
      const midnightIst = Date.parse(`${trimmed}T00:00:00+05:30`);
      if (Number.isNaN(midnightIst)) return null;
      return midnightIst + DAY_MS - 1000;
    }
    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

export function isExpired(instant: number | null, now: number): boolean {
  return instant !== null && now >= instant;
}

/**
 * Days remaining, rounded the way a student reads it: anything past the
 * halfway point of a day is "N days", and the final partial day is "1 day",
 * never "0 days".
 */
export function daysRemaining(instant: number, now: number): number {
  return Math.max(1, Math.ceil((instant - now) / DAY_MS));
}

/**
 * The label for a deadline at a given moment.
 *
 * Above a day left, days. Inside the last day, hours and minutes — which is the
 * part that has to keep ticking, and why callers subscribe to the shared clock
 * rather than formatting once at render.
 */
export function formatDeadlineCountdown(
  instant: number | null,
  now: number
): { text: string; tone: "none" | "open" | "soon" | "urgent" | "closed" } {
  if (instant === null) return { text: "No deadline set", tone: "none" };

  const remaining = instant - now;
  if (remaining <= 0) return { text: "Registration closed", tone: "closed" };

  if (remaining > DAY_MS) {
    const days = daysRemaining(instant, now);
    return { text: `${days} day${days === 1 ? "" : "s"} left`, tone: days <= 3 ? "soon" : "open" };
  }

  const hours = Math.floor(remaining / HOUR_MS);
  const minutes = Math.floor((remaining % HOUR_MS) / MINUTE_MS);
  if (hours > 0) {
    return { text: minutes > 0 ? `${hours}h ${minutes}m remaining` : `${hours}h remaining`, tone: "urgent" };
  }
  return { text: `${Math.max(minutes, 1)}m remaining`, tone: "urgent" };
}

/**
 * The deadline as the admin typed it, expressed in Indian Standard Time.
 *
 * `Intl` is given an explicit zone rather than the visitor's local one: a
 * student opening this in Dubai still has to see the Indian cut-off, because
 * that is the instant the database enforces.
 */
export function formatDeadlineInIst(instant: number | null): string | null {
  if (instant === null) return null;
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(instant));
  } catch {
    return new Date(instant).toISOString();
  }
}

/**
 * Converts a wall-clock value from `datetime-local` (which reports the time the
 * admin typed, in IST) into a UTC instant.
 *
 * A `datetime-local` string carries no zone, so appending the IST offset is the
 * only correct reading — `new Date(...)` would otherwise interpret it as the
 * browser's zone and shift every deadline the admin enters.
 */
export function istWallClockToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const local = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)
    ? `${trimmed}${trimmed.length === 16 ? ":00" : ""}+05:30`
    : trimmed;
  const ms = Date.parse(local);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

/** The inverse: a stored UTC instant rendered for an IST `datetime-local` input. */
export function isoToIstWallClock(iso: string | null | undefined): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  const ist = new Date(ms + IST_OFFSET_MS);
  return ist.toISOString().slice(0, 16);
}
