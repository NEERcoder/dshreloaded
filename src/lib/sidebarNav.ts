/**
 * Single source of truth for the homepage rail and the mobile drawer, so the
 * two never drift. Destinations reuse only routes that already exist in
 * App.tsx. `disabled` items render visibly but are non-interactive — the
 * certificate-management system is a separate future project.
 */
export type SidebarNavItem = {
  label: string;
  href?: string;
  icon: string;
  disabled?: boolean;
  /** Match the exact path (for "/") instead of the whole subtree. */
  exact?: boolean;
};

export const SIDEBAR_NAV: SidebarNavItem[] = [
  { label: "Home", href: "/", icon: "home", exact: true },
  { label: "Internships", href: "/opportunities/internships", icon: "target" },
  { label: "Certificates", icon: "star", disabled: true },
  { label: "Competitions", href: "/opportunities/competitions", icon: "trophy" },
  { label: "Circle", href: "/circle", icon: "users" },
  { label: "MARK — Your Achievements", href: "/mark", icon: "award" },
];

/** Anchored at the bottom of the rail, below the Pulse News panel. */
export const SIDEBAR_DASHBOARD: SidebarNavItem = {
  label: "Dashboard",
  href: "/dashboard",
  icon: "grid",
};
