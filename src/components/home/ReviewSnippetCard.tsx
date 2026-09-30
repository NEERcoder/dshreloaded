import Icon from "../Icon";
import { Link } from "../../lib/router";

type ReviewSnippetCardProps = {
  collegeName?: string;
  authorName: string;
  rating: number;
  excerpt: string;
  href: string;
};

export default function ReviewSnippetCard({
  collegeName,
  authorName,
  rating,
  excerpt,
  href,
}: ReviewSnippetCardProps) {
  return (
    <Link
      href={href}
      data-cursor="view"
      className="glass-card card-editorial card-interactive group flex min-w-[78%] snap-start flex-col p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue sm:min-w-0 sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        {collegeName ? (
          <span className="line-clamp-1 text-[11px] font-extrabold uppercase tracking-wider text-ink-500">
            {collegeName}
          </span>
        ) : (
          <span />
        )}
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-blue-soft px-2 py-0.5 text-[11px] font-extrabold text-brand-blue">
          <Icon name="star" className="h-3 w-3" />
          {rating}/5
        </span>
      </div>
      <p className="mt-2.5 line-clamp-3 text-[13px] leading-relaxed text-ink-600 sm:mt-3 sm:text-sm">
        <span className="font-display text-lg leading-none text-brand-blue">&ldquo;</span>
        {excerpt}
        <span className="font-display text-lg leading-none text-brand-blue">&rdquo;</span>
      </p>
      <p className="mt-auto pt-4 text-[11px] font-bold text-ink-500">— {authorName}</p>
    </Link>
  );
}
