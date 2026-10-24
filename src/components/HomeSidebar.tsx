import { useEffect, useState } from "react";
import Icon from "./Icon";
import FeatureIcon from "./FeatureIcon";
import { Link, useLocation } from "../lib/router";
import { SIDEBAR_NAV, SIDEBAR_DASHBOARD, type SidebarNavItem } from "../lib/sidebarNav";
import { getPulsePosts, type PulsePostRecord } from "../lib/dataAccess";

/**
 * The account rail beside the homepage on large screens. Its width and fixed
 * position are unchanged by design; the contents live in SidebarContent, which
 * the mobile drawer renders too, so desktop and mobile can never drift.
 *
 * `--rail-w` is the one width the navbar's left segment, the tab row and the
 * content row also read, so the rail cannot fall out of step with the chrome
 * beside it.
 *
 * `--rail-top` is the navbar's own height by default and is raised by the shell
 * on a page that carries the section-tab row, so the rail always starts below
 * whatever chrome is above it instead of sliding underneath it.
 *
 * `navy` puts the rail on the section pages' dark canvas: the same
 * `.section-navy` token scope the content uses, so rail and page flip together
 * rather than one of them being re-tuned by hand.
 */
export default function HomeSidebar({ navy = false }: { navy?: boolean }) {
  return (
    <aside
      aria-label="JAVLIN sections"
      className={`home-rail hidden w-[var(--rail-w)] shrink-0 lg:fixed lg:bottom-0 lg:left-0 lg:top-[var(--rail-top,5rem)] lg:z-30 lg:flex lg:flex-col lg:gap-2 lg:overflow-hidden lg:rounded-r-2xl lg:p-3${
        navy ? " section-navy" : ""
      }`}
    >
      <SidebarContent />
    </aside>
  );
}

/**
 * Primary nav, then the Pulse News panel which takes the remaining flexible
 * height and scrolls on its own, then Dashboard pinned to the bottom. Renders
 * as a fragment so the parent flex column (rail or drawer) lays it out.
 * `onNavigate` lets the drawer close itself after a destination is chosen.
 */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { path } = useLocation();
  const [posts, setPosts] = useState<PulsePostRecord[]>([]);
  const [pulseState, setPulseState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    getPulsePosts(8)
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          // Surface a real error; do not silently show an empty panel.
          setPulseState("error");
          return;
        }
        // The data layer returns rows ordered by published_at DESC (nulls last),
        // which is the canonical PULSE order the /pulse page shows. Re-sorting
        // here with a `publishedAt ?? createdAt` fallback would diverge from it:
        // a row with a null published_at would jump to its created_at position.
        setPosts(result.data ?? []);
        setPulseState("ready");
      })
      .catch(() => {
        if (!cancelled) setPulseState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isActive = (item: SidebarNavItem) =>
    item.href != null &&
    (item.exact ? path === item.href : path === item.href || path.startsWith(item.href + "/"));

  const itemClass = (item: SidebarNavItem) =>
    `relative flex min-h-[40px] items-center gap-3 rounded-xl px-3 py-1.5 text-[13px] leading-snug transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue ${
      isActive(item)
        ? "bg-brand-blue-soft font-extrabold text-brand-navy"
        : "font-bold text-ink-700 hover:bg-brand-blue-soft/60 hover:text-brand-navy"
    }`;

  /**
   * The rail glyph. Supplied artwork is full-colour raster, so it keeps its own
   * colours in both states and the active cue comes from the background, the
   * left bar and the label weight — never from a `currentColor` change.
   */
  const itemGlyph = (item: SidebarNavItem) =>
    item.feature ? (
      <FeatureIcon name={item.feature} className="h-4 w-4 shrink-0" />
    ) : (
      <Icon name={item.icon} className="h-4 w-4 shrink-0" />
    );

  const activeBar = (
    <span
      aria-hidden="true"
      className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-blue"
    />
  );

  return (
    <>
      <nav aria-label="Homepage sections" className="shrink-0">
        <ul className="flex flex-col gap-1">
          {SIDEBAR_NAV.map((item) => (
            <li key={item.label}>
              {item.disabled ? (
                <span
                  aria-disabled="true"
                  title="Coming soon"
                  className="flex min-h-[40px] cursor-not-allowed select-none items-center gap-3 rounded-xl px-3 text-[13px] font-bold leading-none text-brand-navy/40"
                >
                  {itemGlyph(item)}
                  <span className="min-w-0">{item.label}</span>
                  <span className="ml-auto rounded-full bg-surface-soft px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-ink-500">
                    Soon
                  </span>
                </span>
              ) : (
                <Link href={item.href!} onClick={onNavigate} className={itemClass(item)}>
                  {isActive(item) && activeBar}
                  {itemGlyph(item)}
                  <span className="min-w-0">{item.label}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Pulse News — takes the leftover vertical space and scrolls inside. The
          box is exactly what the rail already allotted (same classes), only the
          contents are composed as an editorial brief: a masthead, then one
          headline per published post newest first on a single accent timeline. */}
      <section
        aria-label="Pulse News"
        className="mt-1 flex min-h-0 flex-1 flex-col rounded-xl border border-surface-border bg-surface-soft/60 p-2.5"
      >
        <header className="shrink-0 border-b border-surface-border pb-1.5">
          <div className="flex items-center gap-1.5">
            <Icon name="newspaper" className="h-3.5 w-3.5 shrink-0 text-brand-blue" />
            <h2 className="text-[10px] font-black uppercase leading-none tracking-[0.2em] text-brand-navy">
              Pulse
            </h2>
            {/* A still orange mark: it flags the panel as the news slot without
                claiming the feed is streaming in real time. */}
            <span aria-hidden="true" className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-brand-red" />
          </div>
          <p className="mt-1 text-[8px] font-bold uppercase leading-none tracking-[0.13em] text-ink-500">
            Campus &amp; opportunity briefing
          </p>
        </header>

        {pulseState === "error" ? (
          <p className="mt-1.5 px-0.5 text-[11px] font-semibold text-brand-red-ink">
            Couldn’t load Pulse News right now.
          </p>
        ) : (
          <ol className="mt-0.5 min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-1">
            {pulseState === "loading" &&
              Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="border-l border-surface-border py-1.5 pl-2.5">
                  <div className="h-2 w-16 rounded-full skeleton-shimmer" />
                  <div className="mt-1.5 h-2.5 w-full rounded skeleton-shimmer" />
                  <div className="mt-1 h-2.5 w-2/3 rounded skeleton-shimmer" />
                </li>
              ))}
            {pulseState === "ready" &&
              posts.map((post, index) => {
                // Newest first, so index 0 is genuinely the latest published
                // story — the mark is order-derived, never decorative.
                const isLatest = index === 0;
                return (
                  <li
                    key={post.id}
                    className={`relative border-l py-1 pl-2.5 ${
                      isLatest ? "border-brand-red" : "border-surface-border"
                    }`}
                  >
                    {isLatest && (
                      <span
                        aria-hidden="true"
                        className="absolute -left-[3.5px] top-3 h-1.5 w-1.5 rounded-full bg-brand-red"
                      />
                    )}
                    <Link
                      href={`/pulse?post=${post.id}`}
                      onClick={onNavigate}
                      className="group -mx-1 block rounded-lg px-1 py-0.5 transition-colors duration-150 hover:bg-brand-blue-soft/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                    >
                      <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        {isLatest && (
                          <span className="shrink-0 rounded-full bg-brand-red-soft px-1 py-px text-[8px] font-black uppercase leading-none tracking-wide text-brand-red-ink">
                            Latest
                          </span>
                        )}
                        <span className="min-w-0 text-[9px] font-black uppercase leading-none tracking-[0.06em] text-ink-500">
                          {formatPulseCategory(post.category)}
                        </span>
                        <span className="ml-auto shrink-0 text-[9px] font-bold leading-none text-ink-400 tabular-nums">
                          {formatPulseDate(post.publishedAt ?? post.createdAt)}
                        </span>
                      </span>
                      <span className="mt-1 flex items-start gap-1">
                        <span className="line-clamp-3 min-w-0 flex-1 text-xs font-extrabold leading-snug text-brand-navy transition-transform duration-150 group-hover:translate-x-px">
                          {post.title}
                        </span>
                        <Icon
                          name="arrow"
                          className="mt-[3px] h-3 w-3 shrink-0 -translate-x-0.5 text-brand-blue opacity-0 transition-[opacity,transform] duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
                        />
                      </span>
                    </Link>
                  </li>
                );
              })}
            {/* No published news: leave the area empty, no placeholder. */}
          </ol>
        )}
      </section>

      <div className="mt-auto shrink-0 border-t border-surface-border pt-2">
        <Link
          href={SIDEBAR_DASHBOARD.href!}
          onClick={onNavigate}
          className="group flex min-h-[44px] items-center gap-3 rounded-xl bg-brand-blue px-3 py-2 text-[13px] font-extrabold leading-snug text-white shadow-soft transition-colors duration-200 hover:bg-brand-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
        >
          {/* The Dashboard button keeps its solid-blue CTA surface, so the
              blue-dominant artwork sits in a 16px white well — same box as every
              other rail glyph, so nothing shifts, but the icon keeps contrast. */}
          {SIDEBAR_DASHBOARD.feature ? (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] bg-white">
              <FeatureIcon name={SIDEBAR_DASHBOARD.feature} className="h-4 w-4" />
            </span>
          ) : (
            <Icon name={SIDEBAR_DASHBOARD.icon} className="h-4 w-4 shrink-0" />
          )}
          <span className="min-w-0 flex-1">{SIDEBAR_DASHBOARD.label}</span>
          <Icon
            name="arrow"
            className="h-4 w-4 shrink-0 -rotate-45 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </>
  );
}

/** "campus_story" → "Campus Story". Same derivation the /pulse page uses. */
function formatPulseCategory(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Editorial stamp sized for a 199px column: "Today" / "Yesterday" / "4d" while
 * the story is fresh, then day + month, and the year only when it is not this
 * year. A missing or unreadable date renders nothing — the headline stands on
 * its own rather than showing a placeholder.
 */
function formatPulseDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d`;
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}
