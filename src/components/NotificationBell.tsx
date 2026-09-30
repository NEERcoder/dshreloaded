import { useEffect, useState } from "react";
import Icon from "./Icon";
import { Link, useLocation } from "../lib/router";
import { useAuth } from "../context/AuthContext";
import { getUnreadNotificationCount } from "../lib/dataAccess";

export const NOTIFICATIONS_CHANGED = "javlin:notifications-changed";

/** Lets any surface (bell, list, dashboard card) refresh without a context. */
export function announceNotificationsChanged() {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
}

/**
 * Unread count for the signed-in student. Re-reads on navigation and after any
 * notification mutation; an unavailable backend simply reads as zero, so the
 * bell never becomes a broken dependency for the rest of the app.
 */
export function useUnreadNotificationCount(): number {
  const { user } = useAuth();
  const { path } = useLocation();
  const [count, setCount] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((value) => value + 1);
    window.addEventListener(NOTIFICATIONS_CHANGED, bump);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED, bump);
  }, []);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }
    let cancelled = false;
    getUnreadNotificationCount().then((result) => {
      if (!cancelled) setCount(result.error ? 0 : result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [user, path, tick]);

  return count;
}

function badgeLabel(count: number): string {
  return count > 9 ? "9+" : String(count);
}

export default function NotificationBell({ className = "" }: { className?: string }) {
  const { user, loading: authLoading } = useAuth();
  const unread = useUnreadNotificationCount();
  const { path } = useLocation();

  if (authLoading || !user) return null;

  const isActive = path === "/notifications" || path.startsWith("/notifications/");

  return (
    <Link
      href="/notifications"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
      className={`relative inline-flex items-center justify-center rounded-xl transition-colors duration-200 min-h-[44px] min-w-[44px] ${
        isActive
          ? "text-brand-blue bg-brand-blue-soft"
          : "text-ink-900 hover:text-brand-blue hover:bg-brand-blue-soft/60"
      } ${className}`}
    >
      <Icon name="bell" className="h-6 w-6" />
      {unread > 0 && (
        <span
          className="absolute -top-0.5 right-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-red px-1 text-[11px] font-black leading-none text-brand-navy"
          aria-hidden="true"
        >
          {badgeLabel(unread)}
        </span>
      )}
    </Link>
  );
}
