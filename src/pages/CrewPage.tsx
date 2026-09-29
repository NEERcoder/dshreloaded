import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import PageShell from "../components/PageShell";
import Icon from "../components/Icon";
import CompactOpportunityCard from "../components/home/CompactOpportunityCard";
import TeamSeekCard, { openSpotsFor, type TeamSeekItem } from "../components/home/TeamSeekCard";
import EmptyState from "../components/home/EmptyState";
import CardRowSkeleton from "../components/home/CardRowSkeleton";
import { Link, useLocation } from "../lib/router";
import { useAuth } from "../context/AuthContext";
import {
  getOpportunities,
  getCompetitionTeamsForCompetition,
  getMyCompetitionTeams,
  createCompetitionTeam,
  joinCompetitionTeamByCode,
  requestToJoinCompetitionTeam,
  type OpportunityRecord,
} from "../lib/dataAccess";

type CrewTeam = TeamSeekItem & { competitionId: string };

type SortKey = "newest" | "openings" | "deadline";

type RequestState = "idle" | "sending" | "sent" | "error";

export default function CrewPage() {
  const { user } = useAuth();
  const { navigate } = useLocation();

  const [competitions, setCompetitions] = useState<OpportunityRecord[]>([]);
  const [teams, setTeams] = useState<CrewTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Which competitions the signed-in student already has a team in.
  const [myTeamByCompetition, setMyTeamByCompetition] = useState<Record<string, string>>({});

  const [search, setSearch] = useState("");
  const [competitionFilter, setCompetitionFilter] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("openings");

  const [requests, setRequests] = useState<Record<string, RequestState>>({});
  const [requestErrors, setRequestErrors] = useState<Record<string, string>>({});

  const [createComp, setCreateComp] = useState("");
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getOpportunities("competition").then(async (result) => {
      if (cancelled) return;
      if (result.error) setLoadError(result.error);
      const teamComps = result.data.filter((item) => item.teamFormationEnabled);
      setCompetitions(teamComps);

      const collected: CrewTeam[] = [];
      await Promise.all(
        teamComps.map(async (comp) => {
          const teamResult = await getCompetitionTeamsForCompetition(comp.id);
          for (const team of teamResult.data) {
            if (team.status !== "active") continue;
            collected.push({
              teamId: team.id,
              teamName: team.name,
              competitionId: comp.id,
              competitionTitle: comp.title,
              memberCount: team.memberCount,
              maxTeamSize: comp.maxTeamSize,
              createdAt: team.createdAt,
              deadline: comp.deadline,
            });
          }
        })
      );
      if (cancelled) return;
      setTeams(collected);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshMyTeams() {
    if (!user) {
      setMyTeamByCompetition({});
      return;
    }
    const result = await getMyCompetitionTeams();
    const map: Record<string, string> = {};
    for (const team of result.data) {
      if (team.status === "active") map[team.competitionId] = team.id;
    }
    setMyTeamByCompetition(map);
  }

  useEffect(() => {
    refreshMyTeams();
  }, [user]);

  // Competition filters come from live listings only.
  const competitionOptions = useMemo(
    () => competitions.map((c) => ({ id: c.id, label: c.title })),
    [competitions]
  );

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return teams
      .filter((team) => {
        if (competitionFilter && team.competitionId !== competitionFilter) return false;
        if (query) {
          // Public team facts only: name and competition title.
          if (!`${team.teamName} ${team.competitionTitle}`.toLowerCase().includes(query)) return false;
        }
        if (openOnly && (openSpotsFor(team) ?? 0) <= 0) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "newest") return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
        if (sort === "deadline") {
          const aTime = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
          const bTime = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
          return aTime - bTime;
        }
        return (openSpotsFor(b) ?? 99) - (openSpotsFor(a) ?? 99);
      });
  }, [teams, search, competitionFilter, openOnly, sort]);

  const filtersActive = Boolean(search || competitionFilter || openOnly);
  const useSelectForCompetitions = competitionOptions.length > 4;

  function clearFilters() {
    setSearch("");
    setCompetitionFilter("");
    setOpenOnly(false);
  }

  async function handleRequestJoin(team: CrewTeam) {
    if (!user) {
      navigate("/login");
      return;
    }
    setRequests((prev) => ({ ...prev, [team.teamId]: "sending" }));
    setRequestErrors((prev) => ({ ...prev, [team.teamId]: "" }));
    const result = await requestToJoinCompetitionTeam(team.teamId);
    if (result.error) {
      setRequests((prev) => ({ ...prev, [team.teamId]: "error" }));
      setRequestErrors((prev) => ({ ...prev, [team.teamId]: result.error as string }));
      if (/already in a team/i.test(result.error)) refreshMyTeams();
      return;
    }
    const status = result.data?.status;
    if (status === "already_member") {
      navigate(`/teams/${team.teamId}`);
      return;
    }
    setRequests((prev) => ({ ...prev, [team.teamId]: "sent" }));
  }

  async function handleCreateTeam(event: FormEvent) {
    event.preventDefault();
    setCreateError(null);
    if (!user) {
      navigate("/login");
      return;
    }
    if (!createComp || !createName.trim()) {
      setCreateError("Pick a competition and name your team.");
      return;
    }
    setCreating(true);
    const result = await createCompetitionTeam(createComp, createName.trim());
    setCreating(false);
    if (result.error || !result.data) {
      setCreateError(result.error ?? "Could not create the team. Try again.");
      return;
    }
    navigate(`/teams/${result.data.id}`);
  }

  async function handleJoinByCode(event: FormEvent) {
    event.preventDefault();
    setJoinError(null);
    if (!user) {
      navigate("/login");
      return;
    }
    if (!code.trim()) {
      setJoinError("Enter your team code.");
      return;
    }
    setJoining(true);
    const result = await joinCompetitionTeamByCode(code);
    setJoining(false);
    if (result.error || !result.data) {
      setJoinError(result.error ?? "Could not join that team. Check the code and try again.");
      return;
    }
    navigate(`/teams/${result.data.id}`);
  }

  return (
    <PageShell
      title="CREW — Find Your Team | JAVLIN"
      description="Find a team, build your crew, and take on challenges together."
      backgroundPreset="team"
    >
      <section className="border-b border-surface-border bg-brand-blue-pale/60 backdrop-blur-[2px] pt-10 pb-8 sm:pt-14 sm:pb-10">
        <div className="container-px">
          <p className="eyebrow text-brand-red">CREW</p>
          <h1 className="font-display mt-2 text-3xl sm:text-5xl font-extrabold tracking-tight text-ink-900 leading-tight">
            Find your people.
          </h1>
          <p className="mt-3 max-w-2xl text-base sm:text-lg leading-relaxed text-ink-500 font-medium">
            Find a team, build your crew, and take on challenges together.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#create-team" className="btn-primary">
              <Icon name="users" className="h-4 w-4" />
              Create a Team
            </a>
            <a href="#join-team" className="btn-outline-blue">
              Have a team code?
            </a>
          </div>
        </div>
      </section>

      <section className="container-px py-8 sm:py-10 space-y-10">
        {loadError && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand-red/20 bg-brand-red-soft px-4 py-3 text-sm font-bold text-brand-red">
            <span className="inline-flex items-center gap-2">
              <Icon name="alert-circle" className="h-4 w-4 shrink-0" />
              We couldn't reach the team board. {loadError}
            </span>
            <button onClick={() => setLoadError(null)} className="shrink-0 text-xs font-black" aria-label="Dismiss">
              <Icon name="close" className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Search + filters */}
        <div className="card p-4 sm:p-5 bg-white shadow-card border border-surface-border">
          <div className="relative">
            <Icon name="search" className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search teams by name or competition…"
              className="field-input pl-11"
              aria-label="Search teams"
            />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {useSelectForCompetitions ? (
              <label className="block">
                <span className="sr-only">Filter by competition</span>
                <select
                  value={competitionFilter}
                  onChange={(event) => setCompetitionFilter(event.target.value)}
                  className="filter-select w-full text-xs"
                >
                  <option value="">All Competitions</option>
                  {competitionOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="lg:col-span-2 flex flex-wrap gap-2">
                <button
                  onClick={() => setCompetitionFilter("")}
                  aria-pressed={competitionFilter === ""}
                  className={`rounded-xl px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition-colors duration-200 min-h-[40px] ${
                    competitionFilter === ""
                      ? "bg-brand-blue text-white shadow-soft"
                      : "bg-white text-ink-500 border border-surface-border hover:text-brand-blue hover:border-brand-blue/40"
                  }`}
                >
                  All Competitions
                </button>
                {competitionOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setCompetitionFilter(competitionFilter === option.id ? "" : option.id)}
                    aria-pressed={competitionFilter === option.id}
                    className={`max-w-[220px] truncate rounded-xl px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition-colors duration-200 min-h-[40px] ${
                      competitionFilter === option.id
                        ? "bg-brand-blue text-white shadow-soft"
                        : "bg-white text-ink-500 border border-surface-border hover:text-brand-blue hover:border-brand-blue/40"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
            <label className="block">
              <span className="sr-only">Sort teams</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                className="filter-select w-full text-xs"
              >
                <option value="openings">Sort: Most open spots</option>
                <option value="newest">Sort: Newest teams</option>
                <option value="deadline">Sort: Deadline soonest</option>
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <label className="inline-flex items-center gap-2 min-h-[40px] cursor-pointer">
              <input
                type="checkbox"
                checked={openOnly}
                onChange={(event) => setOpenOnly(event.target.checked)}
                className="h-5 w-5 rounded border-surface-border text-brand-blue focus-visible:ring-brand-blue"
              />
              <span className="text-xs font-bold text-ink-500">Teams needing members</span>
            </label>
            <div className="flex items-center gap-3">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-400" aria-live="polite">
                {loading ? "Loading…" : `${filtered.length} team${filtered.length === 1 ? "" : "s"}`}
              </p>
              {filtersActive && (
                <button
                  onClick={clearFilters}
                  className="text-xs font-extrabold uppercase tracking-wider text-brand-blue hover:underline min-h-[40px]"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Competitions that allow team formation */}
        <div>
          <h2 className="text-lg font-extrabold text-ink-900">Team competitions on the field</h2>
          {loading ? (
            <div className="mt-5">
              <CardRowSkeleton count={4} />
            </div>
          ) : competitions.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                icon="trophy"
                title="Team formation isn't open for any current competition"
                description="As soon as a competition enables teams, crews can form here. Browse what's live on FIELD."
                ctaLabel="Explore FIELD"
                ctaHref="/field"
              />
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {competitions.slice(0, 8).map((item) => (
                <CompactOpportunityCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Teams looking for members */}
        <div>
          <h2 className="text-lg font-extrabold text-ink-900">Teams looking for members</h2>
          {loading ? (
            <div className="mt-5">
              <CardRowSkeleton count={4} />
            </div>
          ) : teams.length === 0 ? (
            <div className="mt-5">
              <div className="w-full rounded-2xl border-2 border-dashed border-surface-border bg-white/80 px-6 py-10 sm:py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue-soft text-brand-blue">
                  <Icon name="users" className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-extrabold text-ink-900">No teams looking for members yet</h3>
                <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-ink-500">
                  Be the first to assemble a crew for one of the competitions above.
                </p>
                <a href="#create-team" className="btn-outline-blue mt-5">
                  Create a Team
                </a>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-5">
              <div className="w-full rounded-2xl border-2 border-dashed border-surface-border bg-white/80 px-6 py-10 sm:py-12 text-center">
                <h3 className="text-base font-extrabold text-ink-900">No teams match your filters</h3>
                <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-ink-500">
                  Try a wider search or clear the filters to see every crew recruiting right now.
                </p>
                <button onClick={clearFilters} className="btn-outline-blue mt-5">
                  Clear Filters
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {filtered.map((team) => {
                const myTeamId = myTeamByCompetition[team.competitionId];
                const isMine = Boolean(myTeamId) && myTeamId === team.teamId;
                const isFull = (openSpotsFor(team) ?? 1) <= 0;
                const alreadyIn = Boolean(myTeamId) && !isMine;
                const requestState = requests[team.teamId] ?? "idle";

                let action: ReactNode = null;
                if (isMine) {
                  action = (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-blue-soft px-3 py-2 text-xs font-bold text-brand-blue">
                      Your team
                    </span>
                  );
                } else if (alreadyIn) {
                  action = (
                    <Link
                      href={`/teams/${myTeamId}`}
                      className="inline-flex min-h-[40px] items-center rounded-xl border border-surface-border bg-white px-3 py-2 text-xs font-extrabold text-brand-blue hover:border-brand-blue/40"
                    >
                      View My Team
                    </Link>
                  );
                } else if (isFull) {
                  action = null;
                } else if (requestState === "sent") {
                  action = (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-blue-soft px-3 py-2 text-xs font-bold text-brand-blue">
                      <Icon name="flag" className="h-3.5 w-3.5" />
                      Request sent
                    </span>
                  );
                } else {
                  action = (
                    <button
                      onClick={() => handleRequestJoin(team)}
                      disabled={requestState === "sending"}
                      className="btn-primary min-h-[40px] px-3 py-2 text-xs disabled:opacity-60"
                    >
                      {user ? (requestState === "sending" ? "Sending…" : "Request to Join") : "Join Team"}
                    </button>
                  );
                }

                const note = alreadyIn
                  ? "You're already part of a team for this competition."
                  : requestState === "error"
                    ? requestErrors[team.teamId]
                    : undefined;

                return <TeamSeekCard key={team.teamId} team={team} action={action} note={note} />;
              })}
            </div>
          )}
        </div>

        {/* Create + join panels */}
        <div className="grid gap-5 lg:grid-cols-2">
          <div id="create-team" className="card scroll-mt-24 p-6 bg-white shadow-card border border-surface-border">
            <p className="eyebrow text-brand-blue">Build your crew</p>
            <h2 className="mt-2 text-lg font-extrabold text-ink-900">Create a Team</h2>
            <p className="mt-1 text-sm text-ink-500">
              Name your crew, pick the competition, and you'll get a private team code to invite others with.
            </p>
            <form onSubmit={handleCreateTeam} className="mt-5 space-y-3">
              <select
                value={createComp}
                onChange={(event) => setCreateComp(event.target.value)}
                className="filter-select w-full text-sm"
                aria-label="Competition"
              >
                <option value="">Select a competition…</option>
                {competitions.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.title}
                    {comp.maxTeamSize ? ` · up to ${comp.maxTeamSize}` : ""}
                  </option>
                ))}
              </select>
              <input
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder="Team name"
                className="field-input"
                aria-label="Team name"
                maxLength={60}
              />
              {createError && (
                <p className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-red">
                  <Icon name="alert-circle" className="h-3.5 w-3.5 shrink-0" />
                  {createError}
                </p>
              )}
              <button
                type="submit"
                disabled={creating || competitions.length === 0}
                className="btn-primary w-full justify-center disabled:opacity-60"
              >
                {creating ? (
                  <>
                    <Icon name="loader" className="h-4 w-4 animate-spin" /> Creating…
                  </>
                ) : user ? (
                  <>
                    <Icon name="plus" className="h-4 w-4" /> Create Team
                  </>
                ) : (
                  "Sign in to create a team"
                )}
              </button>
              {competitions.length === 0 && !loading && (
                <p className="text-xs text-ink-500">
                  No competition has team formation open right now.
                </p>
              )}
            </form>
          </div>

          <div id="join-team" className="card scroll-mt-24 p-6 bg-white shadow-card border border-surface-border">
            <p className="eyebrow text-brand-red">Already have a crew?</p>
            <h2 className="mt-2 text-lg font-extrabold text-ink-900">Have a team code?</h2>
            <p className="mt-1 text-sm text-ink-500">
              A captain's code joins their team instantly. Codes are shared privately — we never publish them.
            </p>
            <form onSubmit={handleJoinByCode} className="mt-5 space-y-3">
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="TEAM-CODE"
                className="field-input font-mono tracking-widest"
                aria-label="Team code"
                maxLength={20}
                autoComplete="off"
              />
              {joinError && (
                <p className="text-xs font-bold text-brand-red">{joinError}</p>
              )}
              <button type="submit" disabled={joining} className="btn-primary w-full justify-center disabled:opacity-60">
                {joining ? "Joining…" : user ? "Join Team" : "Sign in to join"}
              </button>
              <p className="text-xs text-ink-500">
                Don't have a code? Browse the crews above and send a request — the captain approves it.
              </p>
            </form>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
