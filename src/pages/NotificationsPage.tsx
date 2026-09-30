import { useCallback, useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import Icon from "../components/Icon";
import { announceNotificationsChanged } from "../components/NotificationBell";
import { initialsOf } from "../components/circle/StudentCard";
import { actorLabel, unreadCountOf } from "../lib/notifications";
import { Link } from "../lib/router";
import { useAuth } from "../context/AuthContext";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRecord,
} from "../lib/dataAccess";

const BTN = "min-h-[44px] px-3.5 text-xs";

function timeLabel(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();

  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getMyNotifications().then((result) => {
      if (cancelled) return;
      if (result.error) setError(result.error);
      setNotifications(result.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => load(), [load]);

  const unreadOnPage = unreadCountOf(notifications);

  async function markRead(notificationId: string) {
    setBusyId(notificationId);
    setActionError(null);
    const result = await markNotificationRead(notificationId);
    setBusyId(null);
    if (result.error) setActionError(result.error);
    else announceNotificationsChanged();
    load();
  }

  async function markAll() {
    setMarkingAll(true);
    setActionError(null);
    const result = await markAllNotificationsRead();
    setMarkingAll(false);
    if (result.error) setActionError(result.error);
    else announceNotificationsChanged();
    load();
  }

  if (authLoading || loading) {
    return (
      <PageShell title="Notifications | JAVLIN" backgroundPreset="directory">
        <div className="container-px py-24 text-center text-sm font-semibold text-ink-500 animate-pulse">
          Loading your notifications…
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell title="Notifications | JAVLIN" backgroundPreset="directory">
        <div className="container-px py-16">
          <div className="mx-auto max-w-xl card border-dashed p-8 sm:p-10 text-center bg-white">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue-soft text-brand-blue">
              <Icon name="bell" className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-lg font-extrabold text-ink-900">Notifications are for signed-in students</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
              Connection activity belongs to the two students involved, so it only appears once you're logged in.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/login" className="btn-primary">
                Sign in
              </Link>
              <Link href="/circle" className="btn-secondary">
                Back to CIRCLE
              </Link>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Notifications | JAVLIN"
      description="Connection requests and acceptances, newest first."
      backgroundPreset="directory"
    >
      <section className="page-hero">
        <div className="container-px">
          <p className="eyebrow">CIRCLE</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="page-title font-display">
                Notifications
              </h1>
              <p className="page-lede mt-3">
                {unreadOnPage > 0
                  ? `${unreadOnPage} unread connection ${unreadOnPage === 1 ? "update" : "updates"}.`
                  : "You're up to date."}
              </p>
            </div>
            {unreadOnPage > 0 && (
              <button type="button" onClick={markAll} disabled={markingAll} className={`btn-secondary ${BTN}`}>
                {markingAll ? "Marking…" : "Mark all as read"}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="container-px py-8 sm:py-10 max-w-2xl">
        {error && (
          <div className="mb-6 rounded-2xl border border-brand-red/20 bg-brand-red-soft px-4 py-3 text-sm font-bold text-brand-red-ink">
            We couldn't load your notifications. {error}
          </div>
        )}
        {actionError && (
          <div
            className="mb-6 rounded-2xl border border-brand-red/20 bg-brand-red-soft px-4 py-3 text-sm font-bold text-brand-red-ink"
            role="status"
          >
            {actionError}
          </div>
        )}

        {notifications.length === 0 ? (
          <div className="w-full rounded-2xl border-2 border-dashed border-surface-border bg-white/80 px-6 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue-soft text-brand-blue">
              <Icon name="bell" className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-base font-extrabold text-ink-900">You're all caught up.</h2>
            <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-ink-500">
              New connection activity will appear here.
            </p>
            <Link href="/circle" className="btn-primary mt-5">
              Browse CIRCLE
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {notifications.map((item) => (
              <li key={item.id}>
                <article
                  className={`flex flex-col gap-3 rounded-2xl border p-4 shadow-card sm:flex-row sm:items-center sm:justify-between ${
                    item.read ? "border-surface-border bg-white" : "border-brand-blue/15 bg-brand-blue-pale"
                  }`}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    {item.actor ? (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-blue-soft text-sm font-extrabold text-brand-blue">
                        {initialsOf(item.actor.fullName)}
                      </span>
                    ) : (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-soft text-ink-400">
                        <Icon name="users" className="h-5 w-5" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm leading-relaxed text-ink-900">
                        {item.actor ? (
                          <Link
                            href={`/circle/${item.actor.userId}`}
                            className="font-extrabold hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                          >
                            {item.actor.fullName}
                          </Link>
                        ) : (
                          <span className="font-extrabold text-ink-500">{actorLabel(item)}</span>
                        )}{" "}
                        <span className="font-semibold">{item.message}</span>
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold uppercase tracking-wider text-ink-500">
                        {!item.read && (
                          <span className="inline-flex items-center gap-1 text-brand-blue">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-blue" />
                            New
                          </span>
                        )}
                        {timeLabel(item.createdAt)}
                      </p>
                      {item.type === "connection_request" && item.connectionId && (
                        <Link href="/circle/connections" className="mt-2 inline-flex text-xs font-extrabold text-brand-blue hover:underline min-h-[44px] sm:min-h-[32px] items-center">
                          Review request
                        </Link>
                      )}
                    </div>
                  </div>
                  {!item.read && (
                    <button
                      type="button"
                      onClick={() => markRead(item.id)}
                      disabled={busyId === item.id}
                      className={`btn-ghost shrink-0 ${BTN}`}
                    >
                      {busyId === item.id ? "Marking…" : "Mark as read"}
                    </button>
                  )}
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
