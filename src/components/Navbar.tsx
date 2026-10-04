import { useEffect, useState } from "react";
import Icon from "./Icon";
import CollegeSearch from "./CollegeSearch";
import MobileMenu from "./MobileMenu";
import NotificationBell from "./NotificationBell";
import { Link } from "../lib/router";

/**
 * The top bar is deliberately thin: menu, search and notifications. Everything
 * account-related (profile, dashboard, sign in/out, admin) lives in the drawer.
 * Row height is fixed at h-16 / sm:h-20 — nothing in here may make it taller.
 */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 8);
          ticking = false;
        });
        ticking = true;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 glass-nav transition-all duration-300 ${
          scrolled ? "border-b shadow-soft" : "border-b border-transparent"
        }`}
      >
        <nav
          className="container-px flex items-center gap-1 h-16 sm:h-20 sm:gap-2"
          aria-label="Primary"
        >
          {/* LEFT — the drawer handle and a plain home affordance. The JAVLIN
              wordmark stays in the drawer, the hero and the footer, which are
              the branding positions; here it competed with navigation. */}
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation"
              aria-expanded={menuOpen}
              className="nav-control inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2.5 text-ink-900 transition-colors hover:bg-brand-blue-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
            >
              <Icon name="menu" className="h-6 w-6" />
            </button>
            <Link
              href="/"
              aria-label="Home"
              className="nav-control inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2.5 text-ink-900 transition-colors hover:bg-brand-blue-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
            >
              <Icon name="home" className="h-6 w-6" />
            </Link>
          </div>

          {/* CENTER — the compact college search, with the bell beside it. */}
          <div className="flex min-w-0 flex-1 items-center justify-center gap-1 sm:gap-1.5">
            <CollegeSearch />
            <NotificationBell className="shrink-0 px-1" />
          </div>
        </nav>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
