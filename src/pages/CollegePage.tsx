import { FormEvent, useEffect, useState } from "react";
import Icon from "../components/Icon";
import PageShell from "../components/PageShell";
import SectionHeading from "../components/SectionHeading";
import DeadlineProgress from "../components/DeadlineProgress";
import { SkeletonCollegePage } from "../components/Skeleton";
import { Link } from "../lib/router";
import {
  createAnonymousReview,
  getCollegeBySlug,
  getMentorsByCollege,
  getOpportunities,
  getReviewsByCollege,
  getVideosByCollege,
  type CollegeRecord,
  type MentorRecord,
  type OpportunityRecord,
  type ReviewRecord,
  type VideoRecord,
} from "../lib/dataAccess";
import { isSupabaseConfigured } from "../lib/supabase";
import { sanitizeExternalUrl, sanitizeYouTubeUrl, getYouTubeThumbnailUrl } from "../lib/urlSafety";

const videoLabels: Record<string, string> = {
  college_review: "College Review",
  campus_tour: "Campus Tour",
  student_interview: "Student Interview",
  podcast: "Podcast",
  cuet_guidance: "CUET Guidance",
  campus_story: "Campus Story",
};

/** Generate a deterministic color from a college name */
function collegeColor(name: string, alpha: number): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = ((hash % 360) + 360) % 360;
  return `hsla(${hue}, 55%, 40%, ${alpha})`;
}

function ComingSoon({
  label,
  copy = "This section will appear when verified college data is connected. DU Science Hub does not publish unverified facts.",
}: {
  label: string;
  copy?: string;
}) {
  return (
    <div className="card border-dashed p-8 text-center bg-white/70">
      <h3 className="font-bold text-ink-900">{label} coming soon</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">{copy}</p>
    </div>
  );
}

// Section quick-nav tabs
const sectionTabs = [
  { id: "overview", label: "Overview" },
  { id: "courses", label: "Courses" },
  { id: "reviews", label: "Student Takes" },
  { id: "videos", label: "Campus Media" },
  { id: "mentors-section", label: "Mentors" },
  { id: "related-opps", label: "Opportunities" },
];

export default function CollegePage({ slug }: { slug: string }) {
  const [college, setCollege] = useState<CollegeRecord | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [mentors, setMentors] = useState<MentorRecord[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCollegeBySlug(slug).then(async (collegeResult) => {
      if (cancelled) return;
      setCollege(collegeResult.data);
      if (collegeResult.error || !collegeResult.data) {
        setError(collegeResult.error);
        setLoading(false);
        return;
      }
      const [reviewResult, videoResult, mentorResult, opportunityResult] = await Promise.all([
        getReviewsByCollege(collegeResult.data.id),
        getVideosByCollege(collegeResult.data.id),
        getMentorsByCollege(collegeResult.data.name),
        getOpportunities(),
      ]);
      if (cancelled) return;
      setReviews(reviewResult.data);
      setVideos(videoResult.data);
      setMentors(mentorResult.data);
      setOpportunities(opportunityResult.data);
      setError(reviewResult.error || videoResult.error || mentorResult.error || opportunityResult.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <PageShell title="Loading college profile | DU Science Hub">
        <SkeletonCollegePage />
      </PageShell>
    );
  }

  if (!college) {
    return (
      <PageShell title="College profile coming soon | DU Science Hub" backgroundPreset="college">
        <section className="container-px py-20 sm:py-28">
          <Link href="/explore" className="text-sm font-semibold text-brand-blue hover:underline">
            ← Back to Explore DU
          </Link>
          <div className="mt-8 max-w-2xl">
            <p className="eyebrow">COLLEGE PROFILE</p>
            <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight text-ink-900">
              This college profile is coming soon.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-ink-500">
              {error ||
                (isSupabaseConfigured
                  ? "There is no published record for this college yet."
                  : "The college directory is ready, but its verified data has not been connected yet.")}
            </p>
            <Link href="/explore" className="btn-secondary mt-8">
              Explore the directory <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </PageShell>
    );
  }

  const categories = college.academicAreas.length ? college.academicAreas.join(" · ") : "";
  const collegeTerms = [college.name, ...college.courses, ...college.academicAreas]
    .filter(Boolean)
    .map((term) => term.toLowerCase());
  const relatedOpportunities = opportunities.filter((item) => {
    const searchable = [
      item.title,
      item.organization,
      item.description,
      item.field || "",
      ...item.eligibleCourses,
    ]
      .join(" ")
      .toLowerCase();
    return collegeTerms.some((term) => term.length > 2 && searchable.includes(term));
  });

  const avgRating = reviews.length
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <PageShell
      title={`${college.name} | DU Science Hub`}
      description={`Explore ${college.name} — courses, reviews, student experiences and opportunities on DU Science Hub.`}
      backgroundPreset="college"
    >
      {/* 1. CINEMATIC ASSEMBLED HERO: College Identity */}
      <section className="bg-brand-blue-pale/60 backdrop-blur-[2px] border-b border-surface-border">
        <div className="container-px py-10 sm:py-16">
          <Link href="/explore" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-blue hover:underline uppercase tracking-wider">
            ← Back to Explore DU
          </Link>
          <div className="mt-6 grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2 animate-fade-in">
                <span className="eyebrow text-brand-red">COLLEGE PROFILE</span>
                <span className="text-ink-300">•</span>
                <span className="text-xs font-bold text-ink-600 uppercase tracking-wider">
                  {[college.campus, college.location].filter(Boolean).join(" · ") || "Delhi University"}
                </span>
              </div>

              {/* College name appears first */}
              <h1 className="mt-3 text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-ink-900 animate-fade-up">
                {college.name}
              </h1>

              {/* Supporting metadata assembles around it */}
              <div className="mt-4 flex flex-wrap items-center gap-3 animate-fade-up" style={{ animationDelay: "0.15s" }}>
                {categories && (
                  <span className="rounded-full bg-brand-blue-soft px-3 py-1 text-xs font-extrabold text-brand-blue">
                    {categories}
                  </span>
                )}
                {college.type && (
                  <span className="rounded-full bg-white border border-surface-border px-3 py-1 text-xs font-semibold text-ink-700">
                    {college.type}
                  </span>
                )}
                {avgRating && (
                  <span className="rounded-full bg-brand-red-soft px-3 py-1 text-xs font-bold text-brand-red">
                    ★ {avgRating} / 5 ({reviews.length} {reviews.length === 1 ? "student take" : "student takes"})
                  </span>
                )}
                <a
                  href="#write-review"
                  className="inline-flex items-center gap-1 rounded-full bg-brand-red hover:bg-brand-red-dark text-white px-3.5 py-1.5 text-xs font-extrabold transition-all shadow-sm active:scale-95 min-h-[32px]"
                >
                  Write a Review →
                </a>
              </div>

              <p className="mt-5 max-w-2xl text-base sm:text-lg leading-relaxed text-ink-600 animate-fade-up" style={{ animationDelay: "0.25s" }}>
                {college.about || "Meet your possible future campus. Verified information, student takes, and real insights."}
              </p>
            </div>

            <div
              className="hidden min-h-56 items-center justify-center rounded-3xl border border-brand-blue/10 p-8 shadow-card sm:flex overflow-hidden transition-transform duration-300 hover:scale-[1.02]"
              style={{ backgroundColor: collegeColor(college.name, 0.08) }}
            >
              {college.heroImageUrl ? (
                <img src={college.heroImageUrl} alt={college.name} className="h-52 w-full rounded-2xl object-cover shadow-sm" />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-8xl font-black" style={{ color: collegeColor(college.name, 0.4) }}>
                    {college.name.charAt(0)}
                  </span>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-ink-400">
                    Delhi University
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* STICKY QUICK-NAV TABS */}
      <div className="sticky top-16 sm:top-20 z-30 bg-white/95 backdrop-blur-md border-b border-surface-border shadow-soft">
        <div className="container-px">
          <nav className="flex gap-1 overflow-x-auto no-scrollbar py-2.5" aria-label="College sections">
            {sectionTabs.map((tab) => (
              <a
                key={tab.id}
                href={`#${tab.id}`}
                className="shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-extrabold text-ink-600 hover:text-brand-blue hover:bg-brand-blue-soft/70 transition-colors active:scale-95"
              >
                {tab.label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* 2. QUICK FACTS & COURSES */}
      <section id="overview" className="scroll-mt-32 py-14 sm:py-20">
        <div className="container-px">
          <SectionHeading
            eyebrow="QUICK FACTS"
            title="Start with what's verified."
            description="Essential college attributes verified directly from official University of Delhi bulletins."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="Campus Zone" value={college.campus} icon="building" />
            <Fact label="Location" value={college.location} icon="target" />
            <Fact label="College Type" value={college.type} icon="users" />
            <Fact label="Academic Areas" value={categories} icon="award" />
          </div>

          {/* About & Courses */}
          <div id="courses" className="scroll-mt-32 mt-16 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="card p-6 sm:p-8 bg-white shadow-card">
              <SectionHeading align="left" eyebrow="ABOUT THE CAMPUS" title="The campus briefing." />
              <p className="mt-4 text-base leading-relaxed text-ink-600 font-normal">
                {college.about || "A verified overview of this college will be added when an approved university source is published."}
              </p>
            </div>

            <div className="card p-6 sm:p-8 bg-white shadow-card">
              <SectionHeading align="left" eyebrow="COURSES OFFERED" title="What can you study here?" />
              <div className="mt-4">
                {college.courses.length ? (
                  <div className="flex flex-wrap gap-2">
                    {college.courses.map((course: string) => (
                      <span
                        key={course}
                        className="rounded-xl bg-brand-blue-soft px-3.5 py-2 text-xs sm:text-sm font-bold text-brand-blue border border-brand-blue/10"
                      >
                        {course}
                      </span>
                    ))}
                  </div>
                ) : (
                  <ComingSoon label="Courses" copy="Course information will be populated directly from official DU admission bulletins." />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. REAL STUDENT TAKES & REVIEWS */}
      <section id="reviews" className="scroll-mt-32 py-16 sm:py-24 border-t border-surface-border bg-surface-soft/60 backdrop-blur-[2px]">
        <div className="container-px grid gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionHeading
                align="left"
                eyebrow="STUDENT REVIEWS"
                title="Skip the brochure. Hear from students."
                subtitle="Real reviews from people who have actually experienced this college."
                description="Anonymous, student-verified perspectives on faculty, societies, exams, and campus vibe."
              />
              {avgRating && (
                <span className="rounded-full bg-brand-red-soft px-4 py-1.5 text-xs font-extrabold text-brand-red shadow-soft">
                  ★ {avgRating} / 5 ({reviews.length} {reviews.length === 1 ? "student take" : "student takes"})
                </span>
              )}
            </div>

            {/* Social comment style review stream */}
            <div className="mt-8 space-y-4">
              {reviews.length ? (
                reviews.map((review) => <ReviewItem review={review} key={review.id} />)
              ) : (
                <div className="card border-dashed p-8 sm:p-10 text-center bg-white">
                  <div className="mx-auto h-12 w-12 rounded-2xl bg-brand-blue-soft text-brand-blue flex items-center justify-center">
                    <Icon name="star" className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-ink-900">Be the first to drop the real take</h3>
                  <p className="mt-2 text-sm text-ink-500 max-w-md mx-auto">
                    Share your experience at this college. Your review helps future juniors make informed choices.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Review Submission Form */}
          <div id="write-review" className="lg:sticky lg:top-36 h-fit scroll-mt-28">
            <ReviewForm collegeId={college.id} />
          </div>
        </div>
      </section>

      {/* 4. DU UNFILTERED MEDIA */}
      <section id="videos" className="scroll-mt-32 border-t border-surface-border bg-white py-16 sm:py-24">
        <div className="container-px">
          <SectionHeading
            eyebrow="DU UNFILTERED"
            title="See the campus before you commit."
            subtitle="Campus tours, student interviews and unfiltered stories."
            description="Real student experiences and campus videos associated with this college."
          />
          <div className="mt-10">
            {videos.length ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {videos.map((video) => {
                  const safeYoutube = sanitizeYouTubeUrl(video.youtubeUrl) || sanitizeExternalUrl(video.youtubeUrl);
                  const thumbUrl = getYouTubeThumbnailUrl(video.youtubeUrl, video.thumbnail);
                  return (
                    <a
                      className="card card-hover group overflow-hidden border border-surface-border shadow-card"
                      href={safeYoutube || undefined}
                      target={safeYoutube ? "_blank" : undefined}
                      rel={safeYoutube ? "noopener noreferrer" : undefined}
                      data-cursor="play"
                      key={video.id}
                    >
                      <div className="relative aspect-video bg-ink-900 flex items-center justify-center overflow-hidden">
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={video.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-white/60">
                            <Icon name="play" className="h-12 w-12" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">DU Unfiltered</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-ink-900/30 group-hover:bg-ink-900/10 transition-colors flex items-center justify-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-red text-white shadow-lift transition-transform group-hover:scale-110">
                            <Icon name="play" className="h-6 w-6 ml-0.5" />
                          </div>
                        </div>
                        {video.duration && (
                          <span className="absolute bottom-2 right-2 rounded-md bg-ink-900/85 px-2 py-0.5 text-[11px] font-bold text-white">
                            {video.duration}
                          </span>
                        )}
                      </div>
                      <div className="p-5">
                        <p className="eyebrow">{videoLabels[video.category] || video.category.replace(/_/g, " ")}</p>
                        <h3 className="mt-2 font-bold text-ink-900 leading-snug group-hover:text-brand-blue transition-colors">
                          {video.title}
                        </h3>
                        {video.description && (
                          <p className="mt-2 text-sm leading-relaxed text-ink-500 line-clamp-2">
                            {video.description}
                          </p>
                        )}
                      </div>
                    </a>
                  );
                })}
              </div>
            ) : (
              <ComingSoon label="Campus Media" copy="Student video stories and tours for this college are coming soon." />
            )}
          </div>
          <div className="mt-8 text-center">
            <Link href="/explore#du-unfiltered" className="btn-ghost">
              Explore All Campus Media <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. SENIORS & MENTORS */}
      <section id="mentors-section" className="scroll-mt-32 border-t border-surface-border bg-surface-soft/60 backdrop-blur-[2px] py-16 sm:py-24">
        <div className="container-px">
          <SectionHeading
            eyebrow="SENIORS & MENTORS"
            title="Learn from someone who's already been there."
            subtitle="Connect with verified seniors from this campus."
            description="Guidance on professors, societies, practical exams, and what actually matters."
          />
          <div className="mt-10">
            {mentors.length ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {mentors.map((mentor) => (
                  <div
                    data-cursor="open"
                    className="card p-6 bg-white border border-surface-border shadow-card cursor-pointer"
                    key={mentor.id}
                  >
                    <div className="flex items-center gap-4">
                      {mentor.photoUrl ? (
                        <img src={mentor.photoUrl} alt={mentor.name} className="h-14 w-14 rounded-2xl object-cover ring-2 ring-brand-blue/10" />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-blue-soft text-brand-blue font-extrabold text-lg">
                          {mentor.name.slice(0, 1)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-ink-900">{mentor.name}</h3>
                        <p className="text-xs font-semibold text-brand-red">
                          {mentor.role || "Senior Mentor"}
                          {mentor.course ? ` · ${mentor.course}` : ""}
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-ink-600 line-clamp-3">
                      {mentor.bio || "DU senior mentor sharing authentic academic and campus insights."}
                    </p>
                    {mentor.expertise && (
                      <p className="mt-4 pt-3 border-t border-surface-border text-xs font-semibold text-brand-blue">
                        Focus: {mentor.expertise}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <ComingSoon label="Campus Mentors" copy="Verified senior mentors associated with this college are coming soon." />
            )}
          </div>
        </div>
      </section>

      {/* 6. OPPORTUNITY RADAR FOR THIS COLLEGE */}
      <section id="related-opps" className="scroll-mt-32 border-t border-surface-border bg-white py-16 sm:py-24">
        <div className="container-px">
          <SectionHeading
            eyebrow="OPPORTUNITY RADAR"
            title="Relevant moves for this campus."
            subtitle="Internships, competitions and research matching your courses."
            description="Opportunities filtered by course relevance and academic area."
          />
          <div className="mt-10">
            {relatedOpportunities.length ? (
              <div className="grid gap-5 sm:grid-cols-2">
                {relatedOpportunities.map((item) => (
                  <CollegeOpportunityCard item={item} key={item.id} />
                ))}
              </div>
            ) : (
              <ComingSoon
                label="Related Opportunities"
                copy={
                  opportunities.length
                    ? "Published opportunities exist, but none are directly matched with this college's disciplines yet."
                    : "Published opportunities connected to this college are coming soon."
                }
              />
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function CollegeOpportunityCard({ item }: { item: OpportunityRecord }) {
  const safeAppUrl = sanitizeExternalUrl(item.applicationUrl);
  return (
    <article
      data-cursor="view"
      className="card card-hover p-6 border border-surface-border bg-white shadow-card flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-md bg-brand-blue-soft px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-brand-blue">
            {item.category}
          </span>
          {item.featured && (
            <span className="rounded-full bg-brand-red-soft px-2.5 py-0.5 text-[11px] font-bold text-brand-red">
              Featured
            </span>
          )}
        </div>
        <h3 className="mt-3 font-bold text-lg text-ink-900 leading-snug">{item.title}</h3>
        <p className="mt-1 text-sm font-semibold text-ink-600">{item.organization}</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-500 line-clamp-2">{item.description}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink-400">
          {item.field && <span>{item.field}</span>}
          {item.mode && <span className="font-semibold text-ink-600">{item.mode}</span>}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-surface-border">
        <DeadlineProgress deadline={item.deadline} createdAt={item.createdAt} />
        {safeAppUrl ? (
          <a href={safeAppUrl} target="_blank" rel="noreferrer" className="btn-outline-blue mt-4 w-full justify-center">
            View Details <Icon name="arrow" className="h-4 w-4" />
          </a>
        ) : (
          <Link href="/opportunities" className="btn-ghost mt-4 w-full justify-center">
            Open Radar <Icon name="arrow" className="h-4 w-4" />
          </Link>
        )}
      </div>
    </article>
  );
}

function Fact({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="card p-5 bg-white border border-surface-border shadow-card flex items-start gap-3.5">
      <div className="h-10 w-10 rounded-xl bg-brand-blue-soft text-brand-blue flex items-center justify-center shrink-0">
        <Icon name={icon} className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
        <p className="mt-1 font-bold text-ink-900 text-sm leading-snug">{value || "Verified info coming soon"}</p>
      </div>
    </div>
  );
}

function ReviewItem({ review }: { review: ReviewRecord }) {
  return (
    <article className="card p-5 sm:p-6 bg-white border border-surface-border shadow-card transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-brand-blue-soft text-brand-blue font-extrabold flex items-center justify-center text-sm shrink-0">
            {review.name.slice(0, 1)}
          </div>
          <div>
            <h3 className="font-bold text-ink-900 text-sm">{review.name}</h3>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-400">
              <span className="text-brand-red font-bold" aria-label={`${review.rating} out of 5 stars`}>
                {"★".repeat(review.rating)}
                {"☆".repeat(5 - review.rating)}
              </span>
              <span>•</span>
              <time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString()}</time>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-ink-700 font-normal">{review.review}</p>
    </article>
  );
}

function ReviewForm({ collegeId }: { collegeId: string }) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setSubmitting(true);
    const result = await createAnonymousReview({ collegeId, name, rating, review });
    setSubmitting(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setMessage("Thanks! Your take is awaiting moderation before appearing publicly.");
    setName("");
    setReview("");
    setRating(5);
  }

  return (
    <form onSubmit={submit} className="card p-6 sm:p-7 bg-white shadow-lift border border-surface-border">
      <span className="eyebrow text-brand-red">DROP YOUR TAKE</span>
      <h2 className="mt-2 text-2xl font-extrabold text-ink-900 tracking-tight">Tell the next student.</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">
        Skip the brochure fluff. No email or login required.
      </p>

      <label className="field-label mt-5" htmlFor="review-name">
        Your Name / Handle
      </label>
      <input
        id="review-name"
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="field-input"
        placeholder="e.g. Physics Major '25"
      />

      <label className="field-label mt-4">Vibe Rating</label>
      <div className="mt-2 flex items-center gap-1.5" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            onMouseEnter={() => setHoverRating(value)}
            onMouseLeave={() => setHoverRating(0)}
            className={`text-2xl transition-transform hover:scale-110 ${
              value <= (hoverRating || rating) ? "text-brand-red" : "text-ink-400/40"
            }`}
            aria-label={`${value} star${value > 1 ? "s" : ""}`}
          >
            ★
          </button>
        ))}
        <span className="ml-2 text-xs font-bold text-ink-500">
          {rating === 5 ? "Top Tier" : rating === 4 ? "Solid" : rating === 3 ? "Decent" : "Needs Work"}
        </span>
      </div>

      <label className="field-label mt-4" htmlFor="review-comment">
        Honest Take
      </label>
      <textarea
        id="review-comment"
        required
        minLength={10}
        value={review}
        onChange={(event) => setReview(event.target.value)}
        className="field-input min-h-32 resize-y"
        placeholder="What should someone genuinely know before choosing this college?"
      />
      <button
        disabled={submitting}
        className="btn-primary mt-6 w-full shadow-card hover:shadow-lift disabled:opacity-60"
      >
        {submitting ? "Posting…" : "Post Your Take"}
      </button>
      {message && (
        <p className="mt-3 text-xs font-bold text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-200" role="status">
          {message}
        </p>
      )}
    </form>
  );
}