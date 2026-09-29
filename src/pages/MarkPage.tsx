import { useEffect, useMemo, useState, type FormEvent } from "react";
import PageShell from "../components/PageShell";
import Icon from "../components/Icon";
import {
  RECORD_CATEGORY_ICONS,
  RECORD_CATEGORY_LABELS,
  StudentRecordList,
  initialsOf,
  yearLabel,
} from "../components/circle/StudentCard";
import { Link } from "../lib/router";
import { useAuth } from "../context/AuthContext";
import {
  STUDENT_RECORD_CATEGORIES,
  createStudentRecord,
  deleteStudentRecord,
  getColleges,
  getCurrentUserProfile,
  getMyCompetitionTeams,
  getOpportunities,
  getStudentRecords,
  updateStudentRecord,
  type CollegeRecord,
  type CompetitionTeamRecord,
  type ProfileRecord,
  type StudentRecord,
  type StudentRecordCategory,
  type StudentRecordInput,
} from "../lib/dataAccess";
import { buildParticipations, resolveTier, type Participation } from "../lib/markTier";

const FUTURE_SECTIONS = [
  { icon: "briefcase", label: "Experience" },
  { icon: "star", label: "Skills" },
];

const EMPTY_RECORD_COPY = "Nothing here yet. Add it as you build.";

type RecordFormState = {
  category: StudentRecordCategory;
  title: string;
  organization: string;
  description: string;
  year: string;
  proofUrl: string;
  isPublic: boolean;
};

function blankRecordForm(): RecordFormState {
  return {
    category: "internship",
    title: "",
    organization: "",
    description: "",
    year: String(new Date().getFullYear()),
    proofUrl: "",
    isPublic: true,
  };
}

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
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Records form: one short inline form, never a wizard.
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recordForm, setRecordForm] = useState<RecordFormState>(blankRecordForm());
  const [recordSaving, setRecordSaving] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      // Four concurrent reads, no per-row queries. The opportunity feed is
      // only fetched when there are team records to enrich.
      const [profileResult, collegesResult, teamsResult, recordsResult] = await Promise.all([
        getCurrentUserProfile(),
        getColleges(),
        getMyCompetitionTeams(),
        getStudentRecords(currentUserId),
      ]);
      if (cancelled) return;

      if (profileResult.error) setError(profileResult.error);
      if (teamsResult.error) setError(teamsResult.error);
      if (recordsResult.error) setRecordError(recordsResult.error);
      setProfile(profileResult.data);
      setColleges(collegesResult.data);
      setRecords(recordsResult.data ?? []);

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

  const publicRecordCount = useMemo(
    () => records.filter((record) => record.isPublic).length,
    [records]
  );

  function openNewRecord() {
    setEditingId(null);
    setRecordForm(blankRecordForm());
    setRecordError(null);
    setPendingDeleteId(null);
    setFormOpen(true);
  }

  function openEditRecord(record: StudentRecord) {
    setEditingId(record.id);
    setRecordForm({
      category: record.category,
      title: record.title,
      organization: record.organization,
      description: record.description,
      year: String(record.year || new Date().getFullYear()),
      proofUrl: record.proofUrl ?? "",
      isPublic: record.isPublic,
    });
    setRecordError(null);
    setPendingDeleteId(null);
    setFormOpen(true);
  }

  function closeRecordForm() {
    setFormOpen(false);
    setEditingId(null);
    setRecordError(null);
  }

  // Re-read the owner's rows from RLS instead of trusting the write echo.
  async function refreshRecords(userId: string) {
    const result = await getStudentRecords(userId);
    if (result.error) {
      setRecordError(result.error);
      return;
    }
    setRecords(result.data ?? []);
  }

  async function submitRecord(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setRecordError(null);

    const title = recordForm.title.trim();
    if (title.length < 2) {
      setRecordError("Give the record a title.");
      return;
    }
    const year = Number(recordForm.year);
    if (!Number.isFinite(year) || year < 1990 || year > 2200) {
      setRecordError("Use a valid year between 1990 and 2200.");
      return;
    }

    const input: StudentRecordInput = {
      category: recordForm.category,
      title,
      organization: recordForm.organization.trim(),
      description: recordForm.description.trim(),
      year,
      proofUrl: recordForm.proofUrl.trim(),
      isPublic: recordForm.isPublic,
    };

    setRecordSaving(true);
    const result = editingId
      ? await updateStudentRecord(editingId, input)
      : await createStudentRecord(input);
    setRecordSaving(false);

    if (result.error || !result.data) {
      setRecordError(result.error ?? "We couldn't save that record.");
      return;
    }
    closeRecordForm();
    await refreshRecords(user.id);
  }

  async function deleteRecord(record: StudentRecord) {
    if (!user) return;
    setDeleting(true);
    const result = await deleteStudentRecord(record.id);
    setDeleting(false);
    setPendingDeleteId(null);
    if (result.error) {
      setRecordError(result.error);
      return;
    }
    if (editingId === record.id) closeRecordForm();
    await refreshRecords(user.id);
  }

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
                            className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-brand-blue hover:text-brand-blue-dark"
                          >
                            View <Icon name="arrow" className="h-3.5 w-3.5" />
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

            {/* MY RECORDS — the student's own internships, projects, awards. */}
            <section className="mt-6 card border border-surface-border bg-white p-6 sm:p-7">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-ink-900">
                  My records
                </h2>
                <p className="text-xs font-bold text-ink-400">
                  {records.length} added · {publicRecordCount} public
                </p>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-ink-500">
                What you've done outside JAVLIN — internships, projects, certifications, awards. Public records
                show on your CIRCLE profile once you've made that profile public.
              </p>

              {!formOpen && records.length > 0 && (
                <button type="button" onClick={openNewRecord} className="btn-secondary mt-4 min-h-[40px] text-sm">
                  <Icon name="plus" className="h-4 w-4" /> Add record
                </button>
              )}

              {recordError && (
                <div
                  role="alert"
                  className="mt-4 rounded-xl border border-brand-red/20 bg-brand-red-soft p-3 text-xs font-bold text-brand-red-dark"
                >
                  {recordError}
                </div>
              )}

              {formOpen && (
                <form
                  onSubmit={submitRecord}
                  className="mt-5 rounded-2xl border border-surface-border bg-surface-soft/60 p-5"
                >
                  <h3 className="text-sm font-extrabold text-ink-900">
                    {editingId ? "Edit record" : "New record"}
                  </h3>

                  <div className="mt-4 grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
                      <div>
                        <label className="field-label" htmlFor="mark-record-category">Category</label>
                        <div className="flex items-center gap-2">
                          <span className="mt-2 flex h-[46px] w-11 shrink-0 items-center justify-center rounded-xl bg-brand-blue-pale text-brand-blue-dark">
                            <Icon name={RECORD_CATEGORY_ICONS[recordForm.category]} className="h-4 w-4" />
                          </span>
                          <select
                            id="mark-record-category"
                            disabled={recordSaving}
                            value={recordForm.category}
                            onChange={(e) => setRecordForm({ ...recordForm, category: e.target.value as StudentRecordCategory })}
                            className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {STUDENT_RECORD_CATEGORIES.map((category) => (
                              <option key={category} value={category}>
                                {RECORD_CATEGORY_LABELS[category]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="field-label" htmlFor="mark-record-year">Year</label>
                        <input
                          id="mark-record-year"
                          type="number"
                          min={1990}
                          max={2200}
                          required
                          disabled={recordSaving}
                          value={recordForm.year}
                          onChange={(e) => setRecordForm({ ...recordForm, year: e.target.value })}
                          className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="field-label" htmlFor="mark-record-title">Title</label>
                      <input
                        id="mark-record-title"
                        type="text"
                        required
                        maxLength={140}
                        disabled={recordSaving}
                        value={recordForm.title}
                        onChange={(e) => setRecordForm({ ...recordForm, title: e.target.value })}
                        className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="e.g. Machine Learning Intern"
                      />
                    </div>

                    <div>
                      <label className="field-label" htmlFor="mark-record-organization">Organization</label>
                      <input
                        id="mark-record-organization"
                        type="text"
                        maxLength={140}
                        disabled={recordSaving}
                        value={recordForm.organization}
                        onChange={(e) => setRecordForm({ ...recordForm, organization: e.target.value })}
                        className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="e.g. Zoho, IIT Madras, your college team"
                      />
                    </div>

                    <div>
                      <label className="field-label" htmlFor="mark-record-description">What you did (optional)</label>
                      <textarea
                        id="mark-record-description"
                        rows={3}
                        maxLength={600}
                        disabled={recordSaving}
                        value={recordForm.description}
                        onChange={(e) => setRecordForm({ ...recordForm, description: e.target.value })}
                        className="field-input resize-y disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="One or two lines — scope, your role, the outcome."
                      />
                    </div>

                    <div>
                      <label className="field-label" htmlFor="mark-record-proof">Proof link (optional)</label>
                      <input
                        id="mark-record-proof"
                        type="url"
                        disabled={recordSaving}
                        value={recordForm.proofUrl}
                        onChange={(e) => setRecordForm({ ...recordForm, proofUrl: e.target.value })}
                        className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="https://certificate-or-post-url"
                      />
                    </div>

                    <label className="flex items-start gap-3 rounded-xl border border-surface-border bg-white p-4">
                      <input
                        type="checkbox"
                        checked={recordForm.isPublic}
                        disabled={recordSaving}
                        onChange={(e) => setRecordForm({ ...recordForm, isPublic: e.target.checked })}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-brand-blue"
                      />
                      <span>
                        <span className="block text-sm font-bold text-ink-900">Show on my profile</span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                          Public records are the only ones anyone else can read, and only when your CIRCLE
                          profile is public.
                        </span>
                      </span>
                    </label>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button type="submit" disabled={recordSaving} className="btn-primary min-h-[40px] disabled:opacity-60">
                      {recordSaving ? (
                        <>
                          <Icon name="loader" className="h-4 w-4 animate-spin" /> Saving…
                        </>
                      ) : (
                        <>
                          <Icon name="check" className="h-4 w-4" /> {editingId ? "Save changes" : "Add record"}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={closeRecordForm}
                      disabled={recordSaving}
                      className="btn-ghost min-h-[40px] disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-5">
                {records.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-surface-border bg-surface-soft/60 p-6 text-center">
                    <p className="text-sm font-bold text-ink-700">{EMPTY_RECORD_COPY}</p>
                    <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-ink-400">
                      Record an internship, a project, a certification — you choose whether each one is public.
                    </p>
                    {!formOpen && (
                      <button
                        type="button"
                        onClick={openNewRecord}
                        className="btn-secondary mt-4 inline-flex min-h-[40px] text-sm"
                      >
                        <Icon name="plus" className="h-4 w-4" /> Add your first record
                      </button>
                    )}
                  </div>
                ) : (
                  <StudentRecordList
                    records={records}
                    showPrivacyFlag
                    renderActions={(record) =>
                      pendingDeleteId === record.id ? (
                        <>
                          <span className="text-[11px] font-bold text-ink-500">Delete “{record.title}”?</span>
                          <button
                            type="button"
                            disabled={deleting}
                            onClick={() => deleteRecord(record)}
                            className="btn-secondary min-h-[34px] px-3 text-xs text-brand-red-dark disabled:opacity-60"
                          >
                            {deleting ? (
                              <>
                                <Icon name="loader" className="h-3.5 w-3.5 animate-spin" /> Deleting…
                              </>
                            ) : (
                              "Confirm delete"
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteId(null)}
                            className="btn-ghost min-h-[34px] px-3 text-xs"
                          >
                            Keep
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditRecord(record)}
                            className="btn-ghost min-h-[34px] px-3 text-xs"
                          >
                            <Icon name="pen" className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteId(record.id)}
                            className="btn-ghost min-h-[34px] px-3 text-xs text-brand-red"
                          >
                            <Icon name="trash" className="h-3.5 w-3.5" /> Delete
                          </button>
                        </>
                      )
                    }
                  />
                )}
              </div>

              <p className="mt-5 text-[11px] leading-relaxed text-ink-400">
                Records are yours to write and yours to hide. JAVLIN doesn't verify them against an issuer, so a
                record states what you said you did.
              </p>
            </section>

            <section className="mt-6">
              <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-ink-900">
                The rest of your record
              </h2>
              <p className="mt-1 text-sm text-ink-500">
                {EMPTY_RECORD_COPY} Competitions are counted for you; everything else you add under My records.
                These sections are the next record types JAVLIN will open.
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
                  <div className="flex items-center justify-between gap-2">
                    <dt className="font-semibold text-ink-500">Records you added</dt>
                    <dd className="font-extrabold text-ink-900">{records.length}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="font-semibold text-ink-500">Public on profile</dt>
                    <dd className="font-extrabold text-ink-900">{publicRecordCount}</dd>
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
