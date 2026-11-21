import type { ReactNode } from "react";

type AuthFrameProps = {
  /** The pull-quote / tagline that opens the page. */
  lead: ReactNode;
  children: ReactNode;
};

/**
 * One narrow column, vertically centred in the space under the fixed navbar.
 * Sign-up and login share it so the two pages line up exactly when you
 * switch between them.
 */
export default function AuthFrame({ lead, children }: AuthFrameProps) {
  return (
    <section className="flex min-h-[calc(100dvh-4rem)] items-center px-4 py-6 sm:min-h-[calc(100dvh-5rem)]">
      <div className="mx-auto w-full max-w-[22.5rem]">
        {lead}
        <div className="mt-5">{children}</div>
      </div>
    </section>
  );
}

type AuthLeadProps = {
  quote: string;
  caption: string;
  /** False for a tagline, which is a statement rather than someone's words. */
  quoted?: boolean;
};

/** The opening line: a quiet serif quote with an orange rule, then who said it. */
export function AuthLead({ quote, caption, quoted = true }: AuthLeadProps) {
  return (
    <figure className="border-l-2 border-brand-red pl-3.5">
      <blockquote className="text-balance font-display text-[1.2rem] leading-snug text-ink-900 sm:text-[1.3rem]">
        {quoted ? `“${quote}”` : quote}
      </blockquote>
      <figcaption className="mt-1.5 text-xs text-ink-500">{caption}</figcaption>
    </figure>
  );
}
