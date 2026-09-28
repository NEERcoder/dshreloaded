import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "../lib/router";
import { useAuth } from "../context/AuthContext";
import { useUnreadNotificationCount } from "./NotificationBell";

/**
 * The account area of the navbar. Everything here is derived from the real
 * Supabase session — no display name, avatar or college is invented; when the
 * session only carries an email, the email is what we show.
 */
function initialsFrom(email: string | null): string {
  if (!email) return "J";
  const local = email.split("@")[0] ?? "";
  const letters = local.replace(/[^a-zA-Z. _-]/g, "");
  const parts = letters.split(/[._ -]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return letters.slice(0, 2).toUpperCase() || "J";
}

export default function AccountMenu() {
  const { user, signOut } = useAuth();
  const { path, navigate } = useLocation();
  const unread = useUnreadNotificationCount();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const profileHref = `/circle/${user.id}`;
  const isOwnProfile = path === profileHref || path.startsWith(`${profileHref}/`);

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    navigate("/");
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex min-h-[40px] items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-extrabold uppercase tracking-wider transition-colors duration-200 ${
          isOwnProfile ? "bg-brand-blue-soft text-brand-blue" : "text-ink-600 hover:bg-brand-blue-pale hover:text-brand-blue"
        }`}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-blue text-[10px] font-black text-white">
          {initialsFrom(user.email ?? null)}
        </span>
        <span>Profile</span>
        <svg
          viewBox="0 0 12 12"
          aria-hidden="true"
          className={`h-2.5 w-2.5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M2 4.5 6 8.5 10 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="glass-card glass-edge absolute right-0 top-[calc(100%+0.5rem)] z-50 w-60 p-1.5 shadow-lift"
        >
          <div className="px-3 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Signed in as</p>
            <p className="mt-1 truncate text-sm font-semibold text-ink-900">{user.email ?? "Your JAVLIN account"}</p>
          </div>
          <div className="my-1 h-px bg-surface-border" />

          <Link
            href={profileHref}
            role="menuitem"
            className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-blue-soft hover:text-brand-blue"
          >
            My profile
          </Link>
          <Link
            href="/notifications"
            role="menuitem"
            className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-blue-soft hover:text-brand-blue"
          >
            Notifications
            {unread > 0 && (
              <span className="rounded-full bg-brand-red px-2 py-0.5 text-[10px] font-black text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          <Link
            href="/circle/connections"
            role="menuitem"
            className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-blue-soft hover:text-brand-blue"
          >
            Connections
          </Link>
          <div className="my-1 h-px bg-surface-border" />
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-ink-600 transition-colors hover:bg-brand-red-soft hover:text-brand-red"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
