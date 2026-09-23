import { useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import { Link, useLocation } from "../lib/router";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";
import {
  getCompetitionTeam,
  leaveCompetitionTeam,
  removeCompetitionTeamMember,
  transferCompetitionTeamCaptain,
  closeCompetitionTeam,
  type CompetitionTeamRecord,
  type CompetitionTeamMemberRecord,
} from "../lib/dataAccess";

export default function TeamPage({ teamId }: { teamId: string }) {
  const { user, loading: authLoading } = useAuth();
  const { navigate } = useLocation();

  const [team, setTeam] = useState<CompetitionTeamRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Code copy/share
  const [copied, setCopied] = useState(false);

  // Confirmation prompts
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDisband, setConfirmDisband] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null); // userId to remove
  const [confirmTransfer, setConfirmTransfer] = useState<string | null>(null); // userId to promote

  async function load() {
    setLoading(true);
    setError(null);
    const result = await getCompetitionTeam(teamId);
    if (result.error) setError(result.error);
    else setTeam(result.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [teamId]);

  async function copyCode() {
    if (!team) return;
    try {
      await navigator.clipboard.writeText(team.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  }

  async function shareTeam() {
    if (!team) return;
    const text = `Join my team "${team.name}" for ${team.competitionTitle}!\nTeam code: ${team.inviteCode}\n${window.location.origin}/opportunities`;
    if (navigator.share) {
      try {
        await navigator.share({ title: team.name, text });
        return;
      } catch {
        // fallthrough to clipboard
      }
    }
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleLeave() {
    setConfirmLeave(false);
    setActionError(null);
    const result = await leaveCompetitionTeam(teamId);
    if (result.error) {
      setActionError(result.error);
    } else {
      navigate("/dashboard");
    }
  }

  async function handleRemove(targetUserId: string) {
    setConfirmRemove(null);
    setActionError(null);
    const result = await removeCompetitionTeamMember(teamId, targetUserId);
    if (result.error) {
      setActionError(result.error);
    } else {
      setActionSuccess("Member removed.");
      await load();
    }
  }

  async function handleTransfer(newCaptainUserId: string) {
    setConfirmTransfer(null);
    setActionError(null);
    const result = await transferCompetitionTeamCaptain(teamId, newCaptainUserId);
    if (result.error) {
      setActionError(result.error);
    } else {
      setActionSuccess("Captaincy transferred.");
      await load();
    }
  }

  async function handleDisband() {
    setConfirmDisband(false);
    setActionError(null);
    const result = await closeCompetitionTeam(teamId);
    if (result.error) {
      setActionError(result.error);
    } else {
      navigate("/dashboard");
    }
  }

  if (authLoading || loading) {
    return (
      <PageShell title="Team | DU Science Hub" backgroundPreset="explore">
        <div className="container-px py-24 text-center text-sm font-semibold text-ink-500 animate-pulse">
          Loading team…
        </div>
      </PageShell>
    );
  }

  if (error || !team) {
    return (
      <PageShell title="Team not found | DU Science Hub" backgroundPreset="explore">
        <div className="container-px py-24 text-center max-w-md mx-auto">
          <p className="text-sm font-bold text-brand-red">{error ?? "Team not found."}</p>
          <Link href="/opportunities" className="btn-secondary mt-6 inline-flex">
            Back to Opportunities
          </Link>
        </div>
      </PageShell>
    );
  }

  const isCaptain = user?.id === team.captainUserId;
  const isMember = team.members.some((m) => m.userId === user?.id);

  return (
    <PageShell
      title={`${team.name} | DU Science Hub`}
      description={`Team ${team.name} for ${team.competitionTitle}`}
      backgroundPreset="explore"
    >
      <div className="container-px py-10 sm:py-14 max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <Link
          href="/opportunities"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-blue hover:text-brand-blue-dark"
        >
          ← Opportunities
        </Link>

        {/* Header */}
        <div className="mt-6 animate-fade-up">
          <p className="eyebrow text-brand-red">COMPETITION TEAM</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-ink-900">
            {team.name}
          </h1>
          <p className="mt-2 text-base font-semibold text-ink-500">{team.competitionTitle}</p>

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${team.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-surface-border text-ink-500"}`}>
              {team.status}
            </span>
            <span className="text-xs text-ink-400">
              {team.memberCount} member{team.memberCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Notifications */}
        {actionSuccess && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 flex items-center justify-between">
            {actionSuccess}
            <button onClick={() => setActionSuccess(null)} className="text-xs font-bold">✕</button>
          </div>
        )}
        {actionError && (
          <div className="mt-5 rounded-xl border border-brand-red/20 bg-brand-red-soft px-4 py-3 text-sm font-bold text-brand-red flex items-center justify-between">
            {actionError}
            <button onClick={() => setActionError(null)} className="text-xs font-bold">✕</button>
          </div>
        )}

        <div className="mt-8 grid gap-6 sm:grid-cols-[1fr_auto]">
          {/* Members */}
          <div className="card p-6">
            <h2 className="text-base font-extrabold text-ink-900">Members</h2>
            <div className="mt-4 space-y-3">
              {team.members.map((member) => (
                <MemberRow
                  key={member.userId}
                  member={member}
                  isCaptain={isCaptain}
                  isMe={member.userId === user?.id}
                  teamCaptainId={team.captainUserId}
                  onRemove={() => setConfirmRemove(member.userId)}
                  onTransfer={() => setConfirmTransfer(member.userId)}
                />
              ))}
            </div>
          </div>

          {/* Team code + actions */}
          <div className="flex flex-col gap-4 sm:w-56">
            {/* Invite code */}
            <div className="card p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-ink-400">Team Code</p>
              <p className="mt-2 text-2xl font-black tracking-widest text-ink-900 font-mono">
                {team.inviteCode}
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <button
                  onClick={copyCode}
                  className="btn-outline-blue w-full justify-center text-xs"
                >
                  <Icon name="flag" className="h-4 w-4" />
                  {copied ? "Copied!" : "Copy Code"}
                </button>
                <button
                  onClick={shareTeam}
                  className="btn-ghost w-full justify-center text-xs"
                >
                  Share Team
                </button>
              </div>
            </div>

            {/* Member actions */}
            {user && isMember && (
              <div className="card p-5 flex flex-col gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink-400">Actions</p>
                {!isCaptain && (
                  <button
                    onClick={() => setConfirmLeave(true)}
                    className="btn-ghost w-full justify-center text-xs text-brand-red hover:bg-brand-red-soft"
                  >
                    Leave Team
                  </button>
                )}
                {isCaptain && (
                  <button
                    onClick={() => setConfirmDisband(true)}
                    className="btn-ghost w-full justify-center text-xs text-brand-red hover:bg-brand-red-soft"
                  >
                    Disband Team
                  </button>
                )}
              </div>
            )}

            {user && !isMember && (
              <div className="card p-5 text-center text-xs text-ink-500">
                <p>Use the team code above to join this team from the competition page.</p>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation modals */}
        {confirmLeave && (
          <ConfirmDialog
            title="Leave this team?"
            description="You will no longer be part of this competition team."
            confirmLabel="Leave"
            onConfirm={handleLeave}
            onCancel={() => setConfirmLeave(false)}
          />
        )}
        {confirmDisband && (
          <ConfirmDialog
            title="Disband this team?"
            description="This will permanently close the team. All members will lose access."
            confirmLabel="Disband"
            onConfirm={handleDisband}
            onCancel={() => setConfirmDisband(false)}
          />
        )}
        {confirmRemove && (
          <ConfirmDialog
            title="Remove this member?"
            description="They will be removed from the team and will need to rejoin with the team code."
            confirmLabel="Remove"
            onConfirm={() => handleRemove(confirmRemove)}
            onCancel={() => setConfirmRemove(null)}
          />
        )}
        {confirmTransfer && (
          <ConfirmDialog
            title="Transfer captaincy?"
            description="This member will become the new team captain. You will become a regular member."
            confirmLabel="Transfer"
            onConfirm={() => handleTransfer(confirmTransfer)}
            onCancel={() => setConfirmTransfer(null)}
          />
        )}
      </div>
    </PageShell>
  );
}

function MemberRow({
  member,
  isCaptain,
  isMe,
  teamCaptainId,
  onRemove,
  onTransfer,
}: {
  member: CompetitionTeamMemberRecord;
  isCaptain: boolean;
  isMe: boolean;
  teamCaptainId: string;
  onRemove: () => void;
  onTransfer: () => void;
}) {
  const isThisMemberCaptain = member.userId === teamCaptainId;

  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-surface-border last:border-0">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-brand-blue-soft flex items-center justify-center text-brand-blue font-bold text-sm shrink-0">
          {member.fullName.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-ink-900">{member.fullName} {isMe ? <span className="text-xs text-ink-400">(you)</span> : null}</p>
            {isThisMemberCaptain && (
              <span className="rounded-full bg-brand-red-soft px-2 py-0.5 text-[10px] font-bold text-brand-red">Captain</span>
            )}
          </div>
          {member.course && <p className="text-xs text-ink-400">{member.course}</p>}
        </div>
      </div>
      {/* Captain controls for non-captain members */}
      {isCaptain && !isThisMemberCaptain && (
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={onTransfer}
            className="px-2 py-1 rounded-lg text-[11px] font-bold text-brand-blue bg-brand-blue-soft hover:bg-brand-blue hover:text-white transition-colors"
            title="Make captain"
          >
            Make Captain
          </button>
          <button
            onClick={onRemove}
            className="px-2 py-1 rounded-lg text-[11px] font-bold text-brand-red bg-brand-red-soft hover:bg-brand-red hover:text-white transition-colors"
            title="Remove"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-lift animate-fade-up">
        <h3 className="text-lg font-extrabold text-ink-900">{title}</h3>
        <p className="mt-2 text-sm text-ink-600">{description}</p>
        <div className="mt-6 flex gap-3">
          <button onClick={onCancel} className="btn-ghost flex-1 justify-center text-sm">
            Cancel
          </button>
          <button onClick={onConfirm} className="btn-primary flex-1 justify-center text-sm">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
