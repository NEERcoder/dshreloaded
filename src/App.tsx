import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import SectionHeading from "./components/SectionHeading";
import PlatformPanel from "./components/PlatformPanel";
import VideoCard from "./components/VideoCard";
import ReviewCard from "./components/ReviewCard";
import MentorCard from "./components/MentorCard";
import OpportunityCard from "./components/OpportunityCard";
import Footer from "./components/Footer";
import Icon from "./components/Icon";
import { platformPanels } from "./data/platformPanels";
import { videos, videoCategories } from "./data/videos";
import { reviews } from "./data/reviews";
import { mentors } from "./data/mentors";
import { opportunities } from "./data/opportunities";

export default function App() {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main>
        <Hero />

        {/* UNIFIED PLATFORM SECTION — THREE CORE PANELS */}
        <section id="platform" className="py-12 sm:py-16 lg:py-20">
          <div className="container-px">
            <SectionHeading
              eyebrow="The Platform"
              title="The DU Science Hub Platform"
              description="Three ways to get involved — explore the university, join the team, or find your next opportunity."
            />
            <div className="mt-10 lg:mt-12 grid gap-5 lg:gap-6 lg:grid-cols-3 max-w-[1280px] mx-auto">
              {platformPanels.map((panel) => (
                <PlatformPanel key={panel.id} {...panel} />
              ))}
            </div>
          </div>
        </section>

        {/* YOUTUBE / STUDENT CONTENT */}
        <section id="student-content" className="py-16 sm:py-20 lg:py-24 bg-surface-soft border-y border-surface-border">
          <div className="container-px">
            <SectionHeading
              eyebrow="Student Media"
              title="Real Student Experiences"
              description="Watch college reviews, student interviews, campus stories and conversations from the DU community."
            />
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {videoCategories.map((c) => (
                <span
                  key={c.id}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white border border-surface-border text-ink-700"
                >
                  {c.label}
                </span>
              ))}
            </div>
            <div className="mt-10 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {videos.map((v) => (
                <VideoCard key={v.id} {...v} />
              ))}
            </div>
          </div>
        </section>

        {/* COLLEGE REVIEWS PREVIEW */}
        <section id="reviews-preview" className="py-16 sm:py-20 lg:py-24">
          <div className="container-px">
            <SectionHeading
              eyebrow="Student Reviews"
              title="What Students Say"
              description="Real experiences from students across DU."
            />
            <div className="mt-12 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.map((r) => (
                <ReviewCard key={r.id} {...r} />
              ))}
            </div>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="#reviews-preview" className="btn-ghost w-full sm:w-auto">
                View All Reviews
              </a>
              <a href="#reviews-preview" className="btn-primary w-full sm:w-auto">
                Write a Review
              </a>
            </div>
          </div>
        </section>

        {/* MENTOR PREVIEW */}
        <section id="mentor-preview" className="py-16 sm:py-20 lg:py-24 bg-surface-soft border-y border-surface-border">
          <div className="container-px">
            <SectionHeading
              eyebrow="Mentors"
              title="Learn From Someone Who's Been There"
              description="Connect with seniors who've navigated DU and can guide you on admissions, courses and careers."
            />
            <div className="mt-12 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {mentors.map((m) => (
                <MentorCard key={m.id} {...m} />
              ))}
            </div>
          </div>
        </section>

        {/* OPPORTUNITY PREVIEW */}
        <section id="opportunity-preview" className="py-16 sm:py-20 lg:py-24">
          <div className="container-px">
            <SectionHeading
              eyebrow="Opportunities"
              title="Opportunities Worth Exploring"
              description="A preview of the internships, jobs, competitions and certifications coming to DU Science Hub."
            />
            <div className="mt-6 flex justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-blue-soft text-brand-blue text-xs font-bold">
                <Icon name="flag" className="h-3.5 w-3.5" />
                Preview · Demo content
              </span>
            </div>
            <div className="mt-8 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {opportunities.map((o) => (
                <OpportunityCard key={o.id} {...o} />
              ))}
            </div>
            <div className="mt-10 text-center">
              <a href="#platform" className="btn-secondary">
                Explore Opportunities
                <Icon name="arrow" className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
