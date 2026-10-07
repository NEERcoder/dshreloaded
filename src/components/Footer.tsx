import { Link } from "../lib/router";
import { useScrollReveal } from "../hooks/useScrollReveal";

export default function Footer() {
  const year = new Date().getFullYear();
  const { ref, isVisible } = useScrollReveal<HTMLElement>({ threshold: 0.05 });

  return (
    <footer
      ref={ref}
      className={`mt-14 sm:mt-20 border-t border-surface-border bg-surface-soft reveal-stagger ${
        isVisible ? "is-visible" : ""
      }`}
    >
      <div className="container-px py-10 sm:py-16 relative z-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2 max-w-sm">
            {/* The full lockup is the primary-brand asset, so it belongs here
                rather than the symbol. As supplied it is a square with the
                artwork sitting in a band across the upper half, so the box is
                cut to that band's own ratio and centred on it — the file is
                displayed, never cropped away from or redrawn. */}
            <img
              src="/brand/javlin-logo.png"
              alt="JAVLIN — Shoot Your Shot"
              width={2000}
              height={2000}
              loading="lazy"
              decoding="async"
              className="mb-4 block h-14 w-auto max-w-full rounded-xl object-cover [object-position:center_41.3%] aspect-[2.19/1]"
            />
            <p className="text-sm text-ink-500 leading-relaxed">
              A student-powered platform for discovering your college, learning from seniors
              and finding opportunities that help you move forward.
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-4">Explore JAVLIN</p>
            <ul className="sm:space-y-2.5">
              {[
                { label: "AIM", href: "/aim" },
                { label: "FIELD", href: "/field" },
                { label: "CREW", href: "/crew" },
                { label: "CIRCLE", href: "/circle" },
                { label: "MARK", href: "/mark" },
                { label: "PULSE", href: "/pulse" },
                { label: "College Reviews", href: "/college-reviews" },
                { label: "Join Our Team", href: "/join" },
              ].map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="flex min-h-[44px] items-center text-sm font-semibold text-ink-700 hover:text-brand-blue transition-colors sm:min-h-0">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-4">Connect</p>
            <ul className="sm:space-y-2.5">
              <li>
                <a
                  href="mailto:hello@javlin.space"
                  className="flex min-h-[44px] items-center text-sm font-semibold text-ink-700 hover:text-brand-blue transition-colors sm:min-h-0"
                >
                  hello@javlin.space
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-surface-border pt-6 sm:flex-row">
          <p className="text-xs text-ink-500">© {year} JAVLIN</p>
          <p className="font-display text-xs font-bold italic text-ink-600">Shoot Your Shot.</p>
          <p className="text-xs text-ink-500">Built by students, for students.</p>
        </div>
      </div>
    </footer>
  );
}
