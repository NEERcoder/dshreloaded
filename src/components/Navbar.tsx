import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import BrandMark from "./BrandMark";
import MobileMenu from "./MobileMenu";
import NotificationBell from "./NotificationBell";
import { Link, useLocation } from "../lib/router";
import { useAuth } from "../context/AuthContext";

const primaryNav = [
  { label: "AIM", href: "/aim" },
  { label: "FIELD", href: "/field" },
  { label: "CREW", href: "/crew" },
  { label: "CIRCLE", href: "/circle" },
  { label: "MARK", href: "/mark" },
  { label: "PULSE", href: "/pulse" },
];

const secondaryNav = [
  { label: "College Reviews", href: "/college-reviews" },
  { label: "Join JAVLIN", href: "/join" },
];

const navLinks = [...primaryNav, ...secondaryNav];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [eggActive, setEggActive] = useState(false);
  const { path, navigate } = useLocation();
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  const triggerEasterEgg = () => {
    setEggActive(true);
    setTimeout(() => setEggActive(false), 2600);
  };

  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number } | null>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);

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
    const activeIndex = primaryNav.findIndex(
      (link) => path === link.href || path.startsWith(`${link.href}/`)
    );
    if (activeIndex !== -1 && linkRefs.current[activeIndex] && navContainerRef.current) {
      const activeEl = linkRefs.current[activeIndex]!;
      const containerRect = navContainerRef.current.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      setIndicatorStyle({
        left: elRect.left - containerRect.left,
        width: elRect.width,
      });
    } else {
      setIndicatorStyle(null);
    }
  }, [path]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md border-b border-surface-border shadow-soft py-0"
            : "bg-white/75 backdrop-blur-sm border-b border-transparent py-1 sm:py-2"
        }`}
      >
        <nav
          className="container-px flex items-center justify-between h-16 sm:h-20"
          aria-label="Primary"
        >
          {/* Brand wordmark with tasteful easter egg */}
          <div className="relative flex items-center">
            <Link
              href="/"
              onClick={() => {
                // If already on homepage, trigger easter egg
                if (window.location.pathname === "/") {
                  triggerEasterEgg();
                }
              }}
              onDoubleClick={(e) => {
                e.preventDefault();
                triggerEasterEgg();
              }}
              className="flex items-center gap-2 shrink-0 group relative"
              aria-label="JAVLIN home"
            >
              <BrandMark className={`h-8 w-auto sm:h-9 transition-transform duration-300 ${eggActive ? "scale-110 -rotate-2" : "group-hover:scale-[1.02]"}`} />
            </Link>

            {/* Hidden playful easter egg toast */}
            {eggActive && (
              <div className="absolute left-0 -bottom-10 z-50 animate-fade-up pointer-events-none whitespace-nowrap rounded-full bg-brand-blue text-white px-3 py-1 text-[11px] font-extrabold shadow-lift border border-white/20 flex items-center gap-1.5">
                <span className="animate-bounce">•</span>
                <span className="font-display">JAVLIN · Shoot Your Shot.</span>
              </div>
            )}
          </div>

          {/* Nav Links with Animated Gliding Active Indicator */}
          <div
            ref={navContainerRef}
            className="relative hidden lg:flex items-center gap-1.5 p-1 rounded-2xl bg-surface-soft/80 border border-surface-border/60 backdrop-blur-sm"
          >
            {/* Smooth Gliding Active Indicator Pill */}
            {indicatorStyle && (
              <div
                className="nav-indicator"
                style={{
                  left: `${indicatorStyle.left}px`,
                  width: `${indicatorStyle.width}px`,
                }}
              />
            )}
            {primaryNav.map((link, idx) => {
              const isActive = path === link.href || path.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.label}
                  ref={(el) => (linkRefs.current[idx] = el)}
                  href={link.href}
                  className={`relative z-10 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider rounded-xl transition-colors duration-200 ${
                    isActive
                      ? "text-brand-blue"
                      : "text-ink-600 hover:text-brand-blue"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-brand-red animate-fade-in" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Secondary Nav + Admin Button (Visible strictly to authenticated verified admins) */}
          <div className="hidden lg:flex items-center gap-2">
            <Link
              href="/college-reviews"
              className={`hidden xl:inline-flex px-3 py-2 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-colors duration-200 ${
                path === "/college-reviews"
                  ? "text-brand-blue bg-brand-blue-soft"
                  : "text-ink-600 hover:text-brand-blue"
              }`}
            >
              College Reviews
            </Link>
            <Link
              href="/join"
              className={`btn-outline-blue px-3.5 py-2 text-xs ${
                path === "/join" || path.startsWith("/join/") ? "bg-brand-blue-soft" : ""
              }`}
            >
              Join JAVLIN
            </Link>
            {isAdmin && !authLoading && (
              <Link
                href="/admin"
                className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-200 inline-flex items-center gap-1.5 shadow-sm ${
                  path === "/admin"
                    ? "bg-brand-red text-white"
                    : "text-brand-red bg-brand-red-soft hover:bg-brand-red hover:text-white"
                }`}
                title="Admin Dashboard"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                Admin
              </Link>
            )}
            {!authLoading && (
              <>
                {user ? (
                  <div className="flex items-center gap-1.5">
                    <NotificationBell className="px-1.5" />
                    <Link
                      href="/dashboard"
                      className={`px-3 py-2 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-colors duration-200 ${
                        path === "/dashboard"
                          ? "text-brand-blue bg-brand-blue-soft"
                          : "text-ink-600 hover:text-brand-blue"
                      }`}
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="px-3 py-2 text-xs font-extrabold uppercase tracking-wider rounded-xl text-ink-600 hover:text-brand-red transition-colors duration-200"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Link
                      href="/login"
                      className="px-3 py-2 text-xs font-extrabold uppercase tracking-wider rounded-xl text-ink-600 hover:text-brand-blue transition-colors duration-200"
                    >
                      Login
                    </Link>
                    <Link href="/signup" className="btn-outline-blue px-3.5 py-2 text-xs">
                      Create Profile
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Mobile Hamburger Menu Toggle */}
          <button
            className="lg:hidden p-2.5 -mr-2 text-ink-900 focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl active:bg-surface-soft"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <Icon name="menu" className="h-6 w-6" />
          </button>
        </nav>
      </header>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        navLinks={navLinks}
      />
    </>
  );
}
