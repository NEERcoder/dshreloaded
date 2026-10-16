import { useEffect, useState } from "react";
import Icon from "./Icon";
import CollegeSearch from "./CollegeSearch";
import HomepageAnimation from "./HomepageAnimation";
import MobileMenu from "./MobileMenu";
import NotificationBell from "./NotificationBell";
import { Link, useLocation } from "../lib/router";

/**
 * The top bar is deliberately thin: menu, search and notifications. Everything
 * account-related (profile, dashboard, sign in/out, admin) lives in the drawer.
 * Row height is fixed at h-16 / sm:h-20 — nothing in here may make it taller.
 */

/**
 * One treatment for every icon control in the bar, so the menu handle and the
 * home affordance can never drift apart: a 44px target, a rounded hover chip
 * and the shared focus ring. `.nav-control` is the hook the navy homepage uses
 * to invert these colours, so it has to stay on the element.
 */
const CONTROL_CLASS =
  "nav-control inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue";

export default function Navbar() {
  const { path } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Home is the current page only on the homepage — the one surface where the
  // bar sits on navy, so the active chip is tuned for that dark ground.
  const isHome = path === "/";

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
              className={`${CONTROL_CLASS} text-ink-900 hover:bg-brand-blue-soft`}
            >
              <Icon name="menu" className="h-6 w-6" />
            </button>
            <Link
              href="/"
              aria-label="Home"
              aria-current={isHome ? "page" : undefined}
              className={`${CONTROL_CLASS} ${
                isHome ? "bg-white/10 text-white" : "text-ink-900 hover:bg-brand-blue-soft"
              }`}
            >
              <Icon name="home" className="h-6 w-6" />
            </Link>
          </div>

          {/* CENTER — the admin animation slot, the compact college search,
              with the bell beside it. The search is the only flexible item, so
              a late-loading animation shrinks it instead of displacing the
              menu and home controls on the left. */}
          <div className="flex min-w-0 flex-1 items-center justify-center gap-1 sm:gap-1.5">
            <HomepageAnimation />
            <CollegeSearch />
            <NotificationBell className="shrink-0 px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue" />
          </div>
        </nav>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
