import { useCallback, useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import Icon from "../components/Icon";
import ConnectControl from "../components/circle/ConnectControl";
import {
  LevelBadge,
  StudentAvatar,
  StudentRecordList,
  VerifiedMark,
  yearLabel,
} from "../components/circle/StudentCard";
import { Link } from "../lib/router";
import { useAuth } from "../context/AuthContext";
import {
  getConnectionStatus,
  getStudentLevel,
  getStudentProfile,
  getStudentRecords,
  instagramProfileUrl,
  type ConnectionRef,
  type StudentProfileRecord,
  type StudentRecord,
} from "../lib/dataAccess";

type StudentProfilePageProps = {
  userId: string;
};

/** Shared shell for the three honest outcomes: private, missing, failed. */
function ProfileNotice({
  icon,
  title,
  description,
  children,
}: {
  icon: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-xl card border-dashed p-8 sm:p-10 text-center bg-white">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue-soft text-brand-blue">
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-lg font-extrabold text-ink-900">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">{description}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>
    </div>
  );
}

export default function StudentProfilePage({ userId }: StudentProfilePageProps) {
  const { user, loading: authLoading } = useAuth();
  const [student, setStudent] = useState<StudentProfileRecord | null>(null);
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [competitions, setCompetitions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionRef | null>(null);

  const profileId = userId.trim().replace(/\/$/, "");
  const isSelf = Boolean(user && user.id === profileId);

  // Reads run for signed-out visitors too. RLS decides what they get: a null
  // profile means the owner has not made it public, and records come back
  // public-only. Nothing here filters private data on the client.
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRecordsError(null);
    setStudent(null);
    setRecords([]);
    setCompetitions(0);

    if (!profileId) {
      setLoading(false);
      return;
    }

    async function load() {
      const profileResult = await getStudentProfile(profileId);
      if (cancelled) return;
      if (profileResult.error) {
        setError(profileResult.error);
        setLoading(false);
        return;
      }

      const found = profileResult.data;
      if (!found && !profileResult.configured) {
        // No database connection at all — not the same as "the owner kept this
        // profile private", so don't claim that.
        setError("Student profiles aren't connected to the database yet.");
        setLoading(false);
        return;
      }
      setStudent(found);
      setLoading(false);
      if (!found) return;

      // Records and level fill in once the profile itself is on screen.
      const [recordsResult, levelResult] = await Promise.all([
        getStudentRecords(profileId),
        getStudentLevel(profileId),
      ]);
      if (cancelled) return;
      setRecords(recordsResult.data ?? []);
      if (recordsResult.error) setRecordsError(recordsResult.error);
      setCompetitions(levelResult.data ?? 0);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [profileId, authLoading, user]);

  // The relationship is only ever read for someone else's profile, and always
  // re-read after an action so both students see the same state.
  const reloadConnection = useCallback(() => {
    if (!user || user.id === profileId) {
      setConnection(null);
      return;
    }
    getConnectionStatus(profileId).then((result) => {
      setConnection(result.data);
    });
  }, [user, profileId]);

  useEffect(() => {
    reloadConnection();
  }, [reloadConnection]);

  if (authLoading || loading) {
    return (
      <PageShell title="Student profile | JAVLIN" backgroundPreset="directory">
        <div className="container-px py-24 text-center text-sm font-semibold text-ink-500 animate-pulse">
          Loading profile…
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell title="Student profile | JAVLIN" backgroundPreset="directory">
        <div className="container-px py-16">
          <ProfileNotice
            icon="alert-triangle"
            title="We couldn't load this profile"
            description={error}
          >
            <Link href="/circle" className="btn-secondary">
              Back to CIRCLE
            </Link>
          </ProfileNotice>
        </div>
      </PageShell>
    );
  }

  if (!student) {
    return (
      <PageShell
        title={isSelf ? "Your CIRCLE profile | JAVLIN" : "Private profile | JAVLIN"}
        backgroundPreset="directory"
      >
        <div className="container-px py-16">
          {isSelf ? (
            <ProfileNotice
              icon="user"
              title="Your profile isn't on CIRCLE yet"
              description="CIRCLE profiles are generated from your JAVLIN profile. Add your details and you'll appear in the directory straight away."
            >
              <Link href="/dashboard" className="btn-primary">
                Complete My Profile
              </Link>
            </ProfileNotice>
          ) : !profileId ? (
            <ProfileNotice
              icon="search"
              title="No profile at this address"
              description="This link doesn't point at a student profile. Browse CIRCLE to find the right person."
            >
              <Link href="/circle" className="btn-secondary">
                Back to CIRCLE
              </Link>
            </ProfileNotice>
          ) : (
            <ProfileNotice
              icon="user"
              title="This profile is private"
              description="This student hasn't opened their profile to visitors. Only signed-in JAVLIN students can see it — and it stays invisible until they turn on Public profile in their dashboard."
            >
              {!user && (
                <Link href="/login" className="btn-primary">
                  Sign in
                </Link>
              )}
              <Link href="/circle" className="btn-secondary">
                Back to CIRCLE
              </Link>
            </ProfileNotice>
          )}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={`${student.fullName} | JAVLIN CIRCLE`}
      description={`${student.fullName}, ${student.course} at ${student.collegeName || "JAVLIN"}`}
      backgroundPreset="directory"
    >
      <div className="container-px py-10 sm:py-14 max-w-2xl mx-auto">
        <Link
          href="/circle"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-blue hover:text-brand-blue-dark"
        >
          <Icon name="arrow-left" className="h-4 w-4" /> Back to CIRCLE
        </Link>

        <div className="mt-6 animate-fade-up">
          <p className="eyebrow">CIRCLE PROFILE</p>
          <div className="mt-4 flex items-start gap-4">
            <StudentAvatar
              src={student.avatarUrl}
              name={student.fullName}
              className="h-16 w-16 text-xl ring-2 ring-white"
            />
            <div className="min-w-0">
              <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-ink-900 leading-tight">
                {student.fullName}
              </h1>
              <p className="mt-1 text-sm font-semibold text-ink-500">
                {student.course}
                {student.yearOfStudy ? ` · ${yearLabel(student.yearOfStudy)}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <LevelBadge competitions={competitions} />
                {student.isPublic && <VerifiedMark />}
                {isSelf && (
                  <span className="rounded-full bg-brand-red-soft px-2 py-0.5 text-[11px] font-bold text-brand-red-ink">
                    This is you
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 card p-6 bg-white shadow-card border border-surface-border">
          <h2 className="text-base font-extrabold text-ink-900">Education</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-[11px] font-black uppercase tracking-widest text-ink-500">College</dt>
              <dd className="mt-1 text-sm font-semibold text-ink-900">
                {student.collegeName || "Not listed"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-black uppercase tracking-widest text-ink-500">Course</dt>
              <dd className="mt-1 text-sm font-semibold text-ink-900">{student.course || "Not listed"}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-black uppercase tracking-widest text-ink-500">Graduation</dt>
              <dd className="mt-1 text-sm font-semibold text-ink-900">
                {student.graduationYear || "Not listed"}
              </dd>
            </div>
          </dl>

          {student.instagramHandle && (
            <div className="mt-5 flex items-center gap-2 border-t border-surface-border pt-4">
              <span className="icon-well h-8 w-8">
                <Icon name="instagram" className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-widest text-ink-500">Instagram</p>
                <a
                  href={instagramProfileUrl(student.instagramHandle) ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
                >
                  @{student.instagramHandle}
                </a>
              </div>
            </div>
          )}
        </div>

        {/* MARK — RLS already limits this to public records of a public profile. */}
        <section className="mt-6 card p-6 bg-white shadow-card border border-surface-border">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-extrabold text-ink-900">MARK record</h2>
            <p className="text-xs font-bold text-ink-500">{records.length} listed</p>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-ink-500">
            Internships, projects, fellowships and achievements this student has chosen to record.
          </p>

          {recordsError ? (
            <p role="alert" className="mt-4 text-xs font-bold text-brand-red-ink">
              We couldn't load these records. {recordsError}
            </p>
          ) : records.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-surface-border bg-surface-soft/60 p-5 text-center text-xs font-semibold text-ink-500">
              {isSelf
                ? "Nothing recorded yet — add your first internship, project or award in MARK."
                : "No public records yet."}
            </p>
          ) : (
            <div className="mt-5">
              <StudentRecordList records={records} showPrivacyFlag={isSelf} />
            </div>
          )}
        </section>

        {isSelf ? (
          <div className="mt-6 card p-6 bg-white shadow-card border border-surface-border">
            <h2 className="text-base font-extrabold text-ink-900">Manage your profile</h2>
            <p className="mt-1 text-sm text-ink-500">
              Your CIRCLE profile is generated from your JAVLIN profile — edit it in one place and CIRCLE updates.
              Records you mark as public show up above.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/dashboard" className="btn-primary">
                Edit Profile
              </Link>
              <Link href="/mark" className="btn-secondary">
                Add MARK records
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 card p-6 bg-white shadow-card border border-surface-border">
            <h2 className="text-base font-extrabold text-ink-900">Connection</h2>
            <div className="mt-3">
              {user ? (
                <ConnectControl peerUserId={profileId} connection={connection} onChanged={reloadConnection} />
              ) : (
                <p className="text-sm leading-relaxed text-ink-500">
                  Connections are student-to-student. Sign in to ask this student to connect.
                </p>
              )}
            </div>
            <p className="mt-4 text-xs font-semibold text-ink-500">
              Interested in working together? Team up for a competition on CREW.
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
