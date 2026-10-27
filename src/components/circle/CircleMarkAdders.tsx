import { useId, useState } from "react";
import Icon from "../Icon";
import CollapsibleList from "./CollapsibleList";
import type { StudentExperience, StudentSkill } from "../../lib/dataAccess";

/**
 * The three things a student can add to their own Mark column from CIRCLE.
 *
 * Each row is a disclosure: the heading is the button, the form it opens asks
 * for the fewest fields the destination can be built from, and whatever already
 * exists is listed underneath with one control to take it back out. Nothing here
 * saves silently — every handler returns an error string, and the row shows it
 * against the entry that failed.
 */

type Field = {
  key: string;
  label: string;
  placeholder?: string;
  maxLength: number;
  required?: boolean;
  /** Numeric keypad on touch. The input stays a text field so `maxLength` and
      the caller's own range check still apply, neither of which a number input
      honours. */
  numeric?: boolean;
};

type AdderProps = {
  /** The action, as the row's heading: "Add skills". */
  label: string;
  /** The noun for the folded list beside its count: "Skills". */
  listLabel: string;
  icon: string;
  fields: Field[];
  items: { id: string; primary: string; secondary?: string }[];
  emptyText: string;
  submitLabel: string;
  onSubmit: (values: Record<string, string>) => Promise<string | null>;
  onRemove: (id: string) => Promise<string | null>;
};

function Adder({ label, listLabel, icon, fields, items, emptyText, submitLabel, onSubmit, onRemove }: AdderProps) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const message = await onSubmit(values);
    setBusy(false);
    if (message) {
      setError(message);
      return;
    }
    const blank: Record<string, string> = {};
    for (const field of fields) blank[field.key] = "";
    setValues(blank);
    setOpen(false);
  }

  return (
    <li className="mt-3 border-t border-surface-border pt-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          setOpen((value) => !value);
          setError(null);
        }}
        className="inline-flex min-h-[36px] items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-brand-blue transition-colors hover:text-ink-900 hover:underline"
      >
        <Icon name={icon} className="h-3.5 w-3.5" />
        {label}
        <Icon name="plus" className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-45" : ""}`} />
      </button>

      <CollapsibleList label={listLabel} icon={icon} items={items} onRemove={onRemove} emptyText={emptyText}>
        {open && (
          <form id={panelId} onSubmit={(event) => void submit(event)} className="mt-2 space-y-2">
            {fields.map((field) => (
              <label key={field.key} className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500">{field.label}</span>
                <input
                  type="text"
                  inputMode={field.numeric ? "numeric" : undefined}
                  value={values[field.key] ?? ""}
                  onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
                  placeholder={field.placeholder}
                  maxLength={field.maxLength}
                  required={field.required}
                  className="field-input mt-1 text-[13px]"
                />
              </label>
            ))}
            <div className="flex items-center gap-2">
              <button type="submit" disabled={busy} className="btn-outline-blue min-h-[36px] px-3 text-xs">
                {busy ? "Saving…" : submitLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                className="text-[11px] font-bold uppercase tracking-wider text-ink-500 hover:text-ink-700"
              >
                Cancel
              </button>
            </div>
            {error && (
              <p className="text-[11px] font-semibold text-brand-red-ink" role="status">
                {error}
              </p>
            )}
          </form>
        )}
      </CollapsibleList>
    </li>
  );
}

const CURRENT_YEAR = new Date().getFullYear();

export default function CircleMarkAdders({
  skills,
  experience,
  achievements,
  onAddSkill,
  onRemoveSkill,
  onAddExperience,
  onRemoveExperience,
  onAddAchievement,
  onRemoveAchievement,
}: {
  skills: StudentSkill[];
  experience: StudentExperience[];
  achievements: { id: string; title: string; year: number }[];
  onAddSkill: (name: string) => Promise<string | null>;
  onRemoveSkill: (id: string) => Promise<string | null>;
  onAddExperience: (input: { role: string; organization: string; period: string }) => Promise<string | null>;
  onRemoveExperience: (id: string) => Promise<string | null>;
  onAddAchievement: (input: { title: string; organization: string; year: string }) => Promise<string | null>;
  onRemoveAchievement: (id: string) => Promise<string | null>;
}) {
  return (
    <ul aria-label="Add to your Mark">
      <Adder
        label="Add skills"
        listLabel="Skills"
        icon="star"
        submitLabel="Add skill"
        emptyText="Nothing listed yet."
        fields={[{ key: "name", label: "Skill", placeholder: "Data analysis", maxLength: 60, required: true }]}
        items={skills.map((skill) => ({ id: skill.id, primary: skill.name }))}
        onSubmit={(values) => onAddSkill(values.name ?? "")}
        onRemove={onRemoveSkill}
      />
      <Adder
        label="Add experience"
        listLabel="Experience"
        icon="briefcase"
        submitLabel="Add role"
        emptyText="No roles added yet."
        fields={[
          { key: "role", label: "Role", placeholder: "Research assistant", maxLength: 120, required: true },
          { key: "organization", label: "Organisation", placeholder: "Lab, company or campus body", maxLength: 160 },
          { key: "period", label: "Period", placeholder: "Jan 2025 – present", maxLength: 60 },
        ]}
        items={experience.map((entry) => ({
          id: entry.id,
          primary: entry.role,
          secondary: entry.organization || entry.period || undefined,
        }))}
        onSubmit={(values) =>
          onAddExperience({
            role: values.role ?? "",
            organization: values.organization ?? "",
            period: values.period ?? "",
          })
        }
        onRemove={onRemoveExperience}
      />
      <Adder
        label="Add achievements"
        listLabel="Achievements"
        icon="award"
        submitLabel="Add achievement"
        emptyText="No achievements recorded yet."
        fields={[
          { key: "title", label: "Achievement", placeholder: "National science quiz finalist", maxLength: 120, required: true },
          { key: "organization", label: "Awarded by", placeholder: "Ministry, body or college", maxLength: 160 },
          {
            key: "year",
            label: "Year",
            placeholder: String(CURRENT_YEAR),
            maxLength: 4,
            required: true,
            numeric: true,
          },
        ]}
        items={achievements.map((entry) => ({ id: entry.id, primary: entry.title, secondary: String(entry.year) }))}
        onSubmit={(values) =>
          onAddAchievement({
            title: values.title ?? "",
            organization: values.organization ?? "",
            year: values.year || String(CURRENT_YEAR),
          })
        }
        onRemove={onRemoveAchievement}
      />
    </ul>
  );
}
