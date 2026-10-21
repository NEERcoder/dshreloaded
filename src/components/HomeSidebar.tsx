import { useEffect, useState } from "react";
import Icon from "./Icon";
import { Link, useLocation } from "../lib/router";
import { SIDEBAR_NAV, SIDEBAR_DASHBOARD, type SidebarNavItem } from "../lib/sidebarNav";
import { getPulsePosts, type PulsePostRecord } from "../lib/dataAccess";

/**
 * The account rail beside the homepage on large screens. Its width (w-56) and
 * fixed position are unchanged by design; the contents live in SidebarContent,
 * which the mobile drawer renders too, so desktop and mobile can never drift.
 */
export default function HomeSidebar() {
  return (
    <aside
      aria-label="JAVLIN sections"
      className="home-rail hidden w-56 shrink-0 lg:fixed lg:bottom-0 lg:left-0 lg:top-20 lg:z-30 lg:flex lg:flex-col lg:gap-2 lg:overflow-hidden lg:rounded-r-2xl lg:p-3"
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
        const sorted = [...(result.data ?? [])].sort(
          (a, b) =>
            new Date(b.publishedAt ?? b.createdAt).getTime() -
            new Date(a.publishedAt ?? a.createdAt).getTime(),
        );
        setPosts(sorted);
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
    `flex min-h-[40px] items-center gap-3 rounded-xl px-3 py-1.5 text-[13px] font-bold leading-snug transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue ${
      isActive(item)
        ? "bg-brand-blue text-white"
        : "text-brand-navy hover:bg-brand-blue-soft hover:text-brand-blue"
    }`;

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
                  <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                  <span className="min-w-0">{item.label}</span>
                  <span className="ml-auto rounded-full bg-surface-soft px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-ink-500">
                    Soon
                  </span>
                </span>
              ) : (
                <Link href={item.href!} onClick={onNavigate} className={itemClass(item)}>
                  <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                  <span className="min-w-0">{item.label}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Pulse News — takes the leftover vertical space and scrolls inside. */}
      <section
        aria-label="Pulse News"
        className="mt-1 flex min-h-0 flex-1 flex-col rounded-xl border border-surface-border bg-surface-soft/60 p-2.5"
      >
        <h2 className="flex shrink-0 items-center gap-1.5 px-0.5 pb-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-brand-navy/70">
          <Icon name="presentation" className="h-3.5 w-3.5" />
          Pulse News
        </h2>

        {pulseState === "error" ? (
          <p className="px-0.5 text-[11px] font-semibold text-brand-red-ink">
            Couldn’t load Pulse News right now.
          </p>
        ) : (
          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
            {pulseState === "loading" &&
              Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="h-9 rounded-lg skeleton-shimmer" />
              ))}
            {pulseState === "ready" &&
              posts.map((post) => (
                <li key={post.id}>
                  <Link
                    href={`/pulse?post=${post.id}`}
                    onClick={onNavigate}
                    className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                  >
                    <span className="line-clamp-2 text-xs font-bold leading-snug text-brand-navy">
                      {post.title}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-semibold text-ink-500">
                      {formatPulseDate(post.publishedAt ?? post.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            {/* No published news: leave the area empty, no placeholder. */}
          </ul>
        )}
      </section>

      <div className="mt-auto shrink-0 border-t border-surface-border pt-2">
        <Link
          href={SIDEBAR_DASHBOARD.href!}
          onClick={onNavigate}
          className="group flex min-h-[44px] items-center gap-3 rounded-xl bg-brand-blue px-3 py-2 text-[13px] font-extrabold leading-snug text-white shadow-soft transition-colors duration-200 hover:bg-brand-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
        >
          <Icon name={SIDEBAR_DASHBOARD.icon} className="h-4 w-4 shrink-0" />
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

function formatPulseDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
