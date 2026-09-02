import { useEffect, useState } from "react";
import Icon from "./Icon";
import { Link, useLocation } from "../lib/router";

type NavLink = { label: string; href: string };

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  navLinks: NavLink[];
};

export default function MobileMenu({ open, onClose, navLinks }: MobileMenuProps) {
  const [render, setRender] = useState(open);
  const { path } = useLocation();

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
            src="/DSH_OFFICIAL_LOGO.png"
            alt="DU Science Hub"
            className="h-9 w-auto max-w-[10rem] object-contain"
            width={506}
            height={229}
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
          {navLinks.map((link) => {
            const isActive = path === link.href || path.startsWith(link.href + "/");
            return (
              <Link
                key={link.label}
                href={link.href}
                onClick={onClose}
                className={`px-4 py-3 text-base font-semibold rounded-xl transition-colors ${
                  isActive
                    ? "text-brand-blue bg-brand-blue-soft"
                    : "text-ink-900 hover:bg-brand-blue-soft"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}

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
  );
}
