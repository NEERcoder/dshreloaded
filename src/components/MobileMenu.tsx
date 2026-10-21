import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import BrandMark from "./BrandMark";
import { SidebarContent } from "./HomeSidebar";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * The phone drawer. It renders the exact same SidebarContent as the desktop
 * rail — primary nav, Pulse News, bottom-anchored Dashboard — so the two
 * cannot drift, and it adds no mobile-only destinations of its own.
 */
export default function MobileMenu({ open, onClose }: MobileMenuProps) {
  const [render, setRender] = useState(open);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) setRender(true);
    else {
      const t = setTimeout(() => setRender(false), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (open && render) closeButtonRef.current?.focus();
  }, [open, render]);

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
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Menu">
      <div
        className={`absolute inset-0 bg-ink-900/30 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`absolute top-0 left-0 flex h-full w-[82%] max-w-sm flex-col bg-white/90 backdrop-blur-xl shadow-lift border-r border-white/70 transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <div className="flex shrink-0 items-center justify-between h-16 px-5 border-b border-surface-border">
          <BrandMark className="h-8 w-auto" />
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close menu"
            className="-mr-2 flex min-h-[44px] min-w-[44px] items-center justify-center text-ink-700 hover:text-brand-blue active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue rounded-xl"
          >
            <Icon name="close" className="h-6 w-6" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-4 py-3">
          <SidebarContent onNavigate={onClose} />
        </div>
      </div>
    </div>
  );
}
