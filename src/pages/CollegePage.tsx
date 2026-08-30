import { FormEvent, useEffect, useState } from "react";
import Icon from "../components/Icon";
import PageShell from "../components/PageShell";
import SectionHeading from "../components/SectionHeading";
import {
  createAnonymousReview,
  getCollegeBySlug,
  getMentors,
  getReviewsByCollege,
  getVideos,
  type CollegeRecord,
  type MentorRecord,
  type ReviewRecord,
  type VideoRecord,
} from "../lib/dataAccess";
import { isSupabaseConfigured } from "../lib/supabase";

function ComingSoon({ label }: { label: string }) {
  return <div className="card border-dashed p-8 text-center"><h3 className="font-bold text-ink-900">{label} coming soon</h3><p className="mt-2 text-sm leading-relaxed text-ink-500">This section will appear when verified college data is connected. DU Science Hub does not publish unverified facts.</p></div>;
}

export default function CollegePage({ slug }: { slug: string }) {
  const [college, setCollege] = useState<CollegeRecord | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [mentors, setMentors] = useState<MentorRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCollegeBySlug(slug).then(async (collegeResult) => {
      if (cancelled) return;
      setCollege(collegeResult.data);
      if (collegeResult.error || !collegeResult.data) {
        setError(collegeResult.error);
        setLoading(false);
        return;
      }
      const [reviewResult, videoResult, mentorResult] = await Promise.all([
        getReviewsByCollege(collegeResult.data.id),
        getVideos(),
        getMentors(),
      ]);
      if (cancelled) return;
      setReviews(reviewResult.data);
      setVideos(videoResult.data.filter((video) => video.college === collegeResult.data?.name));
      setMentors(mentorResult.data.filter((mentor) => mentor.college === collegeResult.data?.name));
      setError(reviewResult.error || videoResult.error || mentorResult.error);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return <PageShell title="Loading college | DU Science Hub"><div className="container-px py-24 text-center text-sm text-ink-500">Loading verified college information…</div></PageShell>;
  }

  if (!college) {
    return (
      <PageShell title="College profile coming soon | DU Science Hub">
        <section className="container-px py-20 sm:py-28">
          <a href="/explore" className="text-sm font-semibold text-brand-blue hover:underline">← Back to Explore DU</a>
          <div className="mt-8 max-w-2xl">
            <p className="eyebrow">College profile</p>
            <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight text-ink-900">This college profile is coming soon.</h1>
            <p className="mt-5 text-lg leading-relaxed text-ink-500">{error || (isSupabaseConfigured ? "There is no published record for this college yet." : "The college directory is ready, but its verified data has not been connected yet.")}</p>
            <a href="/explore" className="btn-secondary mt-8">Explore the directory <Icon name="arrow" className="h-4 w-4" /></a>
          </div>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell title={`${college.name} | DU Science Hub`} description={`Explore ${college.name} on DU Science Hub.`}>
      <section className="bg-brand-blue-pale border-b border-surface-border">
        <div className="container-px py-14 sm:py-20">
          <a href="/explore" className="text-sm font-semibold text-brand-blue hover:underline">← Back to Explore DU</a>
          <p className="eyebrow mt-8">{college.campus || "Delhi University"} {college.location ? `· ${college.location}` : ""}</p>
          <h1 className="mt-3 max-w-3xl text-4xl sm:text-5xl font-extrabold tracking-tight text-ink-900">{college.name}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-500">{college.about || "Verified college profile information from the DU Science Hub directory."}</p>
        </div>
      </section>
      <section className="py-14 sm:py-20">
        <div className="container-px grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Campus" value={college.campus} />
          <Fact label="Location" value={college.location} />
          <Fact label="College type" value={college.type} />
          <Fact label="Academic areas" value={college.academicAreas.join(", ")} />
        </div>
        <div className="container-px mt-14 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <SectionHeading eyebrow="Courses" title="What can you study?" />
            <div className="mt-6">{college.courses.length ? <div className="flex flex-wrap gap-2">{college.courses.map((course) => <span key={course} className="rounded-full bg-brand-blue-soft px-3.5 py-2 text-sm font-semibold text-brand-blue">{course}</span>)}</div> : <ComingSoon label="Courses" />}</div>
          </div>
          <div>
            <SectionHeading eyebrow="Campus information" title="Know before you go." />
            <div className="mt-6"><ComingSoon label="Campus details" /></div>
          </div>
        </div>
      </section>
      <section className="border-y border-surface-border bg-surface-soft py-14 sm:py-20">
        <div className="container-px">
          <SectionHeading eyebrow="DU Unfiltered" title="Student voices from this college" />
          <div className="mt-6">{videos.length ? <div className="grid gap-4 sm:grid-cols-2">{videos.map((video) => <a className="card card-hover p-5" href={video.youtubeUrl || undefined} key={video.id}><p className="eyebrow">{video.category}</p><h3 className="mt-2 font-bold text-ink-900">{video.title}</h3></a>)}</div> : <ComingSoon label="DU Unfiltered videos" />}</div>
        </div>
      </section>
      <section className="py-14 sm:py-20">
        <div className="container-px grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <SectionHeading eyebrow="Student reviews" title="What students are saying" description="Only approved reviews are shown publicly. Anyone can submit a review without creating an account." />
            <div className="mt-6 space-y-4">
              {reviews.length ? reviews.map((review) => <ReviewItem review={review} key={review.id} />) : <ComingSoon label="Student reviews" />}
            </div>
          </div>
          <ReviewForm collegeId={college.id} onCreated={(review) => setReviews((current) => [review, ...current])} />
        </div>
      </section>
      <section className="border-t border-surface-border bg-surface-soft py-14 sm:py-20">
        <div className="container-px"><SectionHeading eyebrow="Seniors & mentors" title="Guidance from the DU community" /><div className="mt-6">{mentors.length ? <div className="grid gap-4 sm:grid-cols-2">{mentors.map((mentor) => <div className="card p-5" key={mentor.id}><h3 className="font-bold text-ink-900">{mentor.name}</h3><p className="mt-1 text-sm text-ink-500">{mentor.role || "Mentor"}{mentor.course ? ` · ${mentor.course}` : ""}</p><p className="mt-3 text-sm leading-relaxed text-ink-500">{mentor.bio || "Profile details coming soon."}</p></div>)}</div> : <ComingSoon label="Mentors" />}</div></div>
      </section>
      {error && <p className="container-px py-4 text-xs text-brand-red" role="status">Some profile sections could not load: {error}</p>}
    </PageShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="card p-5"><p className="text-xs font-bold uppercase tracking-wider text-ink-400">{label}</p><p className="mt-2 font-bold text-ink-900">{value || "Coming soon"}</p></div>;
}

function ReviewItem({ review }: { review: ReviewRecord }) {
  const [reported, setReported] = useState(false);
  return <article className="card p-5"><div className="flex items-start justify-between gap-4"><div><h3 className="font-bold text-ink-900">{review.name}</h3><div className="mt-1 flex items-center gap-2 text-xs text-ink-400"><span className="text-brand-red">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span><time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString()}</time></div></div><button onClick={() => setReported(true)} className="text-xs font-semibold text-ink-400 hover:text-brand-red">{reported ? "Reported" : "Report"}</button></div><p className="mt-4 text-sm leading-relaxed text-ink-600">{review.review}</p></article>;
}

function ReviewForm({ collegeId, onCreated }: { collegeId: string; onCreated: (review: ReviewRecord) => void }) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState("5");
  const [review, setReview] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (!isSupabaseConfigured) {
      setMessage("Review submissions are paused until the Supabase publishable configuration is completed.");
      return;
    }
    setSubmitting(true);
    const result = await createAnonymousReview({ collegeId, name, rating: Number(rating), review });
    setSubmitting(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setMessage("Thanks—your review is awaiting moderation before it appears publicly.");
    setName("");
    setReview("");
    if (result.data) onCreated(result.data);
  }

  return <form onSubmit={submit} className="card p-5 sm:p-6"><p className="eyebrow">Share your experience</p><h2 className="mt-2 text-2xl font-extrabold text-ink-900">Tell the next student.</h2><p className="mt-3 text-sm leading-relaxed text-ink-500">No account, email, phone or college ID required.</p><label className="field-label mt-5" htmlFor="review-name">Name</label><input id="review-name" required value={name} onChange={(event) => setName(event.target.value)} className="field-input" placeholder="Your name" /><label className="field-label mt-4" htmlFor="review-rating">Rating</label><select id="review-rating" value={rating} onChange={(event) => setRating(event.target.value)} className="field-input">{[5, 4, 3, 2, 1].map((value) => <option value={value} key={value}>{value} out of 5</option>)}</select><label className="field-label mt-4" htmlFor="review-comment">Review</label><textarea id="review-comment" required minLength={10} value={review} onChange={(event) => setReview(event.target.value)} className="field-input min-h-32 resize-y" placeholder="What should a future student know?" /><button disabled={submitting} className="btn-primary mt-5 w-full disabled:opacity-60">{submitting ? "Posting…" : "Post review"}</button>{message && <p className="mt-3 text-sm font-semibold text-ink-700" role="status">{message}</p>}</form>;
}
