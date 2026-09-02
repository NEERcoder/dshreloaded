import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import Icon from "../components/Icon";
import SectionHeading from "../components/SectionHeading";
import TiltCard from "../components/TiltCard";
import { SkeletonCollegeGrid } from "../components/Skeleton";
import { Link } from "../lib/router";
import {
  getColleges,
  getMentors,
  getVideos,
  getApprovedReviews,
  createAnonymousReview,
  type CollegeRecord,
  type MentorRecord,
  type VideoRecord,
  type ReviewRecord,
} from "../lib/dataAccess";
import { isSupabaseConfigured } from "../lib/supabase";
import { sanitizeYouTubeUrl, getYouTubeThumbnailUrl } from "../lib/urlSafety";

const campusOptions = ["North Campus", "South Campus", "Off Campus", "Other / Specialized"];
const academicOptions = [
  "Science",
  "Commerce",
  "Arts & Humanities",
  "Social Sciences",
  "Management",
  "Vocational",
  "Education",
  "Medicine / Health",
  "Specialized",
  "Open Learning",
];
const typeOptions = ["Co-educational", "Women's", "Specialized"];

const videoCategoryMap: Record<string, string> = {
  all: "All",
  college_review: "College Reviews",
  campus_tour: "Campus Tours",
  student_interview: "Student Interviews",
  podcast: "Podcasts",
  cuet_guidance: "CUET Guidance",
  campus_story: "Campus Stories",
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
}

/** Generate a deterministic color from a college name */
function collegeColor(name: string, alpha: number): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = ((hash % 360) + 360) % 360;
  return `hsla(${hue}, 55%, 40%, ${alpha})`;
}

function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card border-dashed p-10 text-center bg-white/90">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue-soft text-brand-blue">
        <Icon name="search" className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-bold text-ink-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-500 max-w-md mx-auto">{children}</p>
    </div>
  );
}

function CollegeCard({ college }: { college: CollegeRecord }) {
  const categories = college.academicAreas.length ? college.academicAreas.slice(0, 3).join(" · ") : null;
  const courses = college.courses.length ? college.courses.slice(0, 2).join(" · ") : null;

  return (
    <TiltCard className="h-full">
      <Link
        href={`/explore/${college.slug}`}
        data-cursor="explore"
        className="card card-hover group p-5 flex flex-col justify-between h-full bg-white border border-surface-border shadow-card"
      >
        <div>
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-extrabold text-base transition-transform duration-300 group-hover:scale-105"
              style={{
                backgroundColor: collegeColor(college.name, 0.12),
                color: collegeColor(college.name, 1),
              }}
            >
              {college.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-base text-ink-900 group-hover:text-brand-blue transition-colors truncate">
                {college.name}
              </h3>
              <p className="text-xs text-ink-500 truncate mt-0.5">
                {[college.campus, college.location].filter(Boolean).join(" · ") || "Delhi University"}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            {categories && (
              <p className="text-xs font-semibold text-brand-blue truncate">
                {categories}
              </p>
            )}
            {courses && (
              <p className="text-xs text-ink-600 truncate">
                {courses}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-surface-border/80 flex items-center justify-between text-xs">
          <span className="font-bold text-ink-400 group-hover:text-brand-red transition-colors">
            View College Take →
          </span>
          {college.type && (
            <span className="rounded-full bg-surface-soft px-2.5 py-0.5 font-medium text-ink-500">
              {college.type}
            </span>
          )}
        </div>
      </Link>
    </TiltCard>
  );
}

function MentorCarousel({ mentors }: { mentors: MentorRecord[] }) {
  if (!mentors.length) return null;

  return (
    <div className="relative overflow-hidden">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {mentors.map((mentor) => (
          <article
            key={mentor.id}
            className="card p-6 flex flex-col justify-between bg-white border border-surface-border shadow-card"
          >
            <div>
              <div className="flex items-center gap-3.5">
                {mentor.photoUrl ? (
                  <img
                    src={mentor.photoUrl}
                    alt={mentor.name}
                    className="h-12 w-12 rounded-2xl object-cover border border-surface-border"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue-soft text-brand-blue font-extrabold text-lg">
                    {mentor.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="truncate font-bold text-ink-900">{mentor.name}</h3>
                  <p className="mt-0.5 text-xs font-semibold text-brand-red">{mentor.role || "Senior Mentor"}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-ink-600 line-clamp-3">
                {mentor.bio || "DU senior mentor sharing authentic academic and campus insights."}
              </p>
            </div>
            <div className="mt-4 border-t border-surface-border pt-3">
              <p className="text-xs font-semibold text-brand-blue truncate">
                {[mentor.college, mentor.course, mentor.year].filter(Boolean).join(" · ") || "DU Community"}
              </p>
              {mentor.expertise && (
                <p className="mt-1 text-[11px] text-ink-500 font-medium truncate">
                  Focus: {mentor.expertise}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function VideoDiscovery({
  videos,
  selectedCategory,
  onSelectCategory,
}: {
  videos: VideoRecord[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}) {
  const filteredVideos = useMemo(() => {
    if (selectedCategory === "all") return videos;
    return videos.filter((v) => v.category === selectedCategory);
  }, [videos, selectedCategory]);

  const featuredVideo = filteredVideos[0];
  const supportingVideos = filteredVideos.slice(1);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(videoCategoryMap).map(([key, label]) => {
          const isActive = selectedCategory === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectCategory(key)}
              className={`rounded-full px-4 py-2 text-xs font-extrabold transition-all duration-200 ${
                isActive
                  ? "bg-brand-blue text-white shadow-soft"
                  : "border border-surface-border bg-white text-ink-700 hover:border-brand-blue/40 hover:bg-surface-soft"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {featuredVideo ? (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr] items-start">
          <div className="card overflow-hidden bg-white border border-surface-border shadow-lift p-2">
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-ink-900">
              <iframe
                src={sanitizeYouTubeUrl(featuredVideo.youtubeUrl || "")}
                title={featuredVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-brand-red-soft px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-brand-red">
                  {videoCategoryMap[featuredVideo.category] || "DU Unfiltered"}
                </span>
                {featuredVideo.college && (
                  <span className="text-xs font-semibold text-ink-500">
                    {featuredVideo.college}
                  </span>
                )}
              </div>
              <h3 className="mt-3 text-xl sm:text-2xl font-black text-ink-900 leading-snug">
                {featuredVideo.title}
              </h3>
              {featuredVideo.description && (
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  {featuredVideo.description}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-400">
              More Student Stories ({supportingVideos.length})
            </p>
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {supportingVideos.map((video) => {
                const thumb = getYouTubeThumbnailUrl(video.youtubeUrl || "");
                return (
                  <a
                    key={video.id}
                    href={video.youtubeUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card card-hover flex gap-3.5 p-3.5 bg-white border border-surface-border group"
                  >
                    <div className="relative h-20 w-32 shrink-0 rounded-xl overflow-hidden bg-ink-900">
                      {thumb ? (
                        <img src={thumb} alt={video.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-white text-xs font-bold">DU Story</div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10">
                        <span className="h-7 w-7 rounded-full bg-white/90 text-brand-red flex items-center justify-center text-xs font-black shadow-sm">
                          ▶
                        </span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-ink-900 group-hover:text-brand-blue transition-colors line-clamp-2">
                        {video.title}
                      </h4>
                      <p className="mt-1 text-[11px] text-ink-500 truncate">
                        {video.college || "Delhi University"}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState title="No videos in this category yet">
            Watch campus tours and student stories as our Campus Correspondents post new content.
          </EmptyState>
        </div>
      )}
    </div>
  );
}

function WriteReviewModal({
  isOpen,
  onClose,
  colleges,
}: {
  isOpen: boolean;
  onClose: () => void;
  colleges: CollegeRecord[];
}) {
  const [collegeId, setCollegeId] = useState(colleges[0]?.id || "");
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!collegeId && colleges.length > 0) {
      setCollegeId(colleges[0].id);
    }
  }, [colleges, collegeId]);

  if (!isOpen) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!collegeId) return;
    setSubmitting(true);
    setMessage(null);
    const res = await createAnonymousReview({ collegeId, name, rating, review });
    setSubmitting(false);
    if (res.error) {
      setMessage(res.error);
    } else {
      setMessage("Thanks! Your student take is awaiting quick moderation before appearing publicly.");
      setName("");
      setReview("");
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 2500);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink-900/60 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-lg max-h-[90dvh] overflow-y-auto p-5 sm:p-8 bg-white shadow-lift border border-surface-border relative">
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 text-ink-400 hover:text-ink-700 text-xl font-bold p-2 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          ✕
        </button>
        <span className="eyebrow text-brand-red">STUDENT REVIEWS</span>
        <h2 className="mt-2 text-2xl font-extrabold text-ink-900">Write an Anonymous Review</h2>
        <p className="mt-1 text-sm text-ink-500">
          Skip the brochure fluff. No email, signup, or login required.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="field-label" htmlFor="modal-college">
              Choose College
            </label>
            <select
              id="modal-college"
              required
              value={collegeId}
              onChange={(e) => setCollegeId(e.target.value)}
              className="field-input"
            >
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.campus || "DU"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label" htmlFor="modal-name">
              Your Name / Handle
            </label>
            <input
              id="modal-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Physics Major '25 or Anonymous"
              className="field-input"
            />
          </div>

          <div>
            <label className="field-label">Vibe Rating</label>
            <div className="mt-2 flex items-center gap-1.5" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setRating(val)}
                  onMouseEnter={() => setHoverRating(val)}
                  onMouseLeave={() => setHoverRating(0)}
                  className={`text-2xl min-h-[44px] min-w-[36px] flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${
                    val <= (hoverRating || rating) ? "text-brand-red" : "text-ink-400/40"
                  }`}
                  aria-label={`${val} star${val > 1 ? "s" : ""}`}
                >
                  ★
                </button>
              ))}
              <span className="ml-2 text-xs font-bold text-ink-500">
                {rating === 5 ? "Top Tier" : rating === 4 ? "Solid" : rating === 3 ? "Decent" : "Needs Work"}
              </span>
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="modal-review">
              Your Honest Review
            </label>
            <textarea
              id="modal-review"
              required
              rows={4}
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="What is this college really like? Mention faculty, crowd, societies, labs, or placement reality."
              className="field-input"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full justify-center py-3 text-sm font-extrabold shadow-card disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Post Anonymous Review →"}
          </button>

          {message && (
            <p className="text-xs font-bold text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center" role="status">
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const [colleges, setColleges] = useState<CollegeRecord[]>([]);
  const [mentors, setMentors] = useState<MentorRecord[]>([]);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [recentReviews, setRecentReviews] = useState<ReviewRecord[]>([]);
  const [videoCategory, setVideoCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [campus, setCampus] = useState("");
  const [academicArea, setAcademicArea] = useState("");
  const [collegeType, setCollegeType] = useState("");
  const [sort, setSort] = useState("name");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getColleges(), getMentors(), getVideos(), getApprovedReviews(6)]).then(
      ([collegeResult, mentorResult, videoResult, reviewResult]) => {
        if (cancelled) return;
        setColleges(collegeResult.data);
        setMentors(mentorResult.data);
        setVideos(videoResult.data);
        setRecentReviews(reviewResult.data);
        setError(collegeResult.error || mentorResult.error || videoResult.error);
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredColleges = useMemo(() => {
    const terms = normalize(search).split(" ").filter(Boolean);
    return colleges
      .filter((college) => {
        const searchable = normalize(
          [
            college.name,
            college.about || "",
            college.campus,
            college.location,
            college.type,
            ...college.courses,
            ...college.academicAreas,
          ].join(" ")
        );
        return (
          terms.every((term) => searchable.includes(term)) &&
          (!campus || college.campus === campus) &&
          (!academicArea || college.academicAreas.includes(academicArea)) &&
          (!collegeType || college.type === collegeType)
        );
      })
      .sort((a, b) => {
        if (sort === "location") return a.location.localeCompare(b.location) || a.name.localeCompare(b.name);
        if (sort === "recent") return (b.createdAt || "").localeCompare(a.createdAt || "") || a.name.localeCompare(b.name);
        return a.name.localeCompare(b.name);
      });
  }, [academicArea, campus, collegeType, colleges, search, sort]);

  const hasFilters = Boolean(search || campus || academicArea || collegeType);
  function clearFilters() {
    setSearch("");
    setCampus("");
    setAcademicArea("");
    setCollegeType("");
    setSort("name");
  }
  const resultLabel = filteredColleges.length === 1 ? "College" : "Colleges";

  return (
    <PageShell
      title="Explore Delhi University | DU Science Hub"
      description="Explore Delhi University colleges, courses, campus experiences and student perspectives with DU Science Hub."
      backgroundPreset="explore"
    >
      {/* 1. EDITORIAL HEADER & 4 PRIMARY PATHWAYS */}
      <section className="bg-brand-blue-pale/60 backdrop-blur-[2px] border-b border-surface-border pt-12 pb-16 sm:pt-16 sm:pb-20">
        <div className="container-px max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <p className="eyebrow text-brand-red">EXPLORE DU</p>
            <h1 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-ink-900 leading-[1.1]">
              Explore Colleges & Student Reviews.
            </h1>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-ink-600 font-medium">
              Explore all 91 Delhi University institutions, read verified perspectives, watch real campus stories, and connect with mentors.
            </p>
          </div>

          {/* 4 Obvious Doors: What do you want to do? */}
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Door 1: Explore Colleges */}
            <TiltCard className="h-full">
              <a
                href="#college-directory"
                className="card card-hover p-6 sm:p-7 h-full flex flex-col justify-between bg-white border border-surface-border shadow-card group"
              >
                <div>
                  <span className="inline-block rounded-lg bg-brand-blue-soft text-brand-blue px-3 py-1 text-[11px] font-black uppercase tracking-wider">
                    DU COLLEGES
                  </span>
                  <h2 className="mt-4 text-xl font-black text-ink-900 group-hover:text-brand-blue transition-colors">
                    Explore Colleges
                  </h2>
                  <p className="mt-2 text-sm text-ink-500 leading-relaxed">
                    91 DU colleges at a glance. Campus locations, courses and cutoffs.
                  </p>
                </div>
                <span className="mt-6 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-brand-blue">
                  EXPLORE COLLEGES →
                </span>
              </a>
            </TiltCard>

            {/* Door 2: Student Reviews (High Priority) */}
            <TiltCard className="h-full">
              <div className="card card-hover p-6 sm:p-7 h-full flex flex-col justify-between bg-white border-2 border-brand-red/40 shadow-lift group">
                <div>
                  <span className="inline-block rounded-lg bg-brand-red text-white px-3 py-1 text-[11px] font-black uppercase tracking-wider shadow-sm">
                    STUDENT REVIEWS
                  </span>
                  <h2 className="mt-4 text-xl font-black text-ink-900 group-hover:text-brand-red transition-colors">
                    Student Reviews
                  </h2>
                  <p className="mt-2 text-sm text-ink-500 leading-relaxed">
                    Skip the brochure. Hear what students actually experienced.
                  </p>
                </div>
                <div className="mt-6 flex flex-col gap-2">
                  <a
                    href="#reviews"
                    className="text-xs font-black uppercase tracking-wider text-brand-red hover:underline"
                  >
                    READ REVIEWS →
                  </a>
                  <button
                    onClick={() => setIsReviewModalOpen(true)}
                    className="btn-primary py-1.5 px-3 text-xs font-black text-center shadow-soft"
                  >
                    WRITE A REVIEW →
                  </button>
                </div>
              </div>
            </TiltCard>

            {/* Door 3: DU Unfiltered */}
            <TiltCard className="h-full">
              <a
                href="#du-unfiltered"
                className="card card-hover p-6 sm:p-7 h-full flex flex-col justify-between bg-white border border-surface-border shadow-card group"
              >
                <div>
                  <span className="inline-block rounded-lg bg-brand-blue-soft text-brand-blue px-3 py-1 text-[11px] font-black uppercase tracking-wider">
                    DU UNFILTERED
                  </span>
                  <h2 className="mt-4 text-xl font-black text-ink-900 group-hover:text-brand-blue transition-colors">
                    Watch Stories
                  </h2>
                  <p className="mt-2 text-sm text-ink-500 leading-relaxed">
                    Real student takes, honest interviews, podcasts and campus tours.
                  </p>
                </div>
                <span className="mt-6 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-brand-blue">
                  WATCH UNFILTERED →
                </span>
              </a>
            </TiltCard>

            {/* Door 4: Seniors & Mentors */}
            <TiltCard className="h-full">
              <a
                href="#mentors"
                className="card card-hover p-6 sm:p-7 h-full flex flex-col justify-between bg-white border border-surface-border shadow-card group"
              >
                <div>
                  <span className="inline-block rounded-lg bg-brand-blue-soft text-brand-blue px-3 py-1 text-[11px] font-black uppercase tracking-wider">
                    SENIORS & MENTORS
                  </span>
                  <h2 className="mt-4 text-xl font-black text-ink-900 group-hover:text-brand-blue transition-colors">
                    Meet Mentors
                  </h2>
                  <p className="mt-2 text-sm text-ink-500 leading-relaxed">
                    Learn from seniors who have already navigated admissions and courses.
                  </p>
                </div>
                <span className="mt-6 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-brand-blue">
                  MEET THE MENTORS →
                </span>
              </a>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* 2. STUDENT REVIEWS SPOTLIGHT (HIGH-PRIORITY FEATURE) */}
      <section id="reviews" className="scroll-mt-24 py-16 sm:py-24 border-b border-surface-border">
        <div className="container-px max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="eyebrow text-brand-red">STUDENT REVIEWS</p>
              <h2 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-ink-900">
                Skip the brochure. Hear from students.
              </h2>
              <p className="mt-3 text-base sm:text-lg text-ink-600 max-w-2xl leading-relaxed">
                See what students actually experienced. Real perspectives from people attending these campuses daily.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setIsReviewModalOpen(true)}
                className="btn-primary py-3.5 px-6 text-sm font-black shadow-lift active:scale-95"
              >
                WRITE A REVIEW →
              </button>
            </div>
          </div>

          {/* Reviews Stream / Cards */}
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recentReviews.length > 0 ? (
              recentReviews.map((r) => (
                <div
                  key={r.id}
                  className="card p-6 flex flex-col justify-between bg-white border border-surface-border shadow-card"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-brand-red">
                        {"★".repeat(r.rating)}{"☆".repeat(Math.max(0, 5 - r.rating))}
                      </span>
                      {r.collegeName && (
                        <span className="rounded-full bg-brand-blue-soft text-brand-blue px-2.5 py-0.5 text-[11px] font-extrabold truncate max-w-[170px]">
                          {r.collegeName}
                        </span>
                      )}
                    </div>
                    <p className="mt-4 text-sm text-ink-700 leading-relaxed font-normal italic">
                      "{r.review}"
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-surface-border flex items-center justify-between text-xs text-ink-400">
                    <span className="font-bold text-ink-800">{r.name}</span>
                    {r.collegeSlug ? (
                      <Link
                        href={`/explore/${r.collegeSlug}`}
                        className="text-brand-blue font-bold hover:underline"
                      >
                        View College →
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full card border-dashed p-10 text-center bg-white">
                <p className="text-base font-bold text-ink-900">Be the first to share your college take.</p>
                <p className="mt-1 text-sm text-ink-500">Reviews help incoming first-years discover what each campus is really like.</p>
                <button
                  onClick={() => setIsReviewModalOpen(true)}
                  className="btn-secondary mt-6"
                >
                  Write the First Review →
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. COLLEGE DIRECTORY WITH STICKY FILTER BAR */}
      <section id="college-directory" className="scroll-mt-24 py-16 sm:py-24 border-b border-surface-border">
        <div className="container-px">
          <SectionHeading
            eyebrow="VERIFIED DIRECTORY"
            title="Browse 91 DU Colleges"
            subtitle="Search official Delhi University institutions."
            description="Verified college records with campus details, academic disciplines, and undergraduate programs."
          />

          {/* Sticky Filter Bar */}
          <div className="mt-8 sticky top-16 sm:top-20 z-30 rounded-3xl border border-surface-border bg-white/95 backdrop-blur-md p-4 sm:p-6 shadow-soft">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Icon name="search" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
                <input
                  type="search"
                  aria-label="Search colleges"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search 91 colleges (e.g. Hindu, Miranda, Hansraj)..."
                  className="field-input pl-12"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-[140px]">
                  <SortSelect sort={sort} onChange={setSort} />
                </div>
                {hasFilters && (
                  <button onClick={clearFilters} className="btn-ghost text-xs whitespace-nowrap shrink-0 px-3.5 py-2.5 min-h-[44px]">
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Filter Pills */}
            <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-surface-border">
              <span className="text-xs font-bold text-ink-400 self-center mr-1 hidden sm:inline">Filter:</span>
              <div className="flex-1 min-w-[130px]">
                <select
                  aria-label="Filter by campus"
                  value={campus}
                  onChange={(event) => setCampus(event.target.value)}
                  className="filter-select text-xs"
                >
                  <option value="">All Campuses</option>
                  {campusOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[130px]">
                <select
                  aria-label="Filter by academic area"
                  value={academicArea}
                  onChange={(event) => setAcademicArea(event.target.value)}
                  className="filter-select text-xs"
                >
                  <option value="">All Disciplines</option>
                  {academicOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[130px]">
                <select
                  aria-label="Filter by college type"
                  value={collegeType}
                  onChange={(event) => setCollegeType(event.target.value)}
                  className="filter-select text-xs"
                >
                  <option value="">All Institution Types</option>
                  {typeOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-auto sm:ml-auto flex items-center justify-between sm:justify-end text-xs font-bold text-ink-500 pt-1 sm:pt-0">
                <span>{filteredColleges.length} {resultLabel}</span>
              </div>
            </div>
          </div>

          <div className="mt-8">
            {loading ? (
              <SkeletonCollegeGrid count={6} />
            ) : error ? (
              <EmptyState title="College directory needs attention">{error}</EmptyState>
            ) : filteredColleges.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredColleges.map((college) => (
                  <CollegeCard college={college} key={college.id} />
                ))}
              </div>
            ) : (
              <EmptyState title={hasFilters ? "No colleges match those filters" : "Official college records are coming soon"}>
                {isSupabaseConfigured
                  ? "There are no published college records matching this search yet."
                  : "The directory interface is ready. Connect the official DU dataset to publish college records without adding unverified information."}
              </EmptyState>
            )}
          </div>
        </div>
      </section>

      {/* 4. DU UNFILTERED MEDIA EXPERIENCE */}
      <section id="du-unfiltered" className="scroll-mt-24 py-16 sm:py-24 border-b border-surface-border">
        <div className="container-px">
          <SectionHeading
            eyebrow="DU UNFILTERED"
            title="Real student takes. Zero brochure energy."
            subtitle="Campus tours, student interviews, podcasts and honest conversations."
            description="Watch real student experiences and campus stories from the Delhi University community."
          />
          <div className="mt-10">
            <VideoDiscovery
              videos={videos}
              selectedCategory={videoCategory}
              onSelectCategory={setVideoCategory}
            />
          </div>
        </div>
      </section>

      {/* 5. SENIORS & MENTORS SHOWCASE */}
      <section id="mentors" className="scroll-mt-24 bg-surface-soft/60 backdrop-blur-[2px] py-16 sm:py-24">
        <div className="container-px">
          <SectionHeading
            eyebrow="SENIORS & MENTORS"
            title="Meet the people who've already been there."
            subtitle="Guidance on courses, societies, admissions and campus life."
            description="Verified seniors and alumni sharing real insights across science, commerce, humanities, and campus life."
          />
          <div className="mt-10">
            <MentorCarousel mentors={mentors} />
          </div>
        </div>
      </section>

      {/* Write Review Modal */}
      <WriteReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        colleges={colleges}
      />
    </PageShell>
  );
}

function SortSelect({ sort, onChange }: { sort: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="sr-only">Sort by</span>
      <select
        aria-label="Sort by"
        value={sort}
        onChange={(event) => onChange(event.target.value)}
        className="filter-select text-xs"
      >
        <option value="name">Sort: Alphabetical</option>
        <option value="recent">Sort: Recently Added</option>
      </select>
    </label>
  );
}