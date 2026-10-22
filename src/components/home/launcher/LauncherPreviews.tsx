import { useEffect, useRef, useState } from "react";
import Icon from "../../Icon";
import { Link } from "../../../lib/router";
import { StudentAvatar } from "../../circle/StudentCard";
import {
  getPulsePosts,
  getStudentDirectory,
  type PulsePostRecord,
  type StudentProfileRecord,
} from "../../../lib/dataAccess";

/**
 * The live preview that replaces the big artwork inside the two compact cards.
 *
 * Both carousels are decorative in motion only: the same text is present when
 * `prefers-reduced-motion` is set (advancing stops, the current slide stays), and
 * neither fetches again on each step — one read per mount, cancelled on unmount.
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

export function CirclePreviewCarousel() {
  const [people, setPeople] = useState<StudentProfileRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getStudentDirectory(24).then((result) => {
      if (cancelled) return;
      // Public profiles only, and only ones a visitor could open.
      const eligible = (result.data ?? []).filter((person) => person.isPublic && person.fullName.trim());
      setPeople(shuffleOnce(eligible).slice(0, 8));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const { index, pause, resume } = useCarousel(people.length, PREVIEW_INTERVAL_MS);

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
        {people.map((person, i) => (
          <figure key={person.userId} className="cat-preview__slide" {...activeProps(i === index)}>
            <StudentAvatar
              src={person.avatarUrl}
              name={person.fullName}
              className="cat-preview__photo"
            />
            <figcaption className="cat-preview__meta">
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
            </figcaption>
          </figure>
        ))}
      </div>
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
        {posts.map((post, i) => (
          <article key={post.id} className="cat-preview__slide cat-preview__slide--news" {...activeProps(i === index)}>
            {post.imageUrl ? (
              <img src={post.imageUrl} alt="" aria-hidden="true" loading="lazy" decoding="async" className="cat-preview__thumb" />
            ) : (
              <span aria-hidden="true" className="cat-preview__thumb cat-preview__thumb--empty">
                <Icon name="newspaper" className="h-3.5 w-3.5" />
              </span>
            )}
            <span className="cat-preview__headline cat-preview__headline--news">{post.title}</span>
          </article>
        ))}
      </div>
    </div>
  );
}
