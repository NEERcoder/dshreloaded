import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import Icon from "../components/Icon";
import StudentCard, { StudentCardSkeleton, yearLabel } from "../components/circle/StudentCard";
import { Link } from "../lib/router";
import { useAuth } from "../context/AuthContext";
import {
  getConnectionStates,
  getStudentDirectory,
  getStudentLevels,
  type ConnectionRef,
  type StudentProfileRecord,
} from "../lib/dataAccess";

function distinct(values: Array<string | number>): string[] {
  return Array.from(new Set(values.map((v) => String(v).trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
}

export default function CirclePage() {
  const { user, loading: authLoading } = useAuth();

  const [students, setStudents] = useState<StudentProfileRecord[]>([]);
  const [connectionStates, setConnectionStates] = useState<Record<string, ConnectionRef>>({});
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [college, setCollege] = useState("");
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

  const collegeOptions = useMemo(() => distinct(students.map((s) => s.collegeName)), [students]);
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
      <section className="border-b border-surface-border bg-brand-blue-pale/60 backdrop-blur-[2px] pt-10 pb-8 sm:pt-14 sm:pb-10">
        <div className="container-px">
          <p className="eyebrow text-brand-red">CIRCLE</p>
          <h1 className="font-display mt-2 text-3xl sm:text-5xl font-extrabold tracking-tight text-ink-900 leading-tight">
            Find your people.
          </h1>
          <p className="mt-3 max-w-2xl text-base sm:text-lg leading-relaxed text-ink-500 font-medium">
            Discover students, interests and people building something alongside you.
          </p>
          {user && (
            <div className="mt-6 flex flex-wrap gap-3">
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

      <section className="container-px py-8 sm:py-10">
        {authLoading || loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <StudentCardSkeleton key={index} />
            ))}
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 rounded-2xl border border-brand-red/20 bg-brand-red-soft px-4 py-3 text-sm font-bold text-brand-red">
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

            <div className="card p-4 sm:p-5 bg-white shadow-card border border-surface-border">
              <div className="relative">
                <Icon name="search" className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search students by name, course or college…"
                  className="field-input pl-11"
                  aria-label="Search students"
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
                <p className="text-xs font-bold uppercase tracking-wider text-ink-400" aria-live="polite">
                  {`${filtered.length} student${filtered.length === 1 ? "" : "s"}`}
                </p>
                {filtersActive && (
                  <button
                    onClick={clearFilters}
                    className="text-xs font-extrabold uppercase tracking-wider text-brand-blue hover:underline min-h-[40px]"
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
