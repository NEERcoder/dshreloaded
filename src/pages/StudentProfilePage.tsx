import { useCallback, useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import Icon from "../components/Icon";
import ConnectControl from "../components/circle/ConnectControl";
import { initialsOf, yearLabel } from "../components/circle/StudentCard";
import { Link } from "../lib/router";
import { useAuth } from "../context/AuthContext";
import { getConnectionStatus, getStudentProfile, type ConnectionRef, type StudentProfileRecord } from "../lib/dataAccess";

type StudentProfilePageProps = {
  userId: string;
};

export default function StudentProfilePage({ userId }: StudentProfilePageProps) {
  const { user, loading: authLoading } = useAuth();
  const [student, setStudent] = useState<StudentProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionRef | null>(null);

  const isSelf = Boolean(user && user.id === userId);

  useEffect(() => {
    if (!user) {
      setStudent(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getStudentProfile(userId).then((result) => {
      if (cancelled) return;
      if (result.error) setError(result.error);
      setStudent(result.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user, userId]);

  // The relationship is only ever read for someone else's profile, and always
  // re-read after an action so both students see the same state.
  const reloadConnection = useCallback(() => {
    if (!user || user.id === userId) {
      setConnection(null);
      return;
    }
    getConnectionStatus(userId).then((result) => {
      setConnection(result.data);
    });
  }, [user, userId]);

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

  if (!user) {
    return (
      <PageShell title="Student profile | JAVLIN" backgroundPreset="directory">
        <div className="container-px py-16">
          <div className="mx-auto max-w-xl card border-dashed p-8 sm:p-10 text-center bg-white">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue-soft text-brand-blue">
              <Icon name="users" className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-lg font-extrabold text-ink-900">Sign in to view this profile</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
              Student profiles stay behind your JAVLIN login so nobody's college or course details get scraped
              anonymously.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/login" className="btn-primary">Sign in</Link>
              <Link href="/circle" className="btn-secondary">Back to CIRCLE</Link>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (error || !student) {
    return (
      <PageShell title="Student not on CIRCLE | JAVLIN" backgroundPreset="directory">
        <div className="container-px py-16 text-center">
          <p className="text-sm font-bold text-ink-500">{error ?? "This student isn't on CIRCLE yet."}</p>
          <Link href="/circle" className="btn-secondary mt-6 inline-flex">
            Back to CIRCLE
          </Link>
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
          <p className="eyebrow text-brand-red">CIRCLE PROFILE</p>
          <div className="mt-4 flex items-start gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-blue-soft text-xl font-extrabold text-brand-blue">
              {initialsOf(student.fullName)}
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-ink-900 leading-tight">
                {student.fullName}
              </h1>
              <p className="mt-1 text-sm font-semibold text-ink-500">
                {student.course}
                {student.yearOfStudy ? ` · ${yearLabel(student.yearOfStudy)}` : ""}
              </p>
              {isSelf && (
                <span className="mt-2 inline-block rounded-full bg-brand-red-soft px-2 py-0.5 text-[10px] font-bold text-brand-red-dark">
                  This is you
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 card p-6 bg-white shadow-card border border-surface-border">
          <h2 className="text-base font-extrabold text-ink-900">Education</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-[10px] font-black uppercase tracking-widest text-ink-400">College</dt>
              <dd className="mt-1 text-sm font-semibold text-ink-900">
                {student.collegeName || "Not listed"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-black uppercase tracking-widest text-ink-400">Course</dt>
              <dd className="mt-1 text-sm font-semibold text-ink-900">{student.course || "Not listed"}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-black uppercase tracking-widest text-ink-400">Graduation</dt>
              <dd className="mt-1 text-sm font-semibold text-ink-900">
                {student.graduationYear || "Not listed"}
              </dd>
            </div>
          </dl>
        </div>

        {isSelf ? (
          <div className="mt-6 card p-6 bg-white shadow-card border border-surface-border">
            <h2 className="text-base font-extrabold text-ink-900">Manage your profile</h2>
            <p className="mt-1 text-sm text-ink-500">
              Your CIRCLE profile is generated from your JAVLIN profile — edit it in one place and CIRCLE updates.
            </p>
            <Link href="/dashboard" className="btn-primary mt-4">
              Edit Profile
            </Link>
          </div>
        ) : (
          <div className="mt-6 card p-6 bg-white shadow-card border border-surface-border">
            <h2 className="text-base font-extrabold text-ink-900">Connection</h2>
            <div className="mt-3">
              <ConnectControl peerUserId={userId} connection={connection} onChanged={reloadConnection} />
            </div>
            <p className="mt-4 text-xs font-semibold text-ink-400">
              Interested in working together? Team up for a competition on CREW.
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
