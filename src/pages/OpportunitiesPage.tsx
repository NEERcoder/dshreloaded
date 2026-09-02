import { useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";
import PageShell from "../components/PageShell";
import SectionHeading from "../components/SectionHeading";
import TiltCard from "../components/TiltCard";
import DeadlineProgress from "../components/DeadlineProgress";
import { SkeletonOpportunityGrid } from "../components/Skeleton";
import { Link } from "../lib/router";
import { getOpportunities, type OpportunityRecord } from "../lib/dataAccess";
import { sanitizeExternalUrl } from "../lib/urlSafety";

const categoryMap: Record<string, OpportunityRecord["category"]> = {
  internships: "internship",
  competitions: "competition",
  research: "research",
  certifications: "certification",
};

const categoryVoice: Record<string, { eyebrow: string; title: string; subtitle: string }> = {
  internships: {
    eyebrow: "INTERNSHIPS",
    title: "Find experience worth applying for.",
    subtitle: "Verified industry and startup roles for Delhi University undergraduates.",
  },
  competitions: {
    eyebrow: "COMPETITIONS",
    title: "Put your skills to work.",
    subtitle: "National contests, hackathons, and challenges worth winning.",
  },
  research: {
    eyebrow: "RESEARCH",
    title: "Find opportunities to learn and contribute.",
    subtitle: "Faculty laboratory attachments, funded fellowships, and academic projects.",
  },
  certifications: {
    eyebrow: "CERTIFICATIONS",
    title: "Build skills that strengthen your next application.",
    subtitle: "Verified credentials recognized across academia and industry.",
  },
};

const mainCategories = [
  {
    id: "internships",
    tag: "INTERNSHIPS",
    headline: "Find experience worth applying for.",
    description: "Industry attachments, startup projects, and technical internships.",
    cta: "EXPLORE INTERNSHIPS",
    accent: "blue",
    icon: "briefcase",
  },
  {
    id: "competitions",
    tag: "COMPETITIONS",
    headline: "Put your skills to work.",
    description: "National hackathons, case challenges, and lab competitions.",
    cta: "EXPLORE COMPETITIONS",
    accent: "red",
    icon: "target",
  },
  {
    id: "research",
    tag: "RESEARCH",
    headline: "Opportunities to learn & contribute.",
    description: "Faculty lab attachments, fellowships, and academic paper co-authorship.",
    cta: "EXPLORE RESEARCH",
    accent: "blue",
    icon: "book",
  },
  {
    id: "certifications",
    tag: "CERTIFICATIONS",
    headline: "Skills for your next application.",
    description: "Verified certifications in Python, Data Science, and laboratory techniques.",
    cta: "EXPLORE CERTIFICATIONS",
    accent: "blue",
    icon: "award",
  },
];

function OpportunityList({ category }: { category?: OpportunityRecord["category"] }) {
  const [items, setItems] = useState<OpportunityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("");
  const [paid, setPaid] = useState("");
  const [sort, setSort] = useState("featured");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getOpportunities(category).then((result) => {
      if (cancelled) return;
      setItems(result.data);
      setError(result.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [category]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return items
      .filter((item) => {
        const searchable = [
          item.title,
          item.organization,
          item.field,
          item.location,
          item.description,
          ...item.eligibleCourses,
        ]
          .join(" ")
          .toLowerCase();
        const isPaid = Boolean(item.stipend && !/unpaid|voluntary/i.test(item.stipend));
        return (
          (!query || searchable.includes(query)) &&
          (!mode || item.mode === mode) &&
          (!paid || (paid === "paid" ? isPaid : !isPaid))
        );
      })
      .sort((a, b) =>
        sort === "deadline"
          ? (a.deadline || "z").localeCompare(b.deadline || "z")
          : Number(b.featured) - Number(a.featured)
      );
  }, [items, mode, paid, search, sort]);

  return (
    <div className="mt-8">
      {/* Search and Filters */}
      <div className="card p-5 sm:p-6 bg-white shadow-card border border-surface-border">
        <div className="relative">
          <Icon name="search" className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by role, company, skills, or department…"
            className="field-input pl-11"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[140px]">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="filter-select text-xs"
            >
              <option value="">All Work Modes</option>
              <option value="Remote">Remote</option>
              <option value="On-site">On-site</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>

          <div className="flex-1 min-w-[140px]">
            <select
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
              className="filter-select text-xs"
            >
              <option value="">All Compensation</option>
              <option value="paid">Paid Only</option>
              <option value="unpaid">Volunteer / Unpaid</option>
            </select>
          </div>

          <div className="w-full sm:w-auto sm:ml-auto min-w-[140px]">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="filter-select text-xs"
            >
              <option value="featured">Sort: Featured First</option>
              <option value="deadline">Sort: Closest Deadline</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mt-8">
        {loading ? (
          <SkeletonOpportunityGrid count={6} />
        ) : error ? (
          <div className="card border-dashed p-10 text-center bg-white">
            <p className="text-base font-bold text-ink-900">Opportunities feed needs attention</p>
            <p className="mt-1 text-sm text-ink-500">{error}</p>
          </div>
        ) : filtered.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <OpportunityCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="card border-dashed p-10 text-center bg-white">
            <p className="text-base font-bold text-ink-900">No opportunities match those filters</p>
            <p className="mt-1 text-sm text-ink-500">Try clearing filters or search terms.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function OpportunityCard({ item }: { item: OpportunityRecord }) {
  const safeUrl = sanitizeExternalUrl(item.applicationUrl);

  return (
    <TiltCard className="h-full">
      <article
        data-cursor="view"
        className="card card-hover p-6 h-full flex flex-col justify-between bg-white border border-surface-border shadow-card"
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
          <h3 className="mt-4 font-bold text-lg leading-snug text-ink-900">{item.title}</h3>
          <p className="mt-1 text-sm font-semibold text-ink-600">{item.organization}</p>
          <p className="mt-3 text-sm leading-relaxed text-ink-500 line-clamp-3">{item.description}</p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-400">
            {item.mode && <span className="font-semibold text-ink-600">{item.mode}</span>}
            {item.field && <span>{item.field}</span>}
            {item.stipend && <span className="font-bold text-emerald-600">{item.stipend}</span>}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-surface-border">
          <DeadlineProgress deadline={item.deadline} createdAt={item.createdAt} />
          {safeUrl ? (
            <a
              href={safeUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-outline-blue mt-4 w-full justify-center text-xs font-bold"
            >
              View Listing <Icon name="arrow" className="h-4 w-4" />
            </a>
          ) : (
            <span className="mt-4 block text-center text-xs font-semibold text-ink-400">
              Application details coming soon
            </span>
          )}
        </div>
      </article>
    </TiltCard>
  );
}

export default function OpportunitiesPage({ categoryId }: { categoryId?: string }) {
  const category = categoryId ? categoryMap[categoryId] : undefined;
  const currentVoice = categoryId && categoryVoice[categoryId]
    ? categoryVoice[categoryId]
    : {
        eyebrow: "OPPORTUNITY RADAR",
        title: "Find Things Worth Applying For.",
        subtitle: "Verified internships, hackathons, research fellowships, and credentials for DU students.",
      };

  return (
    <PageShell
      title={category ? `${category.toUpperCase()} | Opportunity Radar | DU Science Hub` : "Find Opportunities | DU Science Hub"}
      description="Find verified science internships, hackathons, research fellowships and certifications for DU students."
      backgroundPreset="opportunities"
    >
      {/* 1. EDITORIAL HEADER */}
      <section className="bg-brand-blue-pale/60 backdrop-blur-[2px] border-b border-surface-border pt-12 pb-16 sm:pt-16 sm:pb-20">
        <div className="container-px max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <p className="eyebrow text-brand-red">{currentVoice.eyebrow}</p>
            <h1 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-ink-900 leading-[1.1]">
              {currentVoice.title}
            </h1>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-ink-600 font-medium">
              {currentVoice.subtitle}
            </p>
          </div>

          {/* 2. THE 4 MAIN CATEGORIES (DOORS) WHEN AT ROOT /OPPORTUNITIES */}
          {!categoryId && (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {mainCategories.map((cat) => {
                const isRed = cat.accent === "red";
                return (
                  <TiltCard key={cat.id} className="h-full">
                    <Link
                      href={`/opportunities/${cat.id}`}
                      data-cursor="view"
                      className="card card-hover p-6 sm:p-7 h-full flex flex-col justify-between bg-white border border-surface-border shadow-card group"
                    >
                      <div>
                        <span
                          className={`inline-block rounded-lg px-3 py-1 text-[11px] font-black uppercase tracking-wider ${
                            isRed
                              ? "bg-brand-red text-white shadow-sm"
                              : "bg-brand-blue text-white shadow-sm"
                          }`}
                        >
                          {cat.tag}
                        </span>

                        <h2 className="mt-5 text-xl font-black text-ink-900 group-hover:text-brand-blue transition-colors leading-snug">
                          {cat.headline}
                        </h2>

                        <p className="mt-3 text-sm text-ink-500 leading-relaxed font-normal">
                          {cat.description}
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between">
                        <span
                          className={`text-xs font-black uppercase tracking-wider ${
                            isRed ? "text-brand-red" : "text-brand-blue"
                          }`}
                        >
                          {cat.cta} →
                        </span>
                        <div className="h-8 w-8 rounded-xl bg-surface-soft flex items-center justify-center text-ink-600 group-hover:bg-brand-blue-soft group-hover:text-brand-blue transition-colors">
                          <Icon name="arrow" className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </Link>
                  </TiltCard>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 3. OPPORTUNITY RADAR FEED */}
      <section id="radar-feed" className="py-14 sm:py-20">
        <div className="container-px max-w-7xl mx-auto">
          {categoryId ? (
            <div className="mb-6 flex items-center justify-between">
              <Link
                href="/opportunities"
                className="inline-flex items-center gap-2 text-xs font-black text-brand-blue hover:underline uppercase tracking-wider"
              >
                ← Back to All 4 Categories
              </Link>
              <span className="text-xs font-bold text-ink-500 uppercase tracking-wider">
                Showing {category} listings
              </span>
            </div>
          ) : (
            <SectionHeading
              eyebrow="OPPORTUNITY RADAR"
              title="All Active Listings"
              subtitle="Filter and search across all verified science opportunities."
              description="Real deadlines, verified partner organizations, and student-eligible openings."
            />
          )}

          <OpportunityList category={category} />
        </div>
      </section>
    </PageShell>
  );
}
