import { useEffect, useMemo, useRef, useState } from "react";
import PageShell from "../components/PageShell";
import Icon from "../components/Icon";
import StudentCard, { StudentCardSkeleton, yearLabel } from "../components/circle/StudentCard";
import CircleYourProfile from "../components/circle/CircleYourProfile";
import CircleMarkAdders from "../components/circle/CircleMarkAdders";
import { Link, useLocation } from "../lib/router";
import { useAuth } from "../context/AuthContext";
import {
  getConnectionStates,
  getConnectionSummary,
  getColleges,
  getCurrentUserProfile,
  getStudentDirectory,
  getStudentExperience,
  getStudentLevel,
  getStudentLevels,
  getStudentRecords,
  getStudentSkills,
  createStudentExperience,
  createStudentRecord,
  createStudentSkill,
  deleteStudentExperience,
  deleteStudentRecord,
  deleteStudentSkill,
  setProfileVisibility,
  type ConnectionRef,
  type ProfileRecord,
  type StudentExperience,
  type StudentProfileRecord,
  type StudentRecord,
  type StudentRecordCategory,
  type StudentSkill,
} from "../lib/dataAccess";

function distinct(values: Array<string | number>): string[] {
  return Array.from(new Set(values.map((v) => String(v).trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
}

export default function CirclePage() {
  const { user, loading: authLoading } = useAuth();
  const { search: queryString, navigate } = useLocation();

  /**
   * A college page links here with ?college=<name> so "the people from this
   * college" reuses this directory instead of duplicating it. The directory
   * filters on the college name it already stores, so the param is a name.
   */
  const collegeFromUrl = useMemo(() => {
    const raw = new URLSearchParams(queryString).get("college");
    return raw ? raw.trim() : "";
  }, [queryString]);

  const [students, setStudents] = useState<StudentProfileRecord[]>([]);
  const [connectionStates, setConnectionStates] = useState<Record<string, ConnectionRef>>({});
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [college, setCollege] = useState(collegeFromUrl);
  const [course, setCourse] = useState("");
  const [year, setYear] = useState("");
  const [graduation, setGraduation] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterWrapRef = useRef<HTMLDivElement>(null);

  // Same disclosure rules the account menu follows: click away or press Escape
  // and the panel closes, because a panel that only closes on its own button
  // traps a keyboard user behind it.
  useEffect(() => {
    if (!filtersOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (filterWrapRef.current && !filterWrapRef.current.contains(event.target as Node)) setFiltersOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFiltersOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [filtersOpen]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      // Public directory is available to signed-out visitors.
      // Connection states are only requested when a viewer is authenticated.
      const directory = await getStudentDirectory();
      if (cancelled) return;

      if (directory.error) setError(directory.error);
      setStudents(directory.data);

      if (user) {
        const connections = await getConnectionStates();
        if (cancelled) return;
        if (connections.error) setError(connections.error);
        setConnectionStates(connections.data);
      } else {
        setConnectionStates({});
      }

      setLoading(false);

      const levelResult = await getStudentLevels(
        directory.data.map((student) => student.userId)
      );
      if (cancelled) return;
      setLevels(levelResult.data ?? {});
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Arriving from a college page after mount (or clicking Back onto a new
  // ?college=) must move the filter, not just the first render.
  useEffect(() => {
    setCollege(collegeFromUrl);
  }, [collegeFromUrl]);

  // The signed-in reader's own presence. Read separately from the directory so
  // a slow profile round trip cannot hold up the list of people, and so a
  // visitor who is not signed in never fires these four queries at all.
  const [myProfile, setMyProfile] = useState<ProfileRecord | null>(null);
  const [myCollegeName, setMyCollegeName] = useState<string | null>(null);
  const [myConnections, setMyConnections] = useState(0);
  const [myCompetitions, setMyCompetitions] = useState(0);
  const [myRecords, setMyRecords] = useState<StudentRecord[]>([]);
  const [mySkills, setMySkills] = useState<StudentSkill[]>([]);
  const [myExperience, setMyExperience] = useState<StudentExperience[]>([]);

  useEffect(() => {
    if (!user) {
      setMyProfile(null);
      setMyCollegeName(null);
      setMyConnections(0);
      setMyCompetitions(0);
      setMyRecords([]);
      setMySkills([]);
      setMyExperience([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const profile = (await getCurrentUserProfile()).data;
      if (cancelled) return;
      setMyProfile(profile);
      const [records, summary, level, skills, experience, colleges] = await Promise.all([
        getStudentRecords(user.id),
        getConnectionSummary(),
        getStudentLevel(user.id),
        getStudentSkills(user.id),
        getStudentExperience(user.id),
        profile?.collegeId ? getColleges() : Promise.resolve(null),
      ]);
      if (cancelled) return;
      setMyRecords(records.data ?? []);
      setMyConnections(summary.data?.connections ?? 0);
      setMyCompetitions(level.data ?? 0);
      setMySkills(skills.data ?? []);
      setMyExperience(experience.data ?? []);
      if (colleges && profile?.collegeId) {
        setMyCollegeName(colleges.data.find((entry) => entry.id === profile.collegeId)?.name ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const markSummary = useMemo(() => {
    const counts = new Map<StudentRecordCategory, number>();
    for (const record of myRecords) counts.set(record.category, (counts.get(record.category) ?? 0) + 1);
    return {
      competitions: myCompetitions,
      records: [...counts.entries()].map(([category, count]) => ({ category, count })),
    };
  }, [myRecords, myCompetitions]);

  async function changeVisibility(next: boolean) {
    const result = await setProfileVisibility(next);
    if (result.error) throw new Error(result.error);
    setMyProfile((current) => (current ? { ...current, isPublic: next } : current));
  }

  /**
   * The Mark column writes the same way: the row is re-read rather than
   * stitched in, so `position`, the owner-only visibility flag and the
   * achievements that share `student_records` with everything else all come
   * back exactly as RLS sees them. Each handler answers with the error string
   * the row should show, or null when it worked.
   */
  async function reloadMark() {
    if (!user) return;
    const [records, skills, experience] = await Promise.all([
      getStudentRecords(user.id),
      getStudentSkills(user.id),
      getStudentExperience(user.id),
    ]);
    setMyRecords(records.data ?? []);
    setMySkills(skills.data ?? []);
    setMyExperience(experience.data ?? []);
  }

  async function addSkill(name: string) {
    const result = await createStudentSkill({ name, isPublic: true });
    if (result.error) return result.error;
    await reloadMark();
    return null;
  }

  async function removeSkill(id: string) {
    const result = await deleteStudentSkill(id);
    if (result.error) return result.error;
    await reloadMark();
    return null;
  }

  async function addExperience(input: { role: string; organization: string; period: string }) {
    const result = await createStudentExperience({ ...input, isPublic: true });
    if (result.error) return result.error;
    await reloadMark();
    return null;
  }

  async function removeExperience(id: string) {
    const result = await deleteStudentExperience(id);
    if (result.error) return result.error;
    await reloadMark();
    return null;
  }

  async function addAchievement(input: { title: string; organization: string; year: string }) {
    const result = await createStudentRecord({
      category: "achievement",
      title: input.title,
      organization: input.organization,
      description: "",
      year: Number(input.year),
      proofUrl: "",
      isPublic: true,
    });
    if (result.error) return result.error;
    await reloadMark();
    return null;
  }

  async function removeAchievement(id: string) {
    const result = await deleteStudentRecord(id);
    if (result.error) return result.error;
    await reloadMark();
    return null;
  }

  const achievements = useMemo(
    () =>
      myRecords
        .filter((record) => record.category === "achievement")
        .map((record) => ({ id: record.id, title: record.title, year: record.year })),
    [myRecords]
  );

  // The linked college may not appear in the list until its students load, so
  // keep the active value selectable.
  const collegeOptions = useMemo(() => {
    const options = distinct(students.map((s) => s.collegeName));
    return college && !options.includes(college) ? [...options, college].sort((a, b) => a.localeCompare(b)) : options;
  }, [college, students]);
  const courseOptions = useMemo(() => distinct(students.map((s) => s.course)), [students]);
  const yearOptions = useMemo(
    () => distinct(students.map((s) => s.yearOfStudy)).filter((v) => v !== "0"),
    [students]
  );
  const graduationOptions = useMemo(
    () => distinct(students.map((s) => s.graduationYear)).filter((v) => v !== "0"),
    [students]
  );

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return students.filter((student) => {
      if (college && student.collegeName !== college) return false;
      if (course && student.course !== course) return false;
      if (year && String(student.yearOfStudy) !== year) return false;
      if (graduation && String(student.graduationYear) !== graduation) return false;
      if (query) {
        const haystack = [
          student.fullName,
          student.course,
          student.collegeName,
          yearLabel(student.yearOfStudy),
          String(student.graduationYear),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [students, search, college, course, year, graduation]);

  const filtersActive = Boolean(search || college || course || year || graduation);
  // The badge on the Filters button: how many of the four dropdowns are
  // narrowing the list right now, so a filtered directory never looks plain.
  const selectCount = [college, course, year, graduation].filter(Boolean).length;
  const meOnDirectory = user ? students.some((s) => s.userId === user.id) : false;

  function clearFilters() {
    setSearch("");
    setCollege("");
    setCourse("");
    setYear("");
    setGraduation("");
  }

  return (
    <PageShell
      title="CIRCLE — Student Directory | JAVLIN"
      description="Discover students, interests and people building something alongside you."
      backgroundPreset="directory"
    >
      <section className="container-px pt-3 sm:pt-4">
        <h1 className="sr-only">Circle — student directory</h1>
        <div className="flex flex-wrap items-center gap-2">
          {user && (
            <Link href="/dashboard" className="btn-outline-blue flex-none">
              Edit My Profile
            </Link>
          )}
          {/* The search moved up here, to the first thing a returning student
              reaches for. "My Connections" left with it — that page is still
              linked from the dashboard and from notifications. */}
          <div className="relative min-w-[220px] flex-1">
            <label className="sr-only" htmlFor="circle-search">
              Search students
            </label>
            <Icon
              name="search"
              className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400"
            />
            <input
              id="circle-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search students by name, course or college…"
              className="field-input pl-11"
            />
          </div>
        </div>
      </section>

      {/* The reader's own two zones — presence and the Mark column — sit above
          the directory rather than on a separate page, so CIRCLE reads as one
          place to see where you stand. */}
      {!authLoading && user && myProfile && (
        <div className="container-px pt-3">
          <CircleYourProfile
            profile={myProfile}
            collegeName={myCollegeName}
            connections={myConnections}
            mark={markSummary}
            adders={
              <CircleMarkAdders
                skills={mySkills}
                experience={myExperience}
                achievements={achievements}
                onAddSkill={addSkill}
                onRemoveSkill={removeSkill}
                onAddExperience={addExperience}
                onRemoveExperience={removeExperience}
                onAddAchievement={addAchievement}
                onRemoveAchievement={removeAchievement}
              />
            }
            onVisibilityChange={changeVisibility}
          />
        </div>
      )}

      <section className="container-px py-6 sm:py-8">
        {authLoading || loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <StudentCardSkeleton key={index} />
            ))}
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 rounded-2xl border border-brand-red/20 bg-brand-red-soft px-4 py-3 text-sm font-bold text-brand-red-ink">
                We couldn't load the directory. {error}
              </div>
            )}

            {!error && students.length > 0 && !meOnDirectory && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-blue/15 bg-brand-blue-soft px-4 py-3">
                <p className="text-sm font-semibold text-brand-blue">
                  Your profile isn't listed in CIRCLE yet. Add your details so others can find you.
                </p>
                <Link href="/dashboard" className="btn-outline-blue text-xs">
                  Complete My Profile
                </Link>
              </div>
            )}

            {college && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-blue/20 bg-brand-blue-soft px-4 py-3">
                <p className="min-w-0 text-sm font-extrabold text-brand-blue">
                  Students from {college}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCollege("");
                    navigate("/circle", { replace: true });
                  }}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-brand-blue/30 bg-white px-3 py-1.5 text-xs font-extrabold text-brand-blue transition-colors hover:bg-brand-blue hover:text-white sm:min-h-0"
                >
                  <Icon name="close" className="h-3.5 w-3.5" />
                  Clear college filter
                </button>
              </div>
            )}

            {/* Four dropdowns in a row dominated this page for what they are:
                four optional refinements. They now live behind one small button
                that carries how many of them are actually set, so a filtered
                directory never looks unfiltered. */}
            <div ref={filterWrapRef} className="relative flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-500" aria-live="polite">
                {`${filtered.length} student${filtered.length === 1 ? "" : "s"}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFiltersOpen((value) => !value)}
                  aria-haspopup="true"
                  aria-expanded={filtersOpen}
                  className="chip-toggle min-h-[36px] px-3 py-1.5 text-[11px]"
                >
                  <Icon name="filter" className="h-3.5 w-3.5" />
                  Filters
                  {selectCount > 0 && (
                    <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand-blue px-1 text-[10px] font-black text-white">
                      {selectCount}
                    </span>
                  )}
                </button>
                {filtersActive && (
                  <button
                    onClick={clearFilters}
                    className="text-xs font-extrabold uppercase tracking-wider text-brand-blue hover:underline min-h-[36px]"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {filtersOpen && (
                <div
                  role="group"
                  aria-label="Filter students"
                  className="card absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 bg-white p-3 shadow-lift sm:left-auto sm:right-0 sm:w-[min(28rem,90vw)] sm:p-4"
                >
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500">College</span>
                      <select value={college} onChange={(event) => setCollege(event.target.value)} className="filter-select mt-1 w-full text-xs">
                        <option value="">All Colleges</option>
                        {collegeOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500">Course</span>
                      <select value={course} onChange={(event) => setCourse(event.target.value)} className="filter-select mt-1 w-full text-xs">
                        <option value="">All Courses</option>
                        {courseOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500">Year of study</span>
                      <select value={year} onChange={(event) => setYear(event.target.value)} className="filter-select mt-1 w-full text-xs">
                        <option value="">All Years</option>
                        {yearOptions.map((option) => (
                          <option key={option} value={option}>{yearLabel(Number(option))}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500">Graduation year</span>
                      <select value={graduation} onChange={(event) => setGraduation(event.target.value)} className="filter-select mt-1 w-full text-xs">
                        <option value="">Any Graduation Year</option>
                        {graduationOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8">
              {students.length === 0 ? (
                <div className="w-full rounded-2xl border-2 border-dashed border-surface-border bg-white/80 px-6 py-10 sm:py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue-soft text-brand-blue">
                    <Icon name="users" className="h-6 w-6" />
                  </div>
                  <h2 className="mt-4 text-base font-extrabold text-ink-900">Your circle is still growing</h2>
                  <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-ink-500">
                    No student profiles are listed yet. Finish your own profile on the dashboard and you'll be the
                    first name here.
                  </p>
                  <Link href="/dashboard" className="btn-outline-blue mt-5">
                    Complete My Profile
                  </Link>
                </div>
              ) : filtered.length === 0 ? (
                <div className="w-full rounded-2xl border-2 border-dashed border-surface-border bg-white/80 px-6 py-10 sm:py-12 text-center">
                  <h2 className="text-base font-extrabold text-ink-900">No students match your search</h2>
                  <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-ink-500">
                    Try another college, course or year.
                  </p>
                  <button onClick={clearFilters} className="btn-outline-blue mt-5">
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filtered.map((student) => (
                    <StudentCard
                      key={student.userId}
                      student={student}
                      isSelf={student.userId === user?.id}
                      connectionState={
                        user && student.userId !== user.id
                          ? connectionStates[student.userId]?.state
                          : undefined
                      }
                      competitions={levels[student.userId] ?? 0}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </PageShell>
  );
}
