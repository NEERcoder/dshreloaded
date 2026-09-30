import { useCallback, useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import Icon from "../components/Icon";
import { Link } from "../lib/router";
import { useAuth } from "../context/AuthContext";
import { initialsOf, yearLabel } from "../components/circle/StudentCard";
import {
  acceptConnectionRequest,
  cancelConnectionRequest,
  getMyConnections,
  getMyPendingRequests,
  getMySentRequests,
  rejectConnectionRequest,
  removeConnection,
  type ConnectionItem,
} from "../lib/dataAccess";

const BTN = "min-h-[44px] px-3.5 text-xs";

type Lists = {
  connections: ConnectionItem[];
  incoming: ConnectionItem[];
  outgoing: ConnectionItem[];
};

const EMPTY_LISTS: Lists = { connections: [], incoming: [], outgoing: [] };

function displayName(item: ConnectionItem): string {
  return item.peer?.fullName ?? "Student";
}

export default function ConnectionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [lists, setLists] = useState<Lists>(EMPTY_LISTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!user) {
      setLists(EMPTY_LISTS);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([getMyConnections(), getMyPendingRequests(), getMySentRequests()]).then(
      ([acceptedResult, incomingResult, outgoingResult]) => {
        setError(acceptedResult.error ?? incomingResult.error ?? outgoingResult.error);
        setLists({
          connections: acceptedResult.data,
          incoming: incomingResult.data,
          outgoing: outgoingResult.data,
        });
        setLoading(false);
      }
    );
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(connectionId: string, call: (id: string) => Promise<{ error: string | null }>) {
    setBusyId(connectionId);
    setActionError(null);
    const result = await call(connectionId);
    setBusyId(null);
    if (result.error) setActionError(result.error);
    else load();
  }

  if (authLoading || loading) {
    return (
      <PageShell title="Connections — CIRCLE | JAVLIN" backgroundPreset="directory">
        <div className="container-px py-24 text-center text-sm font-semibold text-ink-500 animate-pulse">
          Loading your connections…
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell title="Connections — CIRCLE | JAVLIN" backgroundPreset="directory">
        <div className="container-px py-16">
          <div className="mx-auto max-w-xl card border-dashed p-8 sm:p-10 text-center bg-white">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue-soft text-brand-blue">
              <Icon name="users" className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-lg font-extrabold text-ink-900">Connections are for signed-in students</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
              Who you're connected with is private to you and the student on the other side. Sign in to see yours.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/login" className="btn-primary">
                Sign in
              </Link>
              <Link href="/circle" className="btn-secondary">
                Back to CIRCLE
              </Link>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  const nothingYet =
    lists.connections.length === 0 && lists.incoming.length === 0 && lists.outgoing.length === 0;

  return (
    <PageShell
      title="Connections — CIRCLE | JAVLIN"
      description="The students you're connected with, and the requests waiting on you."
      backgroundPreset="directory"
    >
      <section className="page-hero pillar-circle">
        <div className="container-px">
          <Link
            href="/circle"
            className="link-pill"
          >
            <Icon name="arrow-left" className="h-4 w-4" /> Back to CIRCLE
          </Link>
          <h1 className="page-title font-display mt-3">
            Your connections.
          </h1>
          <p className="page-lede mt-3 max-w-2xl">
            {lists.connections.length} connection{lists.connections.length === 1 ? "" : "s"}
            {lists.incoming.length > 0
              ? ` · ${lists.incoming.length} request${lists.incoming.length === 1 ? "" : "s"} waiting`
              : ""}
          </p>
        </div>
      </section>

      <section className="container-px py-8 sm:py-10 max-w-2xl">
        {error && (
          <div className="mb-6 rounded-2xl border border-brand-red/20 bg-brand-red-soft px-4 py-3 text-sm font-bold text-brand-red-ink">
            We couldn't load your connections. {error}
          </div>
        )}
        {actionError && (
          <div
            className="mb-6 rounded-2xl border border-brand-red/20 bg-brand-red-soft px-4 py-3 text-sm font-bold text-brand-red-ink"
            role="status"
          >
            {actionError}
          </div>
        )}

        {nothingYet ? (
          <div className="w-full rounded-2xl border-2 border-dashed border-surface-border bg-white/80 px-6 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue-soft text-brand-blue">
              <Icon name="users" className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-base font-extrabold text-ink-900">No connections yet.</h2>
            <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-ink-500">
              Your connection requests will appear here. Start by finding your people in CIRCLE.
            </p>
            <Link href="/circle" className="btn-primary mt-5">
              Browse CIRCLE
            </Link>
          </div>
        ) : (
          <>
            {lists.incoming.length > 0 && (
              <ConnectionGroup
                title="Requests for you"
                items={lists.incoming}
                busyId={busyId}
                onAccept={(id) => act(id, acceptConnectionRequest)}
                onReject={(id) => act(id, rejectConnectionRequest)}
              />
            )}

            {lists.outgoing.length > 0 && (
              <ConnectionGroup
                title="Requests you sent"
                items={lists.outgoing}
                busyId={busyId}
                onCancel={(id) => act(id, cancelConnectionRequest)}
              />
            )}

            {lists.connections.length > 0 && (
              <ConnectionGroup title="Connections" items={lists.connections} busyId={busyId} onRemove={(id) => act(id, removeConnection)} />
            )}
          </>
        )}
      </section>
    </PageShell>
  );
}

type ConnectionGroupProps = {
  title: string;
  items: ConnectionItem[];
  busyId: string | null;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onCancel?: (id: string) => void;
  onRemove?: (id: string) => void;
};

function ConnectionGroup({ title, items, busyId, onAccept, onReject, onCancel, onRemove }: ConnectionGroupProps) {
  return (
    <div className="mb-10 last:mb-0">
      <h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900">
        {title} <span className="text-sm font-bold text-ink-500">({items.length})</span>
      </h2>
      <div className="mt-4 space-y-3">
        {items.map((item) => {
          const busy = busyId === item.connectionId;
          return (
            <article
              key={item.connectionId}
              className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-blue-soft text-sm font-extrabold text-brand-blue">
                  {initialsOf(displayName(item))}
                </span>
                <div className="min-w-0">
                  {item.peer ? (
                    <Link
                      href={`/circle/${item.peerUserId}`}
                      className="truncate text-sm font-extrabold text-ink-900 hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                    >
                      {item.peer.fullName}
                    </Link>
                  ) : (
                    <p className="text-sm font-extrabold text-ink-500">No longer on CIRCLE</p>
                  )}
                  <p className="mt-0.5 truncate text-xs font-semibold text-ink-500">
                    {item.peer
                      ? [item.peer.course, yearLabel(item.peer.yearOfStudy)].filter(Boolean).join(" · ")
                      : "This student's profile isn't listed anymore."}
                  </p>
                  {item.peer?.collegeName && (
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-ink-500">{item.peer.collegeName}</p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {onAccept && (
                  <button type="button" className={`btn-primary ${BTN}`} disabled={busy} onClick={() => onAccept(item.connectionId)}>
                    {busy ? "Working…" : "Accept"}
                  </button>
                )}
                {onReject && (
                  <button type="button" className={`btn-secondary ${BTN}`} disabled={busy} onClick={() => onReject(item.connectionId)}>
                    Reject
                  </button>
                )}
                {onCancel && (
                  <button type="button" className={`btn-secondary ${BTN}`} disabled={busy} onClick={() => onCancel(item.connectionId)}>
                    {busy ? "Cancelling…" : "Cancel request"}
                  </button>
                )}
                {onRemove && (
                  <button type="button" className={`btn-ghost ${BTN}`} disabled={busy} onClick={() => onRemove(item.connectionId)}>
                    {busy ? "Removing…" : "Remove"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
