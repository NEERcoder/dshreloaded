import type { StudentProfileRecord } from "./dataAccess";

// Pure connection-graph projection shared by every CIRCLE surface. Nothing
// here touches Supabase, so the mapping rules (who is the peer, which inbox a
// row belongs to, which single state a pair resolves to) are testable without
// a database or an auth session.

export type ConnectionRow = {
  id: string;
  requesterUserId: string;
  recipientUserId: string;
  status: "pending" | "accepted";
  createdAt: string;
};

export type ConnectionState = "none" | "outgoing_pending" | "incoming_pending" | "accepted";

export type ConnectionRef = {
  connectionId: string;
  state: Exclude<ConnectionState, "none">;
  createdAt: string;
};

export type ConnectionItem = {
  connectionId: string;
  state: Exclude<ConnectionState, "none">;
  createdAt: string;
  peerUserId: string;
  /** Null when the student has no CIRCLE profile row (deleted or incomplete). */
  peer: StudentProfileRecord | null;
};

type RawConnectionRow = Record<string, unknown>;

export const mapConnectionRow = (row: RawConnectionRow): ConnectionRow => ({
  id: String(row.id),
  requesterUserId: String(row.requester_user_id),
  recipientUserId: String(row.recipient_user_id),
  status: row.status === "accepted" ? "accepted" : "pending",
  createdAt: String(row.created_at ?? ""),
});

/**
 * The other student in a row, from my point of view. A row I am not part of is
 * discarded rather than guessed at — RLS should never hand one to me, and a
 * silent drop beats rendering someone else's relationship.
 */
export function peerUserIdOf(row: ConnectionRow, myUserId: string): string | null {
  if (row.requesterUserId === myUserId) return row.recipientUserId;
  if (row.recipientUserId === myUserId) return row.requesterUserId;
  return null;
}

export function stateOf(row: ConnectionRow, myUserId: string): ConnectionRef["state"] | null {
  const peer = peerUserIdOf(row, myUserId);
  if (!peer || peer === myUserId) return null;
  if (row.status === "accepted") return "accepted";
  return row.requesterUserId === myUserId ? "outgoing_pending" : "incoming_pending";
}

/**
 * One entry per peer. If the backend ever returns two rows for the same pair
 * (it shouldn't — the migration's canonical-pair index forbids it) the
 * strongest relationship wins: accepted, then an incoming request I can act
 * on, then whatever is newest.
 */
export function buildConnectionMap(rows: ConnectionRow[], myUserId: string): Record<string, ConnectionRef> {
  const byPeer: Record<string, ConnectionRef> = {};
  const strength = { accepted: 3, incoming_pending: 2, outgoing_pending: 1 } as const;

  for (const row of rows) {
    const peer = peerUserIdOf(row, myUserId);
    const state = stateOf(row, myUserId);
    if (!peer || !state) continue;

    const candidate: ConnectionRef = { connectionId: row.id, state, createdAt: row.createdAt };
    const existing = byPeer[peer];
    if (!existing) {
      byPeer[peer] = candidate;
      continue;
    }
    const preferCandidate =
      strength[candidate.state] > strength[existing.state] ||
      (candidate.state === existing.state && candidate.createdAt > existing.createdAt);
    if (preferCandidate) byPeer[peer] = candidate;
  }

  return byPeer;
}

/** Attach the directory projection to each relationship, dropping orphans. */
export function assembleConnections(
  rows: ConnectionRow[],
  profiles: StudentProfileRecord[],
  myUserId: string
): ConnectionItem[] {
  const profileByUserId = new Map(profiles.map((profile) => [profile.userId, profile]));
  const items: ConnectionItem[] = [];

  for (const [peerUserId, ref] of Object.entries(buildConnectionMap(rows, myUserId))) {
    // A missing profile is still a real relationship — keep the row so the
    // student can see and remove it instead of it vanishing silently.
    items.push({
      connectionId: ref.connectionId,
      state: ref.state,
      createdAt: ref.createdAt,
      peerUserId,
      peer: profileByUserId.get(peerUserId) ?? null,
    });
  }

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export type ConnectionSummary = { connections: number; incomingPending: number; outgoingPending: number };

export function summarise(rows: ConnectionRow[], myUserId: string): ConnectionSummary {
  const map = buildConnectionMap(rows, myUserId);
  const summary: ConnectionSummary = { connections: 0, incomingPending: 0, outgoingPending: 0 };
  for (const ref of Object.values(map)) {
    if (ref.state === "accepted") summary.connections += 1;
    else if (ref.state === "incoming_pending") summary.incomingPending += 1;
    else summary.outgoingPending += 1;
  }
  return summary;
}
