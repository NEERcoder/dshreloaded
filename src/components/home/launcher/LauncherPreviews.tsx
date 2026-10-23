import { useEffect, useRef, useState } from "react";
import Icon from "../../Icon";
import { Link } from "../../../lib/router";
import { useAuth } from "../../../context/AuthContext";
import { StudentAvatar } from "../../circle/StudentCard";
import {
  acceptConnectionRequest,
  getConnectionStates,
  getPulsePosts,
  getStudentDirectory,
  sendConnectionRequest,
  type ConnectionRef,
  type PulsePostRecord,
  type StudentProfileRecord,
} from "../../../lib/dataAccess";

/**
 * The live previews inside the CIRCLE and PULSE launcher cards.
 *
 * Both carousels are decorative in motion only: the same text is present when
 * `prefers-reduced-motion` is set (advancing stops, the current slide stays), and
 * neither fetches again on each step — one read per mount, cancelled on unmount.
 *
 * Every slide is a real destination, built from the record's own id. The CIRCLE
 * slide also carries a Connect action that reuses the existing connection
 * actions; the slide link and that button are siblings, never nested.
 */

const PREVIEW_INTERVAL_MS = 1800;
const NEWS_INTERVAL_MS = 2500;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Advance through `count` slides while the pointer is away and focus is outside.
 * One timer per mount; the interval only reads refs, so it never re-arms on
 * render and never fetches anything.
 */
function useCarousel(count: number, delay: number) {
  const [index, setIndex] = useState(0);
  const paused = useRef(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = prefersReducedMotion();
  }, []);

  useEffect(() => {
    if (count <= 1) return;
    const timer = window.setInterval(() => {
      if (paused.current || reduced.current) return;
      setIndex((current) => (current + 1) % count);
    }, delay);
    return () => window.clearInterval(timer);
  }, [count, delay]);

  // Keep the index valid if the data shrinks (e.g. a refresh returns fewer rows).
  useEffect(() => {
    setIndex((current) => (count === 0 ? 0 : current % count));
  }, [count]);

  return {
    index,
    pause: () => { paused.current = true; },
    resume: () => { paused.current = false; },
  };
}

/** A stable shuffle for one mount; the list never reshuffles on re-render. */
function shuffleOnce<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function activeProps(active: boolean) {
  return { "aria-hidden": active ? undefined : true } as const;
}

type ConnectAction = "send" | "accept";

type PreviewConnectProps = {
  person: StudentProfileRecord;
  active: boolean;
  authLoading: boolean;
  signedIn: boolean;
  connection: ConnectionRef | undefined;
  statesReady: boolean;
  busy: boolean;
  disabled: boolean;
  failed: boolean;
  onAction: (person: StudentProfileRecord, action: ConnectAction) => void;
};

/**
 * The compact top-right relationship control. The layout reserves its corner so
 * it can never sit on the photo, name or headline. Logged-out visitors are sent
 * to the existing sign-in flow with this profile as the return path.
 */
function PreviewConnect({
  person,
  active,
  authLoading,
  signedIn,
  connection,
  statesReady,
  busy,
  disabled,
  failed,
  onAction,
}: PreviewConnectProps) {
  if (authLoading || (signedIn && !statesReady)) {
    return <span className="cat-preview__connect" aria-hidden="true">…</span>;
  }

  if (!signedIn) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(`/circle/${person.userId}`)}`}
        className="cat-preview__connect cat-preview__connect--action"
        tabIndex={active ? 0 : -1}
        aria-label={`Sign in to connect with ${person.fullName}`}
      >
        Connect
      </Link>
    );
  }

  const state = connection?.state ?? "none";

  if (state === "accepted") {
    return (
      <span
        className="cat-preview__connect cat-preview__connect--connected"
        title={`You're connected with ${person.fullName}`}
      >
        Connected
      </span>
    );
  }

  if (state === "outgoing_pending") {
    return (
      <span
        className="cat-preview__connect cat-preview__connect--pending"
        title={`Connection request sent to ${person.fullName}`}
      >
        Requested
      </span>
    );
  }

  const action: ConnectAction = state === "incoming_pending" ? "accept" : "send";
  const label = busy ? "…" : failed ? "Retry" : action === "accept" ? "Accept" : "Connect";

  return (
    <button
      type="button"
      onClick={() => onAction(person, action)}
      disabled={disabled}
      tabIndex={active ? 0 : -1}
      title={
        failed
          ? "That connection request failed. Try again."
          : action === "accept"
            ? `Accept ${person.fullName}'s connection request`
            : `Connect with ${person.fullName}`
      }
      aria-label={
        busy
          ? "Sending connection request"
          : failed
            ? `Retry connecting with ${person.fullName}`
            : action === "accept"
              ? `Accept connection request from ${person.fullName}`
              : `Connect with ${person.fullName}`
      }
      className={`cat-preview__connect cat-preview__connect--action ${
        failed ? "cat-preview__connect--error" : ""
      }`}
    >
      {label}
    </button>
  );
}

export function CirclePreviewCarousel() {
  const { user, loading: authLoading } = useAuth();
  const [people, setPeople] = useState<StudentProfileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<Record<string, ConnectionRef>>({});
  const [statesReady, setStatesReady] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    const currentUserId = user?.id;
    setLoading(true);
    getStudentDirectory(24).then((result) => {
      if (cancelled) return;
      // Public profiles only, and never the viewer's own record.
      const eligible = (result.data ?? []).filter(
        (person) => person.isPublic && person.fullName.trim() && person.userId !== currentUserId
      );
      setPeople(shuffleOnce(eligible).slice(0, 8));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setConnections({});
      setStatesReady(true);
      return;
    }
    let cancelled = false;
    setStatesReady(false);
    getConnectionStates().then((result) => {
      if (cancelled) return;
      setConnections(result.data ?? {});
      setStatesReady(true);
      if (result.error) {
        setNotice("Couldn't load your connection status. Connect will still be checked by JAVLIN.");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  const { index, pause, resume } = useCarousel(people.length, PREVIEW_INTERVAL_MS);

  async function handleConnect(person: StudentProfileRecord, action: ConnectAction) {
    if (!user) return;
    setBusyId(person.userId);
    setFailedId(null);

    let failure: string | null = null;
    let success = "";

    if (action === "accept") {
      const connectionId = connections[person.userId]?.connectionId;
      if (!connectionId) {
        failure = "That connection request is no longer available.";
      } else {
        const result = await acceptConnectionRequest(connectionId);
        if (result.error) failure = result.error;
        else success = `You're now connected with ${person.fullName}.`;
      }
    } else {
      const result = await sendConnectionRequest(person.userId);
      if (result.error) {
        failure = result.error;
      } else if (result.data?.status === "already_connected") {
        success = `You're already connected with ${person.fullName}.`;
      } else if (result.data?.status === "already_pending") {
        success = `A request to ${person.fullName} is already pending.`;
      } else if (result.data?.status === "incoming_request") {
        success = `${person.fullName} has already asked to connect. You can accept from the preview.`;
      } else {
        success = `Connection request sent to ${person.fullName}.`;
      }
    }

    if (failure) {
      setFailedId(person.userId);
      setNotice(`Couldn't connect with ${person.fullName}: ${failure}`);
      setBusyId(null);
      return;
    }

    // Re-read the relationship instead of guessing what the mutation returned.
    const states = await getConnectionStates();
    if (!states.error) setConnections(states.data ?? {});
    setNotice(success);
    setBusyId(null);
  }

  if (loading) {
    return <div className="cat-preview cat-preview--skeleton" aria-hidden="true" />;
  }

  if (people.length === 0) {
    return (
      <Link href="/circle" className="cat-preview__empty">
        <Icon name="users" className="h-3.5 w-3.5" />
        <span>Profiles appear here as students join CIRCLE.</span>
      </Link>
    );
  }

  return (
    <div
      className="cat-preview cat-preview--circle"
      role="group"
      aria-roledescription="carousel"
      aria-label="CIRCLE student profiles"
      tabIndex={0}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
    >
      <div
        className="cat-preview__track cat-preview__track--x"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {people.map((person, i) => {
          const active = i === index;
          return (
            <figure key={person.userId} className="cat-preview__slide" {...activeProps(active)}>
              <Link
                href={`/circle/${person.userId}`}
                className="cat-preview__profile"
                tabIndex={active ? 0 : -1}
                aria-label={`Open ${person.fullName}'s profile`}
              >
                <span className="cat-preview__photo-row">
                  <StudentAvatar src={person.avatarUrl} name={person.fullName} className="cat-preview__photo" />
                </span>
                <span className="cat-preview__meta">
                  <span className="cat-preview__name">
                    <span className="cat-preview__name-text">{person.fullName}</span>
                    {/* Decorative blue tick: a visual mark only, hidden from assistive
                        technology and never presented as an identity claim. */}
                    <span aria-hidden="true" className="cat-preview__tick">
                      <Icon name="check" className="h-2 w-2" />
                    </span>
                  </span>
                  {person.headline?.trim() ? (
                    <span className="cat-preview__headline">{person.headline}</span>
                  ) : null}
                </span>
              </Link>

              <PreviewConnect
                person={person}
                active={active}
                authLoading={authLoading}
                signedIn={Boolean(user)}
                connection={connections[person.userId]}
                statesReady={statesReady}
                busy={busyId === person.userId}
                disabled={busyId !== null}
                failed={failedId === person.userId}
                onAction={handleConnect}
              />
            </figure>
          );
        })}
      </div>

      <p className="sr-only" role="status" aria-live="polite">{notice}</p>
    </div>
  );
}

export function PulsePreviewCarousel() {
  const [posts, setPosts] = useState<PulsePostRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // getPulsePosts already returns the canonical published order — never re-sort.
    getPulsePosts(6).then((result) => {
      if (cancelled) return;
      setPosts((result.data ?? []).slice(0, 6));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const { index, pause, resume } = useCarousel(posts.length, NEWS_INTERVAL_MS);

  if (loading) {
    return <div className="cat-preview cat-preview--skeleton" aria-hidden="true" />;
  }

  if (posts.length === 0) {
    return (
      <Link href="/pulse" className="cat-preview__empty">
        <Icon name="newspaper" className="h-3.5 w-3.5" />
        <span>No campus news yet — open PULSE.</span>
      </Link>
    );
  }

  return (
    <div
      className="cat-preview cat-preview--pulse"
      role="group"
      aria-roledescription="carousel"
      aria-label="PULSE campus news"
      tabIndex={0}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
    >
      <div
        className="cat-preview__track cat-preview__track--y"
        style={{ transform: `translateY(-${index * 100}%)` }}
      >
        {posts.map((post, i) => {
          const active = i === index;
          return (
            <Link
              key={post.id}
              href={`/pulse?post=${encodeURIComponent(post.id)}`}
              className="cat-preview__slide cat-preview__slide--news cat-preview__news-link"
              tabIndex={active ? 0 : -1}
              aria-label={`Read ${post.title}`}
              {...activeProps(active)}
            >
              {post.imageUrl ? (
                <img src={post.imageUrl} alt="" aria-hidden="true" loading="lazy" decoding="async" className="cat-preview__thumb" />
              ) : (
                <span aria-hidden="true" className="cat-preview__thumb cat-preview__thumb--empty">
                  <Icon name="newspaper" className="h-3.5 w-3.5" />
                </span>
              )}
              <span className="cat-preview__headline cat-preview__headline--news">{post.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
