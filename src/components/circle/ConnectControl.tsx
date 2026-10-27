import { useState } from "react";
import Icon from "../Icon";
import {
  acceptConnectionRequest,
  cancelConnectionRequest,
  rejectConnectionRequest,
  removeConnection,
  sendConnectionRequest,
  type ConnectionRef,
} from "../../lib/dataAccess";

type Action = "send" | "accept" | "reject" | "cancel" | "remove";

type ConnectControlProps = {
  peerUserId: string;
  connection: ConnectionRef | null;
  /** Called after any successful action so the page can re-read the state. */
  onChanged: () => void;
  /**
   * `compact` is the card-corner form: the current state and the one action
   * that moves it forward, at 30px. Cancelling a request, rejecting one and
   * removing a connection stay on the full control, because a corner is not
   * room for four buttons and a destructive one should not be a stray tap.
   */
  variant?: "full" | "compact";
};

const BTN = "min-h-[44px] px-4 text-sm";
const BTN_SM = "min-h-[30px] gap-1 px-2.5 text-[11px]";

/**
 * The five relationship states from one source of truth: the connection row.
 * Every mutation re-reads the row instead of guessing what came back, so a
 * request that raced with the other student's own action can't desync the UI.
 */
export default function ConnectControl({
  peerUserId,
  connection,
  onChanged,
  variant = "full",
}: ConnectControlProps) {
  const [busy, setBusy] = useState<Action | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const compact = variant === "compact";
  const size = compact ? BTN_SM : BTN;

  async function run(action: Action, call: () => Promise<{ error: string | null }>) {
    setBusy(action);
    setNotice(null);
    const result = await call();
    setBusy(null);
    if (result.error) {
      setNotice(result.error);
      return;
    }
    onChanged();
  }

  const state = connection?.state ?? "none";
  const id = connection?.connectionId;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        {state === "none" && (
          <button
            type="button"
            className={`btn-primary ${size}`}
            onClick={() => run("send", () => sendConnectionRequest(peerUserId))}
            disabled={busy !== null}
          >
            <Icon name="users" className="h-3.5 w-3.5" />
            {busy === "send" ? "Sending…" : "Connect"}
          </button>
        )}
        {state === "outgoing_pending" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-blue-soft px-2 py-0.5 text-[11px] font-bold text-brand-blue">
            <Icon name="clock" className="h-3 w-3" />
            {busy === "cancel" ? "Cancelling…" : "Pending"}
          </span>
        )}
        {state === "incoming_pending" && (
          <button
            type="button"
            className={`btn-primary ${size}`}
            onClick={() => run("accept", () => acceptConnectionRequest(id as string))}
            disabled={busy !== null}
          >
            <Icon name="check" className="h-3.5 w-3.5" />
            {busy === "accept" ? "Accepting…" : "Accept"}
          </button>
        )}
        {state === "accepted" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
            <Icon name="check" className="h-3 w-3" />
            Connected
          </span>
        )}
        {/* The paragraph the full form carries becomes the accessible name here,
            so a screen reader still hears what the corner means. */}
        <span className="sr-only" role="status" aria-live="polite">
          {notice ??
            (state === "incoming_pending"
              ? "This student asked to connect with you."
              : state === "accepted"
                ? "You're connected with this student."
                : state === "outgoing_pending"
                  ? "Your request is pending."
                  : "Connect with this student.")}
        </span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2.5">
        {state === "none" && (
          <button
            type="button"
            className={`btn-primary ${BTN}`}
            onClick={() => run("send", () => sendConnectionRequest(peerUserId))}
            disabled={busy !== null}
          >
            <Icon name="users" className="h-4 w-4" />
            {busy === "send" ? "Sending…" : "Connect"}
          </button>
        )}

        {state === "outgoing_pending" && (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue-soft px-3 py-1 text-xs font-bold text-brand-blue">
              <Icon name="clock" className="h-3.5 w-3.5" />
              Request sent
            </span>
            <button
              type="button"
              className={`btn-secondary ${BTN}`}
              onClick={() => run("cancel", () => cancelConnectionRequest(id as string))}
              disabled={busy !== null}
            >
              {busy === "cancel" ? "Cancelling…" : "Cancel request"}
            </button>
          </>
        )}

        {state === "incoming_pending" && (
          <>
            <button
              type="button"
              className={`btn-primary ${BTN}`}
              onClick={() => run("accept", () => acceptConnectionRequest(id as string))}
              disabled={busy !== null}
            >
              {busy === "accept" ? (
                <>
                  <Icon name="loader" className="h-4 w-4 animate-spin" /> Accepting…
                </>
              ) : (
                <>
                  <Icon name="check" className="h-4 w-4" /> Accept
                </>
              )}
            </button>
            <button
              type="button"
              className={`btn-secondary ${BTN}`}
              onClick={() => run("reject", () => rejectConnectionRequest(id as string))}
              disabled={busy !== null}
            >
              {busy === "reject" ? (
                <>
                  <Icon name="loader" className="h-4 w-4 animate-spin" /> Rejecting…
                </>
              ) : (
                <>
                  <Icon name="close" className="h-4 w-4" /> Reject
                </>
              )}
            </button>
          </>
        )}

        {state === "accepted" && (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              Connected
            </span>
            <button
              type="button"
              className={`btn-ghost ${BTN}`}
              onClick={() => run("remove", () => removeConnection(id as string))}
              disabled={busy !== null}
            >
              {busy === "remove" ? "Removing…" : "Remove connection"}
            </button>
          </>
        )}
      </div>

      <p className="mt-3 text-xs font-semibold text-ink-500" role="status" aria-live="polite">
        {notice ? (
          <span className="text-brand-red-ink">{notice}</span>
        ) : state === "incoming_pending" ? (
          "This student asked to connect with you."
        ) : state === "accepted" ? (
          "You're connected with this student."
        ) : (
          "Connections are student-to-student and only visible to the two of you."
        )}
      </p>
    </div>
  );
}

export function ConnectionBadge({ state }: { state: ConnectionRef["state"] }) {
  if (state === "accepted") {
    return (
      <span className="ml-auto shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
        Connected
      </span>
    );
  }
  if (state === "incoming_pending") {
    return (
      <span className="ml-auto shrink-0 rounded-full bg-brand-red-soft px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-red-ink">
        Request
      </span>
    );
  }
  if (state === "outgoing_pending") {
    return (
      <span className="ml-auto shrink-0 rounded-full bg-brand-blue-soft px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-blue">
        Pending
      </span>
    );
  }
  return null;
}
