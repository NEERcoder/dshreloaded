import type { OpportunityRecord } from "./localProvider";

/** Indian rupee grouping — 50000 renders as ₹50,000, not ₹50,000.00. */
export function formatPrizeAmount(amount: number): string {
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount)}`;
}

/**
 * The one line a card or detail page shows for what a winner receives.
 *
 * A prize and a reward are independent: a competition can offer either, and
 * plenty offer only certificates. When neither is set this returns null and the
 * caller shows nothing — a "₹0" or an invented "Recognition" would be a lie
 * about someone else's competition.
 */
export function prizeLabel(
  opportunity: Pick<OpportunityRecord, "prizeAmount" | "rewards" | "stipend">
): string | null {
  const parts: string[] = [];
  if (opportunity.prizeAmount !== null && opportunity.prizeAmount !== undefined) {
    parts.push(formatPrizeAmount(opportunity.prizeAmount));
  }
  const rewards = opportunity.rewards?.trim();
  if (rewards) parts.push(rewards);
  // Older listings only ever had "Stipend / Award", which is where a prize used
  // to be typed. Falling back to it keeps those cards informative without
  // showing the same value twice when an admin fills both.
  if (parts.length === 0) {
    const stipend = opportunity.stipend?.trim();
    return stipend || null;
  }
  return parts.join(" + ");
}

/**
 * Read `stipend` honestly.
 *
 * There is no `is_paid` column, so this is a reading of what an admin typed, not
 * a stored fact. The rules are deliberately narrow and negative-first:
 *
 *   * explicit unpaid wording → `unpaid`
 *   * a currency symbol, an amount, or paid/stipend/salary wording → `paid`
 *   * anything else, including a blank, → `unstated`
 *
 * A blank therefore never counts as unpaid, and a stray "no" in a phrase like
 * "₹40,000 / month (no travel cover)" or "No registration fee" cannot flip a
 * listing into the unpaid bucket — the earlier broad `\bno\b` test did exactly
 * that, which is how this function came to be.
 */
export type CompensationState = "paid" | "unpaid" | "unstated";

const UNPAID_PATTERN =
  /unpaid|voluntary|no\s+(?:paid\s+)?(?:stipend|salary|pay|wage|remuneration|compensation)|stipend\s*[:\-]?\s*(?:no|none|nil|zero)\b|\bnil\b|\bzero\s+(?:stipend|pay|salary)\b/i;
const PAID_PATTERN = /[₹$€]|(?:^|[^a-z])(?:rs|inr|usd)\.?[\s:]*\d|\d+\s*(?:per|\/|a)\s*(?:month|week|day|hour)|\bpaid\b|\bstipend\b|\bsalary\b|\bhonorari|\bremunerat/i;

export function compensationState(stipend: string | null | undefined): CompensationState {
  const text = (stipend ?? "").trim();
  if (!text) return "unstated";
  if (UNPAID_PATTERN.test(text)) return "unpaid";
  if (PAID_PATTERN.test(text)) return "paid";
  return "unstated";
}

/**
 * How a money fact is coloured. Cash, merchandise and pay are different
 * promises, so they never share a tone.
 *
 * The tone qualifies the chip; the organiser's own words stay inside it. That is
 * the only reason a heuristic reading of free text is allowed to reach the UI —
 * nothing here ever writes a "Paid" label the admin did not type.
 */
export type RewardTone = "cash" | "goods" | "pay" | "free" | "neutral";

/**
 * `free` is matched on the organiser's literal first word and nothing else.
 * There is no fee column, and an *unpaid* stipend is not a free one — it says we
 * do not pay you, not that you pay nothing — so unpaid lands on `neutral`.
 */
export function stipendTone(stipend: string | null | undefined): RewardTone {
  const text = (stipend ?? "").trim();
  if (!text) return "neutral";
  if (/^free\b/i.test(text)) return "free";
  return compensationState(text) === "paid" ? "pay" : "neutral";
}

/** Team size in the words a student reads, never a guess about solo entry. */
export function teamSizeLabel(
  opportunity: Pick<OpportunityRecord, "teamFormationEnabled" | "minTeamSize" | "maxTeamSize">
): string | null {
  if (!opportunity.teamFormationEnabled) return null;
  const min = opportunity.minTeamSize;
  const max = opportunity.maxTeamSize;
  if (min === 1 && max === 1) return "Individual participation";
  if (min !== null && max !== null && min !== max) return `Teams of ${min}–${max}`;
  if (max !== null && min === null) return `Teams of up to ${max}`;
  if (min !== null && max === null) return `Teams of ${min} or more`;
  if (min !== null && max !== null) return `Teams of ${min}`;
  return null;
}
