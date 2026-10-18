import PageShell from "../components/PageShell";
import Icon from "../components/Icon";
import { Link } from "../lib/router";

/**
 * Terms & Conditions.
 *
 * DRAFT — grounded only in verified product behaviour (routes, features and the
 * Supabase data model present in this repository). Every legally material item
 * that cannot be established from the code is left as a visible placeholder for
 * the operator and legal review, never invented. Do not publish until the
 * bracketed items are resolved.
 */

function Ph({ children }: { children: string }) {
  return (
    <span className="rounded-md bg-brand-red-soft px-1.5 py-0.5 font-mono text-[0.85em] font-semibold text-brand-red-ink">
      {children}
    </span>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg sm:text-xl font-bold text-ink-900">{`${n}. ${title}`}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <PageShell
      title="Terms & Conditions | JAVLIN"
      description="Terms governing use of the JAVLIN student and opportunity platform."
      backgroundPreset="explore"
    >
      <div className="container-px mx-auto max-w-3xl py-10 sm:py-16">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-blue hover:text-brand-blue-dark"
          >
            <Icon name="arrow-left" className="h-4 w-4" /> Back to Home
          </Link>
        </div>

        <article className="card p-6 sm:p-10">
          <header className="border-b border-surface-border pb-6">
            <p className="eyebrow">Legal</p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-ink-900">
              Terms &amp; Conditions
            </h1>
            <p className="mt-3 text-sm text-ink-600">
              Terms governing use of the JAVLIN student and opportunity platform.
            </p>
            <p className="mt-3 text-xs text-ink-500">
              Status: <strong>Draft</strong> &middot; Last updated: <Ph>[VERIFY LAST-UPDATED DATE]</Ph>{" "}
              &middot; Contact:{" "}
              <a href="mailto:hello@javlin.space" className="font-semibold text-brand-blue hover:underline">
                hello@javlin.space
              </a>
            </p>
          </header>

          {/* Draft notice — kept visible while material placeholders remain. */}
          <div
            role="note"
            className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-900"
          >
            <p className="font-black uppercase tracking-wide">Draft for Legal Review</p>
            <p className="mt-1">
              This document is a working draft. It describes product behaviour that exists in the
              application, but it is <strong>not finalised legal advice</strong> and has not been
              reviewed by a qualified lawyer. Items shown in{" "}
              <span className="font-mono font-semibold">[BRACKETS]</span> must be supplied by the
              operator and reviewed before publication.
            </p>
          </div>

          <div className="mt-8 space-y-8 text-sm sm:text-base leading-relaxed text-ink-700">
            <Section n={1} title="About these Terms and the platform">
              <p>
                These Terms govern your access to and use of JAVLIN, including its website and the
                features described below. JAVLIN is operated by{" "}
                <Ph>[LEGAL ENTITY NAME — REQUIRED BEFORE PUBLICATION]</Ph>. Using the platform means
                you accept these Terms and our <Link href="/privacy" className="font-semibold text-brand-blue hover:underline">Privacy Policy</Link>. If you do not
                accept them, do not use the platform.
              </p>
              <p>
                The JAVLIN brand name alone does not identify the legal contracting entity; the
                operator&apos;s legal name and notice address above are required before publication.
              </p>
            </Section>

            <Section n={2} title="Eligibility and accounts">
              <p>
                JAVLIN is a platform for students and people exploring educational, career and campus
                opportunities. You must provide accurate information and keep your login credentials
                secure. You are responsible for activity carried out through your account.
              </p>
              <p>
                Minimum-age and eligibility rules: <Ph>[VERIFY ELIGIBILITY / AGE REQUIREMENTS]</Ph>.
                Where an individual opportunity sets its own eligibility, that opportunity&apos;s rules
                also apply to you.
              </p>
            </Section>

            <Section n={3} title="What JAVLIN provides">
              <p>
                Based on the features present in the application, JAVLIN may provide: opportunity and
                competition discovery (AIM, FIELD), team formation and membership (CREW), a student
                directory, connections and notifications (CIRCLE), a personal record of achievements
                (MARK), campus/news updates (PULSE), college reviews, and student accounts with a
                profile and privacy controls. Features may be added, changed or discontinued.
              </p>
            </Section>

            <Section n={4} title="Third-party opportunities and organizers">
              <p>
                Listings may be submitted by organizers (including through a third-party submission
                form) or sourced from elsewhere. Unless expressly stated, the organizer — not JAVLIN —
                is responsible for an opportunity&apos;s accuracy, eligibility, deadlines, selection,
                fees, prizes and delivery. Verify important details with the organizer before applying
                or sharing information. A listing is not an endorsement or guarantee by JAVLIN.
              </p>
            </Section>

            <Section n={5} title="Teams, registrations and participation">
              <p>
                Where team and competition features are available, you agree to provide accurate
                registration information and follow the rules shown in the feature and by the
                organizer. Do not impersonate others, register someone without permission, misuse
                invite codes, or attempt to bypass eligibility or deadlines.
              </p>
            </Section>

            <Section n={6} title="Profiles, connections and student records">
              <p>
                You are responsible for the information you add to your profile, connections, student
                records, reviews or other submissions, and you should only submit information you have
                the right to share. Some fields can be made visible to others through the privacy
                controls; consider carefully before making anything public, and do not post another
                person&apos;s private information without permission.
              </p>
            </Section>

            <Section n={7} title="Acceptable use">
              <p>You agree not to:</p>
              <ul className="ml-5 list-disc space-y-1">
                <li>post unlawful, fraudulent, defamatory, harassing, hateful or misleading content;</li>
                <li>infringe anyone&apos;s rights, or submit content you are not authorised to share;</li>
                <li>impersonate a person or organization, or falsify achievements or credentials;</li>
                <li>interfere with the service, probe or bypass security controls, or scrape personal data;</li>
                <li>send spam, or misuse team, connection or registration tools.</li>
              </ul>
            </Section>

            <Section n={8} title="Your content and permissions">
              <p>
                You keep the rights you hold in content you submit. The licence terms that let JAVLIN
                host and display that content to operate the service are:{" "}
                <Ph>[LEGAL REVIEW REQUIRED: CONTENT LICENCE]</Ph>.
              </p>
            </Section>

            <Section n={9} title="Moderation and account actions">
              <p>
                JAVLIN may review, restrict or remove content, or suspend access, where reasonably
                necessary to protect users, enforce these Terms, address abuse or security risks, or
                comply with law. The precise grounds, notice and appeal process are:{" "}
                <Ph>[LEGAL REVIEW REQUIRED: MODERATION &amp; APPEALS]</Ph>.
              </p>
            </Section>

            <Section n={10} title="Fees and payments">
              <p>
                The application does not currently process payments or take payment for its features.
                An organizer may separately impose a fee for an opportunity; any such fee, refund or
                cancellation is governed by that organizer&apos;s own terms, not by JAVLIN.
              </p>
            </Section>

            <Section n={11} title="Availability and disclaimers">
              <p>
                The platform is provided &ldquo;as available.&rdquo; We do not guarantee uninterrupted,
                error-free operation, nor any outcome such as selection, admission, employment or a
                prize. Warranty and liability terms are:{" "}
                <Ph>[LEGAL REVIEW REQUIRED: DISCLAIMERS &amp; LIABILITY]</Ph>.
              </p>
            </Section>

            <Section n={12} title="Changes to these Terms">
              <p>
                We may update these Terms as the platform or applicable law changes; the
                &ldquo;Last updated&rdquo; date will be revised. The statement that continued use after a
                change constitutes acceptance, and how changes must be noticed to be enforceable, is{" "}
                <Ph>[LEGAL REVIEW REQUIRED: ACCEPTANCE-BY-CONTINUED-USE &amp; NOTICE]</Ph>.
              </p>
            </Section>

            <Section n={13} title="Governing law and disputes">
              <p>
                Governing law and dispute resolution: <Ph>[VERIFY GOVERNING LAW &amp; JURISDICTION]</Ph>.
                These are not stated here because they must be confirmed by the operator and legal
                review.
              </p>
            </Section>

            <Section n={14} title="Contact and legal notices">
              <p>
                For questions or notices, contact{" "}
                <a href="mailto:hello@javlin.space" className="font-semibold text-brand-blue hover:underline">
                  hello@javlin.space
                </a>
                . Operator legal name: <Ph>[LEGAL ENTITY NAME — REQUIRED BEFORE PUBLICATION]</Ph>.
                Address for notices: <Ph>[VERIFY REGISTERED/NOTICE ADDRESS]</Ph>.
              </p>
            </Section>
          </div>
        </article>
      </div>
    </PageShell>
  );
}
