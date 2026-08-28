import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import SectionHeading from "./components/SectionHeading";
import PlatformPanel from "./components/PlatformPanel";
import ProductCard from "./components/ProductCard";
import VideoCard from "./components/VideoCard";
import ReviewCard from "./components/ReviewCard";
import MentorCard from "./components/MentorCard";
import OpportunityCard from "./components/OpportunityCard";
import Footer from "./components/Footer";
import Icon from "./components/Icon";
import InteractiveDotGrid from "./components/InteractiveDotGrid";
import { platformPanels } from "./data/platformPanels";
import { videos, videoCategories } from "./data/videos";
import { reviews } from "./data/reviews";
import { mentors } from "./data/mentors";
import { opportunities } from "./data/opportunities";
import { exploreDuCards } from "./data/exploreDu";

function DuScienceHubHome() {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main>
        <Hero />

        {/* UNIFIED PLATFORM SECTION — THREE CORE PANELS */}
        <section id="pillars" className="py-12 sm:py-16 lg:py-20">
          <div className="container-px">
            <SectionHeading
              eyebrow="Three ways to use the hub"
              title="Your DU journey, all in one place"
              description="Three ways to get involved — explore the university, join the team, or find your next opportunity."
            />
            <div className="mt-10 lg:mt-12 grid gap-5 lg:gap-6 lg:grid-cols-3 max-w-[1280px] mx-auto">
              {platformPanels.map((panel) => (
                <div
                  key={panel.id}
                  id={panel.id === "explore-du" ? undefined : panel.id}
                  className="min-w-0 scroll-mt-24"
                >
                  <PlatformPanel {...panel} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* EXPLORE DU DISCOVERY HUB */}
        <section id="explore-du" className="scroll-mt-20 py-16 sm:py-20 lg:py-24 bg-surface-soft border-y border-surface-border">
          <div className="container-px">
            <SectionHeading
              eyebrow="Explore DU"
              title="Explore DU"
              subtitle="A Complete DU Guide, By the Seniors."
              description="Discover DU colleges, college guides, courses, campus life, student experiences, reviews, seniors, mentors, interviews and campus videos in one student-first space."
            />
            <div className="mt-10 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {exploreDuCards.map((card) => (
                <ProductCard key={card.id} {...card} />
              ))}
            </div>

            {/* COLLEGE REVIEWS PREVIEW */}
            <div id="reviews-preview" className="scroll-mt-20 mt-16 sm:mt-20">
            <SectionHeading
                eyebrow="Student Reviews · Preview"
                title="What Students Say"
                description="A preview of the student-review experience. Community comments will be connected to college pages when the data source is selected."
            />
              <div className="mt-10 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {reviews.map((r) => (
                  <ReviewCard key={r.id} {...r} />
                ))}
              </div>
              <div className="mt-8 flex justify-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-surface-border text-ink-500 text-xs font-semibold">
                  Preview · Demo content
                </span>
              </div>
            </div>

            {/* MENTOR PREVIEW */}
            <div id="mentor-preview" className="scroll-mt-20 mt-16 sm:mt-20 pt-16 sm:pt-20 border-t border-surface-border">
            <SectionHeading
              eyebrow="Mentors"
              title="Learn From Someone Who's Been There"
              description="Connect with seniors who've navigated DU and can guide you on admissions, courses and careers."
            />
              <div className="mt-10 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {mentors.map((m) => (
                  <MentorCard key={m.id} {...m} />
                ))}
              </div>
            </div>

            {/* DU UNFILTERED / STUDENT MEDIA */}
            <div id="du-unfiltered" className="scroll-mt-20 mt-16 sm:mt-20 pt-16 sm:pt-20 border-t border-surface-border">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-2xl">
                  <p className="eyebrow mb-3">Explore DU · Student voices</p>
                  <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900">DU Unfiltered</h3>
                  <p className="mt-3 text-base sm:text-lg text-ink-500 leading-relaxed">
                    Real student experiences, honest college reviews and conversations from the DU community.
                  </p>
                </div>
                <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-surface-border text-ink-500 text-xs font-semibold">
                  Preview · Content in progress
                </span>
              </div>
              <div className="mt-8 flex flex-wrap gap-2">
                {videoCategories.map((c) => (
                  <span
                    key={c.id}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white border border-surface-border text-ink-700"
                  >
                    {c.label}
                  </span>
                ))}
              </div>
              <div className="mt-8 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {videos.map((v) => (
                  <VideoCard key={v.id} {...v} />
                ))}
              </div>
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
              <a href="#find-opportunities" className="btn-secondary">
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

export default function App() {
  const path = window.location.pathname;

  if (path === "/dot-grid") {
    return <InteractiveDotGrid />;
  }

  return <DuScienceHubHome />;
}
