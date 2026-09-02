import { FormEvent, useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";
import PageShell from "../components/PageShell";
import TiltCard from "../components/TiltCard";
import { roles as fallbackRoles, roleApplicationUrls, type RoleCardData } from "../data/roles";
import { getOpenTeamRoles, submitGeneralApplication } from "../lib/dataAccess";
import { sanitizeExternalUrl } from "../lib/urlSafety";
import { Link } from "../lib/router";

function JoinIntro() {
  const campusCorrespondentUrl = roleApplicationUrls["campus-correspondent"] || "https://forms.gle/oqqLTmm45NEtvjV49";

  return (
    <section className="bg-brand-blue-pale/60 backdrop-blur-[2px] border-b border-surface-border pt-12 pb-16 sm:pt-16 sm:pb-20">
      <div className="container-px max-w-7xl mx-auto">
        <div className="max-w-3xl">
          <p className="eyebrow text-brand-red">JOIN OUR TEAM</p>
          <h1 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-ink-900 leading-[1.1]">
            Represent Your College or Build With Us.
          </h1>
          <p className="mt-4 text-base sm:text-lg leading-relaxed text-ink-600 font-medium">
            Work with an ambitious, student-powered team helping Delhi University students discover real information, authentic campus perspectives, and career-defining opportunities.
          </p>
        </div>

        {/* TWO VERY CLEAR PATHWAYS */}
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {/* Pathway 1: Represent Your College */}
          <TiltCard className="h-full">
            <div className="card card-hover p-6 sm:p-10 h-full flex flex-col justify-between bg-white border-2 border-brand-red/40 shadow-lift group">
              <div>
                <span className="inline-block rounded-xl bg-brand-red text-white px-3.5 py-1 text-xs font-black uppercase tracking-wider shadow-sm">
                  REPRESENT YOUR COLLEGE
                </span>
                <h2 className="mt-6 text-2xl sm:text-3xl font-black text-ink-900 group-hover:text-brand-red transition-colors leading-snug">
                  Become the voice of your campus.
                </h2>
                <p className="mt-3 text-base leading-relaxed text-ink-600">
                  Cover college stories, society festivals, research achievements, and real student experiences directly from your campus.
                </p>
              </div>
              <div className="mt-8 pt-6 border-t border-surface-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <a
                  href={campusCorrespondentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-cursor="join"
                  className="btn-primary py-3 px-6 text-xs sm:text-sm font-black shadow-card inline-flex items-center justify-center gap-2"
                >
                  CAMPUS CORRESPONDENT →
                </a>
                <span className="text-xs font-bold text-ink-400">Direct Google Form</span>
              </div>
            </div>
          </TiltCard>

          {/* Pathway 2: Build With Us */}
          <TiltCard className="h-full">
            <div className="card card-hover p-6 sm:p-10 h-full flex flex-col justify-between bg-white border border-surface-border shadow-card group">
              <div>
                <span className="inline-block rounded-xl bg-brand-blue text-white px-3.5 py-1 text-xs font-black uppercase tracking-wider shadow-sm">
                  BUILD WITH US
                </span>
                <h2 className="mt-6 text-2xl sm:text-3xl font-black text-ink-900 group-hover:text-brand-blue transition-colors leading-snug">
                  Work with the core team.
                </h2>
                <p className="mt-3 text-base leading-relaxed text-ink-600">
                  Collaborate directly on visual design, editorial content, growth marketing, and founder's office operations.
                </p>
              </div>
              <div className="mt-8 pt-6 border-t border-surface-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <a
                  href="#open-roles"
                  className="btn-secondary py-3 px-6 text-xs sm:text-sm font-black shadow-card inline-flex items-center justify-center gap-2"
                >
                  EXPLORE OPEN ROLES →
                </a>
                <span className="text-xs font-bold text-ink-400">4 Active Openings</span>
              </div>
            </div>
          </TiltCard>
        </div>
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
      setMessage("Please choose a CV or resume file.");
      return;
    }
    setSubmitting(true);
    const result = await submitGeneralApplication(email, file);
    setSubmitting(false);
    setMessage(
      result.error
        ? result.error
        : "Your CV was received! We review every profile and keep you in mind for upcoming roles."
    );
    if (!result.error) {
      setEmail("");
      setFile(null);
      event.currentTarget.reset();
    }
  }

  return (
    <section id="general" className="scroll-mt-24 border-t border-surface-border bg-brand-blue-pale/50 backdrop-blur-[2px] py-16 sm:py-24">
      <div className="container-px">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-start max-w-6xl mx-auto">
          <div>
            <p className="eyebrow text-brand-red">GENERAL APPLICATION</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-ink-900">
              Can’t find the exact role?
            </h2>
            <p className="mt-4 max-w-xl leading-relaxed text-ink-600">
              We love proactive students who want to build something useful. Send us your CV, LinkedIn, or portfolio and tell us how you'd like to contribute.
            </p>
            <div className="mt-6 space-y-3 text-sm text-ink-600">
              <p className="flex items-center gap-2">
                <span className="text-brand-blue font-bold">✓</span> Direct contact:{" "}
                <a href="mailto:connect@dusciencehub.in" className="font-bold text-brand-blue hover:underline">
                  connect@dusciencehub.in
                </a>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-brand-blue font-bold">✓</span> No corporate cover letters required
              </p>
              <p className="flex items-center gap-2">
                <span className="text-brand-blue font-bold">✓</span> Reviewed directly by founding student contributors
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="card p-6 sm:p-8 bg-white shadow-lift border border-surface-border">
            <h3 className="text-xl font-bold text-ink-900">Submit Your Profile</h3>
            <p className="mt-1 text-xs text-ink-500">We respond to every serious student application.</p>

            <label className="field-label mt-5" htmlFor="applicant-email">
              College or Personal Email
            </label>
            <input
              id="applicant-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@college.du.ac.in"
              className="field-input"
            />

            <label className="field-label mt-4" htmlFor="applicant-cv">
              Resume / CV (PDF or Word)
            </label>
            <input
              id="applicant-cv"
              type="file"
              required
              accept=".pdf,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-2 block w-full text-xs text-ink-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-blue-soft file:text-brand-blue hover:file:bg-brand-blue-soft/80"
            />

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary mt-6 w-full justify-center shadow-card disabled:opacity-60"
            >
              {submitting ? "Uploading…" : "Drop Your Profile →"}
            </button>

            {message && (
              <p className="mt-4 text-xs font-bold text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-200" role="status">
                {message}
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}

export default function JoinPage({ roleId }: { roleId?: string }) {
  const [roleList, setRoleList] = useState<RoleCardData[]>(fallbackRoles);

  useEffect(() => {
    let cancelled = false;
    getOpenTeamRoles().then((result) => {
      if (cancelled) return;
      if (!result.data.length) return;
      const mapped: RoleCardData[] = result.data.map((r, index) => {
        const fallback = fallbackRoles.find((f) => f.slug === r.slug) || fallbackRoles[index % fallbackRoles.length];
        return {
          id: r.id,
          slug: r.slug,
          title: r.title,
          description: r.shortDescription || fallback.description,
          fullDescription: r.fullDescription || fallback.fullDescription,
          icon: fallback.icon,
          accent: fallback.accent,
          responsibilities: r.responsibilities.length ? r.responsibilities : fallback.responsibilities,
          requirements: r.requirements.length ? r.requirements : fallback.requirements,
          benefits: r.benefits.length ? r.benefits : fallback.benefits,
          workArrangement: r.workMode || fallback.workArrangement,
          workMode: r.workMode || fallback.workMode,
          duration: r.duration || fallback.duration,
          status: r.isOpen ? "Open" : "Closed",
          isOpen: r.isOpen,
          googleFormUrl: r.googleFormUrl || fallback.googleFormUrl || roleApplicationUrls[r.slug] || "",
        };
      });
      setRoleList(mapped);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const role = useMemo(() => {
    if (!roleId) return undefined;
    return roleList.find((item) => item.id === roleId || item.slug === roleId);
  }, [roleId, roleList]);

  if (roleId) {
    return <RoleDetail role={role} />;
  }

  return (
    <PageShell title="Join DU Science Hub | Build DU With Us" backgroundPreset="team">
      {/* 1. TWO VERY CLEAR PATHWAYS */}
      <JoinIntro />

      {/* 2. AVAILABLE ROLES (SIMPLE, SCANNABLE FORMAT) */}
      <section id="open-roles" className="scroll-mt-24 py-16 sm:py-24 border-b border-surface-border">
        <div className="container-px max-w-7xl mx-auto">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow text-brand-red">OPEN ROLES</p>
              <h2 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-ink-900">
                Choose your role.
              </h2>
              <p className="mt-2 text-base text-ink-600 font-normal">
                4 active student openings with instant Google Form applications.
              </p>
            </div>
            <span className="text-xs sm:text-sm font-bold text-ink-500 bg-white border border-surface-border px-3.5 py-1.5 rounded-full shadow-soft self-start sm:self-auto">
              {roleList.filter((item) => item.status === "Open" || item.isOpen).length} active openings
            </span>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {roleList.map((item) => {
              const safeUrl = sanitizeExternalUrl(item.googleFormUrl);
              const isRed = item.accent === "red";

              return (
                <TiltCard key={item.id} className="h-full">
                  <div
                    data-cursor="join"
                    className="card card-hover p-6 sm:p-7 h-full flex flex-col justify-between bg-white border border-surface-border shadow-card group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                            isRed
                              ? "bg-brand-red-soft text-brand-red"
                              : "bg-brand-blue-soft text-brand-blue"
                          }`}
                        >
                          {item.slug === "campus-correspondent"
                            ? "CAMPUS VOICE"
                            : item.slug === "canva-editor"
                            ? "CREATIVE & DESIGN"
                            : item.slug === "content-writer"
                            ? "EDITORIAL & GUIDES"
                            : "STRATEGY & OPS"}
                        </span>
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Actively Recruiting" />
                      </div>

                      <div className="mt-6 flex items-center gap-3">
                        <div
                          className={`h-11 w-11 rounded-2xl flex items-center justify-center font-black ${
                            isRed
                              ? "bg-brand-red-soft text-brand-red"
                              : "bg-brand-blue-soft text-brand-blue"
                          }`}
                        >
                          <Icon name={item.icon} className="h-5 w-5" />
                        </div>
                        <h3 className="font-extrabold text-lg text-ink-900 leading-snug group-hover:text-brand-blue transition-colors">
                          {item.title}
                        </h3>
                      </div>

                      <p className="mt-4 text-sm text-ink-600 leading-relaxed line-clamp-3 font-normal">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-8 pt-5 border-t border-surface-border flex flex-col gap-2.5">
                      {safeUrl ? (
                        <a
                          href={safeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary py-2.5 px-4 text-xs font-black justify-center shadow-soft text-center min-h-[44px]"
                        >
                          Apply via Google Form →
                        </a>
                      ) : null}
                      <Link
                        href={`/join/${item.id}`}
                        className="text-xs font-extrabold text-ink-500 hover:text-brand-blue text-center py-1 transition-colors"
                      >
                        View Role Details →
                      </Link>
                    </div>
                  </div>
                </TiltCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. GENERAL APPLICATION (DROP YOUR CV) */}
      <GeneralApplication />
    </PageShell>
  );
}

function RoleDetail({ role }: { role?: RoleCardData }) {
  if (!role) {
    return (
      <PageShell title="Role Not Found | DU Science Hub" backgroundPreset="team">
        <section className="container-px py-20">
          <h1 className="text-3xl font-extrabold text-ink-900">Role not found</h1>
          <Link href="/join" className="btn-secondary mt-6">
            Back to Open Positions
          </Link>
        </section>
      </PageShell>
    );
  }

  const safeGoogleFormUrl = sanitizeExternalUrl(role.googleFormUrl);

  return (
    <PageShell title={`${role.title} | Join DU Science Hub`} backgroundPreset="team">
      <section className="bg-brand-blue-pale/60 backdrop-blur-[2px] border-b border-surface-border">
        <div className="container-px py-14 sm:py-20">
          <Link href="/join" className="text-xs font-bold text-brand-blue hover:underline uppercase tracking-wider">
            ← Back to Open Positions
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                role.status === "Open" || role.isOpen
                  ? "bg-brand-red-soft text-brand-red"
                  : "bg-surface-border text-ink-500"
              }`}
            >
              {role.status === "Open" || role.isOpen ? "Actively Recruiting" : "Closed"}
            </span>
            {role.workArrangement && (
              <span className="rounded-full bg-white border border-surface-border px-3 py-1 text-xs font-semibold text-ink-600">
                {role.workArrangement}
              </span>
            )}
            {role.duration && (
              <span className="rounded-full bg-white border border-surface-border px-3 py-1 text-xs font-semibold text-ink-600">
                {role.duration}
              </span>
            )}
          </div>
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold text-ink-900 tracking-tight">{role.title}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-600">{role.description}</p>
          <div className="mt-8 flex flex-wrap gap-4">
            {safeGoogleFormUrl ? (
              <a
                href={safeGoogleFormUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-sm font-extrabold shadow-lift"
              >
                Apply via Official Google Form →
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="container-px max-w-4xl">
          {role.responsibilities && role.responsibilities.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-ink-900">What you’ll do</h2>
              <ul className="mt-4 space-y-2.5">
                {role.responsibilities.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-ink-700">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-red" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {role.requirements && role.requirements.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xl font-bold text-ink-900">What we’re looking for</h2>
              <ul className="mt-4 space-y-2.5">
                {role.requirements.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-ink-700">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-blue" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {role.benefits && role.benefits.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xl font-bold text-ink-900">What you’ll get</h2>
              <ul className="mt-4 space-y-2.5">
                {role.benefits.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-ink-700">
                    <span className="mt-1 text-emerald-600 font-bold">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-12 rounded-3xl bg-surface-soft p-8 text-center border border-surface-border">
            <h3 className="text-xl font-bold text-ink-900">Ready to join?</h3>
            <p className="mt-2 text-sm text-ink-500">Fill out our quick application form to get started.</p>
            {safeGoogleFormUrl && (
              <a
                href={safeGoogleFormUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary mt-6 inline-flex shadow-card"
              >
                Apply via Google Form →
              </a>
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
