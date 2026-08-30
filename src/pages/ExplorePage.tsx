import { useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";
import PageShell from "../components/PageShell";
import SectionHeading from "../components/SectionHeading";
import {
  getColleges,
  getMentors,
  getVideos,
  type CollegeRecord,
  type MentorRecord,
  type VideoRecord,
} from "../lib/dataAccess";
import { isSupabaseConfigured } from "../lib/supabase";

const campusOptions = ["North Campus", "South Campus", "Off Campus", "Other/Specialized"];
const academicOptions = [
  "Science",
  "Commerce",
  "Arts & Humanities",
  "Social Sciences",
  "Management/Commerce",
  "Vocational",
  "Education",
  "Law",
  "Medicine/Health",
  "Other",
];
const typeOptions = ["Co-educational", "Women's", "Specialized"];

function EmptyState({ title, children }: { title: string; children: string }) {
  return (
    <div className="card border-dashed p-8 sm:p-10 text-center">
      <div className="mx-auto h-12 w-12 rounded-2xl bg-brand-blue-soft text-brand-blue flex items-center justify-center">
        <Icon name="building" className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-bold text-ink-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-500">{children}</p>
    </div>
  );
}

function MentorCarousel({ mentors }: { mentors: MentorRecord[] }) {
  if (!mentors.length) {
    return (
      <EmptyState title="Mentor profiles are coming soon">
        We’ll feature real seniors and mentors who have worked with DU Science Hub once their approved profiles are connected.
      </EmptyState>
    );
  }

  const cards = [...mentors, ...mentors];
  return (
    <div className="mentor-carousel" aria-label="Seniors and mentors">
      <div className="mentor-track">
        {cards.map((mentor, index) => (
          <article className="mentor-slide card p-5" key={`${mentor.id}-${index}`}>
            <div className="flex items-center gap-4">
              {mentor.photoUrl ? (
                <img src={mentor.photoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" loading="lazy" />
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-brand-red-soft text-brand-red flex items-center justify-center font-extrabold">
                  {mentor.name.slice(0, 1)}
                </div>
              )}
              <div className="min-w-0">
                <h3 className="font-bold text-ink-900 truncate">{mentor.name}</h3>
                <p className="mt-1 text-xs text-ink-500">{mentor.role || "DU Science Hub mentor"}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-500">
              {mentor.bio || "Profile details coming soon."}
            </p>
            <p className="mt-4 text-xs font-semibold text-brand-blue">
              {[mentor.college, mentor.course, mentor.year].filter(Boolean).join(" · ") || "DU community"}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

function VideoDiscovery({ videos }: { videos: VideoRecord[] }) {
  if (!videos.length) {
    return (
      <EmptyState title="DU Unfiltered is getting ready">
        Real college reviews, campus tours, interviews, podcasts and CUET guidance will appear here when the official video records are added.
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((video) => (
        <a
          key={video.id}
          href={video.youtubeUrl || undefined}
          target={video.youtubeUrl ? "_blank" : undefined}
          rel={video.youtubeUrl ? "noreferrer" : undefined}
          className="card card-hover overflow-hidden group"
        >
          <div className="aspect-video bg-brand-blue-soft flex items-center justify-center">
            {video.thumbnail ? (
              <img src={video.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <Icon name="play" className="h-10 w-10 text-brand-blue" />
            )}
          </div>
          <div className="p-5">
            <p className="eyebrow">{video.category}</p>
            <h3 className="mt-2 font-bold leading-snug text-ink-900 group-hover:text-brand-blue">{video.title}</h3>
            {video.description && <p className="mt-2 text-sm leading-relaxed text-ink-500">{video.description}</p>}
            {video.duration && <p className="mt-4 text-xs font-semibold text-ink-400">{video.duration}</p>}
          </div>
        </a>
      ))}
    </div>
  );
}

export default function ExplorePage() {
  const [colleges, setColleges] = useState<CollegeRecord[]>([]);
  const [mentors, setMentors] = useState<MentorRecord[]>([]);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [campus, setCampus] = useState("");
  const [academicArea, setAcademicArea] = useState("");
  const [collegeType, setCollegeType] = useState("");
  const [sort, setSort] = useState("name");

  useEffect(() => {
    let cancelled = false;
    Promise.all([getColleges(), getMentors(), getVideos()]).then(([collegeResult, mentorResult, videoResult]) => {
      if (cancelled) return;
      setColleges(collegeResult.data);
      setMentors(mentorResult.data);
      setVideos(videoResult.data);
      setError(collegeResult.error || mentorResult.error || videoResult.error);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredColleges = useMemo(() => {
    const query = search.trim().toLowerCase();
    return colleges
      .filter((college) => {
        const searchable = [
          college.name,
          college.campus,
          college.location,
          college.type,
          ...college.courses,
          ...college.academicAreas,
        ].join(" ").toLowerCase();
        return (
          (!query || searchable.includes(query)) &&
          (!campus || college.campus === campus) &&
          (!academicArea || college.academicAreas.includes(academicArea)) &&
          (!collegeType || college.type === collegeType)
        );
      })
      .sort((a, b) => (sort === "location" ? a.location.localeCompare(b.location) : a.name.localeCompare(b.name)));
  }, [academicArea, campus, collegeType, colleges, search, sort]);

  return (
    <PageShell
      title="Explore Delhi University | DU Science Hub"
      description="Explore Delhi University colleges, student experiences, mentors and DU Unfiltered."
    >
      <section className="bg-brand-blue-pale border-b border-surface-border">
        <div className="container-px py-14 sm:py-20 lg:py-24">
          <p className="eyebrow">Explore DU</p>
          <h1 className="mt-3 max-w-3xl text-4xl sm:text-5xl font-extrabold tracking-tight text-ink-900">
            A complete DU guide, by the seniors.
          </h1>
          <p className="mt-5 max-w-2xl text-base sm:text-lg leading-relaxed text-ink-500">
            Find college information, real student voices, campus stories and guidance in one student-first space.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            <a href="#directory" className="btn-secondary">Browse colleges <Icon name="arrow" className="h-4 w-4" /></a>
            <a href="#du-unfiltered" className="btn-ghost">Watch DU Unfiltered</a>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="container-px">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["DU Unfiltered", "Real student experiences, interviews and campus stories.", "#du-unfiltered", "play"],
              ["College Directory", "Search colleges by campus, course and academic area.", "#directory", "building"],
              ["Student Reviews", "Read and share experiences without an account.", "#directory", "star"],
              ["Seniors & Mentors", "Learn from people who have navigated the DU journey.", "#mentors", "users"],
            ].map(([title, description, href, icon]) => (
              <a href={href} key={title} className="card card-hover p-5">
                <div className="h-11 w-11 rounded-xl bg-brand-red-soft text-brand-red flex items-center justify-center">
                  <Icon name={icon} className="h-5 w-5" />
                </div>
                <h2 className="mt-4 font-bold text-ink-900">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{description}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="directory" className="scroll-mt-24 border-y border-surface-border bg-surface-soft py-14 sm:py-20">
        <div className="container-px">
          <SectionHeading
            eyebrow="College directory"
            title="Find your DU college"
            description="Search official college records by name, course, campus, location or academic area."
          />
          <div className="mt-8 card p-4 sm:p-5">
            <div className="relative">
              <Icon name="search" className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by college, course, campus or location"
                className="w-full rounded-xl border border-surface-border bg-white py-3 pl-10 pr-4 text-sm text-ink-900 placeholder:text-ink-400"
              />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <select value={campus} onChange={(event) => setCampus(event.target.value)} className="filter-select">
                <option value="">All campuses</option>
                {campusOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
              <select value={academicArea} onChange={(event) => setAcademicArea(event.target.value)} className="filter-select">
                <option value="">All academic areas</option>
                {academicOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
              <select value={collegeType} onChange={(event) => setCollegeType(event.target.value)} className="filter-select">
                <option value="">All college types</option>
                {typeOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="filter-select">
                <option value="name">Sort: name</option>
                <option value="location">Sort: location</option>
              </select>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink-700">{filteredColleges.length} {filteredColleges.length === 1 ? "result" : "results"}</p>
            {!isSupabaseConfigured && <span className="text-xs font-semibold text-brand-red">Directory data connection pending</span>}
          </div>
          <div className="mt-5">
            {error ? (
              <EmptyState title="College directory needs attention">{error}</EmptyState>
            ) : filteredColleges.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredColleges.map((college) => (
                  <a href={`/explore/${college.slug}`} key={college.id} className="card card-hover p-5">
                    <p className="eyebrow">{college.campus || "Delhi University"}</p>
                    <h3 className="mt-2 text-lg font-bold text-ink-900">{college.name}</h3>
                    <p className="mt-2 text-sm text-ink-500">{college.location || "Location details coming soon."}</p>
                    <p className="mt-4 text-xs font-semibold text-brand-blue">{college.courses.slice(0, 2).join(" · ") || "Courses coming soon"}</p>
                  </a>
                ))}
              </div>
            ) : (
              <EmptyState title="Official college records are coming soon">
                {isSupabaseConfigured
                  ? "There are no published college records matching this search yet."
                  : "The directory interface is ready. Connect the official DU dataset to publish college records without adding unverified information."}
              </EmptyState>
            )}
          </div>
        </div>
      </section>

      <section id="du-unfiltered" className="scroll-mt-24 py-14 sm:py-20">
        <div className="container-px">
          <SectionHeading
            eyebrow="Student voices"
            title="DU Unfiltered"
            description="College reviews, campus tours, interviews, podcasts, CUET guidance and campus stories—without made-up stats."
          />
          <div className="mt-8 flex flex-wrap gap-2">
            {["College Reviews", "Campus Tours", "Student Interviews", "Podcasts", "CUET Guidance", "Campus Stories"].map((category) => (
              <span key={category} className="rounded-full border border-surface-border bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-700">{category}</span>
            ))}
          </div>
          <div className="mt-8"><VideoDiscovery videos={videos} /></div>
        </div>
      </section>

      <section id="mentors" className="scroll-mt-24 border-t border-surface-border bg-surface-soft py-14 sm:py-20">
        <div className="container-px">
          <SectionHeading
            eyebrow="Seniors & mentors"
            title="Learn from someone who’s been there."
            description="Profiles will be published only after real mentor information is connected and approved."
          />
          <div className="mt-8"><MentorCarousel mentors={mentors} /></div>
        </div>
      </section>
    </PageShell>
  );
}
