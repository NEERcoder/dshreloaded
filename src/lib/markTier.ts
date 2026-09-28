// MARK V1 tier = competitions joined, nothing else.
// No points, no XP, no weighting by activity type.

import type { CompetitionTeamRecord, OpportunityRecord } from "./dataAccess";

/**
 * One MARK competition credit: a real membership row in
 * competition_team_members, deduped by competition.
 */
export type Participation = {
  teamId: string;
  teamName: string;
  teamStatus: CompetitionTeamRecord["status"];
  competitionId: string;
  title: string;
  organization: string | null;
  deadline: string | null;
  isCaptain: boolean;
};

/**
 * One MARK credit per competition the student holds a team membership in.
 * Two teams on one competition still count once; a membership on a listing
 * that isn't a competition earns nothing.
 */
export function buildParticipations(
  teams: CompetitionTeamRecord[],
  publishedOpportunities: OpportunityRecord[],
  userId: string
): Participation[] {
  const oppById = new Map<string, OpportunityRecord>(publishedOpportunities.map((o) => [o.id, o]));
  const counted = new Set<string>();
  const rows: Participation[] = [];

  for (const team of teams) {
    if (!team.competitionId || counted.has(team.competitionId)) continue;
    const opp = oppById.get(team.competitionId) ?? null;
    if (opp && opp.category !== "competition") continue;
    counted.add(team.competitionId);
    rows.push({
      teamId: team.id,
      teamName: team.name,
      teamStatus: team.status,
      competitionId: team.competitionId,
      title: opp?.title || team.competitionTitle || "Competition",
      organization: opp?.organization ?? null,
      deadline: opp?.deadline ?? null,
      isCaptain: team.captainUserId === userId,
    });
  }
  return rows;
}

export type TierId = "none" | "bronze" | "silver" | "gold" | "diamond" | "platinum";

type TierBand = {
  id: TierId;
  /** Display label, e.g. "BRONZE". null until the first tier is reached. */
  label: string | null;
  /** Prose label used in progress copy, e.g. "Bronze". */
  title: string | null;
  min: number;
  max: number | null;
  /** Competition count that unlocks the next band. null at the top tier. */
  next: number | null;
  nextTitle: string | null;
};

const BANDS: TierBand[] = [
  { id: "none", label: null, title: null, min: 0, max: 10, next: 11, nextTitle: "Bronze" },
  { id: "bronze", label: "BRONZE", title: "Bronze", min: 11, max: 20, next: 21, nextTitle: "Silver" },
  { id: "silver", label: "SILVER", title: "Silver", min: 21, max: 50, next: 51, nextTitle: "Gold" },
  { id: "gold", label: "GOLD", title: "Gold", min: 51, max: 100, next: 101, nextTitle: "Diamond" },
  { id: "diamond", label: "DIAMOND", title: "Diamond", min: 101, max: 200, next: 201, nextTitle: "Platinum" },
  { id: "platinum", label: "PLATINUM", title: "Platinum", min: 201, max: null, next: null, nextTitle: null },
];

export type TierStatus = {
  competitions: number;
  tier: TierId;
  tierLabel: string | null;
  /** 1–5 for BRONZE…PLATINUM, 0 while no tier is held. */
  tierIndex: number;
  nextTierLabel: string | null;
  competitionsRemaining: number | null;
  /** 0–100 within the current band. */
  progressPercent: number;
  message: string;
};

export function resolveTier(rawCount: number): TierStatus {
  const competitions = Math.max(0, Math.floor(rawCount || 0));
  const band =
    BANDS.find((b) => b.max === null ? competitions >= b.min : competitions >= b.min && competitions <= b.max) ??
    BANDS[0];

  const message = (() => {
    if (band.next === null) return "Highest current tier reached.";
    if (competitions === 0) return "Start building your MARK.";
    const remaining = band.next - competitions;
    return `${remaining} more competition${remaining === 1 ? "" : "s"} to reach ${band.nextTitle}.`;
  })();

  const span = band.next === null ? 0 : band.next - band.min;
  const progressPercent =
    band.next === null ? 100 : Math.round(((competitions - band.min) / span) * 100);

  return {
    competitions,
    tier: band.id,
    tierLabel: band.label,
    tierIndex: BANDS.indexOf(band),
    nextTierLabel: band.nextTitle,
    competitionsRemaining: band.next === null ? null : band.next - competitions,
    progressPercent: Math.min(100, Math.max(0, progressPercent)),
    message,
  };
}
