import { useEffect, useState } from "react";
import Icon from "./Icon";

type NavLink = { label: string; href: string };
type SocialLink = { label: string; href: string; icon: string };

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  navLinks: NavLink[];
  socialLinks: SocialLink[];
};

export default function MobileMenu({ open, onClose, navLinks, socialLinks }: MobileMenuProps) {
  const [render, setRender] = useState(open);

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
        className={`absolute top-0 right-0 h-full w-[82%] max-w-sm bg-white shadow-lift transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-16 px-5 border-b border-surface-border">
          <img
            src="/DSH_NEW_LOGO_..png"
            alt="DU Science Hub"
            className="h-8 w-auto"
          />
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-2 -mr-2 text-ink-700 hover:text-brand-blue"
          >
            <Icon name="close" className="h-6 w-6" />
          </button>
        </div>

        <div className="px-5 py-6 flex flex-col gap-1">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={onClose}
              className="px-4 py-3 text-base font-semibold text-ink-900 rounded-xl hover:bg-brand-blue-soft transition-colors"
            >
              {link.label}
            </a>
          ))}

          <div className="mt-4 pt-4 border-t border-surface-border">
            <p className="px-4 mb-2 text-xs font-bold uppercase tracking-wider text-ink-400">
              Follow
            </p>
            <div className="flex gap-2">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  onClick={onClose}
                  aria-label={s.label}
                  className="p-3 rounded-xl border border-surface-border text-ink-700 hover:text-brand-blue hover:bg-brand-blue-soft transition-colors"
                >
                  <Icon name={s.icon} className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          <a
            href="#find-opportunities"
            onClick={onClose}
            className="btn-primary mt-4 w-full"
          >
            Find Opportunities
          </a>
        </div>
      </div>
    </div>
  );
}
