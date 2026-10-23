import { useEffect, useRef } from "react";
import Icon from "./Icon";
import { Link, useLocation } from "../lib/router";
import { SECTION_TABS, activeSectionTab } from "../lib/sidebarNav";

/**
 * The eight section pages as one row, mounted directly beneath the existing top
 * taskbar and above the rail-plus-content row, so the shell stays
 * taskbar → tabs → sidebar + page. Both layouts render it — `SectionShell` on
 * desktop, `PageShell` on a standalone section page — and each asks the same
 * predicate, so a page can never grow two of them.
 *
 * The tab surface is the app's own chip pattern (same 44px box, radius,
 * uppercase label and solid-blue active fill as the category chips on the
 * listing pages), which is why no new visual language is introduced here.
 *
 * Below laptop width the row scrolls sideways rather than shrinking the labels.
 * The strip carries vertical padding so the focus ring is never clipped by that
 * scroller, and the active tab is brought into view — but only when the strip
 * genuinely overflows, and never in a way that moves the page itself.
 */
const TAB_BASE =
  "inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 text-[11px] font-extrabold uppercase tracking-wider transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2";
const TAB_INACTIVE =
  "border-surface-border bg-white text-ink-600 hover:border-brand-blue/40 hover:text-brand-blue active:bg-brand-blue-pale";
const TAB_ACTIVE =
  "border-brand-blue-dark bg-brand-blue text-white shadow-soft hover:text-white active:bg-brand-blue-dark";

export default function SectionTabs() {
  const { path } = useLocation();
  const active = activeSectionTab(path);
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const tab = activeRef.current;
    if (!tab) return;
    const strip = tab.closest<HTMLElement>("[data-section-tabs-strip]");
    if (!strip || strip.scrollWidth <= strip.clientWidth) return;
    // `block: "nearest"` keeps a horizontally centred tab from scrolling the page.
    tab.scrollIntoView({ block: "nearest", inline: "center" });
  }, [path]);

  return (
    <div className="section-tabs-bar shrink-0 border-b border-surface-border pt-16 sm:pt-20">
      <nav aria-label="Section pages" className="section-tabs">
        {/* A fixed 56px band — 44px tabs with 6px of air, which is also the room
            the focus ring needs, because a horizontal scroller clips one. The
            height is a constant so the rail below can be offset by exactly it. */}
        <ul
          data-section-tabs-strip
          className="h-scroll no-scrollbar flex h-14 items-center gap-1.5 overflow-x-auto py-1.5"
        >
          {SECTION_TABS.map((tab) => {
            const isActive = active?.id === tab.id;
            return (
              <li key={tab.id} className="shrink-0">
                <Link
                  href={tab.href}
                  ref={isActive ? activeRef : undefined}
                  aria-current={isActive ? "page" : undefined}
                  className={`${TAB_BASE} ${isActive ? TAB_ACTIVE : TAB_INACTIVE}`}
                >
                  <Icon name={tab.icon} className="h-3.5 w-3.5 shrink-0" />
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
