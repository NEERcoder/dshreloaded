import { useEffect, useState } from "react";
import Icon from "./Icon";
import AccountMenu from "./AccountMenu";
import CollegeSearch from "./CollegeSearch";
import HomepageAnimation from "./HomepageAnimation";
import MobileMenu from "./MobileMenu";
import NotificationBell from "./NotificationBell";
import { Link, useLocation } from "../lib/router";
import { useIsDesktop } from "../hooks/useIsDesktop";
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
          className={`container-px flex items-center gap-1 h-16 sm:h-20 sm:gap-2 max-sm:gap-0.5 max-sm:px-2 ${
            onToggleSidebar ? "lg:max-w-none lg:pl-0 lg:pr-8" : ""
          }`}
          aria-label="Primary"
        >
          {/* LEFT — the JAVLIN logo (home link), then the drawer/sidebar handle.
              On the homepage at lg+ this block is exactly the rail's width
              (w-56): the logo sits on the left edge and the hamburger lines up
              with the rail's right border.

              Below 640px the three wrapper blocks collapse with `max-sm:contents`
              so the controls become direct flex items of the nav and can be
              ordered: hamburger, search, CTA, bell, avatar (the lockup is hidden
              on phones). Every one of these classes is `max-sm:`-scoped, so
              ≥640px keeps the markup, grouping and spacing it had before. */}
          <div
            className={`flex shrink-0 items-center gap-0.5 sm:gap-1 max-sm:contents ${
              onToggleSidebar ? "lg:w-56 lg:justify-between lg:pl-3" : ""
            }`}
          >
            {/* Phones drop the lockup entirely (Home is the drawer's first item
                and the drawer header carries the brand) so its width goes to
                the search field. sm:h-12 / px-1 are the untouched desktop size
                and position. */}
            <Link
              href="/"
              aria-label="JAVLIN home"
              aria-current={isHome ? "page" : undefined}
              className="flex min-h-[44px] items-center rounded-xl px-1 max-sm:hidden max-sm:order-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
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
                className="h-5 w-auto max-w-[40vw] object-contain sm:h-12"
              />
            </Link>
            <button
              type="button"
              onClick={handleMenuClick}
              aria-label={togglesSidebar ? (sidebarOpen ? "Hide menu" : "Show menu") : "Open navigation"}
              aria-expanded={togglesSidebar ? sidebarOpen : menuOpen}
              className={`${CONTROL_CLASS} max-sm:order-1 text-ink-900 hover:bg-brand-blue-soft`}
            >
              <Icon name="menu" className="h-6 w-6" />
            </button>
          </div>

          {/* CENTER — the animation slot, the college search and the bell. */}
          <div className="flex min-w-0 flex-1 items-center justify-center gap-1 sm:gap-1.5 max-sm:contents">
            <HomepageAnimation />
            <CollegeSearch
              className="max-sm:order-3 max-sm:max-w-none max-sm:basis-[88px] max-sm:[&_input]:h-12 max-sm:[&_input]:pl-8 max-sm:[&_input]:pr-7 max-sm:[&_input]:text-[14px]"
            />
            <NotificationBell className="shrink-0 px-1 max-sm:order-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue" />
          </div>

          {/* RIGHT — List Your Event and the account dropdown. */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5 max-sm:contents">
            <a
              href={ORGANIZER_FORM_URL}
              {...EXTERNAL_LINK_PROPS}
              className="btn-primary btn-sm min-h-[44px] px-3 text-[13px] max-sm:order-4 max-sm:max-w-[84px] max-sm:px-2.5 max-sm:text-[12px] max-sm:leading-tight"
            >
              List Your Event
            </a>
            <AccountMenu className="max-sm:order-6" />
          </div>
        </nav>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
