import { useEffect, useState } from "react";
import SectionHeader from "./SectionHeader";
import Icon from "../Icon";
import { Link } from "../../lib/router";
import { categoryById } from "../../lib/categories";
import EmptyState from "./EmptyState";
import CardRowSkeleton from "./CardRowSkeleton";
import { getPulsePosts, type PulsePostRecord } from "../../lib/dataAccess";
import { sanitizeExternalUrl } from "../../lib/urlSafety";

/** "opportunity_alert" -> "Opportunity Alert". Labels derive from the stored slug. */
function categoryLabel(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function dateLabel(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function PulsePreview() {
  const [posts, setPosts] = useState<PulsePostRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // getPulsePosts returns published rows only — RLS keeps drafts inside /admin.
    getPulsePosts(6).then((result) => {
      if (cancelled) return;
      setPosts(result.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="pulse" className="scroll-mt-24 border-t glass-panel-tint">
      <div className="container-px py-9 sm:py-12">
        <SectionHeader
          eyebrow="PULSE"
          title="See what's happening."
          description="Updates, stories and opportunities worth knowing about."
          viewAllHref="/pulse"
          viewAllLabel="See What's Happening"
          iconSrc={categoryById("pulse")?.iconSrc}
        />
        <div className="mt-5">
          {loading ? (
            <CardRowSkeleton />
          ) : posts.length === 0 ? (
            <EmptyState
              icon="play"
              title="Nothing here yet."
              description="Keep exploring — updates, stories and opportunities land here as they happen."
            />
          ) : (
            <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-4 lg:overflow-visible">
              {posts.map((post) => (
                <PulsePostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PulsePostCard({ post }: { post: PulsePostRecord }) {
  const externalUrl = sanitizeExternalUrl(post.externalUrl);
  const posted = dateLabel(post.publishedAt ?? post.createdAt);

  return (
    <Link
      href="/pulse"
      data-cursor="view"
      className={`glass-card group flex snap-start flex-col overflow-hidden hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue min-w-[78%] sm:min-w-0 ${
        post.imageUrl ? "" : "p-5"
      }`}
    >
      {post.imageUrl && (
        <div className="h-40 w-full shrink-0 overflow-hidden bg-surface-soft">
          <img
            src={post.imageUrl}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}
      <div className={`flex flex-1 flex-col ${post.imageUrl ? "p-5" : ""}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-md bg-brand-blue-soft px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-blue">
            {categoryLabel(post.category)}
          </span>
          {externalUrl && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-red-soft px-2 py-0.5 text-[10px] font-bold text-brand-red">
              <Icon name="external" className="h-3 w-3" />
              Source
            </span>
          )}
        </div>
        <h3 className="mt-3 line-clamp-2 text-sm font-extrabold leading-snug text-ink-900 transition-colors group-hover:text-brand-blue">
          {post.title}
        </h3>
        {post.summary && (
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-ink-500">{post.summary}</p>
        )}
        {posted && (
          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4 text-[11px] font-semibold text-ink-400">
            <Icon name="calendar" className="h-3 w-3" />
            {posted}
          </div>
        )}
      </div>
    </Link>
  );
}
