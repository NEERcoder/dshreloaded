import PageShell from "../components/PageShell";
import Icon from "../components/Icon";
import { Link } from "../lib/router";

/**
 * Privacy Policy.
 *
 * DRAFT — the data practices described here are grounded in this repository's
 * actual code and Supabase migrations (auth, the profiles/connections/
 * notifications/records/registrations data model, storage buckets and RLS).
 * Anything that depends on production configuration or that cannot be verified
 * from the code is left as a visible placeholder rather than asserted. Do not
 * publish until the bracketed items are resolved and reviewed.
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

export default function PrivacyPolicyPage() {
  return (
    <PageShell
      title="Privacy Policy | JAVLIN"
      description="How JAVLIN handles personal information across its student and opportunity features."
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
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-ink-900">
              Privacy Policy
            </h1>
            <p className="mt-3 text-sm text-ink-600">
              How JAVLIN handles personal information across its student and opportunity features.
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
              This draft describes data handling that is evidenced by the application and its database
              schema. It is <strong>not finalised</strong> and has not been reviewed for compliance.
              Items in <span className="font-mono font-semibold">[BRACKETS]</span> depend on production
              configuration or legal review and must be resolved before publication.
            </p>
          </div>

          <div className="mt-8 space-y-8 text-sm sm:text-base leading-relaxed text-ink-700">
            <Section n={1} title="Who we are and scope">
              <p>
                This Privacy Policy explains how JAVLIN handles personal information when you use the
                platform. JAVLIN is operated by <Ph>[VERIFY LEGAL ENTITY NAME]</Ph>. Contact:{" "}
                <a href="mailto:hello@javlin.space" className="font-semibold text-brand-blue hover:underline">
                  hello@javlin.space
                </a>
                . It does not automatically govern external organizers or linked third-party pages,
                which have their own practices.
              </p>
            </Section>

            <Section n={2} title="Information we collect">
              <p>The information collected depends on the features you use. From the application and its data model:</p>
              <ul className="ml-5 list-disc space-y-2">
                <li>
                  <strong>Account:</strong> your email address and password (managed through Supabase
                  Authentication). Email verification may be required depending on project settings.
                </li>
                <li>
                  <strong>Profile:</strong> full name, college, course, year of study, graduation year
                  and gender, stored in your student profile.
                </li>
                <li>
                  <strong>Optional profile fields:</strong> a phone number (optional and not verified),
                  an Instagram handle, and an avatar image you choose to upload.
                </li>
                <li>
                  <strong>Content you create:</strong> connection requests and accepted connections,
                  system-generated notifications about those, and student records (title, organization,
                  description, year, an optional public proof link, and a per-record visibility choice).
                </li>
                <li>
                  <strong>Teams and registrations:</strong> competition teams you create or join (team
                  name, membership, invite code) and, where you register, a registration entry that may
                  include participant and roster details needed to administer the entry.
                </li>
                <li>
                  <strong>Applications you submit:</strong> a general application uploads your email and
                  a CV/résumé file to a private storage bucket visible only to administrators.
                </li>
                <li>
                  <strong>Organizer submissions:</strong> event-submission details you provide are
                  collected through a third-party form provider (see section 7).
                </li>
                <li>
                  <strong>Technical/security data:</strong> request and error logs may be generated by
                  the underlying services. Their scope and retention are{" "}
                  <Ph>[VERIFY ACTIVE SERVICE PROVIDERS]</Ph>.
                </li>
              </ul>
            </Section>

            <Section n={3} title="How we use information">
              <p>
                We use information to create and secure your account; operate the profile, directory,
                connections, notifications, teams, registrations, records and reviews features; help you
                discover opportunities; administer participation where applicable; respond to support,
                reports and privacy requests; and maintain reliability and security.
              </p>
            </Section>

            <Section n={4} title="Legal basis and consent">
              <p>
                The lawful bases, consent mechanisms and any data-protection obligations applicable to
                this processing are: <Ph>[LEGAL REVIEW REQUIRED: DATA-PROTECTION OBLIGATIONS]</Ph>. This
                draft does not assert a specific legal basis or compliance status until that review is
                complete.
              </p>
            </Section>

            <Section n={5} title="Public profiles and visibility">
              <p>
                Two different audiences see different things, and they should not be confused:
              </p>
              <ul className="ml-5 list-disc space-y-2">
                <li>
                  <strong>Signed-in JAVLIN students</strong> can read the basic fields of another
                  student&apos;s profile (name, college, course, year of study, graduation year, gender
                  and Instagram handle). This is the case whether or not you turn on the public-profile
                  setting, because the platform lets students discover one another.
                </li>
                <li>
                  <strong>Anonymous visitors</strong> (people who are not signed in) can see your profile
                  only when you turn on the &ldquo;public profile&rdquo; setting. When it is on, they see a
                  limited set of fields (name, college, course, year of study, graduation year, avatar and
                  handle) and only the student records you have marked public.
                </li>
              </ul>
              <p>
                Your phone number is never part of any public or anonymous view. You can change the
                public-profile setting and each record&apos;s visibility in your dashboard.
              </p>
              <p>
                <strong>Profile photos:</strong> avatar images are stored in a public image bucket. Your
                photo link is only shown on a public profile, but anyone who already has the direct image
                URL can open that picture, so a photo should be treated as potentially reachable if its
                link is shared, even when your profile is set to private.
              </p>
            </Section>

            <Section n={6} title="When we share information">
              <ul className="ml-5 list-disc space-y-2">
                <li>
                  <strong>With other signed-in students:</strong> your profile fields are visible to them
                  as described in section 5, and only the student records you mark public are shown. The
                  public-profile toggle controls anonymous visibility, not visibility to signed-in students.
                </li>
                <li>
                  <strong>Phone number:</strong> shown to students who share a team with you, through an
                  access-controlled lookup. It is never included in a public or anonymous profile view.
                </li>
                <li>
                  <strong>With platform administrators:</strong> a phone number and other participant
                  details may be visible to JAVLIN administrators when they process a competition
                  registration; this access is restricted to administrators. Whether such details are also
                  passed to an external organizer:{" "}
                  <Ph>[VERIFY ORGANIZER ACCESS TO PARTICIPANT CONTACT]</Ph>.
                </li>
                <li>
                  <strong>Service providers:</strong> vendors that host or operate the platform (see
                  section 7).
                </li>
                <li>
                  <strong>For legal/safety reasons:</strong> where required by law or reasonably necessary
                  to protect users or enforce our terms.
                </li>
              </ul>
            </Section>

            <Section n={7} title="Service providers and third parties">
              <p>
                The application is built to use <strong>Supabase</strong> for authentication, the
                database and file storage. Organizer event submissions are handled through a
                third-party form provider, <strong>Tally</strong>, whose terms apply to those
                submissions. Website hosting, content delivery and any logging are provided by services
                that must be confirmed against the live deployment:{" "}
                <Ph>[VERIFY ACTIVE SERVICE PROVIDERS]</Ph>. A provider appearing in code or configuration
                is not, by itself, proof of what is active in production.
              </p>
            </Section>

            <Section n={8} title="Storage, security and location">
              <p>
                Data is stored in the Supabase database and storage buckets. Access is governed by
                row-level security, but the rules differ by data type, so they should not be read as
                uniform &ldquo;private to you&rdquo; storage:
              </p>
              <ul className="ml-5 list-disc space-y-2">
                <li>
                  <strong>Creating and changing your own data:</strong> you can insert or update only your
                  own profile, contact details, connections and student records; you cannot edit another
                  student&apos;s rows.
                </li>
                <li>
                  <strong>Reading profiles:</strong> profile rows are readable by all signed-in students
                  (see section 5), not only by their owner. Anonymous visitors see a profile only when its
                  owner has enabled the public-profile setting.
                </li>
                <li>
                  <strong>Reading student records:</strong> a record is visible to its owner always; to
                  everyone only when both the record and its owner&apos;s profile are marked public; and to
                  administrators for moderation.
                </li>
                <li>
                  <strong>Connections and notifications:</strong> visible only to the students who are
                  parties to them.
                </li>
                <li>
                  <strong>Phone number:</strong> stored separately from the public profile and never
                  returned in a public or anonymous view.
                </li>
              </ul>
              <p>
                No secret keys are shown to users. No transmission or storage system can be guaranteed
                completely secure; use a strong, unique password and protect your credentials. Data
                locations and any cross-border transfers:{" "}
                <Ph>[VERIFY DATA LOCATION AND INTERNATIONAL TRANSFERS]</Ph>.
              </p>
            </Section>

            <Section n={9} title="Cookies and local storage">
              <p>
                Your sign-in session is kept in your browser&apos;s local storage so you stay logged in
                between visits. The application code does not include advertising or third-party
                analytics/tracking scripts. If analytics are added at the hosting layer, this section
                must be updated: <Ph>[VERIFY ACTIVE SERVICE PROVIDERS]</Ph>.
              </p>
            </Section>

            <Section n={10} title="Retention">
              <p>
                We aim to keep personal information only as long as needed for the purposes above, but
                specific retention periods and deletion criteria are:{" "}
                <Ph>[VERIFY DATA RETENTION PERIODS]</Ph>. This draft does not state fixed periods because
                they must be confirmed by the operator.
              </p>
            </Section>

            <Section n={11} title="Your choices and rights">
              <p>
                You can update or remove your profile details and change your visibility settings yourself
                in your dashboard. There is no self-service account-deletion feature in the application;
                requests for access, correction, deletion or account closure are handled by contacting{" "}
                <a href="mailto:hello@javlin.space" className="font-semibold text-brand-blue hover:underline">
                  hello@javlin.space
                </a>
                . How such requests are received, verified and fulfilled is{" "}
                <Ph>[VERIFY OPERATIONAL PROCESS FOR DELETION / ACCOUNT-CLOSURE REQUESTS]</Ph>. Available
                rights depend on applicable law:{" "}
                <Ph>[LEGAL REVIEW REQUIRED: DATA-PROTECTION OBLIGATIONS]</Ph>. Deleting an account may not
                remove information already lawfully shared with others or retained under applicable law.
              </p>
            </Section>

            <Section n={12} title="Younger users">
              <p>
                JAVLIN is designed for a student audience, which may include younger users. Where
                applicable law requires parental or guardian consent, the relevant features must not be
                used until that consent and any safeguards are in place. Specific age requirements:{" "}
                <Ph>[VERIFY ELIGIBILITY / AGE REQUIREMENTS]</Ph>.
              </p>
            </Section>

            <Section n={13} title="Changes to this policy">
              <p>
                We may update this policy as the platform, its providers or applicable law change; the
                &ldquo;Last updated&rdquo; date will be revised. Please review it periodically.
              </p>
            </Section>

            <Section n={14} title="Contact and grievance details">
              <p>
                Privacy questions and requests:{" "}
                <a href="mailto:hello@javlin.space" className="font-semibold text-brand-blue hover:underline">
                  hello@javlin.space
                </a>
                . Operator: <Ph>[VERIFY LEGAL ENTITY NAME]</Ph>. Notice address:{" "}
                <Ph>[VERIFY REGISTERED/NOTICE ADDRESS]</Ph>. Grievance / data-protection officer:{" "}
                <Ph>[VERIFY GRIEVANCE OFFICER DETAILS]</Ph>.
              </p>
            </Section>
          </div>
        </article>
      </div>
    </PageShell>
  );
}
