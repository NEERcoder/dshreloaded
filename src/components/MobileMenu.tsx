import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import BrandMark from "./BrandMark";
import { Link, useLocation } from "../lib/router";
import { useAuth } from "../context/AuthContext";
import { useUnreadNotificationCount } from "./NotificationBell";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * The app drawer. It carries account actions plus the two utility destinations
 * that used to sit in the top bar, so the navbar itself can stay minimal.
 */
export default function MobileMenu({ open, onClose }: MobileMenuProps) {
  const [render, setRender] = useState(open);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { path, navigate } = useLocation();
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const unread = useUnreadNotificationCount();

  async function handleSignOut() {
    onClose();
    await signOut();
    navigate("/");
  }

  useEffect(() => {
    if (open) setRender(true);
    else {
      const t = setTimeout(() => setRender(false), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (open && render) closeButtonRef.current?.focus();
  }, [open, render]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!render) return null;

  const itemClass = (href: string) =>
    `flex items-center gap-2.5 rounded-xl px-4 py-3 text-base font-semibold transition-colors ${
      path === href || path.startsWith(href + "/")
        ? "text-brand-blue bg-brand-blue-soft"
        : "text-ink-900 hover:bg-brand-blue-soft"
    }`;

  function stagger(index: number) {
    return { className: `drawer-link ${open ? "is-visible" : ""}`, style: { transitionDelay: open ? `${index * 45 + 50}ms` : "0ms" } };
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Menu">
      <div
        className={`absolute inset-0 bg-ink-900/30 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`absolute top-0 left-0 h-full w-[82%] max-w-sm bg-white/90 backdrop-blur-xl shadow-lift border-r border-white/70 transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <div className="flex items-center justify-between h-16 px-5 border-b border-surface-border">
          <BrandMark className="h-8 w-auto" />
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close menu"
            className="p-2 -mr-2 text-ink-700 hover:text-brand-blue active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue rounded-xl"
          >
            <Icon name="close" className="h-6 w-6" />
          </button>
        </div>

        <div className="px-5 py-6 flex flex-col gap-1">
          {!authLoading && user && (
            <>
              <div {...stagger(0)}>
                <Link href="/dashboard" onClick={onClose} className={itemClass("/dashboard")}>
                  <Icon name="grid" className="h-5 w-5 shrink-0" />
                  Dashboard
                </Link>
              </div>
              <div {...stagger(1)}>
                <Link href={`/circle/${user.id}`} onClick={onClose} className={itemClass("/circle")}>
                  <Icon name="user" className="h-5 w-5 shrink-0" />
                  Profile
                </Link>
              </div>
              <div {...stagger(2)}>
                <Link href="/circle/connections" onClick={onClose} className={itemClass("/circle/connections")}>
                  <Icon name="link" className="h-5 w-5 shrink-0" />
                  Connections
                </Link>
              </div>
              <div {...stagger(3)}>
                <Link
                  href="/notifications"
                  onClick={onClose}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 text-base font-semibold transition-colors ${
                    path === "/notifications" ? "text-brand-blue bg-brand-blue-soft" : "text-ink-900 hover:bg-brand-blue-soft"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon name="bell" className="h-5 w-5 shrink-0" />
                    Notifications
                  </span>
                  {unread > 0 && (
                    <span className="rounded-full bg-brand-red px-2 py-0.5 text-[11px] font-black text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
              </div>
            </>
          )}

          {!authLoading && !user && (
            <>
              <div {...stagger(0)}>
                <Link href="/login" onClick={onClose} className={itemClass("/login")}>
                  <Icon name="user" className="h-5 w-5 shrink-0" />
                  Login
                </Link>
              </div>
              <div {...stagger(1)}>
                <Link href="/signup" onClick={onClose} className={itemClass("/signup")}>
                  <Icon name="plus" className="h-5 w-5 shrink-0" />
                  Create Profile
                </Link>
              </div>
            </>
          )}

          <div {...stagger(!authLoading && user ? 4 : 2)}>
            <Link href="/college-reviews" onClick={onClose} className={itemClass("/college-reviews")}>
              <Icon name="star" className="h-5 w-5 shrink-0" />
              College Reviews
            </Link>
          </div>
          <div {...stagger(!authLoading && user ? 5 : 3)}>
            <Link href="/join" onClick={onClose} className={itemClass("/join")}>
              <Icon name="users" className="h-5 w-5 shrink-0" />
              Join JAVLIN
            </Link>
          </div>

          {isAdmin && !authLoading && (
            <div {...stagger(!authLoading && user ? 6 : 4)}>
              <Link
                href="/admin"
                onClick={onClose}
                className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-base font-extrabold transition-colors ${
                  path === "/admin" ? "text-white bg-brand-red" : "text-brand-red bg-brand-red-soft hover:bg-brand-red hover:text-white"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
                Admin Dashboard
              </Link>
            </div>
          )}

          {!authLoading && user && (
            <div {...stagger(7)}>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 rounded-xl px-4 py-3 text-base font-semibold text-ink-600 transition-colors hover:bg-surface-soft"
              >
                <Icon name="logout" className="h-5 w-5 shrink-0" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
