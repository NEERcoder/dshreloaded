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
 * The routes the desktop rail can render inside its own shell. Derived from the
 * nav list above so a destination added once appears in both places; "/pulse" is
 * included because the rail's Pulse News panel links into it.
 */
export const SECTION_PATHS: string[] = [
  ...SIDEBAR_NAV.flatMap((item) => (item.href ? [item.href] : [])),
  SIDEBAR_DASHBOARD.href as string,
  "/pulse",
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
