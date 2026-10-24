import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import Icon from "../components/Icon";
import StudentCard, { StudentCardSkeleton, yearLabel } from "../components/circle/StudentCard";
import CircleYourProfile from "../components/circle/CircleYourProfile";
import CircleSuggestedProfiles from "../components/circle/CircleSuggestedProfiles";
import { Link, useLocation } from "../lib/router";
import { useAuth } from "../context/AuthContext";
import {
  getConnectionStates,
  getConnectionSummary,
  getColleges,
  getCurrentUserProfile,
  getStudentDirectory,
  getStudentLevel,
  getStudentLevels,
  getStudentRecords,
  setProfileVisibility,
  type ConnectionRef,
  type ProfileRecord,
  type StudentProfileRecord,
  type StudentRecord,
  type StudentRecordCategory,
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

  useEffect(() => {
    if (!user) {
      setMyProfile(null);
      setMyCollegeName(null);
      setMyConnections(0);
      setMyCompetitions(0);
      setMyRecords([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const profile = (await getCurrentUserProfile()).data;
      if (cancelled) return;
      setMyProfile(profile);
      const [records, summary, level, colleges] = await Promise.all([
        getStudentRecords(user.id),
        getConnectionSummary(),
        getStudentLevel(user.id),
        profile?.collegeId ? getColleges() : Promise.resolve(null),
      ]);
      if (cancelled) return;
      setMyRecords(records.data ?? []);
      setMyConnections(summary.data?.connections ?? 0);
      setMyCompetitions(level.data ?? 0);
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

  const suggestions = useMemo(
    () => students.filter((student) => student.userId !== user?.id),
    [students, user?.id]
  );

  async function changeVisibility(next: boolean) {
    const result = await setProfileVisibility(next);
    if (result.error) throw new Error(result.error);
    setMyProfile((current) => (current ? { ...current, isPublic: next } : current));
  }

  // A connection action changes two reads at once — the per-student state map
  // the cards show and the summary the presence card counts — so both are
  // re-read from RLS rather than guessed at locally.
  async function reloadConnections() {
    const [states, summary] = await Promise.all([getConnectionStates(), getConnectionSummary()]);
    setConnectionStates(states.data);
    setMyConnections(summary.data?.connections ?? 0);
  }

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
        <div>
          {user && (
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard" className="btn-outline-blue">
                Edit My Profile
              </Link>
              <Link href="/circle/connections" className="btn-secondary">
                My Connections
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* The reader's own two zones — presence and suggestions — sit above the
          directory rather than on a separate page, so CIRCLE reads as one place
          to see where you stand and who is next to you. */}
      {!authLoading && user && myProfile && (
        <div className="container-px pt-3">
          <CircleYourProfile
            profile={myProfile}
            collegeName={myCollegeName}
            connections={myConnections}
            mark={markSummary}
            onVisibilityChange={changeVisibility}
          />
          {!loading && suggestions.length > 0 && (
            <div className="mt-4">
              <CircleSuggestedProfiles
                people={suggestions}
                connections={connectionStates}
                onChanged={() => void reloadConnections()}
              />
            </div>
          )}
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

            <div className="card p-4 sm:p-5 bg-white shadow-card border border-surface-border">
              <div className="relative">
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
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block">
                  <span className="sr-only">Filter by college</span>
                  <select value={college} onChange={(event) => setCollege(event.target.value)} className="filter-select w-full text-xs">
                    <option value="">All Colleges</option>
                    {collegeOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="sr-only">Filter by course</span>
                  <select value={course} onChange={(event) => setCourse(event.target.value)} className="filter-select w-full text-xs">
                    <option value="">All Courses</option>
                    {courseOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="sr-only">Filter by year of study</span>
                  <select value={year} onChange={(event) => setYear(event.target.value)} className="filter-select w-full text-xs">
                    <option value="">All Years</option>
                    {yearOptions.map((option) => (
                      <option key={option} value={option}>{yearLabel(Number(option))}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="sr-only">Filter by graduation year</span>
                  <select value={graduation} onChange={(event) => setGraduation(event.target.value)} className="filter-select w-full text-xs">
                    <option value="">Any Graduation Year</option>
                    {graduationOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-500" aria-live="polite">
                  {`${filtered.length} student${filtered.length === 1 ? "" : "s"}`}
                </p>
                {filtersActive && (
                  <button
                    onClick={clearFilters}
                    className="text-xs font-extrabold uppercase tracking-wider text-brand-blue hover:underline min-h-[44px]"
                  >
                    Clear filters
                  </button>
                )}
              </div>
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
