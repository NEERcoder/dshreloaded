import { useEffect, useState } from "react";
import Icon from "./Icon";
import { Link, useLocation } from "../lib/router";
import { useAuth } from "../context/AuthContext";

type NavLink = { label: string; href: string };

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  navLinks: NavLink[];
};

export default function MobileMenu({ open, onClose, navLinks }: MobileMenuProps) {
  const [render, setRender] = useState(open);
  const { path, navigate } = useLocation();
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();

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
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!render) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Menu">
      <div
        className={`absolute inset-0 bg-ink-900/30 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
        <div
          className={`absolute top-0 right-0 h-full w-[82%] max-w-sm bg-white shadow-lift transition-transform duration-300 ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
          style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
        >
          <div className="flex items-center justify-between h-16 px-5 border-b border-surface-border">
            <img
              src="/DSH_OFFICIAL_LOGO.png"
              alt="DU Science Hub"
              className="h-9 w-auto max-w-[10rem] object-contain"
              width={506}
              height={229}
            />
            <button
              onClick={onClose}
              aria-label="Close menu"
              className="p-2 -mr-2 text-ink-700 hover:text-brand-blue active:scale-95 transition-transform"
            >
              <Icon name="close" className="h-6 w-6" />
            </button>
          </div>

          <div className="px-5 py-6 flex flex-col gap-1">
            {navLinks.map((link, idx) => {
              const isActive = path === link.href || path.startsWith(link.href + "/");
              return (
                <div
                  key={link.label}
                  className={`drawer-link ${open ? "is-visible" : ""}`}
                  style={{ transitionDelay: open ? `${idx * 45 + 50}ms` : "0ms" }}
                >
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className={`block px-4 py-3 text-base font-semibold rounded-xl transition-colors ${
                      isActive
                        ? "text-brand-blue bg-brand-blue-soft"
                        : "text-ink-900 hover:bg-brand-blue-soft"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                </div>
              );
            })}

            {isAdmin && !authLoading && (
              <div
                className={`drawer-link ${open ? "is-visible" : ""}`}
                style={{ transitionDelay: open ? `${navLinks.length * 45 + 50}ms` : "0ms" }}
              >
                <Link
                  href="/admin"
                  onClick={onClose}
                  className={`px-4 py-3 text-base font-extrabold rounded-xl transition-colors flex items-center justify-between ${
                    path === "/admin"
                      ? "text-white bg-brand-red"
                      : "text-brand-red bg-brand-red-soft hover:bg-brand-red hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
                    <span>Admin Dashboard</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded bg-white/20">
                    Verified
                  </span>
                </Link>
              </div>
            )}

            {!authLoading && (
              <div
                className={`drawer-link ${open ? "is-visible" : ""}`}
                style={{ transitionDelay: open ? `${(navLinks.length + (isAdmin ? 1 : 0) + 1) * 45 + 50}ms` : "0ms" }}
              >
                {user ? (
                  <div className="flex flex-col gap-2 mt-1">
                    <Link
                      href="/dashboard"
                      onClick={onClose}
                      className={`block px-4 py-3 text-base font-semibold rounded-xl transition-colors ${
                        path === "/dashboard"
                          ? "text-brand-blue bg-brand-blue-soft"
                          : "text-ink-900 hover:bg-brand-blue-soft"
                      }`}
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-3 text-base font-semibold rounded-xl text-ink-600 hover:bg-surface-soft transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 mt-1">
                    <Link
                      href="/login"
                      onClick={onClose}
                      className={`block px-4 py-3 text-base font-semibold rounded-xl transition-colors ${
                        path === "/login"
                          ? "text-brand-blue bg-brand-blue-soft"
                          : "text-ink-900 hover:bg-brand-blue-soft"
                      }`}
                    >
                      Login
                    </Link>
                    <Link
                      href="/signup"
                      onClick={onClose}
                      className={`block px-4 py-3 text-base font-semibold rounded-xl transition-colors ${
                        path === "/signup"
                          ? "text-brand-blue bg-brand-blue-soft"
                          : "text-ink-900 hover:bg-brand-blue-soft"
                      }`}
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            )}

            <div
              className={`drawer-link ${open ? "is-visible" : ""}`}
              style={{ transitionDelay: open ? `${(navLinks.length + (isAdmin ? 1 : 0) + 2) * 45 + 50}ms` : "0ms" }}
            >
              <Link
                href="/opportunities"
                onClick={onClose}
                className="btn-primary mt-4 w-full shadow-card"
              >
                Opportunity Radar
              </Link>
            </div>
          </div>
        </div>
    </div>
  );
}
