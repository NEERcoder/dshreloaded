import { FormEvent, useEffect, useState } from "react";
import Icon from "../Icon";
import { Link, useLocation } from "../../lib/router";
import { useAuth } from "../../context/AuthContext";
import {
  getOpportunityById,
  getCompetitionTeamsForCompetition,
  createCompetitionTeam,
  joinCompetitionTeamByCode,
  requestToJoinCompetitionTeam,
  type OpportunityRecord,
  type CompetitionTeamRecord,
} from "../../lib/dataAccess";
import { sanitizeExternalUrl } from "../../lib/urlSafety";
import { CATEGORY_BADGE } from "./OpportunityCard";
import { opportunityCategoryIcon } from "../../data/opportunityCategories";

// "manage"  — team creation/join tools (Opportunity Radar / competitions list)
// "discover"— discovery only, points to CREW for team formation (FIELD)
export type TeamMode = "manage" | "discover";

export default function OpportunityDetail({
  opportunityId,
  onClose,
  teamMode = "manage",
}: {
  opportunityId: string;
  onClose: () => void;
  teamMode?: TeamMode;
}) {
  const { user } = useAuth();
  const { navigate } = useLocation();
  const [opp, setOpp] = useState<OpportunityRecord | null>(null);
  const [teams, setTeams] = useState<CompetitionTeamRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Team creation
  const [teamName, setTeamName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Join by code (instant)
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Join by request (captain approval)
  const [requestingTeamId, setRequestingTeamId] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<Record<string, "none" | "pending" | "sent">>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setTeams([]);
    getOpportunityById(opportunityId).then(async (res) => {
      if (cancelled) return;
      setOpp(res.data);
      const isTeamCompetition =
        res.data?.category === "competition" && res.data.teamFormationEnabled && teamMode === "manage";
      if (isTeamCompetition) {
        const teamsRes = await getCompetitionTeamsForCompetition(opportunityId);
        if (!cancelled) setTeams(teamsRes.data ?? []);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [opportunityId, teamMode]);

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
  const showTeamSection = Boolean(opp && opp.category === "competition" && opp.teamFormationEnabled);

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
          <div className="flex items-center justify-center gap-2 p-8 text-sm font-semibold text-ink-500">
            <Icon name="loader" className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : !opp ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-ink-500">
            <Icon name="alert-circle" className="h-4 w-4" />
            Opportunity not found.
          </div>
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
                  <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider ${CATEGORY_BADGE[opp.category] ?? "bg-surface-soft text-ink-600"}`}>
                    <Icon name={opportunityCategoryIcon(opp.category)} className="h-3.5 w-3.5" />
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
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                      <Icon name="monitor" className="h-3.5 w-3.5" /> Mode
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ink-800">{opp.mode}</p>
                  </div>
                )}
                {opp.location && (
                  <div className="rounded-xl bg-surface-soft p-3">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                      <Icon name="map-pin" className="h-3.5 w-3.5" /> Location
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ink-800">{opp.location}</p>
                  </div>
                )}
                {opp.deadline && (
                  <div className="rounded-xl bg-surface-soft p-3">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                      <Icon name="calendar" className="h-3.5 w-3.5" /> Deadline
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ink-800">{opp.deadline}</p>
                  </div>
                )}
                {opp.stipend && (
                  <div className="rounded-xl bg-surface-soft p-3">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                      <Icon name="wallet" className="h-3.5 w-3.5" /> Stipend
                    </p>
                    <p className="mt-1 text-sm font-semibold text-emerald-700">{opp.stipend}</p>
                  </div>
                )}
                {opp.duration && (
                  <div className="rounded-xl bg-surface-soft p-3">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                      <Icon name="clock" className="h-3.5 w-3.5" /> Duration
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ink-800">{opp.duration}</p>
                  </div>
                )}
                {opp.field && (
                  <div className="rounded-xl bg-surface-soft p-3">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                      <Icon name="target" className="h-3.5 w-3.5" /> Field
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ink-800">{opp.field}</p>
                  </div>
                )}
              </div>

              {opp.eligibleCourses.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {opp.eligibleCourses.map((course) => (
                    <span key={course} className="rounded-lg bg-surface-soft px-2.5 py-1 text-[11px] font-bold text-ink-600">
                      {course}
                    </span>
                  ))}
                </div>
              )}

              <p className="mt-5 text-sm leading-relaxed text-ink-600">{opp.description}</p>

              {opp.eligibility && (
                <div className="mt-4 rounded-xl border border-surface-border bg-surface-soft p-4">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-400">
                    <Icon name="info" className="h-3.5 w-3.5" /> Eligibility
                  </p>
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
                  Apply Now <Icon name="external" className="h-4 w-4" />
                </a>
              )}

              {/* FIELD: discovery only — team formation lives on CREW */}
              {showTeamSection && teamMode === "discover" && (
                <div className="mt-8 border-t border-surface-border pt-6">
                  <p className="eyebrow text-brand-red">TEAM COMPETITION</p>
                  <h3 className="mt-2 text-lg font-extrabold text-ink-900">This one takes a team</h3>
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
                  <p className="mt-3 text-sm leading-relaxed text-ink-600">
                    Head to CREW to find a crew short on members for this competition, request to join one, or start
                    your own team.
                  </p>
                  <Link href="/crew" className="btn-outline-blue mt-4 w-full justify-center">
                    Find a team on CREW <Icon name="arrow" className="h-4 w-4" />
                  </Link>
                </div>
              )}

              {/* Opportunity Radar: full team management tools */}
              {showTeamSection && teamMode === "manage" && (
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
                        <div
                          key={t.id}
                          className="flex items-center justify-between rounded-xl border border-surface-border p-3 gap-3"
                        >
                          <Link
                            href={`/teams/${t.id}`}
                            className="flex-1 min-w-0 hover:text-brand-blue transition-colors"
                          >
                            <p className="text-sm font-bold text-ink-900">{t.name}</p>
                            <p className="text-xs text-ink-400">{t.memberCount} member{t.memberCount !== 1 ? "s" : ""}</p>
                          </Link>
                          {user && (
                            <div className="shrink-0">
                              {requestStatus[t.id] === "pending" || requestStatus[t.id] === "sent" ? (
                                <span className="text-xs font-semibold text-brand-blue bg-brand-blue-soft px-2.5 py-1 rounded-lg">
                                  Request sent
                                </span>
                              ) : (
                                <button
                                  disabled={requestingTeamId === t.id}
                                  onClick={async () => {
                                    setRequestingTeamId(t.id);
                                    const res = await requestToJoinCompetitionTeam(t.id);
                                    setRequestingTeamId(null);
                                    if (res.data?.status === "sent") {
                                      setRequestStatus((prev) => ({ ...prev, [t.id]: "sent" }));
                                    } else if (res.data?.status === "already_pending") {
                                      setRequestStatus((prev) => ({ ...prev, [t.id]: "pending" }));
                                    } else if (res.data?.status === "already_member") {
                                      navigate(`/teams/${t.id}`);
                                    }
                                  }}
                                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-brand-blue text-white hover:bg-brand-blue-dark transition-colors disabled:opacity-60"
                                >
                                  {requestingTeamId === t.id ? "…" : "Join Team"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
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
                          {creating ? (
                            <>
                              <Icon name="loader" className="h-4 w-4 animate-spin" /> Creating…
                            </>
                          ) : (
                            <>
                              <Icon name="plus" className="h-4 w-4" /> Create Team
                            </>
                          )}
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
