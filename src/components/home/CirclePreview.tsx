import { useEffect, useState } from "react";
import SectionHeader from "./SectionHeader";
import Icon from "../Icon";
import { categoryById } from "../../lib/categories";
import { Link } from "../../lib/router";
import { useAuth } from "../../context/AuthContext";
import EmptyState from "./EmptyState";
import { initialsOf, yearLabel } from "../circle/StudentCard";
import {
  acceptConnectionRequest,
  cancelConnectionRequest,
  getConnectionStates,
  getStudentDirectory,
  sendConnectionRequest,
  type ConnectionRef,
  type StudentProfileRecord,
} from "../../lib/dataAccess";

type ConnectAction = "send" | "accept" | "cancel";

/** Compact CIRCLE card: the directory fields the schema actually carries. */
function ProfileCard({
  student,
  connection,
  busy,
  onConnect,
}: {
  student: StudentProfileRecord;
  connection: ConnectionRef | undefined;
  busy: ConnectAction | null;
  onConnect: (student: StudentProfileRecord, action: ConnectAction) => void;
}) {
  const state = connection?.state ?? "none";

  return (
    <div className="homepage-profile-card glass-card flex flex-col items-center p-5 text-center">
      <Link
        href={`/circle/${student.userId}`}
        data-cursor="view"
        aria-label={`View ${student.fullName}'s profile`}
        className="group flex flex-col items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue rounded-full"
      >
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-blue-soft text-xl font-extrabold text-brand-blue ring-2 ring-white transition-transform duration-300 group-hover:scale-[1.03]">
          {initialsOf(student.fullName)}
        </span>
        <h3 className="mt-3 line-clamp-2 text-sm font-extrabold leading-snug text-ink-900 transition-colors group-hover:text-brand-blue">
          {student.fullName}
        </h3>
      </Link>
      <p className="mt-1 line-clamp-2 text-xs font-semibold text-ink-600">{student.collegeName || "College not listed yet"}</p>
      {student.course && (
        <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-ink-500">{student.course}</p>
      )}
      <p className="mt-0.5 text-[11px] font-semibold text-ink-400">
        {student.yearOfStudy ? yearLabel(student.yearOfStudy) : "Year not listed"}
      </p>

      <div className="mt-4 w-full">
        {state === "accepted" ? (
          <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
            <Icon name="check" className="h-3.5 w-3.5" />
            Connected
          </span>
        ) : state === "incoming_pending" ? (
          <button
            type="button"
            onClick={() => onConnect(student, "accept")}
            disabled={busy !== null}
            className="btn-primary w-full min-h-[38px] px-3 text-xs"
          >
            {busy === "accept" ? (
              <>
                <Icon name="loader" className="h-3.5 w-3.5 animate-spin" /> Accepting…
              </>
            ) : (
              <>
                <Icon name="check" className="h-3.5 w-3.5" /> Accept
              </>
            )}
          </button>
        ) : state === "outgoing_pending" ? (
          <button
            type="button"
            onClick={() => onConnect(student, "cancel")}
            disabled={busy !== null}
            className="btn-secondary w-full min-h-[38px] px-3 text-xs"
          >
            {busy === "cancel" ? (
              <>
                <Icon name="loader" className="h-3.5 w-3.5 animate-spin" /> Cancelling…
              </>
            ) : (
              <>
                <Icon name="clock" className="h-3.5 w-3.5" /> Requested
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onConnect(student, "send")}
            disabled={busy !== null}
            className="btn-primary w-full min-h-[38px] px-3 text-xs"
          >
            {busy === "send" ? (
              <>
                <Icon name="loader" className="h-3.5 w-3.5 animate-spin" /> Sending…
              </>
            ) : (
              <>
                <Icon name="users" className="h-3.5 w-3.5" /> Connect
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function CirclePreview() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentProfileRecord[]>([]);
  const [connectionStates, setConnectionStates] = useState<Record<string, ConnectionRef>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<{ id: string; action: ConnectAction } | null>(null);

  useEffect(() => {
    if (!user) {
      setStudents([]);
      setConnectionStates({});
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([getStudentDirectory(), getConnectionStates()]).then(([directory, connections]) => {
      if (cancelled) return;
      if (directory.error) setError(directory.error);
      setStudents((directory.data ?? []).filter((student) => student.userId !== user.id).slice(0, 10));
      setConnectionStates(connections.data ?? {});
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleConnect(student: StudentProfileRecord, action: ConnectAction) {
    setBusy({ id: student.userId, action });
    if (action === "send") {
      await sendConnectionRequest(student.userId);
    } else if (action === "cancel") {
      const id = connectionStates[student.userId]?.connectionId;
      if (id) await cancelConnectionRequest(id);
    } else {
      const id = connectionStates[student.userId]?.connectionId;
      if (id) await acceptConnectionRequest(id);
    }
    const states = await getConnectionStates();
    setConnectionStates(states.data ?? {});
    setBusy(null);
  }

  const shouldLoop = students.length > 1;
  const loopStudents = shouldLoop ? [...students, ...students] : students;

  return (
    <section id="circle" className="scroll-mt-24 border-t glass-panel">
      <div className="container-px py-10 sm:py-14">
        <SectionHeader
          eyebrow="CIRCLE"
          title="Find your people with common interests"
          description="A directory of students across colleges and courses — by students, for students."
          viewAllHref="/circle"
          viewAllLabel="Explore CIRCLE"
          iconSrc={categoryById("circle")?.iconSrc}
        />

        <div className="mt-6">
          {loading ? (
            <div className="flex gap-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="homepage-profile-card glass-card p-5">
                  <div className="mx-auto h-20 w-20 rounded-full skeleton-shimmer" />
                  <div className="mx-auto mt-3 h-3 w-24 rounded skeleton-shimmer" />
                  <div className="mx-auto mt-2 h-3 w-16 rounded skeleton-shimmer" />
                </div>
              ))}
            </div>
          ) : !user ? (
            <EmptyState
              icon="users"
              title="The student directory is live"
              description="CIRCLE lists real JAVLIN students — names, colleges and courses — so it stays behind your sign-in. Create your profile to appear, then browse your people."
              ctaLabel="Sign in to browse"
              ctaHref="/login"
            />
          ) : error ? (
            <p className="text-sm font-semibold text-brand-red">{error}</p>
          ) : students.length === 0 ? (
            <EmptyState
              icon="users"
              title="Your circle is still growing"
              description="No other student profiles are listed yet. Finish your own profile on the dashboard and you'll be the first name here."
              ctaLabel="Complete My Profile"
              ctaHref="/dashboard"
            />
          ) : (
            <>
              <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 xl:hidden">
                {students.map((student) => (
                  <ProfileCard
                    key={student.userId}
                    student={student}
                    connection={connectionStates[student.userId]}
                    busy={busy?.id === student.userId ? busy.action : null}
                    onConnect={handleConnect}
                  />
                ))}
              </div>

              <div className="homepage-carousel-window hidden xl:block">
                <div className={`homepage-carousel-track homepage-carousel-fast ${shouldLoop ? "homepage-carousel-animate" : ""}`}>
                  {loopStudents.map((student, index) => (
                    <ProfileCard
                      key={`${student.userId}-${index}`}
                      student={student}
                      connection={connectionStates[student.userId]}
                      busy={busy?.id === student.userId ? busy.action : null}
                      onConnect={handleConnect}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
