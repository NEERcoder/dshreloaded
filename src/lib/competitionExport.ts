import { buildWorkbook, registrationFileName, type SheetSpec, type SheetRow } from "./xlsx";
import type { CompetitionRegistrationRecord } from "./dataAccess";
import { formatDeadlineInIst } from "./deadline";

/**
 * The shape of an admin registration export.
 *
 * Kept apart from the button that triggers it so the row layout, the exclusion
 * of withdrawn entries from the registered count and the formula guard can all
 * be tested without a DOM.
 */
export type ExportCompetition = {
  title: string;
  organization?: string | null;
  deadlineAt?: string | null;
  deadline?: string | null;
};

type FormingTeam = {
  name: string;
  memberCount: number;
  status: string;
  createdAt: string;
};

function istStamp(iso: string | null | undefined): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return formatDeadlineInIst(ms) ?? iso;
}

function rosterText(record: CompetitionRegistrationRecord): string {
  return record.roster
    .map((member) => {
      const name = member.fullName?.trim() || "Unnamed";
      const contact = member.email || member.phone || member.userId.slice(0, 8);
      return `${member.role === "captain" ? "*" : ""}${name} (${contact})`;
    })
    .join("; ");
}

/**
 * Builds the three registered sheets, plus `Teams Forming` only when there is
 * something to put in it.
 *
 * Forming teams are deliberately separated: Part 20.3 forbids representing an
 * incomplete team as a registered entry, and putting them in `Registrations`
 * would do exactly that.
 */
export function buildRegistrationWorkbook(
  competition: ExportCompetition,
  records: CompetitionRegistrationRecord[],
  formingTeams: FormingTeam[] = []
): { blob: Blob; fileName: string; counts: { registered: number; withdrawn: number; forming: number } } {
  const registered = records.filter((r) => r.status === "registered");
  const withdrawn = records.filter((r) => r.status === "withdrawn");

  const registrationRows: SheetRow[] = records.map((record) => [
    record.registrationId,
    competition.title,
    record.contestantName || "",
    record.contestantEmail || "",
    record.contestantPhone || "",
    record.registrationType === "team" ? "Team" : "Solo",
    record.teamName || "",
    record.status,
    istStamp(record.registeredAt),
    record.roster.length > 0 ? rosterText(record) : "",
  ]);

  const teams = registered.filter((r) => r.registrationType === "team" && r.teamId);
  const teamRows: SheetRow[] = teams.map((record) => [
    record.teamId,
    record.teamName || "",
    record.captainName || record.contestantName || "",
    "registered",
    record.roster.length,
    istStamp(record.registeredAt),
    rosterText(record),
  ]);

  const rosterRows: SheetRow[] = teams.flatMap((record) =>
    record.roster.map((member) => [
      record.teamId,
      record.teamName || "",
      member.role === "captain" ? "Captain" : "Member",
      member.fullName || "",
      member.email || "",
      member.phone || "",
      record.status,
      istStamp(record.registeredAt),
    ])
  );

  const sheets: SheetSpec[] = [
    {
      name: "Registrations",
      headers: [
        "Registration ID",
        "Competition",
        "Contestant name",
        "Email",
        "Phone",
        "Registration type",
        "Team name",
        "Status",
        "Registered at (IST)",
        "Roster",
      ],
      rows: registrationRows,
    },
    {
      name: "Teams",
      headers: ["Team ID", "Team name", "Captain", "Status", "Members", "Registered at (IST)", "Roster"],
      rows: teamRows,
    },
    {
      name: "Team Roster",
      headers: ["Team ID", "Team name", "Role", "Member name", "Email", "Phone", "Registration status", "Registered at (IST)"],
      rows: rosterRows,
    },
  ];

  if (formingTeams.length > 0) {
    sheets.push({
      name: "Teams Forming",
      headers: ["Team name", "Members so far", "Team status", "Created", "Counted as registered?"],
      rows: formingTeams.map((team) => [
        team.name,
        team.memberCount,
        team.status,
        istStamp(team.createdAt),
        "No — registration not submitted",
      ]),
    });
  }

  return {
    blob: buildWorkbook(sheets),
    fileName: registrationFileName(competition.title),
    counts: {
      registered: registered.length,
      withdrawn: withdrawn.length,
      forming: formingTeams.length,
    },
  };
}
