import { useEffect, useState } from "react";
import Icon from "./Icon";
import MobileMenu from "./MobileMenu";
import MagneticButton from "./MagneticButton";
import { Link, useLocation } from "../lib/router";

const navLinks = [
  { label: "Explore DU", href: "/explore" },
  { label: "Join Our Team", href: "/join" },
  { label: "Opportunity Radar", href: "/opportunities" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [eggActive, setEggActive] = useState(false);
  const { path } = useLocation();

  const triggerEasterEgg = () => {
    setEggActive(true);
    setTimeout(() => setEggActive(false), 2600);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
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
          {/* Official Brand Logo with Tasteful Easter Egg */}
          <div className="relative flex items-center">
            <Link
              href="/"
              onClick={() => {
                // If already on homepage, trigger elephant easter egg
                if (window.location.pathname === "/") {
                  triggerEasterEgg();
                }
              }}
              onDoubleClick={(e) => {
                e.preventDefault();
                triggerEasterEgg();
              }}
              className="flex items-center gap-2 shrink-0 group relative"
              aria-label="DU Science Hub home"
            >
              <img
                src="/DSH_OFFICIAL_LOGO.png"
                alt="DU Science Hub"
                className={`h-10 sm:h-12 w-auto max-w-[11rem] object-contain transition-transform duration-300 ${
                  eggActive ? "scale-110 -rotate-2" : "group-hover:scale-[1.02]"
                }`}
                width={506}
                height={229}
              />
            </Link>

            {/* Hidden playful easter egg toast */}
            {eggActive && (
              <div className="absolute left-0 -bottom-10 z-50 animate-fade-up pointer-events-none whitespace-nowrap rounded-full bg-brand-blue text-white px-3 py-1 text-[11px] font-extrabold shadow-lift border border-white/20 flex items-center gap-1.5">
                <span className="animate-bounce">🐘</span>
                <span>DU Science Hub · Built for the grind</span>
              </div>
            )}
          </div>

          {/* Nav Links with Animated Active Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 p-1 rounded-2xl bg-surface-soft/80 border border-surface-border/60 backdrop-blur-sm">
            {navLinks.map((link) => {
              const isActive = path === link.href || (link.href !== "/" && path.startsWith(link.href));
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`relative px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all duration-200 ${
                    isActive
                      ? "text-brand-blue bg-white shadow-soft"
                      : "text-ink-600 hover:text-brand-blue hover:bg-white/60"
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

          {/* Magnetic Primary CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <MagneticButton href="/opportunities" variant="primary">
              Opportunity Radar
              <Icon name="target" className="h-4 w-4" />
            </MagneticButton>
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
