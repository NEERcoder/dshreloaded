import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import Icon from "../components/Icon";
import { initialsOf, yearLabel } from "../components/circle/StudentCard";
import { Link } from "../lib/router";
import { useAuth } from "../context/AuthContext";
import {
  getColleges,
  getCurrentUserProfile,
  getMyCompetitionTeams,
  getOpportunities,
  type CollegeRecord,
  type CompetitionTeamRecord,
  type ProfileRecord,
} from "../lib/dataAccess";
import { buildParticipations, resolveTier, type Participation } from "../lib/markTier";

const FUTURE_SECTIONS = [
  { icon: "briefcase", label: "Experience" },
  { icon: "building", label: "Internships" },
  { icon: "award", label: "Certifications" },
  { icon: "palette", label: "Projects" },
  { icon: "flask", label: "Research" },
  { icon: "users", label: "Campus Roles & Leadership" },
  { icon: "trophy", label: "Achievements" },
  { icon: "star", label: "Skills" },
];

const EMPTY_RECORD_COPY = "Nothing here yet. Add it as you build.";

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function statusLabel(status: CompetitionTeamRecord["status"]): string {
  if (status === "active") return "Active";
  if (status === "closed") return "Closed";
  return "Disbanded";
}

export default function MarkPage() {
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [colleges, setColleges] = useState<CollegeRecord[]>([]);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const currentUserId = user.id;
    setLoading(true);
    setError(null);

    async function load() {
      // Three concurrent reads, no per-row queries. The opportunity feed is
      // only fetched when there are team records to enrich.
      const [profileResult, collegesResult, teamsResult] = await Promise.all([
        getCurrentUserProfile(),
        getColleges(),
        getMyCompetitionTeams(),
      ]);
      if (cancelled) return;

      if (profileResult.error) setError(profileResult.error);
      if (teamsResult.error) setError(teamsResult.error);
      setProfile(profileResult.data);
      setColleges(collegesResult.data);

      const teams = teamsResult.data ?? [];
      const published = teams.length ? (await getOpportunities()).data : [];
      if (cancelled) return;

      setParticipations(buildParticipations(teams, published, currentUserId));
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user, reloadKey]);

  const college = useMemo(
    () => colleges.find((c) => c.id === profile?.collegeId) ?? null,
    [colleges, profile]
  );

  const tier = useMemo(() => resolveTier(participations.length), [participations.length]);

  // Completion only from columns public.profiles actually has.
  const profileFieldCount = useMemo(() => {
    if (!profile) return 0;
    return [
      Boolean(profile.fullName.trim()),
      Boolean(college),
      Boolean(profile.course.trim()),
      profile.yearOfStudy > 0,
      profile.graduationYear > 0,
    ].filter(Boolean).length;
  }, [profile, college]);

  if (authLoading || loading) {
    return (
      <PageShell title="MARK — Your Record | JAVLIN" backgroundPreset="explore">
        <div className="container-px py-24 text-center text-sm font-semibold text-ink-500 animate-pulse">
          Loading your record…
        </div>
      </PageShell>
    );
  }

  // MARK is the student's own workspace — nothing is read for visitors.
  if (!user) {
    return (
      <PageShell
        title="MARK — Build Your Record | JAVLIN"
        description="One record for everything you've done — competitions first, then the rest."
        backgroundPreset="explore"
      >
        <MarkHeader />
        <div className="container-px py-8 sm:py-12">
          <div className="mx-auto max-w-xl card border-dashed p-8 sm:p-10 text-center bg-white">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue-soft text-brand-blue">
              <Icon name="trophy" className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-extrabold text-ink-900">MARK is for signed-in students</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
              Your record is your own workspace — it is built from your profile and the competition teams
              you've actually joined, and it is never shown publicly.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/login" className="btn-primary min-h-[40px]">Sign in to open MARK</Link>
              <Link href="/signup" className="btn-secondary min-h-[40px]">Create Your Profile</Link>
            </div>
          </div>

          <ul className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
            {[
              "Your college, course and graduation year",
              "Every competition you've entered",
              "A tier that grows with real participation",
              "Room for projects, internships and more",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-surface-border bg-white p-4 text-sm font-semibold text-ink-700 shadow-card"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-blue-soft text-brand-blue">
                  <Icon name="arrow" className="h-3.5 w-3.5" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </PageShell>
    );
  }

  if (error && !profile) {
    return (
      <PageShell title="MARK — Your Record | JAVLIN" backgroundPreset="explore">
        <MarkHeader />
        <div className="container-px py-10">
          <div className="card p-6 border border-brand-red/20 bg-brand-red-soft text-center">
            <p className="text-sm font-bold text-brand-red-dark">{error}</p>
            <button className="btn-secondary mt-4 min-h-[40px]" onClick={() => setReloadKey((k) => k + 1)}>
              Try again
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="MARK — Your Record | JAVLIN"
      description="Your competitions, tier and student record — built from what you've actually done."
      backgroundPreset="explore"
    >
      <MarkHeader />

      <div className="container-px py-8 sm:py-10">
        {/* PROFILE HEADER */}
        <section className="card border border-surface-border bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xl font-extrabold text-brand-blue-soft">
                {initialsOf(profile?.fullName ?? "")}
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900 break-words leading-tight">
                  {profile ? profile.fullName : "Finish your profile"}
                </h2>
                {profile ? (
                  <>
                    <p className="mt-1 text-sm font-semibold text-ink-500">
                      {profile.course}
                      {profile.yearOfStudy ? ` · ${yearLabel(profile.yearOfStudy)}` : ""}
                    </p>
                    <p className="mt-1 text-xs font-medium text-ink-400">
                      {college ? college.name : "College not listed yet"}
                      {profile.graduationYear ? ` · Graduates ${profile.graduationYear}` : ""}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 max-w-md text-sm leading-relaxed text-ink-500">
                    Your MARK needs a name, college, course and graduation year before it can show anything.
                  </p>
                )}
              </div>
            </div>
            <Link href="/dashboard" className="btn-primary shrink-0 self-start min-h-[40px]">
              Edit Profile
            </Link>
          </div>

          {profile && (
            <div className="mt-6 border-t border-surface-border pt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink-400">
                  {profileFieldCount === 5 ? "Profile complete" : "Profile fields on file"}
                </p>
                {profileFieldCount < 5 && (
                  <p className="text-[10px] font-bold text-brand-red-dark">
                    {5 - profileFieldCount} of 5 still empty
                  </p>
                )}
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-blue-soft"
                role="progressbar"
                aria-label="Profile fields on file"
                aria-valuenow={profileFieldCount}
                aria-valuemin={0}
                aria-valuemax={5}
              >
                <div
                  className="h-full rounded-full bg-brand-blue transition-all duration-300"
                  style={{ width: `${(profileFieldCount / 5) * 100}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-brand-red/20 bg-brand-red-soft p-3 text-xs font-bold text-brand-red-dark">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          {/* MAIN RECORD COLUMN */}
          <div className="order-2 min-w-0 lg:order-1">
            <section className="card border border-surface-border bg-white p-6 sm:p-7">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-ink-900">
                  Competition record
                </h2>
                <p className="text-xs font-bold text-ink-400">
                  {participations.length} joined
                </p>
              </div>

              {participations.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-surface-border bg-surface-soft/60 p-6 text-center">
                  <p className="text-sm font-bold text-ink-700">{EMPTY_RECORD_COPY}</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-ink-400">
                    Competitions appear here the moment you join a team for one.
                  </p>
                  <Link href="/crew" className="btn-secondary mt-4 min-h-[40px] inline-flex text-sm">
                    Find a crew on CREW
                  </Link>
                </div>
              ) : (
                <ul className="mt-5 space-y-3">
                  {participations.map((entry) => {
                    const deadline = formatDate(entry.deadline);
                    return (
                      <li
                        key={entry.teamId}
                        className="rounded-2xl border border-surface-border bg-surface-soft/60 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-bold text-ink-900 break-words">{entry.title}</h3>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  entry.teamStatus === "active"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-surface-border text-ink-500"
                                }`}
                              >
                                {statusLabel(entry.teamStatus)}
                              </span>
                              {entry.isCaptain && (
                                <span className="rounded-full bg-brand-red-soft px-2 py-0.5 text-[10px] font-bold text-brand-red-dark">
                                  Captain
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs font-medium text-ink-500">
                              {entry.organization ? `by ${entry.organization}` : "Competition no longer listed"}
                            </p>
                            <p className="mt-1 text-xs text-ink-400">
                              {entry.teamName}
                              {deadline ? ` · Deadline ${deadline}` : ""}
                            </p>
                          </div>
                          <Link
                            href={`/teams/${entry.teamId}`}
                            className="shrink-0 text-xs font-bold text-brand-blue hover:text-brand-blue-dark"
                          >
                            View →
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <p className="mt-5 text-[11px] leading-relaxed text-ink-400">
                MARK records participation. Placements and wins aren't stored in JAVLIN yet, so nothing here
                claims a result.
              </p>
            </section>

            <section className="mt-6">
              <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-ink-900">
                The rest of your record
              </h2>
              <p className="mt-1 text-sm text-ink-500">
                {EMPTY_RECORD_COPY} These sections fill in as JAVLIN opens each record type.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {FUTURE_SECTIONS.map((section) => (
                  <div
                    key={section.label}
                    className="min-w-0 rounded-2xl border border-dashed border-surface-border bg-white/70 p-4"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue-soft text-brand-blue">
                      <Icon name={section.icon} className="h-4 w-4" />
                    </span>
                    <h3 className="mt-3 text-sm font-extrabold text-ink-900">{section.label}</h3>
                    <p className="mt-1 text-[11px] font-medium leading-relaxed text-ink-400">
                      Not open yet
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* TIER SIDEBAR — first on mobile so it stays readable */}
          <aside className="order-1 min-w-0 lg:order-2">
            <div className="lg:sticky lg:top-24 space-y-4">
              <TierCard tier={tier} />

              <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-card">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink-400">Your record</p>
                <dl className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="font-semibold text-ink-500">Competitions joined</dt>
                    <dd className="font-extrabold text-ink-900">{participations.length}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="font-semibold text-ink-500">Profile fields</dt>
                    <dd className="font-extrabold text-ink-900">{profile ? `${profileFieldCount} / 5` : "0 / 5"}</dd>
                  </div>
                </dl>
                <Link href="/dashboard" className="btn-secondary mt-4 min-h-[40px] w-full text-sm">
                  My Dashboard
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </PageShell>
  );
}

function MarkHeader() {
  return (
    <section className="border-b border-surface-border bg-brand-blue-pale/60 backdrop-blur-[2px] pt-10 pb-8 sm:pt-14 sm:pb-10">
      <div className="container-px">
        <p className="eyebrow text-brand-red">MARK</p>
        <h1 className="font-display mt-2 text-3xl sm:text-5xl font-extrabold tracking-tight text-ink-900 leading-tight">
          Your record.
        </h1>
        <p className="mt-3 max-w-2xl text-base sm:text-lg leading-relaxed text-ink-600 font-medium">
          One place for everything you've done — starting with the competitions you actually showed up for.
        </p>
      </div>
    </section>
  );
}

function TierCard({ tier }: { tier: ReturnType<typeof resolveTier> }) {
  const hasTier = tier.tierLabel !== null;
  const isPlatinum = tier.tier === "platinum";

  const cardClass = hasTier
    ? `rounded-2xl p-6 shadow-lift bg-brand-navy ring-1 ${isPlatinum ? "ring-brand-red/50" : "ring-white/10"}`
    : "rounded-2xl border border-surface-border bg-white p-6 shadow-card";

  return (
    <section className={cardClass}>
      <p
        className={`text-[10px] font-black uppercase tracking-widest ${
          hasTier ? "text-brand-blue-soft/70" : "text-ink-400"
        }`}
      >
        MARK tier
      </p>

      <div className="mt-3 flex items-baseline gap-2">
        <span
          className={`font-display text-4xl font-extrabold tracking-tight ${
            hasTier ? "text-white" : "text-ink-900"
          }`}
        >
          {tier.competitions}
        </span>
        <span className={`text-sm font-bold ${hasTier ? "text-brand-blue-soft/80" : "text-ink-500"}`}>
          competition{tier.competitions === 1 ? "" : "s"}
        </span>
      </div>

      {tier.tierLabel ? (
        <p className="font-display mt-2 text-xl font-extrabold tracking-[0.18em] text-brand-blue-soft">
          {tier.tierLabel}
        </p>
      ) : (
        <p className="mt-2 text-sm font-bold text-ink-400">No tier yet</p>
      )}

      <div
        className={`mt-4 h-1.5 overflow-hidden rounded-full ${hasTier ? "bg-white/15" : "bg-brand-blue-soft"}`}
        role="progressbar"
        aria-label="Progress to the next MARK tier"
        aria-valuenow={tier.progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            hasTier ? "bg-brand-blue-soft" : "bg-brand-blue"
          }`}
          style={{ width: `${tier.progressPercent}%` }}
        />
      </div>

      <p className={`mt-3 text-xs font-semibold leading-relaxed ${hasTier ? "text-brand-blue-soft/80" : "text-ink-500"}`}>
        {tier.message}
      </p>
    </section>
  );
}
