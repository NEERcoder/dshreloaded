import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import Icon from "../components/Icon";
import EmptyState from "../components/home/EmptyState";
import { SkeletonOpportunityGrid } from "../components/Skeleton";
import { Link, useLocation } from "../lib/router";
import { getOpenTeamRoles, getPulsePosts, type PulsePostRecord } from "../lib/dataAccess";
import { sanitizeExternalUrl } from "../lib/urlSafety";

/**
 * PULSE — campus news, and only campus news.
 *
 * The page used to mix three sources: published `pulse_posts`, featured
 * opportunities and campus videos. The two displaced ones still exist and are
 * still reachable — opportunity discovery is the six section pages under the tab
 * row (and the AIM/FIELD launchers on the homepage), campus videos are on
 * /explore and on each college page. What is left here is the editorial
 * hierarchy from the reference sheet: one lead story, a Top stories list beside
 * it, then the rest as a grid.
 *
 * Nothing is invented to make the page look like a newspaper. A `pulse_post` has
 * no author, byline or college column, so no card claims one: the tag on a story
 * is the category an editor picked, and the time is the row's own `published_at`.
 */

const NEWS_DESK_MAILTO = "mailto:hello@javlin.space?subject=Campus%20news%20for%20JAVLIN%20Pulse";

/** "campus_story" -> "Campus Story". Labels derive from the stored slug. */
function categoryLabel(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function postedLabel(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** "2 h ago" inside a week, then the date — the reference's own rhythm. */
function agoLabel(createdAt: string): string {
  const time = new Date(createdAt).getTime();
  if (Number.isNaN(time)) return "";
  const minutes = Math.round((Date.now() - time) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days <= 7) return `${days} d ago`;
  return postedLabel(createdAt);
}

export default function PulsePage() {
  const [posts, setPosts] = useState<PulsePostRecord[]>([]);
  const [openRoleCount, setOpenRoleCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState("all");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const { search } = useLocation();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getPulsePosts(48), getOpenTeamRoles()]).then(([postsResult, rolesResult]) => {
      if (cancelled) return;
      // Published rows only — RLS never returns a draft to this query.
      setPosts(postsResult.data);
      setOpenRoleCount(rolesResult.data.filter((role) => role.isOpen).length);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Deep link: the homepage Pulse News panel links to `/pulse?post=<id>`, which
  // opens that article in the existing detail modal once posts have loaded.
  useEffect(() => {
    const postId = new URLSearchParams(search).get("post");
    if (postId && posts.some((post) => post.id === postId)) setSelectedPostId(postId);
  }, [search, posts]);

  // Topics are the stored categories that actually have a published story, so a
  // chip never offers a section nothing is filed under.
  const topicOptions = useMemo(() => {
    const present = new Set(posts.map((post) => post.category));
    return [...present].sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b)));
  }, [posts]);

  const filtered = useMemo(
    () => (topic === "all" ? posts : posts.filter((post) => post.category === topic)),
    [posts, topic]
  );

  const lead = filtered[0] ?? null;
  const topStories = filtered.slice(1, 5);
  const rest = filtered.slice(5);

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) ?? null,
    [posts, selectedPostId]
  );

  return (
    <PageShell
      title="PULSE — Campus News | JAVLIN"
      description="Campus news from colleges across India: announcements, stories, results, interviews and guides."
      backgroundPreset="explore"
    >
      <section className="container-px pb-8 pt-3 sm:pt-4">
        <h1 className="sr-only">Pulse — campus news</h1>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-surface-border pb-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2" role="group" aria-label="News topics">
            {topicOptions.length > 1 && (
              <>
                <FilterChip label="All news" active={topic === "all"} onClick={() => setTopic("all")} />
                {topicOptions.map((category) => (
                  <FilterChip
                    key={category}
                    label={categoryLabel(category)}
                    active={topic === category}
                    onClick={() => setTopic(category)}
                  />
                ))}
              </>
            )}
          </div>
          <a href={NEWS_DESK_MAILTO} className="btn-accent min-h-[44px] shrink-0">
            <Icon name="mail" className="h-4 w-4" />
            Got campus news? Mail us
          </a>
        </div>

        {loading ? (
          <SkeletonOpportunityGrid count={6} />
        ) : posts.length === 0 ? (
          <EmptyState
            icon="newspaper"
            title="No stories published yet."
            description="The desk publishes here as soon as there is something worth reading. Live listings are on the opportunity pages."
            ctaLabel="Browse internships"
            ctaHref="/opportunities/internships"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="filter"
            title="Nothing filed under that topic yet."
            description="Choose All news to see everything the desk has published."
            ctaLabel="Show all news"
            ctaHref="/pulse"
          />
        ) : (
          <>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <LeadStory post={lead} onSelect={setSelectedPostId} />
              {topStories.length > 0 && <TopStories posts={topStories} onSelect={setSelectedPostId} />}
            </div>

            {rest.length > 0 && (
              <div className="mt-10">
                <div className="flex items-end justify-between gap-3">
                  <h2 className="font-display text-lg font-extrabold tracking-tight text-ink-900 sm:text-xl">
                    Latest news
                  </h2>
                  <p className="text-xs font-bold text-ink-500">
                    {rest.length} more {rest.length === 1 ? "story" : "stories"}
                  </p>
                </div>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((post) => (
                    <PulsePostCard key={post.id} post={post} onSelect={setSelectedPostId} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Where the two displaced feeds went, so nothing on this page is a dead
            end and nothing here pretends to be news. */}
        {!loading && posts.length > 0 && (
          <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-surface-border pt-5 text-xs font-semibold text-ink-500">
            <span>Looking for something else?</span>
            <Link
              href="/opportunities/internships"
              className="inline-flex items-center gap-1 font-extrabold text-brand-blue hover:underline"
            >
              Open internships <Icon name="arrow" className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/opportunities/competitions"
              className="inline-flex items-center gap-1 font-extrabold text-brand-blue hover:underline"
            >
              Competitions <Icon name="arrow" className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center gap-1 font-extrabold text-brand-blue hover:underline"
            >
              Campus videos <Icon name="arrow" className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {openRoleCount !== null && openRoleCount > 0 && (
          <Link
            href="/join"
            className="card mt-6 flex items-center justify-between gap-4 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-red-soft text-brand-red-ink">
                <Icon name="flag" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-ink-900">JAVLIN is hiring students</p>
                <p className="text-xs font-semibold text-ink-500">
                  {openRoleCount} role{openRoleCount === 1 ? "" : "s"} open on the team right now
                </p>
              </div>
            </div>
            <Icon name="arrow" className="h-5 w-5 shrink-0 text-brand-blue" />
          </Link>
        )}

        <div className="mt-6 rounded-2xl border border-surface-border bg-white px-5 py-4 text-center">
          <p className="text-sm font-semibold text-ink-600">
            Have news about your campus?{" "}
            <a href={NEWS_DESK_MAILTO} className="font-extrabold text-brand-blue hover:underline">
              Mail us
            </a>
            .
          </p>
        </div>
      </section>

      {selectedPost && <PulsePostDetail post={selectedPost} onClose={() => setSelectedPostId(null)} />}
    </PageShell>
  );
}

/** The lead slot: the newest published story, set apart from everything below. */
function LeadStory({ post, onSelect }: { post: PulsePostRecord | null; onSelect: (id: string) => void }) {
  if (!post) return null;
  const externalUrl = sanitizeExternalUrl(post.externalUrl);

  return (
    <article className="card flex h-full min-w-0 flex-col overflow-hidden">
      {post.imageUrl ? (
        <button
          type="button"
          onClick={() => onSelect(post.id)}
          className="block h-48 w-full cursor-pointer bg-surface-soft sm:h-64"
        >
          <img
            src={post.imageUrl}
            alt={`${post.title} cover`}
            decoding="async"
            className="h-full w-full object-cover"
          />
        </button>
      ) : null}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-widest">
          <span className="rounded-md bg-brand-blue-soft px-2 py-0.5 text-brand-blue">
            {categoryLabel(post.category)}
          </span>
          {externalUrl && (
            <span className="inline-flex items-center gap-1 rounded-md bg-brand-red-soft px-2 py-0.5 text-brand-red-ink">
              <Icon name="external" className="h-3 w-3" /> External source
            </span>
          )}
          <span className="font-bold text-ink-500">{agoLabel(post.publishedAt ?? post.createdAt)}</span>
        </div>
        <h2 className="font-display mt-3 text-2xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-3xl">
          {post.title}
        </h2>
        {post.summary && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-600 sm:text-base">{post.summary}</p>
        )}
        <button
          type="button"
          onClick={() => onSelect(post.id)}
          className="btn-primary mt-4 min-h-[44px] self-start px-4 text-sm"
        >
          Read the story <Icon name="arrow" className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

function TopStories({ posts, onSelect }: { posts: PulsePostRecord[]; onSelect: (id: string) => void }) {
  return (
    <div className="min-w-0">
      <h2 className="font-display text-lg font-extrabold tracking-tight text-ink-900">Top stories</h2>
      <ul className="mt-3 space-y-2.5">
        {posts.map((post) => (
          <li key={post.id}>
            <button
              type="button"
              onClick={() => onSelect(post.id)}
              className="w-full rounded-xl border border-surface-border bg-white p-3 text-left transition-colors hover:border-brand-blue/40 hover:bg-brand-blue-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
            >
              <p className="line-clamp-2 text-sm font-extrabold leading-snug text-ink-900">{post.title}</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-ink-500">
                {categoryLabel(post.category)} · {agoLabel(post.publishedAt ?? post.createdAt)}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PulsePostCard({ post, onSelect }: { post: PulsePostRecord; onSelect: (id: string) => void }) {
  const externalUrl = sanitizeExternalUrl(post.externalUrl);

  return (
    <article className="card flex h-full min-w-0 flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      {post.imageUrl ? (
        <button
          type="button"
          onClick={() => onSelect(post.id)}
          className="block h-40 w-full cursor-pointer bg-surface-soft"
        >
          <img
            src={post.imageUrl}
            alt={`${post.title} cover`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
          />
        </button>
      ) : null}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-widest">
          <span className="rounded-md bg-brand-blue-soft px-2 py-0.5 text-brand-blue">
            {categoryLabel(post.category)}
          </span>
          {externalUrl && (
            <span className="inline-flex items-center gap-1 rounded-md bg-brand-red-soft px-2 py-0.5 text-brand-red-ink">
              <Icon name="external" className="h-3 w-3" /> External source
            </span>
          )}
          <span className="font-bold text-ink-500">{agoLabel(post.publishedAt ?? post.createdAt)}</span>
        </div>
        <h3 className="font-display mt-3 text-lg font-extrabold leading-snug tracking-tight text-ink-900">
          {post.title}
        </h3>
        {post.summary && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-500">{post.summary}</p>
        )}
        <button
          type="button"
          onClick={() => onSelect(post.id)}
          className="btn-primary mt-4 min-h-[44px] self-start px-4 text-sm"
        >
          Read More <Icon name="arrow" className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

function PulsePostDetail({ post, onClose }: { post: PulsePostRecord; onClose: () => void }) {
  const externalUrl = sanitizeExternalUrl(post.externalUrl);
  const posted = postedLabel(post.publishedAt ?? post.createdAt);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="PULSE post"
    >
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-lift sm:max-w-2xl sm:rounded-3xl">
        {post.imageUrl ? (
          <div className="h-44 w-full overflow-hidden rounded-t-3xl bg-surface-soft">
            <img src={post.imageUrl} alt={post.title} className="h-full w-full object-cover" />
          </div>
        ) : null}

        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-brand-blue-soft px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-brand-blue">
                  {categoryLabel(post.category)}
                </span>
                {posted && <span className="text-xs font-bold text-ink-500">{posted}</span>}
              </div>
              <h2 className="font-display mt-3 text-2xl font-extrabold tracking-tight text-ink-900">
                {post.title}
              </h2>
              {post.summary && <p className="mt-1 text-base font-semibold text-ink-600">{post.summary}</p>}
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-surface-border bg-surface-soft text-ink-500 transition-colors hover:bg-brand-red-soft hover:text-brand-red-ink"
              aria-label="Close"
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>

          {post.content && (
            <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-ink-600">{post.content}</p>
          )}

          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-primary mt-6 w-full justify-center"
            >
              Open source <Icon name="external" className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[44px] rounded-full border px-4 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue ${
        active
          ? "border-brand-navy bg-brand-navy text-white"
          : "border-surface-border bg-white text-ink-600 hover:border-brand-blue hover:text-brand-blue"
      }`}
    >
      {label}
    </button>
  );
}
