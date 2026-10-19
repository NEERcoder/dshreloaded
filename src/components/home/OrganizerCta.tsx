import Icon from "../Icon";
import { EXTERNAL_LINK_PROPS, ORGANIZER_CTA, ORGANIZER_FORM_URL } from "../../lib/organizerCta";

/**
 * The organizer-facing island, sitting between College Reviews and Join Our
 * Team. It is deliberately the same shape as its neighbours — one island, one
 * rail — so the homepage does not grow a second visual language, and the only
 * orange button on the page is the one thing we want tapped.
 */
export default function OrganizerCta() {
  return (
    <section id="organizers" className="band scroll-mt-24">
      <div className="container-px py-5 sm:py-6 lg:py-8">
        <div className="glass-card card-rail flex flex-col items-start justify-between gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:gap-4 lg:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-red-soft text-brand-red-ink sm:flex">
              <Icon name="trophy" className="h-6 w-6" />
            </span>
            <div>
              <p className="eyebrow">{ORGANIZER_CTA.eyebrow}</p>
              <h2 className="section-title font-display mt-1.5 leading-tight">
                {ORGANIZER_CTA.heading}
              </h2>
              <p className="section-lede mt-1.5 max-w-xl sm:mt-2 sm:text-base">
                {ORGANIZER_CTA.description}
              </p>
            </div>
          </div>
          <div className="w-full shrink-0 sm:w-auto">
            <a
              href={ORGANIZER_FORM_URL}
              {...EXTERNAL_LINK_PROPS}
              className="btn-accent w-full justify-center sm:w-auto"
            >
              {ORGANIZER_CTA.label} <Icon name="arrow" className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
