import { Link } from "../lib/router";
import { useScrollReveal } from "../hooks/useScrollReveal";
import BrandMark from "./BrandMark";

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
            <BrandMark className="h-12 w-auto block mb-4" />
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
                  href="mailto:connect@dusciencehub.in"
                  className="flex min-h-[44px] items-center text-sm font-semibold text-ink-700 hover:text-brand-blue transition-colors sm:min-h-0"
                >
                  connect@dusciencehub.in
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-surface-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-ink-500">© {year} JAVLIN</p>
          <p className="text-xs text-ink-500">Built by students, for students.</p>
        </div>
      </div>
    </footer>
  );
}
