import Icon from "../Icon";
import type { CompetitionRound } from "../../lib/localProvider";

type Props = {
  rounds: CompetitionRound[];
  onChange: (rounds: CompetitionRound[]) => void;
};

function newRound(): CompetitionRound {
  return { id: `round-${crypto.randomUUID()}`, title: "", details: "" };
}

/**
 * Ordered round list for a competition.
 *
 * Rounds are stored in the order they are listed here and the public page shows
 * "Rounds (N)", so reordering is a real edit rather than a cosmetic one. An
 * empty list renders no rounds publicly — nothing is invented to fill it.
 */
export default function RoundsEditor({ rounds, onChange }: Props) {
  function update(index: number, patch: Partial<CompetitionRound>) {
    onChange(rounds.map((round, i) => (i === index ? { ...round, ...patch } : round)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= rounds.length) return;
    const next = [...rounds];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="rounded-xl border border-surface-border bg-surface-soft p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-500">
          <Icon name="flag" className="h-3.5 w-3.5" /> Rounds
          {rounds.length > 0 && <span className="text-ink-900">({rounds.length})</span>}
        </p>
        <button type="button" onClick={() => onChange([...rounds, newRound()])} className="btn-ghost px-3 py-1.5 text-xs">
          <Icon name="plus" className="h-3.5 w-3.5" /> Add round
        </button>
      </div>

      {rounds.length === 0 ? (
        <p className="mt-3 text-xs text-ink-500">
          No rounds set. Public listings will not show a rounds section until you add one.
        </p>
      ) : (
        <ol className="mt-3 space-y-3">
          {rounds.map((round, index) => (
            <li key={round.id} className="rounded-lg border border-surface-border bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-500">
                  Round {index + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="rounded-md p-1.5 text-ink-600 disabled:opacity-30 hover:bg-surface-soft"
                    title="Move up"
                    aria-label={`Move round ${index + 1} up`}
                  >
                    <Icon name="arrow" className="h-3.5 w-3.5 -rotate-90" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === rounds.length - 1}
                    className="rounded-md p-1.5 text-ink-600 disabled:opacity-30 hover:bg-surface-soft"
                    title="Move down"
                    aria-label={`Move round ${index + 1} down`}
                  >
                    <Icon name="arrow" className="h-3.5 w-3.5 rotate-90" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(rounds.filter((_, i) => i !== index))}
                    className="rounded-md p-1.5 text-brand-red-ink hover:bg-brand-red-soft"
                    title="Remove round"
                    aria-label={`Remove round ${index + 1}`}
                  >
                    <Icon name="trash" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <input
                value={round.title}
                onChange={(event) => update(index, { title: event.target.value })}
                className="field-input mt-2 text-sm"
                placeholder="Round name, e.g. Online Round 1"
                aria-label={`Round ${index + 1} title`}
              />
              <textarea
                value={round.details}
                onChange={(event) => update(index, { details: event.target.value })}
                className="field-input mt-2 min-h-16 text-sm"
                placeholder="What happens in this round, deliverables, evaluation…"
                aria-label={`Round ${index + 1} details`}
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
