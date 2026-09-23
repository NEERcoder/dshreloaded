import { FormEvent, useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import { useAuth } from "../context/AuthContext";
import { Link, useLocation } from "../lib/router";
import {
  getColleges,
  getCurrentUserProfile,
  createProfile,
  updateProfile,
  getMyCompetitionTeams,
  type CollegeRecord,
  type ProfileRecord,
  type ProfileInput,
  type CompetitionTeamRecord,
} from "../lib/dataAccess";

const GENDER_OPTIONS = ["Female", "Male", "Non-binary", "Prefer not to say"];

type FormState = {
  fullName: string;
  collegeId: string;
  course: string;
  yearOfStudy: string;
  graduationYear: string;
  gender: string;
};

const blankForm: FormState = {
  fullName: "",
  collegeId: "",
  course: "",
  yearOfStudy: "",
  graduationYear: "",
  gender: "",
};

function yearLabel(y: number): string {
  const suffix = y === 1 ? "st" : y === 2 ? "nd" : y === 3 ? "rd" : "th";
  return `${y}${suffix} Year`;
}

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { navigate } = useLocation();

  const currentYear = new Date().getFullYear();
  const graduationYearOptions = useMemo(
    () => Array.from({ length: 8 }, (_, i) => currentYear + i),
    [currentYear]
  );

  const [dataLoading, setDataLoading] = useState(true);
  const [colleges, setColleges] = useState<CollegeRecord[]>([]);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [myTeams, setMyTeams] = useState<CompetitionTeamRecord[]>([]);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(blankForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Route guard: logged-out visitors never see dashboard content.
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, user, navigate]);

  async function loadData() {
    setDataLoading(true);
    setLoadError(null);
    const [collegesResult, profileResult, teamsResult] = await Promise.all([
      getColleges(),
      getCurrentUserProfile(),
      getMyCompetitionTeams(),
    ]);
    setColleges(collegesResult.data);
    setMyTeams(teamsResult.data ?? []);

    if (profileResult.error) {
      setLoadError(profileResult.error);
    } else if (profileResult.data) {
      const p = profileResult.data;
      setProfile(p);
      setForm({
        fullName: p.fullName,
        collegeId: p.collegeId,
        course: p.course,
        yearOfStudy: p.yearOfStudy ? String(p.yearOfStudy) : "",
        graduationYear: p.graduationYear ? String(p.graduationYear) : "",
        gender: p.gender,
      });
      setEditing(false);
    } else {
      // No profile row yet — most likely the profile-creation step during
      // signup didn't complete. Drop the student straight into the form
      // so they can finish setting up their account.
      setProfile(null);
      setForm(blankForm);
      setEditing(true);
    }
    setDataLoading(false);
  }

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  function validateForm(): string | null {
    if (form.fullName.trim().length < 2) return "Full name must be at least 2 characters.";
    if (!form.collegeId) return "Please select your college.";
    if (!form.course.trim()) return "Please enter your course.";

    const yos = Number(form.yearOfStudy);
    if (!form.yearOfStudy || Number.isNaN(yos) || yos < 1 || yos > 6) {
      return "Year of study must be between 1 and 6.";
    }

    const gradYear = Number(form.graduationYear);
    if (!form.graduationYear || Number.isNaN(gradYear) || gradYear < currentYear) {
      return `Graduation year must be ${currentYear} or later.`;
    }

    if (!form.gender) return "Please select a gender.";
    return null;
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    const validationError = validateForm();
    if (validationError) {
      setSaveError(validationError);
      return;
    }

    setSaving(true);

    // Only ever the fields the student is allowed to change — user_id is
    // never part of this payload and cannot be supplied from this form.
    const input: ProfileInput = {
      fullName: form.fullName.trim(),
      collegeId: form.collegeId,
      course: form.course.trim(),
      yearOfStudy: Number(form.yearOfStudy),
      graduationYear: Number(form.graduationYear),
      gender: form.gender,
    };

    const result = profile ? await updateProfile(input) : await createProfile(input);

    if (result.error || !result.data) {
      setSaveError(
        result.error || (profile ? "We couldn't save your changes." : "We couldn't create your profile.")
      );
      setSaving(false);
      return;
    }

    setProfile(result.data);
    setEditing(false);
    setSaving(false);
    setSaveSuccess(true);
  }

  function startEdit() {
    if (profile) {
      setForm({
        fullName: profile.fullName,
        collegeId: profile.collegeId,
        course: profile.course,
        yearOfStudy: profile.yearOfStudy ? String(profile.yearOfStudy) : "",
        graduationYear: profile.graduationYear ? String(profile.graduationYear) : "",
        gender: profile.gender,
      });
    }
    setSaveError(null);
    setSaveSuccess(false);
    setEditing(true);
  }

  function cancelEdit() {
    if (!profile) return; // nothing to cancel back to — profile must be created first
    setForm({
      fullName: profile.fullName,
      collegeId: profile.collegeId,
      course: profile.course,
      yearOfStudy: profile.yearOfStudy ? String(profile.yearOfStudy) : "",
      graduationYear: profile.graduationYear ? String(profile.graduationYear) : "",
      gender: profile.gender,
    });
    setSaveError(null);
    setEditing(false);
  }

  async function handleSignOut() {
    await signOut();
    navigate("/", { replace: true });
  }

  const selectedCollege = useMemo(
    () => colleges.find((c) => c.id === (profile?.collegeId || form.collegeId)) || null,
    [colleges, profile, form.collegeId]
  );

  // Auth still resolving, or we're about to redirect a logged-out visitor.
  if (authLoading || !user) {
    return (
      <PageShell title="Dashboard | DU Science Hub" backgroundPreset="explore">
        <div className="container-px py-24 text-center text-sm font-semibold text-ink-500 animate-pulse">
          Loading your dashboard…
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Dashboard | DU Science Hub"
      description="Manage your DU Science Hub student profile."
      backgroundPreset="explore"
    >
      <div className="container-px py-10 sm:py-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-6 border-b border-surface-border">
          <div>
            <p className="eyebrow text-brand-red">STUDENT DASHBOARD</p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-ink-900">
              {profile ? `Hey, ${profile.fullName.split(" ")[0]}.` : "Let's finish setting up."}
            </h1>
            <p className="mt-2 text-xs font-semibold text-ink-500 font-mono">
              Signed in as: {user.email}
            </p>
          </div>
          <button
            className="btn-ghost self-start text-xs font-bold text-ink-600 hover:text-brand-red"
            onClick={handleSignOut}
          >
            Sign out →
          </button>
        </div>

        <div className="mt-8 max-w-2xl">
          {dataLoading ? (
            <div className="card p-8 text-center text-sm font-semibold text-ink-500 animate-pulse">
              Loading your profile…
            </div>
          ) : loadError ? (
            <div className="card p-6 border border-brand-red/20 bg-brand-red-soft">
              <p className="text-sm font-bold text-brand-red">{loadError}</p>
              <button className="btn-secondary mt-4" onClick={loadData}>
                Try again
              </button>
            </div>
          ) : editing ? (
            <form onSubmit={save} className="card p-6 sm:p-8">
              <h2 className="text-lg font-bold text-ink-900">
                {profile ? "Edit your profile" : "Complete your profile"}
              </h2>
              {!profile && (
                <p className="mt-1 text-sm text-ink-500">
                  Your account is ready — just a few details left before you can use the hub.
                </p>
              )}

              <div className="mt-5 grid gap-4">
                <div>
                  <label className="field-label" htmlFor="dash-full-name">Full Name</label>
                  <input
                    id="dash-full-name"
                    type="text"
                    required
                    disabled={saving}
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="e.g. Ananya Sharma"
                  />
                </div>

                <div>
                  <label className="field-label" htmlFor="dash-college">College</label>
                  <select
                    id="dash-college"
                    required
                    disabled={saving}
                    value={form.collegeId}
                    onChange={(e) => setForm({ ...form, collegeId: e.target.value })}
                    className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="" disabled>Select your college</option>
                    {colleges.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.campus ? `(${c.campus})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="field-label" htmlFor="dash-course">Course</label>
                  <input
                    id="dash-course"
                    type="text"
                    required
                    disabled={saving}
                    value={form.course}
                    onChange={(e) => setForm({ ...form, course: e.target.value })}
                    className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="e.g. BSc (Hons) Physics"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="field-label" htmlFor="dash-year">Year of Study</label>
                    <select
                      id="dash-year"
                      required
                      disabled={saving}
                      value={form.yearOfStudy}
                      onChange={(e) => setForm({ ...form, yearOfStudy: e.target.value })}
                      className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="" disabled>Select year</option>
                      {[1, 2, 3, 4, 5, 6].map((y) => (
                        <option key={y} value={y}>{yearLabel(y)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="field-label" htmlFor="dash-graduation-year">Graduation Year</label>
                    <select
                      id="dash-graduation-year"
                      required
                      disabled={saving}
                      value={form.graduationYear}
                      onChange={(e) => setForm({ ...form, graduationYear: e.target.value })}
                      className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="" disabled>Select year</option>
                      {graduationYearOptions.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="field-label" htmlFor="dash-gender">Gender</label>
                  <select
                    id="dash-gender"
                    required
                    disabled={saving}
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="" disabled>Select gender</option>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
                  {saving ? "Saving…" : profile ? "Save changes" : "Save and continue"}
                </button>
                {profile && (
                  <button type="button" onClick={cancelEdit} disabled={saving} className="btn-ghost">
                    Cancel
                  </button>
                )}
              </div>

              {saveError && (
                <div role="alert" className="mt-4 rounded-xl border border-brand-red/20 bg-brand-red-soft p-3 text-xs font-bold text-brand-red">
                  {saveError}
                </div>
              )}
            </form>
          ) : profile ? (
            <div className="card p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-ink-900">Your profile</h2>
                <button className="btn-secondary px-4 py-2 text-xs" onClick={startEdit}>
                  Edit Profile
                </button>
              </div>

              {saveSuccess && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
                  Your profile has been updated.
                </div>
              )}

              <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="field-label">Full Name</dt>
                  <dd className="mt-1 text-sm font-semibold text-ink-900">{profile.fullName}</dd>
                </div>
                <div>
                  <dt className="field-label">College</dt>
                  <dd className="mt-1 text-sm font-semibold text-ink-900">
                    {selectedCollege ? `${selectedCollege.name}${selectedCollege.campus ? ` (${selectedCollege.campus})` : ""}` : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="field-label">Course</dt>
                  <dd className="mt-1 text-sm font-semibold text-ink-900">{profile.course}</dd>
                </div>
                <div>
                  <dt className="field-label">Year of Study</dt>
                  <dd className="mt-1 text-sm font-semibold text-ink-900">{yearLabel(profile.yearOfStudy)}</dd>
                </div>
                <div>
                  <dt className="field-label">Graduation Year</dt>
                  <dd className="mt-1 text-sm font-semibold text-ink-900">{profile.graduationYear}</dd>
                </div>
                <div>
                  <dt className="field-label">Gender</dt>
                  <dd className="mt-1 text-sm font-semibold text-ink-900">{profile.gender}</dd>
                </div>
              </dl>

              <p className="mt-6 text-xs text-ink-400">
                Email: <span className="font-semibold text-ink-500">{user.email}</span> · Account can't be reassigned to another user.
              </p>
            </div>
          ) : null}
        </div>

        {/* MY TEAMS */}
        <div className="mt-10 max-w-2xl">
          <h2 className="text-lg font-extrabold text-ink-900">My Teams</h2>
          <p className="mt-1 text-sm text-ink-500">Competitions you're part of.</p>

          {dataLoading ? (
            <div className="mt-4 card p-6 text-sm text-ink-500 animate-pulse">Loading teams…</div>
          ) : myTeams.length === 0 ? (
            <div className="mt-4 card p-6 text-center border-dashed">
              <p className="text-sm font-semibold text-ink-500">You haven't joined a competition team yet.</p>
              <Link href="/opportunities" className="btn-secondary mt-4 inline-flex text-sm">
                Explore Competitions
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {myTeams.map((team) => (
                <Link
                  key={team.id}
                  href={`/teams/${team.id}`}
                  className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between hover:shadow-lift hover:-translate-y-0.5 transition-all duration-200 block"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-ink-900">{team.name}</h3>
                      {team.captainUserId === user?.id && (
                        <span className="rounded-full bg-brand-red-soft px-2 py-0.5 text-[10px] font-bold text-brand-red">Captain</span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${team.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-surface-border text-ink-500"}`}>
                        {team.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-500">{team.competitionTitle}</p>
                    <p className="text-xs text-ink-400">{team.memberCount} member{team.memberCount !== 1 ? "s" : ""}</p>
                  </div>
                  <span className="text-xs font-bold text-brand-blue shrink-0">View team →</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
