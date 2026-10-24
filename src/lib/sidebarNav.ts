import type { FeatureIconName } from "../components/FeatureIcon";

/**
 * Single source of truth for the homepage rail and the mobile drawer, so the
 * two never drift. Destinations reuse only routes that already exist in
 * App.tsx. `feature` names supplied artwork that the rail and drawer render
 * instead of the stroke glyph in `icon`, which stays as the fallback.
 *
 * The Certifications item links to the existing filtered opportunity view at
 * `/opportunities/certifications`. The separate personal "My Certificates"
 * feature is still a future project and remains disabled where it appears.
 */
export type SidebarNavItem = {
  label: string;
  href?: string;
  icon: string;
  /** Supplied full-colour artwork; wins over `icon` when present. */
  feature?: FeatureIconName;
  disabled?: boolean;
  /** Match the exact path (for "/") instead of the whole subtree. */
  exact?: boolean;
};

export const SIDEBAR_NAV: SidebarNavItem[] = [
  { label: "Home", href: "/", icon: "home", exact: true },
  { label: "Internships", href: "/opportunities/internships", icon: "briefcase", feature: "internship" },
  { label: "Certifications", href: "/opportunities/certifications", icon: "award", feature: "certification" },
  { label: "Competitions", href: "/opportunities/competitions", icon: "trophy", feature: "competition" },
  { label: "Circle", href: "/circle", icon: "users" },
  { label: "MARK — Your Achievements", href: "/mark", icon: "award" },
];

/** Anchored at the bottom of the rail, below the Pulse News panel. */
export const SIDEBAR_DASHBOARD: SidebarNavItem = {
  label: "Dashboard",
  href: "/dashboard",
  icon: "grid",
  feature: "dashboard",
};

/**
 * The eight redesigned section pages, in tab order. They live beside the rail
 * list rather than in a module of their own so every navigation surface — rail,
 * drawer and the tab row under the taskbar — resolves its destinations from one
 * file and cannot drift into two competing systems.
 *
 * `href` is the destination the app already has, except for `/events` and
 * `/hackathons`, which are the dedicated pages the redesign asked for.
 * `nested` keeps a tab active for the routes below it (`/circle/<id>`,
 * `/circle/connections`) instead of only its exact path.
 */
export type SectionTabItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
  nested?: boolean;
};

export const SECTION_TABS: SectionTabItem[] = [
  { id: "internships", label: "Internships", href: "/opportunities/internships", icon: "briefcase" },
  { id: "certifications", label: "Certifications", href: "/opportunities/certifications", icon: "award" },
  { id: "research", label: "Research", href: "/opportunities/research", icon: "flask" },
  { id: "competitions", label: "Competitions", href: "/opportunities/competitions", icon: "trophy" },
  { id: "events", label: "Events", href: "/events", icon: "calendar", nested: true },
  { id: "hackathons", label: "Hackathons", href: "/hackathons", icon: "code", nested: true },
  { id: "circle", label: "Circle", href: "/circle", icon: "users", nested: true },
  { id: "pulse", label: "Pulse", href: "/pulse", icon: "newspaper" },
];

/** The tab that owns this path, or null when the path is not a section page. */
export function activeSectionTab(path: string): SectionTabItem | null {
  return (
    SECTION_TABS.find((tab) =>
      tab.nested ? path === tab.href || path.startsWith(`${tab.href}/`) : path === tab.href
    ) ?? null
  );
}

/** True where the eight-tab row belongs: the section pages and their nesting. */
export function isSectionTabPath(path: string): boolean {
  return activeSectionTab(path) !== null;
}

/**
 * True for the eight section pages themselves, and not for the routes nested
 * under them. The tab row has to stay active for `/circle/<id>` so a profile
 * still shows where the reader is; the dark section canvas deliberately does
 * not, because a profile, a team or an event detail is its own page and keeps
 * the light surface every other page uses.
 */
export function isSectionTabRoot(path: string): boolean {
  return SECTION_TABS.some((tab) => tab.href === path);
}

/**
 * The section pages whose feed is the page's only scrolling region. CIRCLE is
 * the deliberate exception: its directory is a browsing surface that reads best
 * as one long page, so it keeps the whole-page scroll and the footer that sits
 * at the bottom of it. Derived from the tab list rather than written out, so a
 * ninth tab cannot quietly join or leave the locked set.
 */
export function isFeedScrollRoot(path: string): boolean {
  return isSectionTabRoot(path) && path !== "/circle";
}

/**
 * The routes the desktop rail can render inside its own shell. Derived from the
 * nav list above plus the section tabs, so a destination added once appears in
 * both places; the tabs are included because the row under the taskbar has to
 * sit above the rail for all eight, not for a subset of them.
 */
export const SECTION_PATHS: string[] = [
  ...new Set([
    ...SIDEBAR_NAV.flatMap((item) => (item.href ? [item.href] : [])),
    SIDEBAR_DASHBOARD.href as string,
    ...SECTION_TABS.map((tab) => tab.href),
  ]),
];


/**
 * True for the exact route only, so deeper paths (`/circle/<id>`, an
 * opportunity detail, `/teams/<id>`) keep their own standalone layout and
 * profile/detail links behave exactly as they did before. A query string is not
 * part of `path` in this router, so `/pulse?post=<id>` still resolves here.
 */
export function isSectionPath(path: string): boolean {
  return SECTION_PATHS.includes(path);
}
