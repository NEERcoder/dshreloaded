import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import SectionHeading from "./components/SectionHeading";
import ProductCard from "./components/ProductCard";
import RoleCard from "./components/RoleCard";
import VideoCard from "./components/VideoCard";
import ReviewCard from "./components/ReviewCard";
import MentorCard from "./components/MentorCard";
import OpportunityCard from "./components/OpportunityCard";
import Footer from "./components/Footer";
import Icon from "./components/Icon";
import { exploreDuCards } from "./data/exploreDu";
import { roles } from "./data/roles";
import { opportunityCategories } from "./data/opportunityCategories";
import { videos, videoCategories } from "./data/videos";
import { reviews } from "./data/reviews";
import { mentors } from "./data/mentors";
import { opportunities } from "./data/opportunities";
import { useReveal } from "./hooks/useReveal";

export default function App() {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main>
        <Hero />

        {/* SECTION 1 — EXPLORE DU */}
        <section id="explore-du" className="py-16 sm:py-20 lg:py-24">
          <div className="container-px">
            <SectionHeading
              eyebrow="Explore DU"
              title="Explore DU"
              subtitle="A Complete DU Guide, By the Seniors."
              description="Discover colleges, hear from students, watch real campus experiences and find guidance from people who have already been through the DU journey."
            />
            <div className="mt-12 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {exploreDuCards.map((card) => (
                <ProductCard key={card.id} {...card} />
              ))}
            </div>
            <div className="mt-10 text-center">
              <a href="#explore-du" className="btn-primary">
                Explore DU
                <Icon name="arrow" className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        {/* SECTION 2 — JOIN DU SCIENCE HUB */}
        <section id="join-team" className="py-16 sm:py-20 lg:py-24 bg-surface-soft border-y border-surface-border">
          <div className="container-px">
            <SectionHeading
              eyebrow="Join Our Team"
              title="Join DU Science Hub"
              subtitle="Build Something Students Actually Use."
              description="We're building a student-powered platform for DU — and we're looking for ambitious students to help us build it."
            />
            <div className="mt-12 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {roles.map((role) => (
                <RoleCard key={role.id} {...role} />
              ))}
            </div>
            <div className="mt-10 text-center">
              <a href="#join-team" className="btn-secondary">
                Join Our Team
                <Icon name="arrow" className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        {/* SECTION 3 — FIND OPPORTUNITIES */}
        <section id="find-opportunities" className="py-16 sm:py-20 lg:py-24">
          <div className="container-px">
            <SectionHeading
              eyebrow="Opportunities"
              title="Find Opportunities"
              subtitle="Internships, Jobs & Competitions for BSc & Science Students."
              description="Discover opportunities that can help you build experience, develop skills and move forward academically and professionally."
            />
            <div className="mt-12 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {opportunityCategories.map((cat) => (
                <OpportunityCategoryCard key={cat.id} {...cat} />
              ))}
            </div>
            <div className="mt-10 text-center">
              <a href="#opportunity-preview" className="btn-primary">
                Explore Opportunities
                <Icon name="arrow" className="h-4 w-4" />
              </a>
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
            <div className="mt-12 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
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

type OpportunityCategoryCardProps = (typeof opportunityCategories)[number];

function OpportunityCategoryCard({ title, description, icon, accent, available }: OpportunityCategoryCardProps) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const accentBg = accent === "red" ? "bg-brand-red-soft text-brand-red" : "bg-brand-blue-soft text-brand-blue";
  return (
    <div ref={ref} className={`reveal ${visible ? "is-visible" : ""} card card-hover p-6 flex flex-col gap-4 group relative`}>
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${accentBg} transition-transform group-hover:scale-110`}>
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-bold text-ink-900 flex items-center gap-2">
        {title}
        {!available && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-surface-soft text-ink-400 border border-surface-border">
            Soon
          </span>
        )}
      </h3>
      <p className="text-sm text-ink-500 leading-relaxed">{description}</p>
    </div>
  );
}
