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
