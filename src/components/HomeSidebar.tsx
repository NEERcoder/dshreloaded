import Icon from "./Icon";
import { Link, useLocation } from "../lib/router";
import { useAuth } from "../context/AuthContext";

type RailItem = {
  href: string;
  label: string;
  icon: string;
  /** Only meaningful once a student exists; hidden for visitors. */
  requiresUser?: boolean;
  /** Match the whole subtree, not just the exact path. */
  exact?: boolean;
};

/**
 * Destinations that already exist — every href here resolves to a real route.
 * "Jobs" lands on AIM because AIM is the jobs/internships/certifications
 * discovery page, and /opportunities only has the four category filters
 * declared in lib/opportunityRoute.ts.
 */
const RAIL_ITEMS: RailItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "grid", requiresUser: true },
  { href: "/circle", label: "Profile", icon: "user", requiresUser: true },
  { href: "/circle/connections", label: "Connections", icon: "link", requiresUser: true },
  { href: "/aim", label: "Jobs", icon: "briefcase" },
  { href: "/opportunities/internships", label: "Internships", icon: "target" },
  { href: "/opportunities/competitions", label: "Competitions", icon: "trophy" },
  { href: "/crew", label: "Teams", icon: "users" },
  { href: "/mark", label: "Your Records", icon: "award", requiresUser: true },
  { href: "/pulse", label: "PULSE News", icon: "presentation" },
  // /join already carries the collaboration experience, so this row keeps one
  // destination and takes the stronger label rather than adding a twin link.
  { href: "/join", label: "Collaborate With Us", icon: "handshake" },
];

/**
 * The account rail that stays open beside the homepage on large screens.
 *
 * Sized to 208px and 38px rows so all eleven entries fit one 1280x720 frame
 * without the rail ever scrolling inside itself. It is `lg`-only on purpose:
 * phones and tablets keep the drawer, which is the pattern that already fits
 * them, and a 38px row would be under the 44px mobile touch minimum.
 */
export default function HomeSidebar() {
  const { path, navigate } = useLocation();
  const { user, loading: authLoading, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  const isActive = (href: string) => path === href || path.startsWith(href + "/");

  const itemClass = (href: string) =>
    `flex min-h-[38px] items-center gap-2.5 rounded-lg px-2.5 text-[12.5px] font-bold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue ${
      isActive(href) ? "bg-brand-blue text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
    }`;

  const visibleItems = RAIL_ITEMS.filter((item) => !item.requiresUser || user);

  return (
    <aside
      aria-label="JAVLIN sections"
      className="home-rail hidden w-52 shrink-0 self-start lg:sticky lg:top-20 lg:mt-20 lg:flex lg:flex-col lg:gap-0.5 lg:rounded-2xl lg:p-2.5"
    >
      <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/45">
        {authLoading ? "JAVLIN" : user ? "Your JAVLIN" : "Explore"}
      </p>

      <nav aria-label="Homepage sections">
        <ul className="flex flex-col gap-0.5">
          {visibleItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.label === "Profile" && user ? `/circle/${user.id}` : item.href}
                className={itemClass(item.href)}
              >
                <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-1.5 border-t border-white/10 pt-1.5">
        {!authLoading && user ? (
          <button
            type="button"
            onClick={handleSignOut}
            className="flex min-h-[38px] w-full items-center gap-2.5 rounded-lg px-2.5 text-[12.5px] font-bold leading-none text-white/65 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
          >
            <Icon name="logout" className="h-4 w-4 shrink-0" />
            Sign Out
          </button>
        ) : (
          <Link
            href="/login"
            className="flex min-h-[38px] w-full items-center justify-center gap-2 rounded-lg bg-brand-red px-2.5 text-[12.5px] font-black leading-none text-brand-navy transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Icon name="user" className="h-4 w-4 shrink-0" />
            Sign In
          </Link>
        )}
      </div>
    </aside>
  );
}
