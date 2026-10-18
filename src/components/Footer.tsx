import { Link } from "../lib/router";
import Icon from "./Icon";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { EXTERNAL_LINK_PROPS, ORGANIZER_CTA, ORGANIZER_FORM_URL } from "../lib/organizerCta";

const EXPLORE_LINKS = [
  { label: "AIM", href: "/aim" },
  { label: "FIELD", href: "/field" },
  { label: "CREW", href: "/crew" },
  { label: "CIRCLE", href: "/circle" },
  { label: "MARK", href: "/mark" },
  { label: "PULSE", href: "/pulse" },
  { label: "College Reviews", href: "/college-reviews" },
  { label: "Join Our Team", href: "/join" },
];

const SOCIAL_LINKS = [
  { label: "Instagram", handle: "@javlin.space", icon: "instagram", href: "https://www.instagram.com/javlin.space/" },
  { label: "JAVLIN", handle: "LinkedIn", icon: "linkedin", href: "https://www.linkedin.com/company/javlin-shoot-your-shot" },
];

const groupHeading = "mb-3 text-[11px] font-black uppercase tracking-[0.14em] text-ink-500";
const footerLink =
  "flex min-h-[44px] items-center gap-2 text-sm font-semibold text-ink-700 transition-colors hover:text-brand-blue sm:min-h-0";

export default function Footer() {
  const year = new Date().getFullYear();
  const { ref, isVisible } = useScrollReveal<HTMLElement>({ threshold: 0.05 });

  return (
    <footer
      ref={ref}
      className={`mt-10 sm:mt-14 border-t border-surface-border bg-surface-soft reveal-stagger ${
        isVisible ? "is-visible" : ""
      }`}
    >
      <div className="container-px py-8 sm:py-12 relative z-10">
        {/* Flexible columns rather than a fixed grid: the three groups carry
            very different amounts of content, and equal columns is what left
            the old footer with a wide empty half on desktop. */}
        <div className="flex flex-col gap-8 sm:gap-10 lg:flex-row lg:flex-wrap lg:items-start lg:gap-x-12">
          <div className="w-full max-w-sm lg:w-72 lg:shrink-0 xl:w-80">
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
              className="mb-3 block h-12 w-auto max-w-full rounded-xl object-cover [object-position:center_41.3%] aspect-[2.19/1]"
            />
            <p className="text-sm leading-relaxed text-ink-500">
              A student-powered platform for discovering your college, learning from seniors
              and finding opportunities that help you move forward.
            </p>
          </div>

          <nav aria-label="Explore JAVLIN" className="lg:flex-1 lg:min-w-[9.5rem]">
            <p className={groupHeading}>Explore JAVLIN</p>
            {/* Two columns from the smallest screen: eight short labels stacked
                one per line was the single tallest thing in the footer, and the
                44px touch target is kept either way. */}
            <ul className="grid grid-cols-2 gap-x-4 sm:gap-x-6 lg:block lg:space-y-0">
              {EXPLORE_LINKS.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className={footerLink}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="For organizers" className="lg:flex-1 lg:min-w-[13rem]">
            <p className={groupHeading}>For Organizers</p>
            <a
              href={ORGANIZER_FORM_URL}
              {...EXTERNAL_LINK_PROPS}
              className="inline-flex min-h-[44px] items-center gap-2 text-sm font-extrabold text-brand-blue transition-colors hover:text-brand-red-ink"
            >
              {ORGANIZER_CTA.label}
              <Icon name="arrow" className="h-3.5 w-3.5" />
            </a>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">{ORGANIZER_CTA.footerSupport}</p>
          </nav>

          <nav aria-label="Connect" className="lg:flex-1 lg:min-w-[12rem]">
            <p className={groupHeading}>Connect</p>
            <ul className="-my-1">
              <li>
                <a href="mailto:hello@javlin.space" className={footerLink}>
                  <Icon name="mail" className="h-4 w-4 shrink-0 text-ink-500" />
                  hello@javlin.space
                </a>
              </li>
              {SOCIAL_LINKS.map((s) => (
                <li key={s.href}>
                  <a href={s.href} {...EXTERNAL_LINK_PROPS} className={footerLink}>
                    <Icon name={s.icon} className="h-4 w-4 shrink-0 text-ink-500" />
                    <span>{s.label}</span>
                    {s.handle !== s.label && <span className="font-normal text-ink-500">{s.handle}</span>}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-surface-border pt-5 sm:flex-row">
          <p className="text-xs text-ink-500">© {year} JAVLIN</p>
          <p className="font-display text-xs font-bold italic text-ink-600">Shoot Your Shot.</p>
          <p className="text-xs text-ink-500">Built by students, for students.</p>
        </div>
        <nav aria-label="Legal" className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 sm:justify-start">
          <Link href="/terms" className="text-xs font-semibold text-ink-500 transition-colors hover:text-brand-blue">
            Terms &amp; Conditions
          </Link>
          <Link href="/privacy" className="text-xs font-semibold text-ink-500 transition-colors hover:text-brand-blue">
            Privacy Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
