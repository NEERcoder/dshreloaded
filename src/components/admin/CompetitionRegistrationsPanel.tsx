import { useEffect, useMemo, useState } from "react";
import Icon from "../Icon";
import {
  getCompetitionRegistrationRecords,
  getCompetitionTeamsForCompetition,
  type CompetitionRegistrationRecord,
  type OpportunityRecord,
} from "../../lib/dataAccess";
import { buildRegistrationWorkbook } from "../../lib/competitionExport";
import { downloadBlob } from "../../lib/xlsx";

type Props = {
  competitions: OpportunityRecord[];
  onSaved: (message: string) => void;
};

const TYPE_FILTERS = ["all", "solo", "team"] as const;
const STATUS_FILTERS = ["all", "registered", "withdrawn"] as const;

function Badge({ tone, children }: { tone: "ok" | "muted" | "info"; children: React.ReactNode }) {
  const classes =
    tone === "ok"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "info"
      ? "bg-brand-blue-soft text-brand-blue"
      : "bg-surface-border text-ink-500";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${classes}`}>
      {children}
    </span>
  );
}

/**
 * Administrator-only registration records for one competition.
 *
 * The data behind this comes from `competition_registration_records()`, which
 * raises unless `public.is_admin()` is true. Nothing here hides a public path —
 * a non-admin simply receives the database error, and personal contact details
 * never reach a browser that the server did not authorise.
 */
export default function CompetitionRegistrationsPanel({ competitions, onSaved }: Props) {
  const [competitionId, setCompetitionId] = useState(competitions[0]?.id ?? "");
  const [records, setRecords] = useState<CompetitionRegistrationRecord[]>([]);
  const [formingCount, setFormingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]>("all");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");

  const competition = competitions.find((item) => item.id === competitionId) ?? null;

  // The dashboard loads competitions after this panel first mounts, so the
  // initial selection is empty and has to be filled in once the list arrives.
  useEffect(() => {
    if (competitions.length === 0) return;
    setCompetitionId((current) => (competitions.some((item) => item.id === current) ? current : competitions[0].id));
  }, [competitions]);

  useEffect(() => {
    let cancelled = false;
    if (!competitionId) {
      setRecords([]);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([
      getCompetitionRegistrationRecords(competitionId),
      getCompetitionTeamsForCompetition(competitionId),
    ]).then(([registrationResult, teamResult]) => {
      if (cancelled) return;
      if (registrationResult.error) {
        setRecords([]);
        setError(registrationResult.error);
      } else {
        setRecords(registrationResult.data);
      }
      // A team with no registration row is still forming. Counting it here is
      // what keeps "teams looking for members" out of the registered total.
      const registeredTeamIds = new Set(
        (registrationResult.data || [])
          .filter((record) => record.status === "registered" && record.teamId)
          .map((record) => record.teamId as string)
      );
      setFormingCount((teamResult.data || []).filter((team) => !registeredTeamIds.has(team.id)).length);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [competitionId]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return records.filter((record) => {
      if (typeFilter !== "all" && record.registrationType !== typeFilter) return false;
      if (statusFilter !== "all" && record.status !== statusFilter) return false;
      if (!needle) return true;
      return [record.contestantName, record.contestantEmail, record.contestantPhone, record.teamName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [records, query, typeFilter, statusFilter]);

  const registeredCount = records.filter((record) => record.status === "registered").length;

  function exportWorkbook() {
    if (!competition || records.length === 0) return;
    const result = buildRegistrationWorkbook(competition, records);
    downloadBlob(result.blob, result.fileName);
    onSaved(
      `Exported ${result.counts.registered} registration${result.counts.registered === 1 ? "" : "s"}${
        result.counts.withdrawn ? ` (${result.counts.withdrawn} withdrawn)` : ""
      }${result.counts.forming ? ` · ${result.counts.forming} forming team(s) kept out of the registered count` : ""}.`
    );
  }

  if (competitions.length === 0) {
    return (
      <div className="card mt-6 p-6 text-center text-sm text-ink-500">
        No competitions yet. Registration records appear here once a competition exists.
      </div>
    );
  }

  return (
    <div className="card mt-6 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <label className="field-label">Competition</label>
          <select
            value={competitionId}
            onChange={(event) => setCompetitionId(event.target.value)}
            className="field-input"
          >
            {competitions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} — {item.organization}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={exportWorkbook}
          disabled={loading || records.length === 0}
          className="btn-secondary min-h-[44px] px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="download" className="h-4 w-4" /> Download Registration Excel
        </button>
      </div>

      {loading ? (
        <p className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-ink-500">
          <Icon name="loader" className="h-4 w-4 animate-spin" /> Loading registration records…
        </p>
      ) : error ? (
        <div className="mt-6 rounded-xl border border-surface-border bg-surface-soft p-4 text-sm text-ink-600">
          <p className="flex items-center gap-2 font-bold text-ink-800">
            <Icon name="alert-circle" className="h-4 w-4 text-brand-red-ink" /> Records unavailable
          </p>
          <p className="mt-1">{error}</p>
          <p className="mt-2 text-xs text-ink-500">
            Registration records are read by a database function that only authorises admins. If
            migration 013 has not been applied to this project yet, that function does not exist and
            no records can be read — the frontend cannot substitute for it.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-600">
            <Badge tone="ok">{registeredCount} registered</Badge>
            {records.some((record) => record.status === "withdrawn") && (
              <Badge tone="muted">{records.filter((r) => r.status === "withdrawn").length} withdrawn</Badge>
            )}
            {formingCount > 0 && <Badge tone="info">{formingCount} still forming</Badge>}
          </div>

          <div className="filter-bar mt-4">
            <label className="min-w-0">
              <span className="sr-only">Search registrations</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="field-input text-sm"
                placeholder="Search name, email, phone or team"
              />
            </label>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as (typeof TYPE_FILTERS)[number])}
              className="field-input text-sm"
              aria-label="Filter by registration type"
            >
              <option value="all">All types</option>
              <option value="solo">Solo</option>
              <option value="team">Team</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as (typeof STATUS_FILTERS)[number])}
              className="field-input text-sm"
              aria-label="Filter by registration status"
            >
              <option value="all">All statuses</option>
              <option value="registered">Registered</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>

          {visible.length === 0 ? (
            <p className="mt-5 rounded-xl border border-dashed border-surface-border p-6 text-center text-sm text-ink-500">
              {records.length === 0
                ? "No registrations for this competition yet."
                : "No registrations match these filters."}
            </p>
          ) : (
            <div className="mt-5 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="text-[11px] font-extrabold uppercase tracking-wider text-ink-500">
                    <th className="py-2 pr-3">Contestant</th>
                    <th className="py-2 pr-3">Contact</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Team</th>
                    <th className="py-2 pr-3">Roster</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((record) => (
                    <tr key={record.registrationId} className="border-t border-surface-border align-top">
                      <td className="py-3 pr-3 font-semibold text-ink-900">
                        {record.contestantName || "Unnamed"}
                      </td>
                      <td className="py-3 pr-3 text-ink-600">
                        {record.contestantEmail && <p className="break-all">{record.contestantEmail}</p>}
                        {record.contestantPhone && <p>{record.contestantPhone}</p>}
                        {!record.contestantEmail && !record.contestantPhone && <span className="text-ink-500">—</span>}
                      </td>
                      <td className="py-3 pr-3 capitalize text-ink-600">{record.registrationType}</td>
                      <td className="py-3 pr-3 text-ink-600">{record.teamName || "—"}</td>
                      <td className="py-3 pr-3 text-ink-600">
                        {record.roster.length > 0 ? (
                          <ol className="space-y-0.5">
                            {record.roster.map((member) => (
                              <li key={member.userId} className="text-xs">
                                {member.fullName || "Unnamed"}
                                {member.role === "captain" && <span className="ml-1 font-bold text-brand-blue">captain</span>}
                              </li>
                            ))}
                          </ol>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <span className={record.status === "registered" ? "font-bold text-emerald-700" : "font-bold text-ink-500"}>
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-ink-500">{record.registeredAt || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-[11px] leading-relaxed text-ink-500">
            Forming teams are listed separately in the export and are never counted as registered
            entries. Workbooks are generated on demand from the live records — no copy is stored in
            Storage, so nothing is left behind for another visitor to find.
          </p>
        </>
      )}
    </div>
  );
}
