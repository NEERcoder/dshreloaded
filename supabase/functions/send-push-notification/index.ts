// =====================================================================
// send-push-notification — Supabase Edge Function (Deno)
// =====================================================================
// Server-side FCM HTTP v1 delivery. The browser only asks; every recipient,
// authorization decision and payload is derived here from database rows.
//
// Secrets (Supabase Edge Function secrets, never in the repo or bundle):
//   FIREBASE_SERVICE_ACCOUNT  — full service-account JSON for javlin-1682b
// Auto-injected by the platform:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:  supabase functions deploy send-push-notification
// Secret:  supabase secrets set FIREBASE_SERVICE_ACCOUNT=<json>
//
// Logs carry error codes and counts only — never tokens, keys or payloads.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.109.0";
import {
  parseRequest,
  preferencesAllow,
  connectionContent,
  teamContent,
  buildFcmMessage,
  connectionDeliveryKey,
  teamDeliveryKey,
  broadcastDeliveryKey,
  isStaleTokenResponse,
  rateLimitVerdict,
  type PushContent,
  type PushRequest,
  type PreferencesRow,
} from "./logic.ts";

const FIREBASE_PROJECT_ID = "javlin-1682b";
const FCM_ENDPOINT = `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`;
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const OAUTH_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

const ALLOWED_ORIGINS = new Set([
  "https://dusciencehub.in",
  "https://www.dusciencehub.in",
  "http://localhost:5173",
  "http://localhost:4173",
]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(req: Request, status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------
// Google OAuth (service-account JWT → access token), WebCrypto RS256.
// ---------------------------------------------------------------------

type ServiceAccount = { client_email: string; private_key: string };

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getAccessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60) {
    return cachedAccessToken.token;
  }

  const encode = (obj: Record<string, unknown>) =>
    base64url(new TextEncoder().encode(JSON.stringify(obj)));
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: account.client_email,
    scope: OAUTH_SCOPE,
    aud: OAUTH_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  })}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned)
  );
  const assertion = `${unsigned}.${base64url(new Uint8Array(signature))}`;

  const response = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) {
    // Status only — the response body can echo request material.
    throw new Error(`oauth_exchange_failed_${response.status}`);
  }
  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("oauth_exchange_no_token");
  cachedAccessToken = { token: data.access_token, expiresAt: now + (data.expires_in ?? 3600) };
  return data.access_token;
}

// ---------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------

type Subscription = { fcm_token: string; user_id: string };

type SendOutcome = "sent" | "failed" | "stale";

async function sendToFcm(
  accessToken: string,
  token: string,
  content: PushContent,
  notificationId: string | null
): Promise<{ outcome: SendOutcome; errorCode: string | null }> {
  let response: Response;
  try {
    response = await fetch(FCM_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildFcmMessage(token, content, notificationId)),
    });
  } catch {
    return { outcome: "failed", errorCode: "network_error" };
  }
  if (response.ok) return { outcome: "sent", errorCode: null };

  let fcmStatus: string | null = null;
  try {
    const err = (await response.json()) as { error?: { status?: string } };
    fcmStatus = err.error?.status ?? null;
  } catch {
    // Non-JSON error body; classify by HTTP status alone.
  }
  if (isStaleTokenResponse(response.status, fcmStatus)) {
    return { outcome: "stale", errorCode: fcmStatus };
  }
  return { outcome: "failed", errorCode: fcmStatus ?? `http_${response.status}` };
}

/**
 * Insert-before-send dedupe: the ledger's unique (delivery_key, fcm_token)
 * means a retry of the same event can never deliver twice to one device.
 */
async function deliverToDevices(
  admin: SupabaseClient,
  accessToken: string,
  devices: Subscription[],
  deliveryKey: string,
  content: PushContent,
  notificationId: string | null,
  initiatedBy: string,
  prefsByUser: Map<string, PreferencesRow>
): Promise<{ sent: number; skipped: number; failed: number }> {
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const device of devices) {
    if (!preferencesAllow(prefsByUser.get(device.user_id) ?? null, content.category)) {
      skipped++;
      await admin.from("push_delivery_log").insert({
        delivery_key: deliveryKey,
        fcm_token: device.fcm_token,
        user_id: device.user_id,
        initiated_by: initiatedBy,
        status: "skipped",
        error_code: "preferences_disabled",
      });
      continue;
    }

    const { error: ledgerError } = await admin.from("push_delivery_log").insert({
      delivery_key: deliveryKey,
      fcm_token: device.fcm_token,
      user_id: device.user_id,
      initiated_by: initiatedBy,
      status: "sent",
    });
    if (ledgerError) {
      // 23505 = this event already reached this device (or was skipped).
      skipped++;
      continue;
    }

    const { outcome, errorCode } = await sendToFcm(accessToken, device.fcm_token, content, notificationId);
    if (outcome === "sent") {
      sent++;
    } else if (outcome === "stale") {
      failed++;
      await admin.from("push_subscriptions").delete().eq("fcm_token", device.fcm_token);
      await admin
        .from("push_delivery_log")
        .update({ status: "stale_removed", error_code: errorCode })
        .eq("delivery_key", deliveryKey)
        .eq("fcm_token", device.fcm_token);
    } else {
      failed++;
      await admin
        .from("push_delivery_log")
        .update({ status: "failed", error_code: errorCode })
        .eq("delivery_key", deliveryKey)
        .eq("fcm_token", device.fcm_token);
    }
  }

  return { sent, skipped, failed };
}

async function loadPreferences(
  admin: SupabaseClient,
  userIds: string[]
): Promise<Map<string, PreferencesRow>> {
  const map = new Map<string, PreferencesRow>();
  if (userIds.length === 0) return map;
  const { data } = await admin
    .from("notification_preferences")
    .select("user_id, push_enabled, opportunities, connections, teams, competitions, announcements")
    .in("user_id", userIds);
  for (const row of data ?? []) {
    map.set(String(row.user_id), row as PreferencesRow);
  }
  return map;
}

async function devicesForUser(admin: SupabaseClient, userId: string): Promise<Subscription[]> {
  const { data } = await admin
    .from("push_subscriptions")
    .select("fcm_token, user_id")
    .eq("user_id", userId);
  return (data ?? []) as Subscription[];
}

async function isAdmin(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return Boolean(data);
}

// ---------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return json(req, 405, { error: "Method not allowed." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const serviceAccountRaw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json(req, 500, { error: "Function environment is not configured." });
  }

  // Caller identity comes from the verified JWT, never from the body.
  const authHeader = req.headers.get("authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return json(req, 401, { error: "Sign in required." });
  const anon = createClient(supabaseUrl, anonKey);
  const { data: userData, error: userError } = await anon.auth.getUser(jwt);
  if (userError || !userData.user) return json(req, 401, { error: "Sign in required." });
  const callerId = userData.user.id;

  let rawBody: unknown;
  try {
    const text = await req.text();
    if (text.length > 10_000) return json(req, 400, { error: "Request too large." });
    rawBody = JSON.parse(text);
  } catch {
    return json(req, 400, { error: "Body must be valid JSON." });
  }

  const parsed = parseRequest(rawBody);
  if ("error" in parsed) return json(req, 400, { error: parsed.error });
  const request: PushRequest = parsed.request;

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Rate limit over the trailing hour, counted per distinct delivery key.
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { data: recent } = await admin
    .from("push_delivery_log")
    .select("delivery_key")
    .eq("initiated_by", callerId)
    .gte("created_at", hourAgo);
  const verdict = rateLimitVerdict((recent ?? []).map((row) => String(row.delivery_key)), request.kind);
  if (!verdict.allowed) return json(req, 429, { error: verdict.reason });

  let serviceAccount: ServiceAccount;
  try {
    if (!serviceAccountRaw) throw new Error("missing");
    const parsedAccount = JSON.parse(serviceAccountRaw) as Partial<ServiceAccount>;
    if (!parsedAccount.client_email || !parsedAccount.private_key) throw new Error("incomplete");
    serviceAccount = { client_email: parsedAccount.client_email, private_key: parsedAccount.private_key };
  } catch {
    return json(req, 500, { error: "Push delivery is not configured on the server." });
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken(serviceAccount);
  } catch (err) {
    console.error("push: OAuth exchange failed:", err instanceof Error ? err.message : "unknown");
    return json(req, 502, { error: "Push provider authentication failed." });
  }

  try {
    if (request.kind === "connection") {
      // The in-app notification row is the source of truth; the caller must
      // be the actor it names (or an admin). Recipients are never client-fed.
      const { data: notification } = await admin
        .from("student_notifications")
        .select("id, user_id, actor_user_id, type")
        .eq("connection_id", request.connectionId)
        .eq("type", request.event)
        .maybeSingle();
      if (!notification) return json(req, 404, { error: "Notification not found." });
      if (notification.actor_user_id !== callerId && !(await isAdmin(admin, callerId))) {
        return json(req, 403, { error: "Not allowed to trigger this notification." });
      }

      let actorName: string | null = null;
      if (notification.actor_user_id) {
        const { data: profile } = await admin
          .from("profiles")
          .select("full_name")
          .eq("user_id", notification.actor_user_id)
          .maybeSingle();
        actorName = profile?.full_name ?? null;
      }

      const recipientId = String(notification.user_id);
      const devices = await devicesForUser(admin, recipientId);
      const prefs = await loadPreferences(admin, [recipientId]);
      const result = await deliverToDevices(
        admin,
        accessToken,
        devices,
        connectionDeliveryKey(String(notification.id)),
        connectionContent(request.event, actorName),
        String(notification.id),
        callerId,
        prefs
      );
      return json(req, 200, result);
    }

    if (request.kind === "team") {
      const { data: joinRequest } = await admin
        .from("competition_team_join_requests")
        .select("id, team_id, user_id, status")
        .eq("id", request.requestId)
        .maybeSingle();
      if (!joinRequest) return json(req, 404, { error: "Join request not found." });

      const { data: team } = await admin
        .from("competition_teams")
        .select("id, name, captain_user_id")
        .eq("id", joinRequest.team_id)
        .maybeSingle();
      if (!team) return json(req, 404, { error: "Team not found." });

      let recipientId: string;
      let phase: "requested" | "approved" | "rejected";
      if (request.event === "join_requested") {
        if (joinRequest.user_id !== callerId) {
          return json(req, 403, { error: "Only the requester can trigger this notification." });
        }
        if (joinRequest.status !== "pending") {
          return json(req, 409, { error: "Request is no longer pending." });
        }
        recipientId = String(team.captain_user_id);
        phase = "requested";
      } else {
        if (team.captain_user_id !== callerId && !(await isAdmin(admin, callerId))) {
          return json(req, 403, { error: "Only the team captain can trigger this notification." });
        }
        if (joinRequest.status !== "approved" && joinRequest.status !== "rejected") {
          return json(req, 409, { error: "Request has not been decided yet." });
        }
        recipientId = String(joinRequest.user_id);
        phase = joinRequest.status;
      }

      const devices = await devicesForUser(admin, recipientId);
      const prefs = await loadPreferences(admin, [recipientId]);
      const result = await deliverToDevices(
        admin,
        accessToken,
        devices,
        teamDeliveryKey(String(joinRequest.id), phase),
        teamContent(phase, team.name ?? null, String(team.id)),
        null,
        callerId,
        prefs
      );
      return json(req, 200, result);
    }

    // Broadcast — verified admins only, validated payload, per-device
    // preference gate and ledger dedupe inside deliverToDevices.
    if (!(await isAdmin(admin, callerId))) {
      return json(req, 403, { error: "Only verified admins can send announcements." });
    }
    const { data: allDevices } = await admin
      .from("push_subscriptions")
      .select("fcm_token, user_id");
    const devices = (allDevices ?? []) as Subscription[];
    const prefs = await loadPreferences(admin, [...new Set(devices.map((device) => device.user_id))]);
    const result = await deliverToDevices(
      admin,
      accessToken,
      devices,
      broadcastDeliveryKey(request.broadcastId),
      { title: request.title, body: request.body, route: request.route, category: request.category },
      null,
      callerId,
      prefs
    );
    return json(req, 200, result);
  } catch (err) {
    // Error class only; messages can contain row data.
    console.error("push: delivery failed:", err instanceof Error ? err.name : "unknown");
    return json(req, 500, { error: "Delivery failed." });
  }
});