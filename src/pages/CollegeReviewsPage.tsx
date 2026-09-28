import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import Icon from "../components/Icon";
import ReviewSnippetCard from "../components/home/ReviewSnippetCard";
import CardRowSkeleton from "../components/home/CardRowSkeleton";
import { Link } from "../lib/router";
import {
  getApprovedReviews,
  getColleges,
  type CollegeRecord,
  type ReviewRecord,
} from "../lib/dataAccess";

const PAGE_SIZE = 12;

type CollegeSummary = {
  college: CollegeRecord;
  reviewCount: number;
  averageRating: number | null;
  latest: ReviewRecord | null;
};

export default function CollegeReviewsPage() {
  const [colleges, setColleges] = useState<CollegeRecord[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getColleges(), getApprovedReviews(500)]).then(([collegesResult, reviewsResult]) => {
      if (cancelled) return;
      setColleges(collegesResult.data);
      setReviews(reviewsResult.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const summaries = useMemo<CollegeSummary[]>(() => {
    const byCollege = new Map<string, ReviewRecord[]>();
    for (const review of reviews) {
      const bucket = byCollege.get(review.collegeId) ?? [];
      bucket.push(review);
      byCollege.set(review.collegeId, bucket);
    }

    const rows = colleges.map((college) => {
      const collegeReviews = byCollege.get(college.id) ?? [];
      const total = collegeReviews.reduce((sum, review) => sum + review.rating, 0);
      return {
        college,
        reviewCount: collegeReviews.length,
        averageRating: collegeReviews.length ? Math.round((total / collegeReviews.length) * 10) / 10 : null,
        latest: collegeReviews[0] ?? null,
      };
    });

    return rows.sort((a, b) =>
      b.reviewCount - a.reviewCount || a.college.name.localeCompare(b.college.name)
    );
  }, [colleges, reviews]);

  const visibleColleges = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return summaries;
    return summaries.filter((row) =>
      [row.college.name, row.college.campus, row.college.location]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [summaries, search]);

  const pagedColleges = visibleColleges.slice(0, visibleCount);
  const remainingColleges = Math.max(0, visibleColleges.length - pagedColleges.length);

  return (
    <PageShell
      title="College Reviews — Hear From Students | JAVLIN"
      description="Real reviews from students who've lived it — academics, campus life, and everything in between."
      backgroundPreset="college"
    >
      <section className="border-b border-surface-border bg-brand-blue-pale/60 backdrop-blur-[2px] pt-10 pb-8 sm:pt-14 sm:pb-10">
        <div className="container-px">
          <p className="eyebrow text-brand-red">COLLEGE REVIEWS</p>
          <h1 className="font-display mt-2 text-3xl sm:text-5xl font-extrabold tracking-tight text-ink-900 leading-tight">
            Before you choose, hear from students.
          </h1>
          <p className="mt-3 max-w-2xl text-base sm:text-lg leading-relaxed text-ink-600 font-medium">
            Real reviews from students who've lived it — academics, campus life, and everything in between.
          </p>
          {!loading && (
            <p className="mt-3 text-xs font-bold uppercase tracking-widest text-ink-400">
              {colleges.length} colleges · {reviews.length} published review{reviews.length === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </section>

      <section className="container-px py-8 sm:py-10">
        <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-card">
          <label className="field-label" htmlFor="review-college-search">
            Search college
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="review-college-search"
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className="field-input min-h-[40px] flex-1"
              placeholder="Start typing a college or campus…"
            />
            <Link href="/explore" className="btn-primary min-h-[40px] justify-center">
              Submit a review
            </Link>
          </div>
          <p className="mt-2 text-xs font-semibold text-ink-400" role="status">
            {loading
              ? "Loading colleges…"
              : `${pagedColleges.length} of ${colleges.length} colleges shown`}
          </p>
        </div>

        <div className="mt-8">
          <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-ink-900">
            Colleges
          </h2>
          {loading ? (
            <div className="mt-4">
              <CardRowSkeleton count={8} />
            </div>
          ) : visibleColleges.length === 0 ? (
            <div className="mt-4 card border-dashed p-10 text-center bg-white">
              <p className="text-base font-bold text-ink-900">No colleges match your search.</p>
              <p className="mt-1 text-sm text-ink-500">Try a shorter name, or browse every college.</p>
              <button className="btn-secondary mt-4 min-h-[40px]" onClick={() => { setSearch(""); setVisibleCount(PAGE_SIZE); }}>
                Clear search
              </button>
            </div>
          ) : (
            <>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pagedColleges.map((row) => (
                <article
                  key={row.college.id}
                  className="flex min-w-0 flex-col rounded-2xl border border-surface-border bg-white p-5 shadow-card"
                >
                  <h3 className="text-sm font-extrabold leading-snug text-ink-900">{row.college.name}</h3>
                  <p className="mt-1 text-xs font-semibold text-ink-500">
                    {[row.college.campus, row.college.location].filter(Boolean).join(" · ") || "Campus not listed"}
                  </p>

                  {row.reviewCount > 0 ? (
                    <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-ink-700">
                      <Icon name="star" className="h-4 w-4 text-brand-red" />
                      {row.averageRating} average
                      <span className="font-semibold text-ink-400">
                        · {row.reviewCount} review{row.reviewCount === 1 ? "" : "s"}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-3 text-xs font-semibold leading-relaxed text-ink-400">
                      No reviews yet.
                      <br />
                      Be the first to share your experience.
                    </p>
                  )}

                  {row.latest && (
                    <blockquote className="mt-3 border-l-2 border-brand-blue-soft pl-3 text-xs leading-relaxed text-ink-500 line-clamp-3">
                      "{row.latest.review}"
                      <span className="mt-1 block font-bold text-ink-400">— {row.latest.name}</span>
                    </blockquote>
                  )}

                  <Link
                    href={row.college.slug ? `/explore/${row.college.slug}` : "/explore"}
                    className="mt-4 inline-flex min-h-[40px] items-center gap-1 text-xs font-bold text-brand-blue hover:text-brand-blue-dark"
                  >
                    View college & reviews <Icon name="arrow" className="h-3.5 w-3.5" />
                  </Link>
                </article>
              ))}
            </div>
            {remainingColleges > 0 && (
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                className="btn-secondary mt-6 min-h-[40px] w-full justify-center sm:w-auto"
              >
                Show more colleges ({remainingColleges})
              </button>
            )}
          </>
        )}
      </div>

        <div className="mt-10">
          <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-ink-900">
            Latest reviews
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Every review is written by a student and approved by a JAVLIN admin before it appears.
          </p>

          {loading ? (
            <div className="mt-4">
              <CardRowSkeleton count={4} />
            </div>
          ) : reviews.length === 0 ? (
            <div className="mt-4 card border-dashed p-10 text-center bg-white">
              <p className="text-base font-bold text-ink-900">No reviews yet.</p>
              <p className="mt-1 text-sm text-ink-500">Be the first to share your experience.</p>
              <Link href="/explore" className="btn-primary mt-4 min-h-[40px] inline-flex">
                Submit a review
              </Link>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {reviews.slice(0, 8).map((review) => (
                <ReviewSnippetCard
                  key={review.id}
                  collegeName={review.collegeName}
                  authorName={review.name}
                  rating={review.rating}
                  excerpt={review.review}
                  href={review.collegeSlug ? `/explore/${review.collegeSlug}` : "/explore"}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
