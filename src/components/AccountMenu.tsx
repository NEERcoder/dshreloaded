import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "../lib/router";
import { useAuth } from "../context/AuthContext";
import Icon from "./Icon";
import { StudentAvatar } from "./circle/StudentCard";
import { resolveTier } from "../lib/markTier";
import {
  getConnectionSummary,
  getStudentLevel,
  getCurrentUserProfile,
  type ProfileRecord,
} from "../lib/dataAccess";

/**
 * The account area of the navbar. Everything shown is derived from the real
 * session and existing data-access calls — no invented name, avatar, league or
 * connection count. When a value is unavailable we show a neutral em dash.
 */
export default function AccountMenu() {
  const { user, signOut } = useAuth();
  const { path, navigate } = useLocation();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [competitions, setCompetitions] = useState<number | null>(null);
  const [connections, setConnections] = useState<number | null>(null);
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

  // Load real account data only while the menu is open and a user exists.
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    getCurrentUserProfile().then((r) => !cancelled && r.data && setProfile(r.data));
    getStudentLevel(user.id).then((r) => !cancelled && r.data != null && setCompetitions(r.data));
    getConnectionSummary().then((r) => !cancelled && !r.error && setConnections(r.data.connections));
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    navigate("/");
  }

  const tier = competitions != null ? resolveTier(competitions) : null;
  const displayName = profile?.fullName || user?.email || "Your account";
  const profileHref = user ? `/circle/${user.id}` : "/login";

  const itemClass =
    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue";

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={user ? "Account menu" : "Account"}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-1 transition-colors duration-200 hover:bg-brand-blue-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
      >
        {user ? (
          <StudentAvatar src={profile?.avatarUrl ?? null} name={displayName} className="h-8 w-8 text-xs ring-2 ring-white" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue-pale text-brand-blue">
            <Icon name="user" className="h-4 w-4" />
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="glass-card glass-edge absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 p-1.5 shadow-lift"
        >
          {user ? (
            <>
              <div className="flex items-center gap-3 px-2.5 py-2.5">
                <StudentAvatar src={profile?.avatarUrl ?? null} name={displayName} className="h-12 w-12 shrink-0 text-base ring-2 ring-white" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink-900">{displayName}</p>
                  <p className="truncate text-xs font-medium text-ink-500">{user.email ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-2.5 pb-2.5 text-[11px] font-bold">
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-blue-pale px-2 py-0.5 text-brand-blue-dark">
                  <Icon name="trophy" className="h-3 w-3" />
                  {tier?.tierLabel ?? "—"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-soft px-2 py-0.5 text-ink-600">
                  <Icon name="users" className="h-3 w-3" />
                  {connections != null ? `${connections} connection${connections === 1 ? "" : "s"}` : "—"}
                </span>
              </div>
              <div className="my-1 h-px bg-surface-border" />

              <Link href={profileHref} role="menuitem" onClick={() => setOpen(false)} className={`${itemClass} text-ink-900 hover:bg-brand-blue-soft hover:text-brand-blue`}>
                <Icon name="user" className="h-4 w-4 shrink-0" />
                View Profile
              </Link>
              <span
                role="menuitem"
                aria-disabled="true"
                title="Coming soon"
                className={`${itemClass} cursor-not-allowed select-none text-ink-400`}
              >
                <Icon name="star" className="h-4 w-4 shrink-0" />
                My Certificates
                <span className="ml-auto rounded-full bg-surface-soft px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-ink-500">Soon</span>
              </span>
              <Link href="/settings" role="menuitem" onClick={() => setOpen(false)} className={`${itemClass} text-ink-900 hover:bg-brand-blue-soft hover:text-brand-blue`}>
                <Icon name="lock" className="h-4 w-4 shrink-0" />
                Settings
              </Link>

              <div className="my-1 h-px bg-surface-border" />
              <button type="button" role="menuitem" onClick={handleSignOut} className={`${itemClass} text-ink-600 hover:bg-brand-red-soft hover:text-brand-red-ink`}>
                <Icon name="logout" className="h-4 w-4 shrink-0" />
                Log Out
              </button>
            </>
          ) : (
            <div className="p-1.5">
              <p className="px-2 py-1 text-xs font-semibold text-ink-500">Sign in to view your profile, league and connections.</p>
              <Link href="/login" role="menuitem" onClick={() => setOpen(false)} className={`${itemClass} mt-1 bg-brand-blue text-white hover:bg-brand-blue-dark`}>
                <Icon name="user" className="h-4 w-4 shrink-0" />
                Log In
              </Link>
              <Link href="/signup" role="menuitem" onClick={() => setOpen(false)} className={`${itemClass} mt-1 text-brand-blue hover:bg-brand-blue-soft`}>
                <Icon name="users" className="h-4 w-4 shrink-0" />
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
