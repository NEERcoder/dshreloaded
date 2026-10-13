import { useEffect, useMemo, useState } from "react";
import Icon from "../Icon";
import { Link, useLocation } from "../../lib/router";
import { useAuth } from "../../context/AuthContext";
import {
  competitionRegistrationOptions,
  createCompetitionTeam,
  getCompetitionRegisteredTeamCount,
  getDiscoverableCompetitionTeams,
  getMyCompetitionRegistration,
  getMyCompetitionTeams,
  isListingOpen,
  joinCompetitionTeamByCode,
  registerForCompetitionSolo,
  requestToJoinCompetitionTeam,
  submitCompetitionTeamRegistration,
  withdrawCompetitionRegistration,
  type CompetitionTeamRecord,
  type DiscoverableCompetitionTeam,
  type MyCompetitionRegistration,
  type OpportunityRecord,
} from "../../lib/dataAccess";
import { deadlineInstant, formatDeadlineCountdown } from "../../lib/deadline";
import { useDeadlineNow } from "../../hooks/useDeadlineNow";

type Props = { opportunity: OpportunityRecord };

type Mode = "menu" | "solo" | "create" | "join";

/**
 * The Register Now block on a competition page.
 *
 * Which paths are offered comes from `competitionRegistrationOptions()`, the
 * same rule the database applies, so a competition that needs four people never
 * shows a solo button. Nothing here is a security control: every action below
 * is an RPC that re-checks authentication, the deadline, capacity and existing
 * membership server-side, and an error from that check is what the user sees.
 */
export default function CompetitionRegistration({ opportunity }: Props) {
  const { user, loading: authLoading } = useAuth();
  const { navigate } = useLocation();

  const [registration, setRegistration] = useState<MyCompetitionRegistration | null>(null);
  const [registrationLoaded, setRegistrationLoaded] = useState(false);
  const [myTeams, setMyTeams] = useState<CompetitionTeamRecord[]>([]);
  const [mode, setMode] = useState<Mode>("menu");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [code, setCode] = useState("");
  const [discoverable, setDiscoverable] = useState<DiscoverableCompetitionTeam[]>([]);
  const [requestedTeamIds, setRequestedTeamIds] = useState<string[]>([]);
  const [registeredTeams, setRegisteredTeams] = useState<number | null>(null);

  const instant = deadlineInstant(opportunity.deadlineAt, opportunity.deadline);
  const now = useDeadlineNow(instant);
  const open = isListingOpen(opportunity, now);
  const countdown = formatDeadlineCountdown(instant, now);
  const options = competitionRegistrationOptions(opportunity);

  const isCompetition = opportunity.category === "competition";

  useEffect(() => {
    let cancelled = false;
    setRegistrationLoaded(false);
    setRegistration(null);
    setMyTeams([]);
    if (!user) {
      setRegistrationLoaded(true);
      return;
    }
    getMyCompetitionRegistration(opportunity.id).then((result) => {
      if (cancelled) return;
      setRegistration(result.data);
      setRegistrationLoaded(true);
    });
    getMyCompetitionTeams().then((result) => {
      if (cancelled) return;
      setMyTeams((result.data || []).filter((team) => team.competitionId === opportunity.id));
    });
    return () => {
      cancelled = true;
    };
  }, [user, opportunity.id]);

  useEffect(() => {
    let cancelled = false;
    getCompetitionRegisteredTeamCount(opportunity.id).then((result) => {
      if (!cancelled) setRegisteredTeams(result.error ? null : result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [opportunity.id]);

  useEffect(() => {
    if (mode !== "join") return;
    let cancelled = false;
    getDiscoverableCompetitionTeams(opportunity.id).then((result) => {
      // `recruiting` is false once the deadline passes, the team is full or it
      // has registered — a closed crew must not look like it is still hiring.
      if (!cancelled) setDiscoverable((result.data ?? []).filter((team) => team.recruiting));
    });
    return () => {
      cancelled = true;
    };
  }, [mode, opportunity.id]);

  const myTeam = myTeams[0] ?? null;
  const minSize = opportunity.minTeamSize ?? 1;
  const teamEligible = myTeam ? myTeam.memberCount >= minSize : false;

  const statusChip = useMemo(() => {
    if (!registration) return null;
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
        <Icon name="check" className="h-3.5 w-3.5" />
        Registered {registration.registrationType === "team" ? "as a team" : "solo"}
      </span>
    );
  }, [registration]);

  function goToSignIn() {
    navigate(`/login?next=${encodeURIComponent(`/opportunities/${opportunity.id}`)}`);
  }

  async function run(action: () => Promise<{ error: string | null; data: unknown }>, success: string) {
    setBusy(true);
    setNotice(null);
    const result = await action();
    setBusy(false);
    if (result.error) {
      setNotice(result.error);
      return false;
    }
    setNotice(success);
    return true;
  }

  async function refreshRegistration() {
    const result = await getMyCompetitionRegistration(opportunity.id);
    setRegistration(result.data);
    const teams = await getMyCompetitionTeams();
    setMyTeams((teams.data || []).filter((team) => team.competitionId === opportunity.id));
    const count = await getCompetitionRegisteredTeamCount(opportunity.id);
    setRegisteredTeams(count.error ? null : count.data);
  }

  if (!isCompetition || !options.solo && !options.createTeam && !options.joinTeam) {
    // A listing without team formation is an application elsewhere, not an
    // entry here. The external link below the fold is the action.
    return null;
  }

  return (
    <section className="mt-6 rounded-2xl border border-surface-border bg-white p-4 sm:p-5" aria-label="Registration">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="eyebrow">REGISTER ON JAVLIN</p>
          <h2 className="mt-1.5 text-lg font-extrabold text-ink-900">
            {open ? "Enter this competition" : "Registration closed"}
          </h2>
        </div>
        <p className="text-sm font-bold text-ink-500">
          {registeredTeams === null
            ? ""
            : registeredTeams > 0
            ? `${registeredTeams} team${registeredTeams === 1 ? "" : "s"} registered`
            : "Be the first team in"}
        </p>
      </div>

      {authLoading ? (
        <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-ink-500">
          <Icon name="loader" className="h-4 w-4 animate-spin" /> Checking your registration…
        </p>
      ) : !user ? (
        <button
          type="button"
          onClick={goToSignIn}
          className="btn-primary mt-4 min-h-[52px] w-full justify-center text-base"
        >
          Register Now <Icon name="arrow" className="h-4 w-4" />
        </button>
      ) : !registrationLoaded ? (
        <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-ink-500">
          <Icon name="loader" className="h-4 w-4 animate-spin" /> Loading your status…
        </p>
      ) : registration && registration.status === "registered" ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex flex-wrap items-center gap-2">{statusChip}</div>
          <p className="mt-2 text-sm text-emerald-900">
            You are entered in JAVLIN for this competition. This records your entry with JAVLIN —
            it is not confirmation from the organiser.
          </p>
          {myTeam && (
            <Link
              href={`/teams/${myTeam.id}`}
              className="btn-outline-blue mt-3 inline-flex min-h-[44px] items-center px-4 text-sm"
            >
              Manage {myTeam.name} <Icon name="arrow" className="h-4 w-4" />
            </Link>
          )}
          {open && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                await run(
                  () => withdrawCompetitionRegistration(registration.registrationId),
                  "Your registration has been withdrawn."
                );
                await refreshRegistration();
              }}
              className="mt-3 block text-xs font-bold text-ink-500 underline-offset-2 hover:text-brand-red-ink hover:underline disabled:opacity-50"
            >
              Withdraw my registration
            </button>
          )}
        </div>
      ) : !open ? (
        <div className="mt-4 rounded-xl border border-surface-border bg-surface-soft p-4">
          <p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-ink-600">
            <Icon name="lock" className="h-4 w-4" /> Registration Closed
          </p>
          <p className="mt-1.5 text-sm text-ink-500">
            The deadline for this competition has passed. Rosters are locked and no new entries can
            be accepted.
          </p>
        </div>
      ) : myTeam ? (
        <div className="mt-4 rounded-xl border border-surface-border p-4">
          <p className="text-sm font-bold text-ink-800">Your team: {myTeam.name}</p>
          <p className="mt-1 text-sm text-ink-500">
            {myTeam.memberCount} of {minSize}
            {opportunity.maxTeamSize ? `–${opportunity.maxTeamSize}` : ""} members
            {teamEligible ? " — ready to register." : " — needs more members before it can register."}
          </p>
          {teamEligible ? (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                await run(
                  () => submitCompetitionTeamRegistration(myTeam.id),
                  "Team registration submitted."
                );
                await refreshRegistration();
              }}
              className="btn-primary mt-3 min-h-[48px] w-full justify-center"
            >
              {busy ? "Submitting…" : "Submit Team Registration"}
            </button>
          ) : (
            <p className="mt-3 rounded-lg bg-brand-red-soft px-3 py-2 text-xs font-bold text-brand-red-ink">
              Registration Pending — looking for members
            </p>
          )}
          <Link
            href={`/teams/${myTeam.id}`}
            className="btn-outline-blue mt-3 inline-flex min-h-[44px] items-center px-4 text-sm"
          >
            Open team page <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
      ) : mode === "menu" ? (
        <>
          <button
            type="button"
            onClick={() => setMode("solo")}
            disabled={!options.solo}
            className="btn-primary mt-4 min-h-[52px] w-full justify-center text-base disabled:hidden"
          >
            Register Now <Icon name="arrow" className="h-4 w-4" />
          </button>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {options.createTeam && (
              <button type="button" onClick={() => setMode("create")} className="btn-outline-blue min-h-[44px] justify-center text-sm">
                <Icon name="plus" className="h-4 w-4" /> Create a Team
              </button>
            )}
            {options.joinTeam && (
              <button type="button" onClick={() => setMode("join")} className="btn-ghost min-h-[44px] justify-center text-sm font-bold">
                <Icon name="users" className="h-4 w-4" /> Join a Team
              </button>
            )}
          </div>
        </>
      ) : mode === "solo" ? (
        <div className="mt-4 rounded-xl border border-surface-border p-4">
          <p className="text-sm font-bold text-ink-800">Enter as an individual</p>
          <p className="mt-1 text-sm text-ink-500">
            This registers you on JAVLIN for {opportunity.title}. You can withdraw until the
            deadline.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              await run(() => registerForCompetitionSolo(opportunity.id), "You're registered.");
              await refreshRegistration();
            }}
            className="btn-primary mt-3 min-h-[48px] w-full justify-center"
          >
            {busy ? "Registering…" : "Join Solo"}
          </button>
          <button type="button" onClick={() => setMode("menu")} className="mt-2 text-xs font-bold text-ink-500 hover:underline">
            Back
          </button>
        </div>
      ) : mode === "create" ? (
        <form
          className="mt-4 rounded-xl border border-surface-border p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!teamName.trim()) {
              setNotice("Give the team a name first.");
              return;
            }
            const ok = await run(
              () => createCompetitionTeam(opportunity.id, teamName.trim()),
              "Team created. Invite people to fill the roster."
            );
            if (ok) {
              setTeamName("");
              await refreshRegistration();
              setMode("menu");
            }
          }}
        >
          <label className="field-label" htmlFor="team-name">Team name</label>
          <input
            id="team-name"
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            className="field-input"
            placeholder="e.g. Quantum Leap"
            maxLength={60}
          />
          <p className="mt-1 text-xs text-ink-500">
            {opportunity.title} · you become the captain.
            {opportunity.maxTeamSize ? ` Up to ${opportunity.maxTeamSize} members.` : ""}
          </p>
          <button type="submit" disabled={busy} className="btn-primary mt-3 min-h-[48px] w-full justify-center">
            {busy ? "Creating…" : "Create Team"}
          </button>
          <button type="button" onClick={() => setMode("menu")} className="mt-2 text-xs font-bold text-ink-500 hover:underline">
            Back
          </button>
        </form>
      ) : (
        <div className="mt-4 space-y-4">
          <form
            className="rounded-xl border border-surface-border p-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!code.trim()) {
                setNotice("Enter the team code you were given.");
                return;
              }
              const ok = await run(() => joinCompetitionTeamByCode(code.trim()), "You joined the team.");
              if (ok) {
                setCode("");
                await refreshRegistration();
                setMode("menu");
              }
            }}
          >
            <label className="field-label" htmlFor="team-code">Join with Team Code</label>
            <div className="flex gap-2">
              <input
                id="team-code"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                className="field-input flex-1 tracking-widest"
                placeholder="XXXX-XXXX"
                autoComplete="off"
              />
              <button type="submit" disabled={busy} className="btn-secondary min-h-[44px] px-4 text-sm">
                Join
              </button>
            </div>
            <p className="mt-1.5 text-xs text-ink-500">
              A code is a private invitation from that team’s captain and adds you straight to the
              roster, subject to the deadline and the size limit.
            </p>
          </form>

          <div>
            <p className="field-label">Teams looking for members</p>
            {discoverable.length === 0 ? (
              <p className="mt-2 rounded-xl border border-dashed border-surface-border p-4 text-sm text-ink-500">
                No team for this competition is recruiting right now. Create one instead.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {discoverable.map((team) => {
                  const requested = requestedTeamIds.includes(team.id);
                  return (
                    <li key={team.id} className="rounded-xl border border-surface-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-ink-900">{team.name}</p>
                          <p className="text-xs text-ink-500">
                            {team.memberCount} member{team.memberCount === 1 ? "" : "s"}
                            {team.placesAvailable !== null ? ` · ${team.placesAvailable} place left` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={requested || busy}
                          onClick={async () => {
                            setBusy(true);
                            const result = await requestToJoinCompetitionTeam(team.id);
                            setBusy(false);
                            if (result.error) setNotice(result.error);
                            else {
                              setRequestedTeamIds((ids) => [...ids, team.id]);
                              setNotice(
                                result.data?.status === "already_member"
                                  ? "You are already on that team."
                                  : "Request sent to the captain."
                              );
                              await refreshRegistration();
                            }
                          }}
                          className="btn-outline-blue min-h-[40px] px-3 text-xs disabled:opacity-60"
                        >
                          {requested ? "Request sent" : "Request to Join"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-2 text-[11px] text-ink-500">
              Only the team name and how many places are left are shown — a roster is never public.
            </p>
          </div>

          <button type="button" onClick={() => setMode("menu")} className="text-xs font-bold text-ink-500 hover:underline">
            Back
          </button>
        </div>
      )}

      {countdown.tone !== "none" && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-ink-500">
          <Icon name="clock" className="h-3.5 w-3.5" />
          {countdown.text}
        </p>
      )}

      {notice && (
        <p role="status" className="mt-3 rounded-lg bg-surface-soft px-3 py-2 text-xs font-semibold text-ink-700">
          {notice}
        </p>
      )}
    </section>
  );
}
