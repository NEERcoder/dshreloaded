import { FormEvent, useEffect, useMemo, useState, type ChangeEvent } from "react";
import PageShell from "../components/PageShell";
import Icon from "../components/Icon";
import { StudentAvatar } from "../components/circle/StudentCard";
import { useUnreadNotificationCount } from "../components/NotificationBell";
import { useAuth } from "../context/AuthContext";
import { Link, useLocation } from "../lib/router";
import {
  getColleges,
  getCurrentUserProfile,
  createProfile,
  updateProfile,
  getMyCompetitionTeams,
  getConnectionSummary,
  setProfileVisibility,
  uploadStudentAvatar,
  normalizeInstagramHandle,
  normalizePhoneNumber,
  instagramProfileUrl,
  type CollegeRecord,
  type ProfileRecord,
  type ProfileInput,
  type CompetitionTeamRecord,
  type ConnectionSummary,
} from "../lib/dataAccess";

const GENDER_OPTIONS = ["Female", "Male", "Non-binary", "Prefer not to say"];

type FormState = {
  fullName: string;
  collegeId: string;
  course: string;
  yearOfStudy: string;
  graduationYear: string;
  gender: string;
  /** Bare handle, no @ and no URL. Public on the profile. */
  instagramHandle: string;
  /** Optional and unverified. Visible only to the owner and shared teammates. */
  phone: string;
};

const blankForm: FormState = {
  fullName: "",
  collegeId: "",
  course: "",
  yearOfStudy: "",
  graduationYear: "",
  gender: "",
  instagramHandle: "",
  phone: "",
};

/** One place to keep the form and the saved profile in step. */
function formFromProfile(p: ProfileRecord): FormState {
  return {
    fullName: p.fullName,
    collegeId: p.collegeId,
    course: p.course,
    yearOfStudy: p.yearOfStudy ? String(p.yearOfStudy) : "",
    graduationYear: p.graduationYear ? String(p.graduationYear) : "",
    gender: p.gender,
    instagramHandle: p.instagramHandle ?? "",
    phone: p.phone ?? "",
  };
}

function yearLabel(y: number): string {
  const suffix = y === 1 ? "st" : y === 2 ? "nd" : y === 3 ? "rd" : "th";
  return `${y}${suffix} Year`;
}

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { navigate } = useLocation();
  const unreadNotifications = useUnreadNotificationCount();

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
  const [connectionSummary, setConnectionSummary] = useState<ConnectionSummary | null>(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(blankForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Privacy + avatar are owner-controlled and separate from the profile form.
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Route guard: logged-out visitors never see dashboard content.
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, user, navigate]);

  async function loadData() {
    setDataLoading(true);
    setLoadError(null);
    const [collegesResult, profileResult, teamsResult, connectionsResult] = await Promise.all([
      getColleges(),
      getCurrentUserProfile(),
      getMyCompetitionTeams(),
      getConnectionSummary(),
    ]);
    setColleges(collegesResult.data);
    setMyTeams(teamsResult.data ?? []);
    // Connections are optional context: if the backend can't answer, the
    // dashboard renders without the section instead of failing.
    setConnectionSummary(
      connectionsResult.error || !connectionsResult.configured ? null : connectionsResult.data
    );

    if (profileResult.error) {
      setLoadError(profileResult.error);
    } else if (profileResult.data) {
      const p = profileResult.data;
      setProfile(p);
      setForm(formFromProfile(p));
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

    if (form.instagramHandle.trim() && !normalizeInstagramHandle(form.instagramHandle)) {
      return "Instagram should be just your username, like neer_singh — no @ and no link.";
    }
    if (form.phone.trim() && !normalizePhoneNumber(form.phone)) {
      return "Enter a valid phone number, or leave it blank.";
    }
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
      instagramHandle: form.instagramHandle,
      phone: form.phone,
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
      setForm(formFromProfile(profile));
    }
    setSaveError(null);
    setSaveSuccess(false);
    setEditing(true);
  }

  function cancelEdit() {
    if (!profile) return; // nothing to cancel back to — profile must be created first
    setForm(formFromProfile(profile));
    setSaveError(null);
    setEditing(false);
  }

  async function toggleVisibility() {
    if (!profile) return;
    const next = !profile.isPublic;
    setVisibilitySaving(true);
    setVisibilityError(null);
    const result = await setProfileVisibility(next);
    setVisibilitySaving(false);
    if (result.error) {
      setVisibilityError(result.error);
      return;
    }
    // Written back from what the owner asked for — the column is the only one
    // this control touches.
    setProfile({ ...profile, isPublic: next });
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // let the same file be picked again after a failure
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Choose an image file — PNG, JPG or WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Keep your photo under 2 MB.");
      return;
    }

    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setAvatarError(null);
    setAvatarSaving(true);

    const result = await uploadStudentAvatar(file);
    setAvatarSaving(false);
    setAvatarPreview(null);
    URL.revokeObjectURL(preview);

    const url = result.data;
    if (result.error || !url) {
      setAvatarError(result.error ?? "We couldn't upload that photo.");
      return;
    }
    setProfile((current) => (current ? { ...current, avatarUrl: url } : current));
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
      <PageShell title="Dashboard | JAVLIN" backgroundPreset="explore">
        <div className="container-px py-24 text-center text-sm font-semibold text-ink-500 animate-pulse">
          Loading your dashboard…
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Dashboard | JAVLIN"
      description="Manage your JAVLIN student profile."
      backgroundPreset="explore"
    >
      <div className="container-px py-10 sm:py-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-6 border-b border-surface-border">
          <div>
            <p className="eyebrow">STUDENT DASHBOARD</p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-ink-900">
              {profile ? `Hey, ${profile.fullName.split(" ")[0]}.` : "Let's finish setting up."}
            </h1>
            <p className="mt-2 text-xs font-semibold text-ink-500 font-mono">
              Signed in as: {user.email}
            </p>
          </div>
          <button
            className="btn-ghost self-start text-xs font-bold text-ink-600 hover:text-brand-red-ink"
            onClick={handleSignOut}
          >
            <Icon name="logout" className="h-4 w-4" /> Sign out
          </button>
        </div>

        <div className="mt-8 max-w-2xl">
          {dataLoading ? (
            <div className="card p-8 text-center text-sm font-semibold text-ink-500 animate-pulse">
              Loading your profile…
            </div>
          ) : loadError ? (
            <div className="card p-6 border border-brand-red/20 bg-brand-red-soft">
              <p className="text-sm font-bold text-brand-red-ink">{loadError}</p>
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="field-label" htmlFor="dash-instagram">
                      Instagram <span className="font-medium normal-case text-ink-500">(optional)</span>
                    </label>
                    <div className="relative">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-500"
                      >
                        @
                      </span>
                      <input
                        id="dash-instagram"
                        type="text"
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={30}
                        disabled={saving}
                        value={form.instagramHandle}
                        onChange={(e) => setForm({ ...form, instagramHandle: e.target.value.replace(/^@+/, "") })}
                        className="field-input pl-7 disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="neer_singh"
                      />
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-ink-500">
                      Username only — this appears on your public profile.
                    </p>
                  </div>

                  <div>
                    <label className="field-label" htmlFor="dash-phone">
                      Phone <span className="font-medium normal-case text-ink-500">(optional)</span>
                    </label>
                    <input
                      id="dash-phone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      maxLength={20}
                      disabled={saving}
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                      placeholder="+91 98765 43210"
                    />
                    <p className="mt-1 text-[11px] font-semibold text-ink-500">
                      Never verified and never public — only teammates on a shared team can see it.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
                  {saving ? (
                    <>
                      <Icon name="loader" className="h-4 w-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    <>
                      <Icon name="check" className="h-4 w-4" /> {profile ? "Save changes" : "Save and continue"}
                    </>
                  )}
                </button>
                {profile && (
                  <button type="button" onClick={cancelEdit} disabled={saving} className="btn-ghost">
                    Cancel
                  </button>
                )}
              </div>

              {saveError && (
                <div role="alert" className="mt-4 rounded-xl border border-brand-red/20 bg-brand-red-soft p-3 text-xs font-bold text-brand-red-ink">
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
                <div>
                  <dt className="field-label">Instagram</dt>
                  <dd className="mt-1 text-sm font-semibold text-ink-900">
                    {profile.instagramHandle ? (
                      <a
                        href={instagramProfileUrl(profile.instagramHandle) ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-brand-blue hover:text-brand-blue-dark"
                      >
                        @{profile.instagramHandle}
                        <Icon name="external" className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      "Not added"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="field-label">Phone</dt>
                  <dd className="mt-1 text-sm font-semibold text-ink-900">
                    {profile.phone || "Not added"}
                    <span className="mt-0.5 block text-[11px] font-semibold text-ink-500">
                      Visible only to you and students on a team with you.
                    </span>
                  </dd>
                </div>
              </dl>

              <p className="mt-6 text-xs text-ink-500">
                Email: <span className="font-semibold text-ink-500">{user.email}</span> · Account can't be reassigned to another user.
              </p>
            </div>
          ) : null}
        </div>

        {/* PROFILE PHOTO & VISIBILITY — owner-controlled, separate from the form */}
        {!dataLoading && !loadError && profile && (
          <div className="mt-6 max-w-2xl">
            <div className="card p-6 sm:p-8">
              <h2 className="text-lg font-bold text-ink-900">Profile photo &amp; visibility</h2>
              <p className="mt-1 text-sm text-ink-500">
                How you appear in CIRCLE and on your public profile link.
              </p>

              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Your photo, preview"
                    className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-white"
                  />
                ) : (
                  <StudentAvatar
                    src={profile.avatarUrl}
                    name={profile.fullName}
                    className="h-16 w-16 text-xl ring-2 ring-white"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <label className="field-label" htmlFor="dash-avatar">Profile photo</label>
                  <input
                    id="dash-avatar"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={avatarSaving}
                    onChange={handleAvatarChange}
                    className="mt-2 block w-full text-xs font-semibold text-ink-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-blue-soft file:px-3 file:py-2 file:text-xs file:font-bold file:text-brand-blue-dark disabled:opacity-60"
                  />
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
                    {avatarSaving
                      ? "Uploading…"
                      : profile.avatarUrl
                        ? "Your photo is live on CIRCLE cards. Square photos crop best."
                        : "No photo yet — your cards show your initials."}
                  </p>
                </div>
              </div>

              {avatarError && (
                <div role="alert" className="mt-4 rounded-xl border border-brand-red/20 bg-brand-red-soft p-3 text-xs font-bold text-brand-red-ink">
                  {avatarError}
                </div>
              )}

              <div className="mt-6 border-t border-surface-border pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink-900">Public profile</p>
                    <p className="mt-1 max-w-md text-xs leading-relaxed text-ink-500">
                      Off keeps your profile to signed-in JAVLIN students. On lets anyone with your profile link
                      see your name, college, course, level and the records you mark public.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={profile.isPublic}
                    aria-label="Public profile"
                    onClick={toggleVisibility}
                    disabled={visibilitySaving}
                    className={`inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors disabled:opacity-60 ${
                      profile.isPublic ? "bg-brand-blue" : "bg-surface-border"
                    }`}
                  >
                    <span
                      className={`h-6 w-6 rounded-full bg-white shadow-soft transition-transform duration-200 ${
                        profile.isPublic ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <p className="mt-3 text-[11px] font-bold" role="status" aria-live="polite">
                  {visibilityError ? (
                    <span className="text-brand-red-ink">{visibilityError}</span>
                  ) : visibilitySaving ? (
                    <span className="inline-flex items-center gap-1.5 text-ink-500">
                      <Icon name="loader" className="h-3.5 w-3.5 animate-spin" /> Updating…
                    </span>
                  ) : (
                    <span className="text-ink-500">
                      {profile.isPublic ? "Visible to anyone with your link." : "Hidden from visitors."}
                    </span>
                  )}
                </p>

                <Link href={`/circle/${profile.userId}`} className="btn-outline-blue mt-4 min-h-[44px] text-xs">
                  <Icon name="external" className="h-4 w-4" /> View my CIRCLE profile
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* MY TEAMS */}
        <div className="mt-10 max-w-2xl">
          <h2 className="text-lg font-extrabold text-ink-900">My Teams</h2>
          <p className="mt-1 text-sm text-ink-500">Competitions you're part of.</p>

          {dataLoading ? (
            <div className="mt-4 card p-6 text-sm text-ink-500 animate-pulse">Loading teams…</div>
          ) : myTeams.length === 0 ? (
            <div className="mt-4 card p-6 text-center border-dashed">
              <p className="text-sm font-semibold text-ink-500">You haven't joined a competition team yet.</p>
              <Link href="/crew" className="btn-secondary mt-4 inline-flex text-sm">
                Find a Crew on CREW
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
                        <span className="rounded-full bg-brand-red-soft px-2 py-0.5 text-[11px] font-bold text-brand-red-ink">Captain</span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${team.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-surface-border text-ink-500"}`}>
                        {team.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-500">{team.competitionTitle}</p>
                    <p className="text-xs text-ink-500">{team.memberCount} member{team.memberCount !== 1 ? "s" : ""}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-blue shrink-0">View team <Icon name="arrow" className="h-3.5 w-3.5" /></span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* CONNECTIONS — compact summary, only when the backend can answer */}
        {!dataLoading && connectionSummary && (
          <div className="mt-10 max-w-2xl">
            <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-ink-900">Connections</h2>
                <p className="mt-1 text-sm font-semibold text-ink-500">
                  {connectionSummary.connections} connection{connectionSummary.connections === 1 ? "" : "s"}
                  {connectionSummary.incomingPending > 0 && (
                    <span className="text-brand-red-ink">
                      {" · "}
                      {connectionSummary.incomingPending} request
                      {connectionSummary.incomingPending === 1 ? "" : "s"} waiting
                    </span>
                  )}
                </p>
                {unreadNotifications > 0 && (
                  <p className="mt-1 text-xs font-bold text-brand-blue">
                    {unreadNotifications} unread notification{unreadNotifications === 1 ? "" : "s"}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {unreadNotifications > 0 && (
                  <Link href="/notifications" className="btn-secondary text-xs">
                    View notifications
                  </Link>
                )}
                <Link href="/circle/connections" className="btn-outline-blue text-xs">
                  View connections
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
