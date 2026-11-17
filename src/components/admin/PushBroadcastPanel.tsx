import { useRef, useState, type FormEvent } from "react";
import Icon from "../Icon";
import {
  requestPushBroadcast,
  PUSH_CATEGORIES,
  type PushCategory,
} from "../../lib/pushNotifications";

const CATEGORY_LABEL: Record<PushCategory, string> = {
  opportunities: "Opportunities",
  connections: "Connections",
  teams: "Teams",
  competitions: "Competitions & events",
  announcements: "Announcements",
};

const ROUTE_PATTERN = /^\/[A-Za-z0-9\-/_]*$/;

/**
 * Admin-only push announcements. The browser only submits the request — the
 * Edge Function re-verifies admin_users, validates the payload, enforces the
 * rate limit and derives recipients server-side. The broadcast id is kept
 * across retries of the same announcement so the delivery ledger dedupes it.
 */
export default function PushBroadcastPanel() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [route, setRoute] = useState("/notifications");
  const [category, setCategory] = useState<PushCategory>("announcements");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const broadcastIdRef = useRef<string | null>(null);

  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  const trimmedRoute = route.trim();
  const routeValid = ROUTE_PATTERN.test(trimmedRoute) && !trimmedRoute.startsWith("//");
  const formValid =
    trimmedTitle.length > 0 && trimmedTitle.length <= 120 &&
    trimmedBody.length > 0 && trimmedBody.length <= 300 &&
    routeValid;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!formValid || sending) return;
    if (!broadcastIdRef.current) broadcastIdRef.current = crypto.randomUUID();
    setSending(true);
    setMessage(null);
    const result = await requestPushBroadcast({
      broadcastId: broadcastIdRef.current,
      title: trimmedTitle,
      body: trimmedBody,
      route: trimmedRoute,
      category,
    });
    setSending(false);
    setMessage({ tone: result.ok ? "ok" : "error", text: result.message });
    if (result.ok) {
      broadcastIdRef.current = null;
      setTitle("");
      setBody("");
      setRoute("/notifications");
      setCategory("announcements");
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-base font-extrabold text-ink-900">Push announcements</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-500">
        Send a push notification to every registered device that has the chosen category enabled.
        Students who turned the category (or all push) off are skipped automatically. Limited to
        5 broadcasts per hour — use sparingly.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="push-title" className="text-xs font-bold uppercase tracking-wider text-ink-500">
            Title ({trimmedTitle.length}/120)
          </label>
          <input
            id="push-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
            className="field-input mt-1.5"
            placeholder="New hackathon announced"
          />
        </div>
        <div>
          <label htmlFor="push-body" className="text-xs font-bold uppercase tracking-wider text-ink-500">
            Message ({trimmedBody.length}/300)
          </label>
          <textarea
            id="push-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={300}
            required
            rows={3}
            className="field-input mt-1.5"
            placeholder="Registrations are open — check the listing before the deadline."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="push-route" className="text-xs font-bold uppercase tracking-wider text-ink-500">
              Opens page
            </label>
            <input
              id="push-route"
              type="text"
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              required
              className="field-input mt-1.5"
              placeholder="/notifications"
            />
            {!routeValid && (
              <p className="mt-1 text-xs font-semibold text-brand-red-ink">
                Use a site path like /notifications or /hackathons.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="push-category" className="text-xs font-bold uppercase tracking-wider text-ink-500">
              Category
            </label>
            <select
              id="push-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as PushCategory)}
              className="field-input mt-1.5"
            >
              {PUSH_CATEGORIES.map((key) => (
                <option key={key} value={key}>
                  {CATEGORY_LABEL[key]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button type="submit" disabled={!formValid || sending} className="btn-primary min-h-[44px] px-5 text-sm">
          {sending ? (
            <span className="inline-flex items-center gap-2">
              <Icon name="loader" className="h-4 w-4 animate-spin" /> Sending…
            </span>
          ) : (
            "Send announcement"
          )}
        </button>
      </form>

      {message && (
        <div
          role="status"
          className={`mt-4 rounded-xl border p-3 text-sm font-semibold ${
            message.tone === "error"
              ? "border-brand-red/20 bg-brand-red-soft text-brand-red-ink"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}