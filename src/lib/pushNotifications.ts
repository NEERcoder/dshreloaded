import { supabase, isSupabaseConfigured } from "./supabase";
import {
  getFirebaseMessaging,
  getToken,
  deleteToken,
  onMessage,
  FIREBASE_VAPID_KEY,
} from "./firebase";

/**
 * Central push-notification service (FCM web push).
 *
 * Design rules carried over from the rest of the app:
 *  - Permission is requested ONLY from an explicit user action, never on load.
 *  - Every backend gap degrades gracefully: until migration 022 and the
 *    send-push-notification Edge Function are deployed, registration reports
 *    "not enabled on the server yet" and event hooks stay silent. The verdict
 *    is cached for the session so a missing backend is probed once.
 *  - An FCM token belongs to a browser. The claim_push_token RPC (migration
 *    022) registers it for the account currently signed in, so switching
 *    accounts re-points this device and never touches other devices.
 *  - Push is a delivery channel: the in-app student_notifications rows remain
 *    the source of truth, and delivery is requested server-side only.
 */

export type PushPermissionStatus = "unsupported" | "default" | "granted" | "denied";
export type PushActionResult = { ok: boolean; message: string };

export type PushCategory = "opportunities" | "connections" | "teams" | "competitions" | "announcements";
export const PUSH_CATEGORIES: PushCategory[] = [
  "opportunities",
  "connections",
  "teams",
  "competitions",
  "announcements",
];

export type NotificationPreferences = {
  pushEnabled: boolean;
  opportunities: boolean;
  connections: boolean;
  teams: boolean;
  competitions: boolean;
  announcements: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  opportunities: true,
  connections: true,
  teams: true,
  competitions: true,
  announcements: true,
};

const SW_URL = "/firebase-messaging-sw.js";
const TOKEN_STORAGE_KEY = "javlin:push-token";

// Session-cached "backend not deployed yet" verdicts (missing table / function).
let pushTablesMissing = false;
let pushFunctionMissing = false;

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  // 42P01 undefined_table; PGRST205 = PostgREST schema cache has no such
  // table; 42883/PGRST202 = the claim_push_token RPC (migration 022) is absent.
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.code === "42883" ||
    error.code === "PGRST202" ||
    /schema cache/i.test(error.message ?? "")
  );
}

export function getPushPermissionStatus(): PushPermissionStatus {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return "unsupported";
  }
  const permission = Notification.permission;
  return permission === "granted" || permission === "denied" ? permission : "default";
}

async function requireUserId(): Promise<string | null> {
  if (!supabase || !isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  try {
    return await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  } catch {
    return null;
  }
}

function deviceDescriptor(): { deviceName: string; deviceType: string } {
  const ua = navigator.userAgent;
  const mobile = /Mobi|Android|iPhone|iPad/i.test(ua);
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  return { deviceName: `${browser} on ${mobile ? "mobile" : "desktop"}`, deviceType: mobile ? "mobile" : "desktop" };
}

/**
 * Register (or refresh) this browser's FCM token for the signed-in account.
 * Assumes permission is already granted — never prompts.
 */
export async function registerPushSubscription(): Promise<PushActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, message: "Sign in to enable notifications." };
  if (pushTablesMissing) {
    return { ok: false, message: "Push notifications aren't enabled on the server yet." };
  }

  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    return { ok: false, message: "This browser doesn't support push notifications." };
  }

  const registration = await registerServiceWorker();
  if (!registration) {
    return { ok: false, message: "Couldn't register the notification service worker." };
  }

  let token: string;
  try {
    token = await getToken(messaging, {
      vapidKey: FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
  } catch {
    return {
      ok: false,
      message: "Couldn't obtain a notification token. Check that notifications are allowed for this site.",
    };
  }
  if (!token) {
    return { ok: false, message: "Couldn't obtain a notification token for this device." };
  }

  const { deviceName, deviceType } = deviceDescriptor();
  // The claim RPC (migration 022) owns the upsert: it derives the owner from
  // the caller's JWT and can re-point a token left by a previous account on
  // this browser — something owner-only RLS cannot express client-side.
  const { error } = await supabase!.rpc("claim_push_token", {
    p_fcm_token: token,
    p_device_name: deviceName,
    p_device_type: deviceType,
  });
  if (error) {
    if (isMissingTableError(error)) {
      pushTablesMissing = true;
      return { ok: false, message: "Push notifications aren't enabled on the server yet." };
    }
    return { ok: false, message: "Couldn't save this device for notifications. Please try again." };
  }

  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // Private browsing may block storage; registration still succeeded.
  }
  return { ok: true, message: "Notifications are enabled for this device." };
}

/** Explicit user action: ask permission if needed, then register this device. */
export async function enablePushNotifications(): Promise<PushActionResult> {
  const status = getPushPermissionStatus();
  if (status === "unsupported") {
    return { ok: false, message: "This browser doesn't support push notifications. Try Chrome, Edge or Firefox on desktop or Android." };
  }
  if (status === "denied") {
    return {
      ok: false,
      message: "Notifications are blocked for this site. Allow them in your browser's site settings, then try again.",
    };
  }
  if (status === "default") {
    let permission: NotificationPermission;
    try {
      permission = await Notification.requestPermission();
    } catch {
      return { ok: false, message: "The browser didn't allow a notification permission prompt." };
    }
    if (permission !== "granted") {
      return { ok: false, message: "Notifications were not allowed. You can enable them anytime from Settings." };
    }
  }
  return registerPushSubscription();
}

/**
 * Remove THIS device's subscription for the signed-in account and invalidate
 * its FCM token. Other devices and other accounts are never touched.
 */
export async function removePushSubscription(): Promise<PushActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, message: "Sign in to manage notifications." };

  let token: string | null = null;
  try {
    token = localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    token = null;
  }
  if (!token) {
    const messaging = await getFirebaseMessaging();
    if (messaging) {
      try {
        token = await getToken(messaging, { vapidKey: FIREBASE_VAPID_KEY });
      } catch {
        token = null;
      }
    }
  }

  if (token && !pushTablesMissing) {
    const { error } = await supabase!
      .from("push_subscriptions")
      .delete()
      .eq("fcm_token", token)
      .eq("user_id", userId);
    if (error && isMissingTableError(error)) pushTablesMissing = true;
  }

  const messaging = await getFirebaseMessaging();
  if (messaging) {
    try {
      await deleteToken(messaging);
    } catch {
      // Token may already be gone; the row removal above is what matters.
    }
  }
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
  return { ok: true, message: "Notifications are disabled for this device." };
}

/** User-facing disable: same cleanup, phrased as a preference change. */
export async function disablePushNotifications(): Promise<PushActionResult> {
  return removePushSubscription();
}

/**
 * Silent re-registration after sign-in / account switch. Only runs when the
 * browser already granted permission — it never prompts. Claiming the token
 * for the new account is what stops the previous account's pushes on this
 * browser (migration 022 re-points the single token row).
 */
export async function syncPushRegistrationForUser(): Promise<void> {
  if (getPushPermissionStatus() !== "granted") return;
  if (!supabase || !isSupabaseConfigured || pushTablesMissing) return;
  try {
    await registerPushSubscription();
  } catch {
    // Background sync must never surface errors into the auth flow.
  }
}

export type ForegroundPushPayload = {
  title: string;
  body: string;
  route: string;
  category: string | null;
  notificationId: string | null;
};

/** Subscribe to foreground FCM messages. Returns an unsubscribe function. */
export async function listenForForegroundMessages(
  handler: (payload: ForegroundPushPayload) => void
): Promise<() => void> {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return () => {};
  const unsubscribe = onMessage(messaging, (payload) => {
    const data = (payload.data ?? {}) as Record<string, string>;
    const route =
      typeof data.route === "string" && /^\/[A-Za-z0-9\-/_]*$/.test(data.route) && !data.route.startsWith("//")
        ? data.route
        : "/notifications";
    handler({
      title: data.title || payload.notification?.title || "JAVLIN",
      body: data.body || payload.notification?.body || "You have a new update.",
      route,
      category: data.category ?? null,
      notificationId: data.notificationId ?? null,
    });
  });
  return unsubscribe;
}

/** Whether this browser's current token is registered for the signed-in user. */
export async function isCurrentDeviceRegistered(): Promise<boolean> {
  if (getPushPermissionStatus() !== "granted") return false;
  const userId = await requireUserId();
  if (!userId || pushTablesMissing) return false;
  let token: string | null = null;
  try {
    token = localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    token = null;
  }
  if (!token) return false;
  const { data, error } = await supabase!
    .from("push_subscriptions")
    .select("id")
    .eq("fcm_token", token)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (isMissingTableError(error)) pushTablesMissing = true;
    return false;
  }
  return Boolean(data);
}

// ---------------------------------------------------------------------
// Delivery preferences (migration 022 notification_preferences)
// ---------------------------------------------------------------------

function mapPreferences(row: Record<string, unknown> | null): NotificationPreferences {
  if (!row) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  const bool = (value: unknown, fallback: boolean) =>
    typeof value === "boolean" ? value : fallback;
  return {
    pushEnabled: bool(row.push_enabled, true),
    opportunities: bool(row.opportunities, true),
    connections: bool(row.connections, true),
    teams: bool(row.teams, true),
    competitions: bool(row.competitions, true),
    announcements: bool(row.announcements, true),
  };
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const userId = await requireUserId();
  if (!userId || pushTablesMissing) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  const { data, error } = await supabase!
    .from("notification_preferences")
    .select("push_enabled, opportunities, connections, teams, competitions, announcements")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (isMissingTableError(error)) pushTablesMissing = true;
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
  return mapPreferences(data as Record<string, unknown> | null);
}

export async function saveNotificationPreferences(
  prefs: NotificationPreferences
): Promise<PushActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, message: "Sign in to manage notifications." };
  if (pushTablesMissing) {
    return { ok: false, message: "Push notifications aren't enabled on the server yet." };
  }
  const { error } = await supabase!.from("notification_preferences").upsert(
    {
      user_id: userId,
      push_enabled: prefs.pushEnabled,
      opportunities: prefs.opportunities,
      connections: prefs.connections,
      teams: prefs.teams,
      competitions: prefs.competitions,
      announcements: prefs.announcements,
    },
    { onConflict: "user_id" }
  );
  if (error) {
    if (isMissingTableError(error)) {
      pushTablesMissing = true;
      return { ok: false, message: "Push notifications aren't enabled on the server yet." };
    }
    return { ok: false, message: "Couldn't save your notification preferences. Please try again." };
  }
  return { ok: true, message: "Notification preferences saved." };
}

// ---------------------------------------------------------------------
// Server-side delivery requests (the browser NEVER sends push itself)
// ---------------------------------------------------------------------

/**
 * Fire-and-forget request to the send-push-notification Edge Function. The
 * server re-derives the recipient from the referenced row and re-checks
 * authorization; nothing here is trusted. Failures are silent by design —
 * push must never break the action that triggered it.
 */
export async function requestPushDelivery(body: Record<string, unknown>): Promise<void> {
  if (!supabase || !isSupabaseConfigured || pushFunctionMissing) return;
  try {
    const { error } = await supabase.functions.invoke("send-push-notification", { body });
    if (error) {
      const status = (error as { context?: { status?: number } }).context?.status;
      // 404 = the function isn't deployed yet; cache and stay silent.
      if (status === 404) pushFunctionMissing = true;
    }
  } catch {
    // Network/auth failures never propagate into the calling flow.
  }
}

/** Admin broadcast request; resolves with a report for the admin UI. */
export async function requestPushBroadcast(input: {
  broadcastId: string;
  title: string;
  body: string;
  route: string;
  category: PushCategory;
}): Promise<PushActionResult> {
  if (!supabase || !isSupabaseConfigured) {
    return { ok: false, message: "Supabase is not configured." };
  }
  if (pushFunctionMissing) {
    return { ok: false, message: "The push delivery function isn't deployed yet." };
  }
  try {
    const { data, error } = await supabase.functions.invoke("send-push-notification", {
      body: { kind: "broadcast", ...input },
    });
    if (error) {
      const status = (error as { context?: { status?: number } }).context?.status;
      if (status === 404) {
        pushFunctionMissing = true;
        return { ok: false, message: "The push delivery function isn't deployed yet." };
      }
      if (status === 403) return { ok: false, message: "Only verified admins can send announcements." };
      if (status === 429) return { ok: false, message: "Rate limit reached. Try again later." };
      return { ok: false, message: "The announcement couldn't be sent. Please try again." };
    }
    const report = (data ?? {}) as { sent?: number; skipped?: number; failed?: number };
    return {
      ok: true,
      message: `Announcement sent to ${report.sent ?? 0} device(s); ${report.skipped ?? 0} skipped by preferences, ${report.failed ?? 0} failed.`,
    };
  } catch {
    return { ok: false, message: "The announcement couldn't be sent. Please try again." };
  }
}