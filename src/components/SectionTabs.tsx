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
 * From `lg` the eight tabs share the row equally (CSS grid, eight equal
 * columns); below that the row scrolls sideways rather than shrinking labels.
 * The selected tab carries a blue gradient surface, a soft glow ring and an
 * inset highlight; the gradient fades in through an opacity transition, and
 * `prefers-reduced-motion` turns the transitions off (see index.css).
 * The strip carries vertical padding so the focus ring is never clipped by that
 * scroller, and the active tab is brought into view — but only when the strip
 * genuinely overflows, and never in a way that moves the page itself.
 */
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
          className="section-tabs-strip h-scroll no-scrollbar"
        >
          {SECTION_TABS.map((tab) => {
            const isActive = active?.id === tab.id;
            return (
              <li key={tab.id}>
                <Link
                  href={tab.href}
                  ref={isActive ? activeRef : undefined}
                  aria-current={isActive ? "page" : undefined}
                  className={`section-tab ${isActive ? "is-active" : ""}`}
                >
                  <Icon name={tab.icon} className="section-tab__icon h-3.5 w-3.5 shrink-0" />
                  <span className="section-tab__label">{tab.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
