/**
 * Pure decision logic for send-push-notification. No Deno, Supabase or
 * Firebase imports here so the whole authorization/validation surface can be
 * unit-tested in Node (scripts/push-check.mjs bundles this file with esbuild).
 */

export const PUSH_CATEGORIES = [
  "opportunities",
  "connections",
  "teams",
  "competitions",
  "announcements",
] as const;
export type PushCategory = (typeof PUSH_CATEGORIES)[number];

export const CONNECTION_EVENTS = ["connection_request", "connection_accepted"] as const;
export type ConnectionEvent = (typeof CONNECTION_EVENTS)[number];

export const TEAM_EVENTS = ["join_requested", "join_decided"] as const;
export type TeamEvent = (typeof TEAM_EVENTS)[number];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROUTE_PATTERN = /^\/[A-Za-z0-9\-/_]*$/;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isSafeRoute(value: unknown): value is string {
  return typeof value === "string" && value.length <= 200 && ROUTE_PATTERN.test(value) && !value.startsWith("//");
}

export function isCategory(value: unknown): value is PushCategory {
  return typeof value === "string" && (PUSH_CATEGORIES as readonly string[]).includes(value);
}

export type PushRequest =
  | { kind: "connection"; connectionId: string; event: ConnectionEvent }
  | { kind: "team"; requestId: string; event: TeamEvent }
  | { kind: "broadcast"; broadcastId: string; title: string; body: string; route: string; category: PushCategory };

/** Strict request parsing — anything malformed is rejected, never coerced. */
export function parseRequest(raw: unknown): { request: PushRequest } | { error: string } {
  if (typeof raw !== "object" || raw === null) return { error: "Body must be a JSON object." };
  const body = raw as Record<string, unknown>;

  if (body.kind === "connection") {
    if (!isUuid(body.connectionId)) return { error: "connectionId must be a UUID." };
    if (!(CONNECTION_EVENTS as readonly string[]).includes(body.event as string)) {
      return { error: "event must be connection_request or connection_accepted." };
    }
    return { request: { kind: "connection", connectionId: body.connectionId, event: body.event as ConnectionEvent } };
  }

  if (body.kind === "team") {
    if (!isUuid(body.requestId)) return { error: "requestId must be a UUID." };
    if (!(TEAM_EVENTS as readonly string[]).includes(body.event as string)) {
      return { error: "event must be join_requested or join_decided." };
    }
    return { request: { kind: "team", requestId: body.requestId, event: body.event as TeamEvent } };
  }

  if (body.kind === "broadcast") {
    if (!isUuid(body.broadcastId)) return { error: "broadcastId must be a UUID." };
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const text = typeof body.body === "string" ? body.body.trim() : "";
    const route = typeof body.route === "string" ? body.route.trim() : "";
    if (title.length < 1 || title.length > 120) return { error: "title must be 1-120 characters." };
    if (text.length < 1 || text.length > 300) return { error: "body must be 1-300 characters." };
    if (!isSafeRoute(route)) return { error: "route must be a site path like /notifications." };
    if (!isCategory(body.category)) return { error: "category is not a known push category." };
    return { request: { kind: "broadcast", broadcastId: body.broadcastId, title, body: text, route, category: body.category } };
  }

  return { error: "kind must be connection, team or broadcast." };
}

// ---------------------------------------------------------------------
// Delivery keys (the dedupe ledger's unique (delivery_key, fcm_token))
// ---------------------------------------------------------------------

export function connectionDeliveryKey(notificationId: string): string {
  return `conn:${notificationId}`;
}

export function teamDeliveryKey(requestId: string, phase: "requested" | "approved" | "rejected"): string {
  return `team:${requestId}:${phase}`;
}

export function broadcastDeliveryKey(broadcastId: string): string {
  return `bcast:${broadcastId}`;
}

// ---------------------------------------------------------------------
// Preferences gate — a missing row means everything is enabled.
// ---------------------------------------------------------------------

export type PreferencesRow = {
  push_enabled?: boolean;
  opportunities?: boolean;
  connections?: boolean;
  teams?: boolean;
  competitions?: boolean;
  announcements?: boolean;
} | null;

export function preferencesAllow(row: PreferencesRow, category: PushCategory): boolean {
  if (!row) return true;
  if (row.push_enabled === false) return false;
  return row[category] !== false;
}

// ---------------------------------------------------------------------
// Payloads — minimal data-only messages. No phone numbers, emails or other
// sensitive fields ever go into a push payload; routes carry IDs only.
// ---------------------------------------------------------------------

export type PushContent = { title: string; body: string; route: string; category: PushCategory };

export function connectionContent(event: ConnectionEvent, actorName: string | null): PushContent {
  const name = actorName && actorName.trim() ? actorName.trim() : "A student";
  return event === "connection_request"
    ? { title: "New connection request", body: `${name} wants to connect with you.`, route: "/circle/connections", category: "connections" }
    : { title: "Connection accepted", body: `${name} accepted your connection request.`, route: "/circle/connections", category: "connections" };
}

export function teamContent(
  phase: "requested" | "approved" | "rejected",
  teamName: string | null,
  teamId: string
): PushContent {
  const name = teamName && teamName.trim() ? teamName.trim() : "your team";
  const route = isSafeRoute(`/teams/${teamId}`) ? `/teams/${teamId}` : "/notifications";
  if (phase === "requested") {
    return { title: "New team join request", body: `A student asked to join ${name}.`, route, category: "teams" };
  }
  if (phase === "approved") {
    return { title: "Join request approved", body: `You're now a member of ${name}.`, route, category: "teams" };
  }
  return { title: "Join request declined", body: `Your request to join ${name} was declined.`, route, category: "teams" };
}

/** FCM v1 data-only message: the service worker owns display and dedupe. */
export function buildFcmMessage(token: string, content: PushContent, notificationId: string | null): Record<string, unknown> {
  const data: Record<string, string> = {
    title: content.title,
    body: content.body,
    route: content.route,
    category: content.category,
  };
  if (notificationId) data.notificationId = notificationId;
  return {
    message: {
      token,
      data,
      webpush: { headers: { TTL: "86400", Urgency: "high" } },
    },
  };
}

// ---------------------------------------------------------------------
// FCM error classification
// ---------------------------------------------------------------------

/** Tokens FCM reports as dead are removed so future sends stay clean. */
export function isStaleTokenResponse(httpStatus: number, fcmStatus: string | null): boolean {
  if (httpStatus === 404 && fcmStatus === "UNREGISTERED") return true;
  if (httpStatus === 400 && fcmStatus === "INVALID_ARGUMENT") return true;
  return false;
}

// ---------------------------------------------------------------------
// Rate limits — counted over distinct delivery keys in the trailing hour.
// ---------------------------------------------------------------------

export const MAX_SENDS_PER_HOUR = 60;
export const MAX_BROADCASTS_PER_HOUR = 5;

export function rateLimitVerdict(
  recentDeliveryKeys: string[],
  incomingKind: PushRequest["kind"]
): { allowed: true } | { allowed: false; reason: string } {
  const distinct = new Set(recentDeliveryKeys);
  if (incomingKind === "broadcast") {
    const broadcasts = [...distinct].filter((key) => key.startsWith("bcast:")).length;
    if (broadcasts >= MAX_BROADCASTS_PER_HOUR) {
      return { allowed: false, reason: "Broadcast limit reached (5 per hour)." };
    }
  }
  if (distinct.size >= MAX_SENDS_PER_HOUR) {
    return { allowed: false, reason: "Send limit reached (60 per hour)." };
  }
  return { allowed: true };
}