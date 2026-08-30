import { FormEvent, useState } from "react";
import Icon from "../components/Icon";
import PageShell from "../components/PageShell";
import RoleCard from "../components/RoleCard";
import { roles, type RoleCardData } from "../data/roles";
import { isSupabaseConfigured } from "../lib/supabase";
import { submitGeneralApplication } from "../lib/dataAccess";

function JoinIntro() {
  return (
    <section className="bg-brand-blue-pale border-b border-surface-border">
      <div className="container-px py-14 sm:py-20 lg:py-24">
        <p className="eyebrow">Join DU Science Hub</p>
        <h1 className="mt-3 max-w-3xl text-4xl sm:text-5xl font-extrabold tracking-tight text-ink-900">
          Build something students actually use.
        </h1>
        <p className="mt-5 max-w-2xl text-base sm:text-lg leading-relaxed text-ink-500">
          Work with a student-powered team helping Delhi University students find better information, experiences and opportunities.
        </p>
        <a href="#positions" className="btn-primary mt-8">See open positions <Icon name="arrow" className="h-4 w-4" /></a>
      </div>
    </section>
  );
}

function GeneralApplication() {
  const [email, setEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!file) {
      setMessage("Please choose a CV or resume.");
      return;
    }
    if (!isSupabaseConfigured) {
      setMessage("CV submissions are paused until the secure Supabase storage configuration is completed.");
      return;
    }
    setSubmitting(true);
    const result = await submitGeneralApplication(email, file);
    setSubmitting(false);
    setMessage(result.error ? result.error : "Your CV was received. We’ll keep you in mind for future opportunities.");
    if (!result.error) {
      setEmail("");
      setFile(null);
      event.currentTarget.reset();
    }
  }

  return (
    <section className="border-t border-surface-border bg-brand-blue-pale py-14 sm:py-20">
      <div className="container-px">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-start">
          <div>
            <p className="eyebrow">General application</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-ink-900">Can’t find the right role?</h2>
            <p className="mt-4 max-w-xl leading-relaxed text-ink-500">
              Send us your CV and we’ll keep you in mind for future opportunities. We’ll use the secure application flow once storage is configured.
            </p>
            <p className="mt-5 text-sm font-semibold text-ink-700">
              Official contact: <a className="text-brand-blue hover:underline" href="mailto:connect@dusciencehub.in">connect@dusciencehub.in</a>
            </p>
          </div>
          <form onSubmit={submit} className="card p-5 sm:p-6">
            <label className="field-label" htmlFor="application-email">Email</label>
            <input id="application-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="field-input" placeholder="you@example.com" />
            <label className="field-label mt-4" htmlFor="application-cv">CV / Resume</label>
            <input id="application-cv" type="file" required accept=".pdf,.doc,.docx" onChange={(event) => setFile(event.target.files?.[0] || null)} className="field-input file:mr-3 file:rounded-lg file:border-0 file:bg-brand-blue-soft file:px-3 file:py-2 file:text-xs file:font-bold file:text-brand-blue" />
            <button disabled={submitting} className="btn-secondary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? "Sending securely…" : "Send my CV"}
            </button>
            {message && <p className="mt-3 text-sm font-semibold text-ink-700" role="status">{message}</p>}
            <p className="mt-4 text-xs leading-relaxed text-ink-400">Your file is not attached to a browser email. It is submitted through secure storage when configured.</p>
          </form>
        </div>
      </div>
    </section>
  );
}

function Benefit({ icon, title, children }: { icon: string; title: string; children: string }) {
  return (
    <article className="card p-5">
      <div className="h-10 w-10 rounded-xl bg-brand-red-soft text-brand-red flex items-center justify-center"><Icon name={icon} className="h-5 w-5" /></div>
      <h3 className="mt-4 font-bold text-ink-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">{children}</p>
    </article>
  );
}

export default function JoinPage({ roleId }: { roleId?: string }) {
  const role = roleId ? roles.find((item) => item.id === roleId) : undefined;

  if (roleId) {
    return <RoleDetail role={role} />;
  }

  return (
    <PageShell title="Join DU Science Hub | Build Something Students Use">
      <JoinIntro />
      <section className="py-14 sm:py-20">
        <div className="container-px">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.25fr] lg:items-center">
            <div>
              <p className="eyebrow">Why join us?</p>
              <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-ink-900">Make a useful impact on DU students.</h2>
              <p className="mt-4 leading-relaxed text-ink-500">Get real-world experience while working on a student-focused product, building a portfolio and meeting people who care about making DU easier to navigate.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Benefit icon="target" title="Real-world experience">Take on practical work that reaches students, not just a classroom brief.</Benefit>
              <Benefit icon="pen" title="Build your portfolio">Create useful guides, designs, stories and product work you can stand behind.</Benefit>
              <Benefit icon="users" title="Grow your network">Work with student contributors and mentors across the DU community.</Benefit>
              <Benefit icon="star" title="Make an impact">Help students find clearer information and better opportunities.</Benefit>
            </div>
          </div>
        </div>
      </section>
      <section className="border-y border-surface-border bg-surface-soft py-14 sm:py-20">
        <div className="container-px">
          <p className="eyebrow">What you’ll get</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-900">Support for the work you do.</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {["Paid internship opportunities, where applicable", "Certificate of Completion", "Letter of Recommendation for eligible performers", "LinkedIn / digital badge where applicable", "Portfolio experience", "Networking and practical experience"].map((benefit) => (
              <div key={benefit} className="card flex items-start gap-3 p-5">
                <span className="mt-0.5 text-brand-red">✓</span>
                <p className="text-sm font-semibold leading-relaxed text-ink-700">{benefit}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-ink-400">Benefits depend on the role, project and eligibility; they are not automatic for every applicant.</p>
        </div>
      </section>
      <section id="positions" className="scroll-mt-24 py-14 sm:py-20">
        <div className="container-px">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="eyebrow">Open positions</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-900">Find your way in.</h2></div>
            <span className="text-sm text-ink-500">{roles.filter((item) => item.status === "Open").length} roles currently listed</span>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((item) => (
              <a href={`/join/${item.id}`} key={item.id}><RoleCard {...item} /></a>
            ))}
          </div>
        </div>
      </section>
      <GeneralApplication />
    </PageShell>
  );
}

function RoleDetail({ role }: { role?: RoleCardData }) {
  if (!role) {
    return <PageShell title="Role not found | DU Science Hub"><section className="container-px py-20"><h1 className="text-3xl font-extrabold text-ink-900">Role not found</h1><a href="/join" className="btn-secondary mt-6">Back to Join Our Team</a></section></PageShell>;
  }
  return (
    <PageShell title={`${role.title} | DU Science Hub`}>
      <section className="bg-brand-blue-pale border-b border-surface-border">
        <div className="container-px py-14 sm:py-20">
          <a href="/join" className="text-sm font-semibold text-brand-blue hover:underline">← Back to Join Our Team</a>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${role.status === "Open" ? "bg-brand-red-soft text-brand-red" : "bg-surface-border text-ink-500"}`}>{role.status}</span>
            <span className="text-sm text-ink-500">{role.workArrangement} · {role.duration}</span>
          </div>
          <h1 className="mt-4 max-w-3xl text-4xl sm:text-5xl font-extrabold tracking-tight text-ink-900">{role.title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-500">{role.description}</p>
          {role.googleFormUrl ? <a href={role.googleFormUrl} target="_blank" rel="noreferrer" className="btn-primary mt-8">Apply Now <Icon name="arrow" className="h-4 w-4" /></a> : <span className="btn-ghost mt-8 cursor-not-allowed opacity-70">Application link coming soon</span>}
        </div>
      </section>
      <section className="py-14 sm:py-20">
        <div className="container-px grid gap-8 lg:grid-cols-3">
          <DetailList title="Responsibilities" items={role.responsibilities} />
          <DetailList title="Who we’re looking for" items={role.requirements} />
          <DetailList title="What you’ll get" items={role.benefits} />
        </div>
      </section>
    </PageShell>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return <article className="card p-6"><h2 className="text-lg font-bold text-ink-900">{title}</h2><ul className="mt-4 space-y-3">{items.map((item) => <li key={item} className="flex gap-2 text-sm leading-relaxed text-ink-500"><span className="text-brand-red">•</span>{item}</li>)}</ul></article>;
}
