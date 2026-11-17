import { useEffect, useState } from "react";
import Icon from "./Icon";
import {
  getPushPermissionStatus,
  enablePushNotifications,
  disablePushNotifications,
  isCurrentDeviceRegistered,
  getNotificationPreferences,
  saveNotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  type PushPermissionStatus,
  type NotificationPreferences,
} from "../lib/pushNotifications";

type CategoryKey = Exclude<keyof NotificationPreferences, "pushEnabled">;

const CATEGORY_ROWS: { key: CategoryKey; label: string; description: string }[] = [
  { key: "opportunities", label: "Opportunities", description: "New internships, certifications and research listings." },
  { key: "connections", label: "Connections", description: "Connection requests and acceptances." },
  { key: "teams", label: "Teams", description: "Team join requests and captain decisions." },
  { key: "competitions", label: "Competitions & events", description: "Updates about competitions and events you take part in." },
  { key: "announcements", label: "Announcements", description: "Occasional announcements from the JAVLIN team." },
];

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 disabled:opacity-60 ${
        checked ? "bg-brand-blue" : "bg-ink-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

const PERMISSION_LABEL: Record<PushPermissionStatus, string> = {
  unsupported: "Not supported in this browser",
  default: "Not asked yet",
  granted: "Allowed",
  denied: "Blocked in browser settings",
};

/**
 * The "Push Notification Preferences" settings section. Permission is only
 * ever requested from the explicit Enable button — this component never
 * prompts on load. Until migration 022 lands, the service reports the server
 * gap and every control degrades to a clear message instead of an error.
 */
export default function PushNotificationSettings() {
  const [permission, setPermission] = useState<PushPermissionStatus>(() => getPushPermissionStatus());
  const [registered, setRegistered] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferences>({ ...DEFAULT_NOTIFICATION_PREFERENCES });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"enable" | "disable" | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([isCurrentDeviceRegistered(), getNotificationPreferences()]).then(([isRegistered, loaded]) => {
      if (cancelled) return;
      setPermission(getPushPermissionStatus());
      setRegistered(isRegistered);
      setPrefs(loaded);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshDeviceState() {
    setPermission(getPushPermissionStatus());
    setRegistered(await isCurrentDeviceRegistered());
  }

  async function handleEnable() {
    if (busy) return;
    setBusy("enable");
    setMessage(null);
    const result = await enablePushNotifications();
    await refreshDeviceState();
    setBusy(null);
    setMessage({ tone: result.ok ? "ok" : "error", text: result.message });
  }

  async function handleDisable() {
    if (busy) return;
    setBusy("disable");
    setMessage(null);
    const result = await disablePushNotifications();
    await refreshDeviceState();
    setBusy(null);
    setMessage({ tone: result.ok ? "ok" : "error", text: result.message });
  }

  async function togglePref(key: keyof NotificationPreferences) {
    if (savingPrefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setSavingPrefs(true);
    setMessage(null);
    const result = await saveNotificationPreferences(next);
    setSavingPrefs(false);
    if (!result.ok) {
      // Keep the last confirmed values on failure.
      setMessage({ tone: "error", text: result.message });
      return;
    }
    setPrefs(next);
    setMessage({ tone: "ok", text: result.message });
  }

  return (
    <div className="card mt-6 p-6">
      <h2 className="text-base font-extrabold text-ink-900">Push Notification Preferences</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-500">
        Get notified on this device about connection requests and team activity, even when JAVLIN
        isn't open. Nothing is sent until you enable notifications here, and you can turn categories
        off at any time.
      </p>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-ink-500 animate-pulse">
          <Icon name="loader" className="h-4 w-4 animate-spin" /> Checking this device…
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-2 text-xs font-bold sm:grid-cols-2">
            <p className="text-ink-500">
              Browser permission:{" "}
              <span className={permission === "granted" ? "text-brand-blue" : permission === "denied" ? "text-brand-red-ink" : "text-ink-700"}>
                {PERMISSION_LABEL[permission]}
              </span>
            </p>
            <p className="text-ink-500">
              This device:{" "}
              <span className={registered ? "text-brand-blue" : "text-ink-700"}>
                {registered ? "Registered for notifications" : "Not registered"}
              </span>
            </p>
          </div>

          {permission === "unsupported" && (
            <div className="mt-4 rounded-xl border border-surface-border bg-surface-soft p-3 text-sm font-semibold text-ink-600">
              This browser doesn't support push notifications. Chrome, Edge and Firefox work on
              desktop and Android. On iPhone or iPad, notifications require iOS 16.4 or later and
              JAVLIN added to your Home Screen.
            </div>
          )}

          {permission === "denied" && (
            <div className="mt-4 rounded-xl border border-brand-red/20 bg-brand-red-soft p-3 text-sm font-semibold text-brand-red-ink">
              Notifications are blocked for this site. Open your browser's site settings (the icon
              next to the address bar), allow notifications for dusciencehub.in, then press Enable
              again.
            </div>
          )}

          {permission !== "unsupported" && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {registered ? (
                <button type="button" onClick={handleDisable} disabled={busy !== null} className="btn-secondary min-h-[44px] px-4 text-sm">
                  {busy === "disable" ? "Disabling…" : "Disable on this device"}
                </button>
              ) : (
                <button type="button" onClick={handleEnable} disabled={busy !== null} className="btn-primary min-h-[44px] px-4 text-sm">
                  {busy === "enable" ? "Enabling…" : "Enable notifications"}
                </button>
              )}
              {busy && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-ink-500">
                  <Icon name="loader" className="h-3.5 w-3.5 animate-spin" /> Working…
                </span>
              )}
            </div>
          )}

          <div className="mt-6 border-t border-surface-border pt-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-ink-900">All push notifications</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
                  The master switch. When off, no category is delivered to any of your devices.
                </p>
              </div>
              <Toggle
                checked={prefs.pushEnabled}
                onChange={() => togglePref("pushEnabled")}
                disabled={savingPrefs}
                label="All push notifications"
              />
            </div>

            <ul className={`mt-4 space-y-4 ${prefs.pushEnabled ? "" : "opacity-50"}`}>
              {CATEGORY_ROWS.map(({ key, label, description }) => (
                <li key={key} className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink-900">{label}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{description}</p>
                  </div>
                  <Toggle
                    checked={prefs[key]}
                    onChange={() => togglePref(key)}
                    disabled={savingPrefs || !prefs.pushEnabled}
                    label={label}
                  />
                </li>
              ))}
            </ul>
            {savingPrefs && (
              <p className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-ink-500">
                <Icon name="loader" className="h-3.5 w-3.5 animate-spin" /> Saving…
              </p>
            )}
          </div>

          <p className="mt-5 text-xs leading-relaxed text-ink-500">
            Push may be unavailable in private browsing windows, and turning notifications off here
            doesn't change your in-app notification centre — it stays the full record.
          </p>
        </>
      )}

      {message && (
        <div
          role="status"
          className={`mt-4 rounded-xl border p-3 text-sm font-semibold ${
            message.tone === "error"
              ? "border-brand-red/20 bg-brand-red-soft text-brand-red-ink"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}