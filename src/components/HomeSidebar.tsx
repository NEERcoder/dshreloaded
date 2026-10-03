import Icon from "./Icon";
import { Link, useLocation } from "../lib/router";
import { useAuth } from "../context/AuthContext";

/**
 * The account rail that sits open beside the homepage on large screens.
 *
 * Deliberately half the drawer's width and icon-led, so it reads as a rail
 * rather than a second content column. It reuses the same destinations as
 * MobileMenu — the drawer stays the mobile pattern and this never appears
 * below lg, so the two can't compete for the same viewport.
 */
export default function HomeSidebar() {
  const { path, navigate } = useLocation();
  const { user, loading: authLoading, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  const itemClass = (href: string) =>
    `flex min-h-[44px] items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue ${
      path === href || (href !== "/" && path.startsWith(href + "/"))
        ? "bg-brand-blue text-white"
        : "text-white/80 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <aside
      aria-label="JAVLIN account menu"
      className="home-rail hidden w-52 shrink-0 self-start lg:sticky lg:top-20 lg:mt-24 lg:flex lg:flex-col lg:gap-1 lg:rounded-2xl lg:p-3"
    >
      <p className="px-3 pb-1 pt-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/45">
        {authLoading ? "Account" : user ? "Your JAVLIN" : "Get started"}
      </p>

      {!authLoading && user ? (
        <>
          <Link href="/dashboard" className={itemClass("/dashboard")}>
            <Icon name="grid" className="h-4 w-4 shrink-0" />
            Dashboard
          </Link>
          <Link href={`/circle/${user.id}`} className={itemClass("/circle")}>
            <Icon name="user" className="h-4 w-4 shrink-0" />
            Profile
          </Link>
          <Link href="/circle/connections" className={itemClass("/circle/connections")}>
            <Icon name="link" className="h-4 w-4 shrink-0" />
            Connections
          </Link>
          <Link href="/join" className={itemClass("/join")}>
            <Icon name="users" className="h-4 w-4 shrink-0" />
            Join JAVLIN
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-1 flex min-h-[44px] items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-bold text-white/65 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
          >
            <Icon name="logout" className="h-4 w-4 shrink-0" />
            Sign Out
          </button>
        </>
      ) : (
        <>
          <Link href="/join" className={itemClass("/join")}>
            <Icon name="users" className="h-4 w-4 shrink-0" />
            Join JAVLIN
          </Link>
          {!authLoading && (
            <Link href="/login" className="btn-accent mt-1 w-full justify-center px-3 text-[13px]">
              <Icon name="user" className="h-4 w-4 shrink-0" />
              Sign In
            </Link>
          )}
        </>
      )}
    </aside>
  );
}
