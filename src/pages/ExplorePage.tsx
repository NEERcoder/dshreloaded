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

const campusOptions = ["North Campus", "South Campus", "Off Campus", "Other"];
const academicOptions = ["Science", "Commerce", "Arts & Humanities", "Social Sciences", "Management / Commerce", "Vocational", "Education", "Law", "Medicine / Health", "Other"];
const typeOptions = ["Co-educational", "Women's", "Specialized"];

function normalize(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function EmptyState({ title, children }: { title: string; children: string }) {
  return (
    <div className="card border-dashed p-8 text-center sm:p-10">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue-soft text-brand-blue">
        <Icon name="building" className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-bold text-ink-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-500">{children}</p>
    </div>
  );
}

function MentorCarousel({ mentors }: { mentors: MentorRecord[] }) {
  if (!mentors.length) {
    return <EmptyState title="Mentor profiles are coming soon">We’ll feature real seniors and mentors who have worked with DU Science Hub once their approved profiles are connected.</EmptyState>;
  }
  return (
    <div className="mentor-carousel" aria-label="Seniors and mentors">
      <div className="mentor-track">
        {[...mentors, ...mentors].map((mentor, index) => (
          <article className="mentor-slide card p-5" key={`${mentor.id}-${index}`}>
            <div className="flex items-center gap-4">
              {mentor.photoUrl ? <img src={mentor.photoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" loading="lazy" /> : <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-red-soft font-extrabold text-brand-red">{mentor.name.slice(0, 1)}</div>}
              <div className="min-w-0"><h3 className="truncate font-bold text-ink-900">{mentor.name}</h3><p className="mt-1 text-xs text-ink-500">{mentor.role || "DU Science Hub mentor"}</p></div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-500">{mentor.bio || "Profile details coming soon."}</p>
            <p className="mt-4 text-xs font-semibold text-brand-blue">{[mentor.college, mentor.course, mentor.year].filter(Boolean).join(" · ") || "DU community"}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function VideoDiscovery({ videos }: { videos: VideoRecord[] }) {
  if (!videos.length) {
    return <EmptyState title="DU Unfiltered is getting ready">Real college reviews, campus tours, interviews, podcasts and CUET guidance will appear here when the official video records are added.</EmptyState>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((video) => (
        <a key={video.id} href={video.youtubeUrl || undefined} target={video.youtubeUrl ? "_blank" : undefined} rel={video.youtubeUrl ? "noreferrer" : undefined} className="card card-hover group overflow-hidden">
          <div className="flex aspect-video items-center justify-center bg-brand-blue-soft">{video.thumbnail ? <img src={video.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Icon name="play" className="h-10 w-10 text-brand-blue" />}</div>
          <div className="p-5"><p className="eyebrow">{video.category.replace(/_/g, " ")}</p><h3 className="mt-2 font-bold leading-snug text-ink-900 group-hover:text-brand-blue">{video.title}</h3>{video.description && <p className="mt-2 text-sm leading-relaxed text-ink-500">{video.description}</p>}{video.duration && <p className="mt-4 text-xs font-semibold text-ink-400">{video.duration}</p>}</div>
        </a>
      ))}
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="filter-select">
        <option value="">All {label.toLowerCase()}</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function CollegeCard({ college }: { college: CollegeRecord }) {
  return (
    <a href={`/explore/${college.slug}`} className="card card-hover group overflow-hidden">
      <div className="flex h-32 items-center justify-center bg-brand-blue-pale p-5">
        <img src="/DSH_OFFICIAL_LOGO.png" alt="" className="max-h-12 w-auto opacity-60 transition-opacity group-hover:opacity-90" />
      </div>
      <div className="p-5">
        <p className="eyebrow">{college.campus || "Delhi University"}</p>
        <h3 className="mt-2 text-lg font-bold leading-snug text-ink-900 group-hover:text-brand-blue">{college.name}</h3>
        <p className="mt-2 text-sm text-ink-500">{college.location || "Location information coming soon."}</p>
        {college.academicAreas.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{college.academicAreas.slice(0, 3).map((area) => <span key={area} className="rounded-full bg-brand-blue-soft px-2.5 py-1 text-[11px] font-semibold text-brand-blue">{area}</span>)}</div>}
        <p className="mt-4 text-sm leading-relaxed text-ink-500">{college.about || "A verified college overview is coming soon."}</p>
        {college.courses.length > 0 && <p className="mt-4 text-xs font-semibold text-brand-blue">{college.courses.slice(0, 3).join(" · ")}</p>}
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand-blue">View College <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
      </div>
    </a>
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
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getColleges(), getMentors(), getVideos()]).then(([collegeResult, mentorResult, videoResult]) => {
      if (cancelled) return;
      setColleges(collegeResult.data);
      setMentors(mentorResult.data);
      setVideos(videoResult.data);
      setError(collegeResult.error || mentorResult.error || videoResult.error);
    });
    return () => { cancelled = true; };
  }, []);

  const filteredColleges = useMemo(() => {
    const terms = normalize(search).split(" ").filter(Boolean);
    return colleges
      .filter((college) => {
        const searchable = normalize([college.name, college.about || "", college.campus, college.location, college.type, ...college.courses, ...college.academicAreas].join(" "));
        return terms.every((term) => searchable.includes(term)) && (!campus || college.campus === campus) && (!academicArea || college.academicAreas.includes(academicArea)) && (!collegeType || college.type === collegeType);
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
    <PageShell title="Explore Delhi University | DU Science Hub" description="Explore Delhi University colleges, courses, campus experiences and student perspectives with DU Science Hub.">
      <section className="border-b border-surface-border bg-brand-blue-pale">
        <div className="container-px py-14 sm:py-20 lg:py-24">
          <p className="eyebrow">EXPLORE DU</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">Find Your Place at DU.</h1>
          <p className="mt-4 text-lg font-semibold text-brand-blue">A Complete DU Guide, By the Seniors.</p>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-500 sm:text-lg">Explore colleges, courses, campus life and real student experiences — all in one place.</p>
          <a href="#directory" className="btn-secondary mt-8">Browse colleges <Icon name="arrow" className="h-4 w-4" /></a>
        </div>
      </section>

      <section id="directory" className="scroll-mt-24 border-b border-surface-border bg-surface-soft py-14 sm:py-20">
        <div className="container-px">
          <SectionHeading eyebrow="College directory" title="Find your DU college" description="Search official college records by name, course, campus, location or academic area." />
          <div className="card mt-8 p-4 sm:p-5">
            <div className="relative">
              <Icon name="search" className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search colleges, courses or keywords..." aria-label="Search colleges, courses or keywords" className="field-input pl-10" />
            </div>
            <div className="mt-3 hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4">
              <FilterSelect label="Campus" value={campus} options={campusOptions} onChange={setCampus} />
              <FilterSelect label="Academic area" value={academicArea} options={academicOptions} onChange={setAcademicArea} />
              <FilterSelect label="College type" value={collegeType} options={typeOptions} onChange={setCollegeType} />
              <SortSelect sort={sort} onChange={setSort} />
            </div>
            <button type="button" className="btn-ghost mt-3 w-full sm:hidden" onClick={() => setFiltersOpen(true)}><Icon name="filter" className="h-4 w-4" /> Filters</button>
            {filtersOpen && (
              <div className="fixed inset-0 z-50 flex items-end bg-ink-900/30 sm:hidden" role="dialog" aria-modal="true" aria-label="College filters" onClick={() => setFiltersOpen(false)}>
                <div className="w-full rounded-t-3xl bg-white p-5 shadow-lift" onClick={(event) => event.stopPropagation()}>
                  <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-ink-900">Filters</h2><button type="button" className="text-sm font-semibold text-ink-500" onClick={() => setFiltersOpen(false)}>Close</button></div>
                  <div className="mt-5 space-y-3"><FilterSelect label="Campus" value={campus} options={campusOptions} onChange={setCampus} /><FilterSelect label="Academic area" value={academicArea} options={academicOptions} onChange={setAcademicArea} /><FilterSelect label="College type" value={collegeType} options={typeOptions} onChange={setCollegeType} /><SortSelect sort={sort} onChange={setSort} /></div>
                  <div className="mt-5 flex gap-3"><button type="button" className="btn-ghost flex-1" onClick={clearFilters}>Clear</button><button type="button" className="btn-secondary flex-1" onClick={() => setFiltersOpen(false)}>Show results</button></div>
                </div>
              </div>
            )}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink-700">{filteredColleges.length} {resultLabel}{filteredColleges.length !== 1 ? "" : ""}{hasFilters ? " Found" : ""}</p>
            <div className="flex items-center gap-3">{hasFilters && <button type="button" onClick={clearFilters} className="text-xs font-bold text-brand-blue hover:underline">Clear filters</button>}{!isSupabaseConfigured && <span className="text-xs font-semibold text-brand-red">Directory data connection pending</span>}</div>
          </div>
          <div className="mt-5">{error ? <EmptyState title="College directory needs attention">{error}</EmptyState> : filteredColleges.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filteredColleges.map((college) => <CollegeCard college={college} key={college.id} />)}</div> : <EmptyState title={hasFilters ? "No colleges match those filters" : "Official college records are coming soon"}>{isSupabaseConfigured ? "There are no published college records matching this search yet." : "The directory interface is ready. Connect the official DU dataset to publish college records without adding unverified information."}</EmptyState>}</div>
        </div>
      </section>

      <section id="du-unfiltered" className="scroll-mt-24 py-14 sm:py-20">
        <div className="container-px">
          <SectionHeading eyebrow="Student voices" title="DU Unfiltered" description="College reviews, campus tours, interviews, podcasts, CUET guidance and campus stories—without made-up stats." />
          <div className="mt-8 flex flex-wrap gap-2">{["College Reviews", "Campus Tours", "Student Interviews", "Podcasts", "CUET Guidance", "Campus Stories"].map((category) => <span key={category} className="rounded-full border border-surface-border bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-700">{category}</span>)}</div>
          <div className="mt-8"><VideoDiscovery videos={videos} /></div>
        </div>
      </section>

      <section id="mentors" className="scroll-mt-24 border-t border-surface-border bg-surface-soft py-14 sm:py-20">
        <div className="container-px"><SectionHeading eyebrow="Seniors & mentors" title="Learn from someone who’s been there." description="Profiles will be published only after real mentor information is connected and approved." /><div className="mt-8"><MentorCarousel mentors={mentors} /></div></div>
      </section>
    </PageShell>
  );
}

function SortSelect({ sort, onChange }: { sort: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="sr-only">Sort by</span><select aria-label="Sort by" value={sort} onChange={(event) => onChange(event.target.value)} className="filter-select"><option value="name">Sort: Alphabetical</option><option value="recent">Sort: Recently Added</option><option value="rating" disabled>Sort: Highest Rated (coming soon)</option><option value="reviews" disabled>Sort: Most Reviewed (coming soon)</option></select></label>;
}