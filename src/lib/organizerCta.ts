/**
 * The one definition of the organizer call-to-action.
 *
 * The homepage section and the footer both link to it, and a URL typed out
 * twice is a URL that eventually gets updated once. Tally owns the form, so
 * there is nothing to submit here — no endpoint, no table, no iframe.
 */
export const ORGANIZER_FORM_URL = "https://tally.so/r/Y5EEeN";

export const ORGANIZER_CTA = {
  eyebrow: "FOR ORGANIZERS & BUSINESSES",
  heading: "Bring your event to the student community.",
  description:
    "Hosting a competition, hackathon, workshop or campus event? Tell us a little about it and our team will get in touch.",
  label: "List Your Event on JAVLIN",
  footerSupport: "Get your event in front of students across India.",
} as const;

/** External links get the same safe attributes everywhere they appear. */
export const EXTERNAL_LINK_PROPS = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const;
