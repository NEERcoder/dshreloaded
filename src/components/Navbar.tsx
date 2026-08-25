import { useEffect, useState } from "react";
import Icon from "./Icon";
import MobileMenu from "./MobileMenu";

const navLinks = [
  { label: "Explore DU", href: "#explore-du" },
  { label: "Join Our Team", href: "#join-team" },
  { label: "Opportunities", href: "#find-opportunities" },
];

const socialLinks = [
  { label: "YouTube", href: "#", icon: "youtube" },
  { label: "Instagram", href: "#", icon: "instagram" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
            ? "bg-white/90 backdrop-blur-md border-b border-surface-border shadow-soft"
            : "bg-white/60 backdrop-blur-sm border-b border-transparent"
        }`}
      >
        <nav
          className="container-px flex items-center justify-between h-16 sm:h-18"
          aria-label="Primary"
        >
          <a href="#top" className="flex items-center gap-2 shrink-0" aria-label="DU Science Hub home">
            <img
              src="/DSH_NEW_LOGO_..png"
              alt="DU Science Hub"
              className="h-9 sm:h-10 w-auto"
              width={140}
              height={40}
            />
          </a>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="px-4 py-2 text-sm font-semibold text-ink-700 rounded-lg hover:text-brand-blue hover:bg-brand-blue-soft/60 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-2">
            {socialLinks.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                className="p-2 rounded-lg text-ink-700 hover:text-brand-blue hover:bg-brand-blue-soft/60 transition-colors"
              >
                <Icon name={s.icon} className="h-5 w-5" />
              </a>
            ))}
            <a href="#find-opportunities" className="btn-primary ml-1">
              Find Opportunities
            </a>
          </div>

          <button
            className="lg:hidden p-2 -mr-2 text-ink-900"
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
        socialLinks={socialLinks}
      />
    </>
  );
}
