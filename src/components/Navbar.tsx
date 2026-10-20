import { useEffect, useState } from "react";
import Icon from "./Icon";
import AccountMenu from "./AccountMenu";
import CollegeSearch from "./CollegeSearch";
import HomepageAnimation from "./HomepageAnimation";
import MobileMenu from "./MobileMenu";
import NotificationBell from "./NotificationBell";
import { Link, useLocation } from "../lib/router";
import { EXTERNAL_LINK_PROPS, ORGANIZER_FORM_URL } from "../lib/organizerCta";

/**
 * The top bar keeps its height and its controls over the navy canvas and
 * only inverts its surface. Row height is fixed at h-16 / sm:h-20 — nothing
 * in here may make it taller.
 *
 * On the homepage the parent passes `onToggleSidebar`, so the hamburger
 * collapses/expands the desktop rail; on every other surface (and on phones)
 * it opens the drawer exactly as before.
 */
const CONTROL_CLASS =
  "nav-control inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue";

type NavbarProps = {
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
};

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

export default function Navbar({ sidebarOpen = true, onToggleSidebar }: NavbarProps) {
  const { path } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isDesktop = useIsDesktop();

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

  const togglesSidebar = Boolean(onToggleSidebar) && isDesktop;

  function handleMenuClick() {
    if (togglesSidebar) {
      onToggleSidebar?.();
    } else {
      setMenuOpen(true);
    }
  }

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 glass-nav transition-all duration-300 ${
          scrolled ? "border-b shadow-soft" : "border-b border-transparent"
        }`}
      >
        <nav
          className={`container-px flex items-center gap-1 h-16 sm:h-20 sm:gap-2 ${
            onToggleSidebar ? "lg:max-w-none lg:pl-0 lg:pr-8" : ""
          }`}
          aria-label="Primary"
        >
          {/* LEFT — the JAVLIN logo (home link), then the drawer/sidebar handle.
              On the homepage at lg+ this block is exactly the rail's width
              (w-56): the logo sits on the left edge and the hamburger lines up
              with the rail's right border. */}
          <div
            className={`flex shrink-0 items-center gap-0.5 sm:gap-1 ${
              onToggleSidebar ? "lg:w-56 lg:justify-between lg:pl-3" : ""
            }`}
          >
            <Link
              href="/"
              aria-label="JAVLIN home"
              aria-current={isHome ? "page" : undefined}
              className="flex min-h-[44px] items-center rounded-xl px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
            >
              {/* The transparent lockup carries a white wordmark, so it is
                  legible on the navy homepage bar; the blue "J" still reads on
                  lighter bars. Height stays within the existing h-16/sm:h-20. */}
              <img
                src="/brand/javlin-logo-transparent.png"
                alt="JAVLIN"
                width={2172}
                height={724}
                draggable={false}
                className="h-[42px] w-auto max-w-[40vw] object-contain sm:h-12"
              />
            </Link>
            <button
              type="button"
              onClick={handleMenuClick}
              aria-label={togglesSidebar ? (sidebarOpen ? "Hide menu" : "Show menu") : "Open navigation"}
              aria-expanded={togglesSidebar ? sidebarOpen : menuOpen}
              className={`${CONTROL_CLASS} text-ink-900 hover:bg-brand-blue-soft`}
            >
              <Icon name="menu" className="h-6 w-6" />
            </button>
          </div>

          {/* CENTER — the animation slot, the college search and the bell. */}
          <div className="flex min-w-0 flex-1 items-center justify-center gap-1 sm:gap-1.5">
            <HomepageAnimation />
            <CollegeSearch />
            <NotificationBell className="shrink-0 px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue" />
          </div>

          {/* RIGHT — List Your Event and the account dropdown. */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <a
              href={ORGANIZER_FORM_URL}
              {...EXTERNAL_LINK_PROPS}
              className="btn-primary btn-sm min-h-[44px] px-3 text-[13px]"
            >
              List Your Event
            </a>
            <AccountMenu />
          </div>
        </nav>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
