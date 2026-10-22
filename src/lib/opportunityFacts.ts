import { deadlineInstant, formatDeadlineInIst } from "./deadline";
import { formatPrizeAmount, teamSizeLabel } from "./prize";
import type { OpportunityRecord } from "./localProvider";

/**
 * The one place that decides which facts about a listing are worth showing, what
 * each is called, and in what order. The feed card and the detail view both read
 * it, so they can never disagree about a listing.
 *
 * Nothing here invents a field: there is no cost, accreditation or "verified"
 * column on an opportunity, so no such label can appear. What an organiser typed
 * into `stipend` is shown under that column's own name, and a cash prize is only
 * claimed when `prize_amount` holds a number.
 */

export type ListingFactKey =
  | "team"
  | "rounds"
  | "prize"
  | "rewards"
  | "mode"
  | "location"
  | "duration"
  | "starts"
  | "stipend"
  | "courses"
  | "field";

export type ListingFact = {
  key: ListingFactKey;
  icon: string;
  /** Names the field in the product's own words, wherever a label fits. */
  label: string;
  /** The organiser's text, or a direct reading of a typed value. */
  value: string;
};

/**
 * A competition is entered, so who can field a team and how many rounds there
 * are come before anything else. Other listings are read as logistics first.
 */
const COMPETITION_ORDER: ListingFactKey[] = [
  "team",
  "rounds",
  "prize",
  "rewards",
  "mode",
  "location",
  "duration",
  "starts",
  "stipend",
  "courses",
  "field",
];

const GENERAL_ORDER: ListingFactKey[] = [
  "mode",
  "location",
  "duration",
  "stipend",
  "prize",
  "rewards",
  "team",
  "rounds",
  "courses",
  "field",
  "starts",
];

/**
 * A certification or research opening is studied, so how long it runs and who it
 * is written for outrank the field label — that is what a student is checking
 * before they compare cost.
 */
const LEARN_ORDER: ListingFactKey[] = [
  "duration",
  "mode",
  "location",
  "courses",
  "rewards",
  "stipend",
  "prize",
  "team",
  "rounds",
  "field",
  "starts",
];

/**
 * `stipend` is one free-text column every category writes into. It keeps the
 * admin form's own name except where the word for that money is simply stipend.
 */
function stipendLabelFor(category: OpportunityRecord["category"]): string {
  return category === "internship" || category === "job" ? "Stipend" : "Stipend / Award";
}

export function listingFacts(item: OpportunityRecord): ListingFact[] {
  const found = new Map<ListingFactKey, ListingFact>();
  const add = (key: ListingFactKey, icon: string, label: string, value: string | null | undefined) => {
    const text = typeof value === "string" ? value.trim() : "";
    if (text) found.set(key, { key, icon, label, value: text });
  };

  if (item.teamFormationEnabled) add("team", "users", "Team size", teamSizeLabel(item));
  const rounds = item.rounds?.length ?? 0;
  add("rounds", "flag", "Rounds", rounds > 0 ? `${rounds} round${rounds === 1 ? "" : "s"}` : null);
  if (item.prizeAmount !== null && item.prizeAmount !== undefined) {
    add("prize", "trophy", "Prize", formatPrizeAmount(item.prizeAmount));
  }
  add("rewards", "award", "Rewards", item.rewards);
  add("mode", "monitor", "Mode", item.mode);
  add("location", "map-pin", "Where", item.location);
  add("duration", "clock", "Duration", item.duration);
  if (item.startAt) {
    const instant = deadlineInstant(item.startAt, null);
    add("starts", "calendar", "Starts", instant === null ? null : formatDeadlineInIst(instant));
  }
  add("stipend", "wallet", stipendLabelFor(item.category), item.stipend);
  add("courses", "book", "For", item.eligibleCourses.join(", "));
  add("field", "target", "Field", item.field);

  const order =
    item.category === "competition"
      ? COMPETITION_ORDER
      : item.category === "certification" || item.category === "research"
        ? LEARN_ORDER
        : GENERAL_ORDER;
  const facts: ListingFact[] = [];
  const seenValues = new Set<string>();
  for (const key of order) {
    const fact = found.get(key);
    if (!fact || seenValues.has(fact.value)) continue;
    seenValues.add(fact.value);
    facts.push(fact);
  }
  return facts;
}
