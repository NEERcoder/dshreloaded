import { FormEvent, useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";
import PageShell from "../components/PageShell";
import SectionHeading from "../components/SectionHeading";
import TiltCard from "../components/TiltCard";
import DeadlineProgress from "../components/DeadlineProgress";
import { SkeletonOpportunityGrid } from "../components/Skeleton";
import { Link, useLocation } from "../lib/router";
import { useAuth } from "../context/AuthContext";
import {
  getOpportunities,
  getOpportunityById,
  getCompetitionTeamsForCompetition,
  createCompetitionTeam,
  joinCompetitionTeamByCode,
  type OpportunityRecord,
  type CompetitionTeamRecord,
} from "../lib/dataAccess";
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
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
              <OpportunityCard key={item.id} item={item} onSelect={setSelectedId} />
            ))}
          </div>
        ) : (
          <div className="card border-dashed p-10 text-center bg-white">
            <p className="text-base font-bold text-ink-900">No opportunities match those filters</p>
            <p className="mt-1 text-sm text-ink-500">Try clearing filters or search terms.</p>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selectedId && (
        <OpportunityDetail
          opportunityId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

const CATEGORY_BADGE: Record<string, string> = {
  internship: "bg-brand-blue-soft text-brand-blue",
  competition: "bg-brand-red-soft text-brand-red",
  research: "bg-brand-blue-soft text-brand-blue",
  certification: "bg-brand-blue-soft text-brand-blue",
  job: "bg-brand-blue-soft text-brand-blue",
  fellowship: "bg-brand-red-soft text-brand-red",
  scholarship: "bg-brand-red-soft text-brand-red",
};

function OpportunityCard({ item, onSelect }: { item: OpportunityRecord; onSelect: (id: string) => void }) {
  const safeUrl = sanitizeExternalUrl(item.applicationUrl);

  return (
    <TiltCard className="h-full">
      <article
        data-cursor="view"
        className="card card-hover h-full flex flex-col bg-white border border-surface-border shadow-card overflow-hidden"
      >
        {/* Poster */}
        {item.imageUrl ? (
          <div className="h-36 w-full overflow-hidden bg-surface-soft cursor-pointer" onClick={() => onSelect(item.id)}>
            <img
              src={item.imageUrl}
              alt={`${item.title} poster`}
              className="h-full w-full object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
        ) : null}

        <div className="p-6 flex flex-col flex-1 justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className={`rounded-md px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider ${CATEGORY_BADGE[item.category] ?? "bg-surface-soft text-ink-600"}`}>
                {item.category}
              </span>
              <div className="flex items-center gap-1.5">
                {item.teamFormationEnabled && (
                  <span className="rounded-full bg-brand-blue-soft px-2 py-0.5 text-[11px] font-bold text-brand-blue">
                    Teams
                  </span>
                )}
                {item.featured && (
                  <span className="rounded-full bg-brand-red-soft px-2.5 py-0.5 text-[11px] font-bold text-brand-red">
                    Featured
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => onSelect(item.id)}
              className="mt-4 text-left font-bold text-lg leading-snug text-ink-900 hover:text-brand-blue transition-colors w-full"
            >
              {item.title}
            </button>
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
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => onSelect(item.id)}
                className="btn-ghost flex-1 justify-center text-xs font-bold"
              >
                Details {item.teamFormationEnabled ? "& Teams" : ""}
              </button>
              {safeUrl && (
                <a
                  href={safeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline-blue flex-1 justify-center text-xs font-bold"
                >
                  Apply <Icon name="arrow" className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </article>
    </TiltCard>
  );
}

// -------------------------------------------------------
// OPPORTUNITY DETAIL (slide-up panel with team formation)
// -------------------------------------------------------
function OpportunityDetail({ opportunityId, onClose }: { opportunityId: string; onClose: () => void }) {
  const { user } = useAuth();
  const { navigate } = useLocation();
  const [opp, setOpp] = useState<OpportunityRecord | null>(null);
  const [teams, setTeams] = useState<CompetitionTeamRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Team creation
  const [teamName, setTeamName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Join by code
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getOpportunityById(opportunityId).then(async (res) => {
      if (cancelled) return;
      setOpp(res.data);
      if (res.data?.teamFormationEnabled) {
        const teamsRes = await getCompetitionTeamsForCompetition(opportunityId);
        if (!cancelled) setTeams(teamsRes.data);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [opportunityId]);

  async function handleCreateTeam(e: FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) return;
    setCreating(true);
    setCreateError(null);
    const result = await createCompetitionTeam(opportunityId, teamName);
    setCreating(false);
    if (result.error || !result.data) {
      setCreateError(result.error || "Failed to create team.");
    } else {
      navigate(`/teams/${result.data.id}`);
    }
  }

  async function handleJoinTeam(e: FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError(null);
    const result = await joinCompetitionTeamByCode(joinCode);
    setJoining(false);
    if (result.error || !result.data) {
      setJoinError(result.error || "Could not join team.");
    } else {
      navigate(`/teams/${result.data.id}`);
    }
  }

  const safeUrl = opp ? sanitizeExternalUrl(opp.applicationUrl) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Opportunity details"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-lift">
        {loading ? (
          <div className="p-8 text-center text-sm font-semibold text-ink-500 animate-pulse">Loading…</div>
        ) : !opp ? (
          <div className="p-8 text-center text-sm text-ink-500">Opportunity not found.</div>
        ) : (
          <>
            {/* Header image */}
            {opp.imageUrl && (
              <div className="h-44 w-full overflow-hidden rounded-t-3xl sm:rounded-t-3xl bg-surface-soft">
                <img src={opp.imageUrl} alt={opp.title} className="h-full w-full object-cover" />
              </div>
            )}

            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className={`inline-block rounded-md px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider ${CATEGORY_BADGE[opp.category] ?? "bg-surface-soft text-ink-600"}`}>
                    {opp.category}
                  </span>
                  <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-ink-900">{opp.title}</h2>
                  <p className="mt-1 text-base font-semibold text-ink-600">{opp.organization}</p>
                </div>
                <button
                  onClick={onClose}
                  className="shrink-0 h-9 w-9 rounded-xl border border-surface-border bg-surface-soft flex items-center justify-center text-ink-500 hover:bg-brand-red-soft hover:text-brand-red transition-colors"
                  aria-label="Close"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {opp.mode && (
                  <div className="rounded-xl bg-surface-soft p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Mode</p>
                    <p className="mt-1 text-sm font-semibold text-ink-800">{opp.mode}</p>
                  </div>
                )}
                {opp.location && (
                  <div className="rounded-xl bg-surface-soft p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Location</p>
                    <p className="mt-1 text-sm font-semibold text-ink-800">{opp.location}</p>
                  </div>
                )}
                {opp.deadline && (
                  <div className="rounded-xl bg-surface-soft p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Deadline</p>
                    <p className="mt-1 text-sm font-semibold text-ink-800">{opp.deadline}</p>
                  </div>
                )}
                {opp.stipend && (
                  <div className="rounded-xl bg-surface-soft p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Stipend</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-700">{opp.stipend}</p>
                  </div>
                )}
                {opp.duration && (
                  <div className="rounded-xl bg-surface-soft p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Duration</p>
                    <p className="mt-1 text-sm font-semibold text-ink-800">{opp.duration}</p>
                  </div>
                )}
                {opp.field && (
                  <div className="rounded-xl bg-surface-soft p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Field</p>
                    <p className="mt-1 text-sm font-semibold text-ink-800">{opp.field}</p>
                  </div>
                )}
              </div>

              <p className="mt-5 text-sm leading-relaxed text-ink-600">{opp.description}</p>

              {opp.eligibility && (
                <div className="mt-4 rounded-xl border border-surface-border bg-surface-soft p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-400">Eligibility</p>
                  <p className="mt-1 text-sm text-ink-700">{opp.eligibility}</p>
                </div>
              )}

              {safeUrl && (
                <a
                  href={safeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary mt-6 w-full justify-center"
                >
                  Apply Now <Icon name="arrow" className="h-4 w-4" />
                </a>
              )}

              {/* Team Formation Section */}
              {opp.teamFormationEnabled && (
                <div className="mt-8 border-t border-surface-border pt-6">
                  <p className="eyebrow text-brand-red">TEAM COMPETITION</p>
                  <h3 className="mt-2 text-lg font-extrabold text-ink-900">Form or join a team</h3>
                  {opp.minTeamSize || opp.maxTeamSize ? (
                    <p className="mt-1 text-sm text-ink-500">
                      Team size:{" "}
                      {opp.minTeamSize && opp.maxTeamSize
                        ? `${opp.minTeamSize}–${opp.maxTeamSize} members`
                        : opp.maxTeamSize
                        ? `Up to ${opp.maxTeamSize} members`
                        : `Min ${opp.minTeamSize} members`}
                    </p>
                  ) : null}

                  {teams.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-ink-400">{teams.length} active team{teams.length !== 1 ? "s" : ""}</p>
                      {teams.map((t) => (
                        <Link
                          key={t.id}
                          href={`/teams/${t.id}`}
                          className="flex items-center justify-between rounded-xl border border-surface-border p-3 hover:border-brand-blue/30 hover:bg-brand-blue-soft/30 transition-colors"
                        >
                          <div>
                            <p className="text-sm font-bold text-ink-900">{t.name}</p>
                            <p className="text-xs text-ink-400">{t.memberCount} member{t.memberCount !== 1 ? "s" : ""}</p>
                          </div>
                          <Icon name="arrow" className="h-4 w-4 text-ink-400" />
                        </Link>
                      ))}
                    </div>
                  )}

                  {!user ? (
                    <div className="mt-5 rounded-xl border border-surface-border bg-surface-soft p-4 text-center">
                      <p className="text-sm text-ink-600">Sign in to create or join a team.</p>
                      <Link href="/login" className="btn-secondary mt-3 w-full justify-center text-sm">
                        Sign in
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <form onSubmit={handleCreateTeam} className="rounded-xl border border-surface-border p-4">
                        <p className="text-sm font-bold text-ink-900">Create a team</p>
                        <input
                          required
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          className="field-input mt-3 text-sm"
                          placeholder="Team name"
                          maxLength={80}
                        />
                        <button type="submit" disabled={creating} className="btn-secondary mt-3 w-full justify-center text-sm disabled:opacity-60">
                          {creating ? "Creating…" : "Create Team"}
                        </button>
                        {createError && <p className="mt-2 text-xs font-bold text-brand-red">{createError}</p>}
                      </form>

                      <form onSubmit={handleJoinTeam} className="rounded-xl border border-surface-border p-4">
                        <p className="text-sm font-bold text-ink-900">Join with team code</p>
                        <input
                          required
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                          className="field-input mt-3 text-sm font-mono tracking-widest"
                          placeholder="DSH-XXXXX"
                          maxLength={9}
                        />
                        <button type="submit" disabled={joining} className="btn-outline-blue mt-3 w-full justify-center text-sm disabled:opacity-60">
                          {joining ? "Joining…" : "Join Team"}
                        </button>
                        {joinError && <p className="mt-2 text-xs font-bold text-brand-red">{joinError}</p>}
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
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
