import { useEffect, useState } from "react";
import Icon from "./Icon";
import BrandMark from "./BrandMark";
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
          className="container-px flex items-center gap-2 h-16 sm:h-20"
          aria-label="Primary"
        >
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2.5 text-ink-900 transition-colors hover:bg-brand-blue-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
            >
              <Icon name="menu" className="h-6 w-6" />
            </button>
            <Link href="/" aria-label="JAVLIN home" className="hidden sm:inline-flex">
              <BrandMark className="h-6 w-auto" />
            </Link>
          </div>

          <CollegeSearch />

          <div className="shrink-0">
            <NotificationBell className="px-1.5" />
          </div>
        </nav>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
