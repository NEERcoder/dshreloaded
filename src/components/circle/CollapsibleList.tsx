import { useId, useState, type ReactNode } from "react";
import Icon from "../Icon";

/**
 * A list that starts folded.
 *
 * The Mark column used to lay every skill and role a student had on the card
 * the moment they added one, so the three adders dominated a card that is meant
 * to read as a summary. The row now shows a count and a chevron; the entries
 * are one click away.
 *
 * The same component serves both audiences — the owner, who can also remove an
 * entry, and a visitor reading somebody else's profile, who can only look.
 * Passing no `onRemove` is what makes it read-only; there is no second
 * component to keep in step.
 */

export type CollapsibleListItem = { id: string; primary: string; secondary?: string };

export default function CollapsibleList({
  label,
  icon,
  items,
  onRemove,
  children,
  variant = "add",
  emptyText,
}: {
  label: string;
  icon: string;
  items: CollapsibleListItem[];
  /** Absent for a visitor: the row becomes a plain disclosure with no × control. */
  onRemove?: (id: string) => Promise<string | null>;
  /** Rendered above the disclosure — the owner's add form. */
  children?: ReactNode;
  /** `add` sits under the Adder's own heading; `view` is the whole row itself. */
  variant?: "add" | "view";
  emptyText?: string;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  if (items.length === 0) {
    // Nothing to fold — but the owner's add form still has to render, or an
    // empty list would make the row impossible to fill.
    return (
      <div className="mt-2">
        {children}
        {emptyText && <p className="mt-1.5 text-[11px] text-ink-500">{emptyText}</p>}
        {failure && (
          <p className="mt-1.5 text-[11px] font-semibold text-brand-red-ink" role="status">
            {failure}
          </p>
        )}
      </div>
    );
  }

  async function remove(id: string) {
    if (!onRemove) return;
    const message = await onRemove(id);
    // A removal can only be started while the list is open, but a slow failure
    // can land after the reader has folded it again — re-open so the reason is
    // not swallowed by a collapsed panel.
    if (message) setOpen(true);
    setFailure(message);
  }

  return (
    <div className="mt-2">
      {children}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          setOpen((value) => !value);
          setFailure(null);
        }}
        className={`inline-flex min-h-[32px] items-center gap-1.5 text-ink-500 transition-colors hover:text-ink-800 ${
          variant === "view" ? "text-[13px] font-extrabold" : "text-[11px] font-bold uppercase tracking-wider"
        }`}
      >
        <Icon name={icon} className="h-3.5 w-3.5 shrink-0 text-brand-blue" />
        {label}
        <span className="font-extrabold text-ink-700">{items.length}</span>
        {/* Folded it points right, unfolded it points down — the same rotated
            chevron the section rails already use. */}
        <Icon
          name="chevron-down"
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>

      {open && (
        <ul id={panelId} className="mt-1.5 space-y-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="min-w-0 truncate font-bold text-ink-700">
                {item.primary}
                {item.secondary ? <span className="font-semibold text-ink-500"> · {item.secondary}</span> : null}
              </span>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => void remove(item.id)}
                  aria-label={`Remove ${item.primary}`}
                  className="flex-none rounded-lg p-1 text-ink-400 transition-colors hover:bg-brand-red-soft hover:text-brand-red-ink"
                >
                  <Icon name="close" className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {failure && (
        <p className="mt-1.5 text-[11px] font-semibold text-brand-red-ink" role="status">
          {failure}
        </p>
      )}
    </div>
  );
}
