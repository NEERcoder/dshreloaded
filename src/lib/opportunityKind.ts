import type { OpportunityRecord } from "./dataAccess";

/**
 * Which subset of a category a destination is allowed to claim.
 *
 * `opportunities.category` accepts exactly seven values and none of them is
 * "hackathon", and there is no format or kind column on a live row. So the only
 * trustworthy signal is the organiser's own wording in the two short labels they
 * type deliberately — the title and the field. A listing that never uses the
 * word is never called one, and the long free-text description is deliberately
 * left out: "…unlike a typical hackathon…" would otherwise pull an unrelated
 * case competition onto the page.
 *
 * Migration 018 proposes an explicit `kind` column so this stops being a reading
 * of prose; until it is applied, this page can only ever show a hackathon that
 * says so itself.
 */
export function isHackathonListing(item: OpportunityRecord): boolean {
  const text = `${item.title} ${item.field ?? ""}`;
  return /\bhackathons?\b/i.test(text);
}

/** The opposite reading, so the Competitions page never doubles a listing up. */
export function isNotHackathonListing(item: OpportunityRecord): boolean {
  return !isHackathonListing(item);
}
