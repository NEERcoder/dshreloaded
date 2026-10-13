import { useEffect, useState } from "react";
import Icon from "../Icon";
import { opportunityHref } from "../../lib/opportunityRoute";

type Props = {
  opportunityId: string;
  title: string;
  organization: string;
};

type State = "idle" | "copied" | "failed";

/**
 * Shares one competition, not the FIELD index.
 *
 * The URL is rebuilt from `location.origin` rather than read from the address
 * bar because a visitor may have arrived through a category filter or a stale
 * query string — the canonical path is the only thing worth handing to someone
 * else. Where the platform offers a native sheet it is used; otherwise the link
 * is copied, and the button says which of those happened.
 */
export default function ShareOpportunity({ opportunityId, title, organization }: Props) {
  const [state, setState] = useState<State>("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = window.setTimeout(() => setState("idle"), 2600);
    return () => window.clearTimeout(timer);
  }, [state]);

  const url = `${window.location.origin}${opportunityHref(opportunityId)}`;

  async function copyLink() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Clipboard access needs a secure context; a selected readonly input
        // still copies over plain http.
        const field = document.createElement("textarea");
        field.value = url;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(field);
        if (!ok) throw new Error("copy rejected");
      }
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  async function share() {
    const native = navigator.share;
    if (!native) {
      await copyLink();
      return;
    }
    try {
      await native.call(navigator, {
        title: `${title} — JAVLIN`,
        text: `${title}, organised by ${organization}. Register on JAVLIN.`,
        url,
      });
    } catch (err) {
      // Dismissing the sheet is not a failure worth reporting.
      if (err instanceof DOMException && err.name === "AbortError") return;
      await copyLink();
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={share} className="btn-outline-blue min-h-[44px] px-4 text-sm">
        <Icon name="share" className="h-4 w-4" />
        {typeof navigator.share === "function" ? "Share" : "Copy Link"}
      </button>
      {typeof navigator.share === "function" && (
        <button type="button" onClick={copyLink} className="btn-ghost min-h-[44px] px-3 text-xs font-bold">
          <Icon name="copy" className="h-4 w-4" /> Copy Link
        </button>
      )}
      <span role="status" aria-live="polite" className="text-xs font-bold text-ink-600">
        {state === "copied" && "Link copied"}
        {state === "failed" && (
          <span className="text-brand-red-ink">
            Couldn’t copy — the address is {url}
          </span>
        )}
      </span>
    </div>
  );
}
