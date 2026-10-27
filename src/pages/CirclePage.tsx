import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import Icon from "../components/Icon";
import StudentCard, { StudentCardSkeleton, yearLabel } from "../components/circle/StudentCard";
import CircleYourProfile from "../components/circle/CircleYourProfile";
import CircleMarkAdders from "../components/circle/CircleMarkAdders";
import CircleDirectorySearch from "../components/circle/CircleDirectorySearch";
import CircleSuggestedProfiles from "../components/circle/CircleSuggestedProfiles";
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

  /** The four dropdowns live inside `CircleDirectorySearch`, which owns only
      their open/closed state; the values stay here because the college banner
      and the empty state clear them too. */
  function setFilterValue(key: "college" | "course" | "year" | "graduation", next: string) {
    if (key === "college") setCollege(next);
    else if (key === "course") setCourse(next);
    else if (key === "year") setYear(next);
    else setGraduation(next);
  }

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

  // A connect action from the rail changes the per-student state map the cards
  // read, so it is re-read from RLS rather than guessed at locally.
  async function reloadConnections() {
    const states = await getConnectionStates();
    setConnectionStates(states.data);
  }

  /**
   * The rail's people. "Suggested" is only ever *who is in the directory* —
   * nothing in the schema ranks students, so the rail keeps the directory's own
   * order rather than inventing one.
   */
  const suggestions = useMemo(
    () => students.filter((student) => student.userId !== user?.id),
    [students, user?.id]
  );

  const showProfileBand = !authLoading && Boolean(user && myProfile);

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
      {/* One band, two columns. The left holds the reader's own presence and
          their Mark column; the right holds the way into the directory. The
          right column renders whether or not anyone is signed in, because the
          search and the filters moved into it and a signed-out visitor still
          has to be able to use them. */}
      <div className="container-px pt-3 sm:pt-4">
        <h1 className="sr-only">Circle — student directory</h1>
        <div className={`circle-band${showProfileBand ? "" : " circle-band--single"}`}>
          {showProfileBand && myProfile && (
            <div className="circle-band__main">
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
              />
            </div>
          )}

          <aside className="circle-band__aside" aria-label="Find students">
            <CircleDirectorySearch
              search={search}
              onSearch={setSearch}
              values={{ college, course, year, graduation }}
              onValue={setFilterValue}
              optionSets={{
                college: collegeOptions,
                course: courseOptions,
                year: yearOptions,
                graduation: graduationOptions,
              }}
              selectCount={selectCount}
            />
            <CircleSuggestedProfiles
              people={suggestions}
              connections={connectionStates}
              onChanged={() => void reloadConnections()}
              canConnect={Boolean(user)}
            />
          </aside>
        </div>
      </div>

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

            {/* The search and the four refinements moved up into the band's
                right column, beside the rail. What is left here is only the
                readout of what they have narrowed the list to. */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-500" aria-live="polite">
                {`${filtered.length} student${filtered.length === 1 ? "" : "s"}`}
              </p>
              {filtersActive && (
                <button
                  onClick={clearFilters}
                  className="text-xs font-extrabold uppercase tracking-wider text-brand-blue hover:underline min-h-[36px]"
                >
                  Clear filters
                </button>
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
