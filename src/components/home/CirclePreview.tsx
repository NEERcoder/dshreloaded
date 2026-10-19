import { useEffect, useState } from "react";
import SectionHeader from "./SectionHeader";
import Icon from "../Icon";
import { categoryById } from "../../lib/categories";
import { Link } from "../../lib/router";
import { useAuth } from "../../context/AuthContext";
import EmptyState from "./EmptyState";
import { LevelBadge, StudentAvatar } from "../circle/StudentCard";
import {
  acceptConnectionRequest,
  cancelConnectionRequest,
  getConnectionStates,
  getStudentDirectory,
  getStudentLevels,
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
  competitions,
  onConnect,
}: {
  student: StudentProfileRecord;
  connection: ConnectionRef | undefined;
  busy: ConnectAction | null;
  competitions: number;
  onConnect: (student: StudentProfileRecord, action: ConnectAction) => void;
}) {
  const state = connection?.state ?? "none";

  return (
    <div className="homepage-profile-card glass-card relative flex min-h-[252px] flex-col items-center p-4 text-center">
      {competitions > 0 && (
        <LevelBadge competitions={competitions} className="absolute left-3 top-3" />
      )}

      <Link
        href={`/circle/${student.userId}`}
        data-cursor="view"
        aria-label={`View ${student.fullName}'s profile`}
        className="group flex w-full flex-col items-center rounded-xl pt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
      >
        <span className="avatar-ring shrink-0">
          <StudentAvatar
            src={student.avatarUrl}
            name={student.fullName}
            className="h-16 w-16 text-lg ring-2 ring-white transition-transform duration-300 group-hover:scale-[1.03] sm:h-18 sm:w-18"
          />
        </span>

        <span className="relative mt-2.5 block w-full">
          {student.isPublic && (
            <span className="absolute -top-5 right-0 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-700">
              <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-white">
                <Icon name="check" className="h-2.5 w-2.5" />
              </span>
              Verified
            </span>
          )}
          <span className="card-title block text-center text-ink-900 transition-colors group-hover:text-brand-blue">
            {student.fullName}
          </span>
        </span>
      </Link>

      <p className="mt-1.5 px-1 text-[10px] font-semibold leading-snug text-ink-500">
        {student.collegeName || "College not listed yet"}
      </p>

      <div className="mt-auto flex w-full justify-center pt-3">
        {state === "accepted" ? (
          <span className="inline-flex min-h-[44px] w-full max-w-[10rem] items-center justify-center gap-1.5 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
            <Icon name="check" className="h-3.5 w-3.5" />
            Connected
          </span>
        ) : state === "incoming_pending" ? (
          <button
            type="button"
            onClick={() => onConnect(student, "accept")}
            disabled={busy !== null}
            className="btn-primary w-full max-w-[10rem] min-h-[44px] px-3 text-[13px] sm:text-xs"
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
            className="btn-secondary w-full max-w-[10rem] min-h-[44px] px-3 text-[13px] sm:text-xs"
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
            className="btn-primary w-full max-w-[10rem] min-h-[44px] px-3 text-[13px] sm:text-xs"
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
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<{ id: string; action: ConnectAction } | null>(null);

  useEffect(() => {
    if (!user) {
      setStudents([]);
      setConnectionStates({});
      setLevels({});
      setLoading(false);
      return;
    }
    let cancelled = false;
    const currentUserId = user.id;
    setLoading(true);

    async function load() {
      const [directory, connections] = await Promise.all([getStudentDirectory(), getConnectionStates()]);
      if (cancelled) return;
      if (directory.error) setError(directory.error);
      const visible = (directory.data ?? []).filter((student) => student.userId !== currentUserId).slice(0, 10);
      setStudents(visible);
      setConnectionStates(connections.data ?? {});
      setLoading(false);

      // One batched RPC for the whole row of cards — never one per profile.
      // The carousel paints first and the level badges land a moment later.
      const levelResult = await getStudentLevels(visible.map((student) => student.userId));
      if (cancelled) return;
      setLevels(levelResult.data ?? {});
    }

    load();
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
    <section id="circle" className="band pillar-circle scroll-mt-24">
      <div className="container-px py-5 sm:py-6 lg:py-8">
        <SectionHeader
          eyebrow="CIRCLE"
          title="Find your people with common interests"
          description="A directory of students across colleges and courses — by students, for students."
          viewAllHref="/circle"
          viewAllLabel="Explore CIRCLE"
          iconSrc={categoryById("circle")?.iconSrc}
        />

        <div className="mt-4">
          {loading ? (
            <div className="homepage-carousel-window">
              <div className="homepage-carousel-track">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="homepage-profile-card glass-card flex min-h-[252px] flex-col p-4">
                  <div className="h-3 w-20 rounded skeleton-shimmer" />
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-14 w-14 shrink-0 rounded-full skeleton-shimmer" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-3.5 w-3/4 rounded skeleton-shimmer" />
                      <div className="h-3 w-full rounded skeleton-shimmer" />
                    </div>
                  </div>
                  <div className="mt-3 space-y-2 rounded-xl bg-surface-soft p-3">
                    <div className="h-3 w-full rounded skeleton-shimmer" />
                    <div className="h-3 w-2/3 rounded skeleton-shimmer" />
                  </div>
                    <div className="mt-auto h-11 w-full rounded-xl skeleton-shimmer" />
                  </div>
                ))}
              </div>
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
            <p className="text-sm font-semibold text-brand-red-ink">{error}</p>
          ) : students.length === 0 ? (
            <EmptyState
              icon="users"
              title="Your circle is still growing"
              description="No other student profiles are listed yet. Finish your own profile on the dashboard and you'll be the first name here."
              ctaLabel="Complete My Profile"
              ctaHref="/dashboard"
            />
          ) : (
            <div className="homepage-carousel-window circle-carousel">
              <div className={`homepage-carousel-track homepage-carousel-fast ${shouldLoop ? "homepage-carousel-animate" : ""}`}>
                {loopStudents.map((student, index) => (
                  <ProfileCard
                    key={`${student.userId}-${index}`}
                    student={student}
                    connection={connectionStates[student.userId]}
                    busy={busy?.id === student.userId ? busy.action : null}
                    competitions={levels[student.userId] ?? 0}
                    onConnect={handleConnect}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
