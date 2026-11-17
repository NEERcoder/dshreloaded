import { useEffect, useRef, useState } from "react";
import { useLocation } from "../lib/router";
import { useAuth } from "../context/AuthContext";
import Icon from "./Icon";
import { announceNotificationsChanged } from "./NotificationBell";
import {
  getPushPermissionStatus,
  listenForForegroundMessages,
  type ForegroundPushPayload,
} from "../lib/pushNotifications";

function safeRoute(raw: unknown): string {
  return typeof raw === "string" && /^\/[A-Za-z0-9\-/_]*$/.test(raw) && !raw.startsWith("//")
    ? raw
    : "/notifications";
}

/**
 * Foreground push surface, mounted once inside the auth provider. While the
 * tab is open FCM delivers to onMessage (not the service worker), so this
 * shows a single in-app toast and refreshes the notification bell. Background
 * display is the service worker's job; its click handler posts
 * "javlin-push-click" here so an already-open tab routes in place.
 */
export default function PushForeground() {
  const { user } = useAuth();
  const { navigate } = useLocation();
  const [toast, setToast] = useState<ForegroundPushPayload | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    function onSwMessage(event: MessageEvent) {
      const data = event.data as { type?: string; route?: string } | null;
      if (!data || data.type !== "javlin-push-click") return;
      navigate(safeRoute(data.route));
    }
    navigator.serviceWorker.addEventListener("message", onSwMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onSwMessage);
  }, [navigate]);

  useEffect(() => {
    if (!user || getPushPermissionStatus() !== "granted") return;
    let active = true;
    let unsubscribe: (() => void) | null = null;

    listenForForegroundMessages((payload) => {
      if (!active) return;
      const key = payload.notificationId ?? `${payload.title}|${payload.body}`;
      if (seenRef.current.has(key)) return;
      if (seenRef.current.size >= 100) seenRef.current.clear();
      seenRef.current.add(key);
      setToast(payload);
      announceNotificationsChanged();
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setToast(null), 8000);
    }).then((fn) => {
      if (active) unsubscribe = fn;
      else fn();
    });

    return () => {
      active = false;
      unsubscribe?.();
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [user]);

  if (!toast) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-[90] w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-surface-border bg-white p-4 shadow-lg"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-blue-soft text-brand-blue">
          <Icon name="bell" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-ink-900">{toast.title}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-ink-600">{toast.body}</p>
          <button
            type="button"
            onClick={() => {
              setToast(null);
              navigate(toast.route);
            }}
            className="mt-2 inline-flex min-h-[36px] items-center text-xs font-extrabold text-brand-blue hover:underline"
          >
            View
          </button>
        </div>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={() => setToast(null)}
          className="shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-surface-soft hover:text-ink-700"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}