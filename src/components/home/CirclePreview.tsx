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
    <div className="homepage-profile-card glass-card flex min-h-[252px] flex-col p-4 text-left">
      <div className="flex min-h-[22px] items-center justify-between gap-2">
        {student.isPublic ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-ink-600">
            <img
              src="/brand/javlin-favicon.png"
              alt=""
              width={14}
              height={14}
              draggable={false}
              className="h-3.5 w-3.5 rounded-full object-cover"
            />
            J verified
            <Icon name="check" className="h-3.5 w-3.5 text-emerald-600" />
          </span>
        ) : (
          <span />
        )}
        {competitions > 0 && <LevelBadge competitions={competitions} />}
      </div>

      <Link
        href={`/circle/${student.userId}`}
        data-cursor="view"
        aria-label={`View ${student.fullName}'s profile`}
        className="group mt-2 flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
      >
        <span className="avatar-ring shrink-0">
          <StudentAvatar
            src={student.avatarUrl}
            name={student.fullName}
            className="h-12 w-12 text-base ring-2 ring-white transition-transform duration-300 group-hover:scale-[1.03] sm:h-14 sm:w-14"
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="card-title block truncate text-ink-900 transition-colors group-hover:text-brand-blue">
            {student.fullName}
          </span>
          {student.headline ? (
            <span className="mt-0.5 block line-clamp-2 text-xs font-medium leading-snug text-ink-700">
              {student.headline}
            </span>
          ) : (
            <span className="block min-h-[2rem]" aria-hidden="true" />
          )}
        </span>
      </Link>

      <div className="mt-3 rounded-xl border border-surface-border bg-surface-soft px-3 py-2">
        <p className="line-clamp-1 text-xs font-bold text-ink-700">
          {student.collegeName || "College not listed yet"}
        </p>
        <p className="meta mt-0.5 line-clamp-1">{student.course || "Course not listed yet"}</p>
      </div>

      <div className="mt-auto w-full pt-3">
        {state === "accepted" ? (
          <span className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
            <Icon name="check" className="h-3.5 w-3.5" />
            Connected
          </span>
        ) : state === "incoming_pending" ? (
          <button
            type="button"
            onClick={() => onConnect(student, "accept")}
            disabled={busy !== null}
            className="btn-primary w-full min-h-[44px] px-3 text-[13px] sm:text-xs"
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
            className="btn-secondary w-full min-h-[44px] px-3 text-[13px] sm:text-xs"
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
            className="btn-primary w-full min-h-[44px] px-3 text-[13px] sm:text-xs"
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
            <div className="flex gap-4">
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
            <>
              <div className="h-scroll no-scrollbar flex snap-x snap-proximity gap-3 overflow-x-auto overflow-y-hidden pb-1 sm:gap-4 xl:hidden">
                {students.map((student) => (
                  <ProfileCard
                    key={student.userId}
                    student={student}
                    connection={connectionStates[student.userId]}
                    busy={busy?.id === student.userId ? busy.action : null}
                    competitions={levels[student.userId] ?? 0}
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
                      competitions={levels[student.userId] ?? 0}
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
