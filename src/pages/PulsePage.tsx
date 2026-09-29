import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import Icon from "../components/Icon";
import EmptyState from "../components/home/EmptyState";
import { SkeletonOpportunityGrid } from "../components/Skeleton";
import OpportunityCard from "../components/opportunities/OpportunityCard";
import { Link } from "../lib/router";
import {
  getOpportunities,
  getOpenTeamRoles,
  getPulsePosts,
  getVideos,
  type OpportunityRecord,
  type PulsePostRecord,
  type VideoRecord,
} from "../lib/dataAccess";
import { opportunityHref } from "../lib/opportunityRoute";
import { getYouTubeThumbnailUrl, sanitizeExternalUrl, sanitizeYouTubeUrl } from "../lib/urlSafety";

const CAMPUS_FILTER = "campus";

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

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

export default function PulsePage() {
  const [posts, setPosts] = useState<PulsePostRecord[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [openRoleCount, setOpenRoleCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getPulsePosts(24), getOpportunities(), getVideos(), getOpenTeamRoles()]).then(
      ([postsResult, opportunitiesResult, videosResult, rolesResult]) => {
        if (cancelled) return;
        // Published rows only — RLS never returns a draft to this query.
        setPosts(postsResult.data);
        setOpportunities(
          [...opportunitiesResult.data].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        );
        setVideos(videosResult.data);
        setOpenRoleCount(rolesResult.data.filter((role) => role.isOpen).length);
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Filters only offer categories that actually have published content.
  const categoryOptions = useMemo(() => {
    const present = new Set(opportunities.map((item) => item.category));
    return [...present].sort();
  }, [opportunities]);

  const featured = useMemo(() => opportunities.filter((item) => item.featured).slice(0, 3), [opportunities]);

  const latest = useMemo(() => {
    if (filter === CAMPUS_FILTER) return [];
    const pool = filter === "all" ? opportunities : opportunities.filter((item) => item.category === filter);
    const featuredIds = filter === "all" ? new Set(featured.map((item) => item.id)) : new Set<string>();
    return pool.filter((item) => !featuredIds.has(item.id)).slice(0, 24);
  }, [opportunities, featured, filter]);

  const campusItems = useMemo(() => {
    if (filter !== "all" && filter !== CAMPUS_FILTER) return [];
    return videos.slice(0, filter === CAMPUS_FILTER ? 12 : 4);
  }, [videos, filter]);

  const isEmpty =
    !loading && posts.length === 0 && opportunities.length === 0 && videos.length === 0;

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) ?? null,
    [posts, selectedPostId]
  );

  // On the default view an empty "Latest" list isn't an empty page: Featured or Campus content
  // is already shown, so the "Nothing here yet." block would sit above real cards.
  const showLatestEmptyState =
    latest.length === 0 && !(filter === "all" && (featured.length > 0 || campusItems.length > 0));

  return (
    <PageShell
      title="PULSE — See What's Happening | JAVLIN"
      description="Updates, stories and opportunities worth knowing about."
      backgroundPreset="explore"
    >
      <section className="border-b border-surface-border bg-brand-blue-pale/60 backdrop-blur-[2px] pt-10 pb-8 sm:pt-14 sm:pb-10">
        <div className="container-px">
          <p className="eyebrow text-brand-red">PULSE</p>
          <h1 className="font-display mt-2 text-3xl sm:text-5xl font-extrabold tracking-tight text-ink-900 leading-tight">
            See what's happening.
          </h1>
          <p className="mt-3 max-w-2xl text-base sm:text-lg leading-relaxed text-ink-600 font-medium">
            Updates, stories and opportunities worth knowing about.
          </p>
        </div>
      </section>

      <section className="container-px py-8 sm:py-10">
        {openRoleCount !== null && openRoleCount > 0 && (
          <Link
            href="/join"
            className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-surface-border bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-red-soft text-brand-red">
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

        {loading ? (
          <SkeletonOpportunityGrid count={6} />
        ) : isEmpty ? (
          <EmptyState
            icon="play"
            title="Nothing here yet."
            description="Keep exploring — updates, stories and opportunities land here as they happen."
            ctaLabel="Explore FIELD"
            ctaHref="/field"
          />
        ) : (
          <>
            {filter === "all" && posts.length > 0 && (
              <div className="mb-10">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="eyebrow text-brand-red">The feed</p>
                    <h2 className="font-display mt-1 text-xl sm:text-2xl font-extrabold tracking-tight text-ink-900">
                      News &amp; stories
                    </h2>
                  </div>
                  <p className="text-xs font-bold text-ink-400">
                    {posts.length} post{posts.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {posts.map((post) => (
                    <PulsePostCard key={post.id} post={post} onSelect={setSelectedPostId} />
                  ))}
                </div>
              </div>
            )}

            {opportunities.length > 0 && categoryOptions.length > 1 && (
              <div className="mb-8 flex flex-wrap items-center gap-2">
                <span className="sr-only" id="pulse-filter-label">
                  Filter PULSE content
                </span>
                <FilterChip label="All" active={filter === "all"} onClick={() => setFilter("all")} />
                {categoryOptions.map((category) => (
                  <FilterChip
                    key={category}
                    label={capitalise(category)}
                    active={filter === category}
                    onClick={() => setFilter(category)}
                  />
                ))}
                {videos.length > 0 && (
                  <FilterChip
                    label="Campus stories"
                    active={filter === CAMPUS_FILTER}
                    onClick={() => setFilter(CAMPUS_FILTER)}
                  />
                )}
              </div>
            )}

            {filter === "all" && featured.length > 0 && (
              <div className="mb-10">
                <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-ink-900">
                  Featured
                </h2>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  {featured.map((item) => (
                    <FeaturedCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}

            {filter !== CAMPUS_FILTER && (latest.length > 0 || showLatestEmptyState) && (
              <div>
                <div className="flex items-end justify-between gap-3">
                  <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-ink-900">
                    {filter === "all" ? "Latest" : capitalise(filter)}
                  </h2>
                  {latest.length > 0 && (
                    <p className="text-xs font-bold text-ink-400">{latest.length} live</p>
                  )}
                </div>

                {latest.length > 0 ? (
                  <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {latest.map((item) => (
                      <OpportunityCard key={item.id} item={item} />
                    ))}
                  </div>
                ) : (
                  <div className="mt-4">
                    <EmptyState
                      icon="play"
                      title="Nothing here yet."
                      description="Keep exploring — new updates land here first."
                      ctaLabel="Explore FIELD"
                      ctaHref="/field"
                    />
                  </div>
                )}
              </div>
            )}

            {campusItems.length > 0 && (
              <div className="mt-10">
                <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-ink-900">
                  From campus
                </h2>
                <p className="mt-1 text-sm text-ink-500">
                  Student stories, tours and interviews published by the JAVLIN campus crew.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {campusItems.map((video) => (
                    <CampusCard key={video.id} video={video} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {selectedPost && (
        <PulsePostDetail post={selectedPost} onClose={() => setSelectedPostId(null)} />
      )}
    </PageShell>
  );
}

function PulsePostCard({ post, onSelect }: { post: PulsePostRecord; onSelect: (id: string) => void }) {
  const externalUrl = sanitizeExternalUrl(post.externalUrl);
  const posted = postedLabel(post.publishedAt ?? post.createdAt);

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-surface-border bg-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
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
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest">
          <span className="rounded-md bg-brand-blue-soft px-2 py-0.5 text-brand-blue">
            {categoryLabel(post.category)}
          </span>
          {externalUrl && (
            <span className="inline-flex items-center gap-1 rounded-md bg-brand-red-soft px-2 py-0.5 text-brand-red">
              <Icon name="external" className="h-3 w-3" /> External source
            </span>
          )}
          {posted && <span className="font-bold text-ink-400">{posted}</span>}
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
          className="btn-primary mt-4 min-h-[40px] self-start px-4 text-sm"
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
                {posted && <span className="text-xs font-bold text-ink-400">{posted}</span>}
              </div>
              <h2 className="font-display mt-3 text-2xl font-extrabold tracking-tight text-ink-900">
                {post.title}
              </h2>
              {post.summary && (
                <p className="mt-1 text-base font-semibold text-ink-600">{post.summary}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-surface-border bg-surface-soft text-ink-500 transition-colors hover:bg-brand-red-soft hover:text-brand-red"
              aria-label="Close"
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>

          {post.content && (
            <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-ink-600">
              {post.content}
            </p>
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
      className={`min-h-[40px] rounded-full border px-4 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue ${
        active
          ? "border-brand-navy bg-brand-navy text-white"
          : "border-surface-border bg-white text-ink-600 hover:border-brand-blue hover:text-brand-blue"
      }`}
    >
      {label}
    </button>
  );
}

function FeaturedCard({ item }: { item: OpportunityRecord }) {
  const cover = item.imageUrl;
  const posted = postedLabel(item.createdAt);
  const href = opportunityHref(item.id);

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-surface-border bg-white shadow-card">
      {cover ? (
        <Link href={href} className="block h-36 w-full bg-surface-soft">
          <img
            src={cover}
            alt={`${item.title} cover`}
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
          />
        </Link>
      ) : null}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest">
          <span className="rounded-md bg-brand-red-soft px-2 py-0.5 text-brand-red">Featured</span>
          <span className="rounded-md bg-brand-blue-soft px-2 py-0.5 text-brand-blue">{capitalise(item.category)}</span>
          {posted && <span className="font-bold text-ink-400">{posted}</span>}
        </div>
        <h3 className="font-display mt-3 text-lg font-extrabold leading-snug tracking-tight text-ink-900">
          {item.title}
        </h3>
        <p className="mt-1 text-xs font-bold text-ink-600">{item.organization}</p>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-500">{item.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={href} className="btn-primary min-h-[40px] px-4 text-sm">
            Read More <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function CampusCard({ video }: { video: VideoRecord }) {
  const safeLink = sanitizeYouTubeUrl(video.youtubeUrl) || sanitizeExternalUrl(video.youtubeUrl);
  const thumb = getYouTubeThumbnailUrl(video.youtubeUrl, video.thumbnail);
  const posted = video.publishedAt ? postedLabel(video.publishedAt) : "";

  const body = (
    <>
      <div className="relative h-28 w-full overflow-hidden bg-brand-navy">
        {thumb ? (
          <img src={thumb} alt={`${video.title} thumbnail`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-brand-blue-soft">
            <Icon name="play" className="h-6 w-6" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-blue">
          <span>{capitalise(video.category.replace(/_/g, " "))}</span>
          {posted && <span className="font-bold text-ink-400">{posted}</span>}
        </div>
        <h3 className="mt-2 line-clamp-2 text-sm font-extrabold leading-snug text-ink-900">{video.title}</h3>
        <p className="mt-1 line-clamp-1 text-xs font-semibold text-ink-500">{video.college || "JAVLIN campus crew"}</p>
        {video.description && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-400">{video.description}</p>}
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-blue">
          Read More <Icon name="arrow" className="h-3.5 w-3.5" />
        </span>
      </div>
    </>
  );

  if (!safeLink) {
    return (
      <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-surface-border bg-white shadow-card">
        {body}
      </article>
    );
  }

  return (
    <a
      href={safeLink}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-surface-border bg-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
    >
      {body}
    </a>
  );
}
