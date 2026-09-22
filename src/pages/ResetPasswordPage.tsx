import { FormEvent, useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import { Link } from "../lib/router";
import { useAuth } from "../context/AuthContext";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { friendlyAuthError } from "../lib/authErrors";

type Mode = "request" | "verifying" | "update" | "expired";

// Supabase appends `type=recovery` (in the URL hash for the default flow,
// or as a query param for PKCE) when a user follows a password-reset email.
function isRecoveryLink(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash || "";
  const search = window.location.search || "";
  return hash.includes("type=recovery") || search.includes("type=recovery");
}

export default function ResetPasswordPage() {
  const { session } = useAuth();

  const [mode, setMode] = useState<Mode>(() => (isRecoveryLink() ? "verifying" : "request"));

  // Request-a-reset-link state
  const [email, setEmail] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);

  // Set-a-new-password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [updateSubmitting, setUpdateSubmitting] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // The Supabase client (detectSessionInUrl: true) parses the recovery
  // token from the URL and establishes a session automatically. We just
  // wait for that session to show up in AuthContext, with a timeout so a
  // broken/expired link doesn't spin forever.
  useEffect(() => {
    if (mode !== "verifying") return;
    if (session) {
      setMode("update");
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setMode((current) => (current === "verifying" ? "expired" : current));
    }, 8000);
    return () => window.clearTimeout(timeoutId);
  }, [mode, session]);

  async function submitRequest(event: FormEvent) {
    event.preventDefault();
    setRequestError(null);

    if (!supabase || !isSupabaseConfigured) {
      setRequestError("Student accounts are not configured on this deployment yet.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setRequestError("Please enter a valid email address.");
      return;
    }

    setRequestSubmitting(true);
    try {
      // window.location.origin resolves to whatever this app is currently
      // running on — localhost during development, the production domain
      // once deployed — so nothing here needs to be hardcoded either way.
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setRequestError(friendlyAuthError(error.message));
        setRequestSubmitting(false);
        return;
      }
      setRequestSent(true);
      setRequestSubmitting(false);
    } catch (err) {
      setRequestError(friendlyAuthError(err instanceof Error ? err.message : null));
      setRequestSubmitting(false);
    }
  }

  async function submitUpdate(event: FormEvent) {
    event.preventDefault();
    setUpdateError(null);

    if (!supabase || !isSupabaseConfigured) {
      setUpdateError("Student accounts are not configured on this deployment yet.");
      return;
    }
    if (newPassword.length < 8) {
      setUpdateError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setUpdateError("Passwords do not match.");
      return;
    }

    setUpdateSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setUpdateError(friendlyAuthError(error.message));
        setUpdateSubmitting(false);
        return;
      }
      setUpdateSuccess(true);
      setUpdateSubmitting(false);
    } catch (err) {
      setUpdateError(friendlyAuthError(err instanceof Error ? err.message : null));
      setUpdateSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Reset password | DU Science Hub"
      description="Reset the password for your DU Science Hub student account."
      backgroundPreset="explore"
    >
      <section className="container-px py-16 sm:py-24">
        <div className="mx-auto max-w-md animate-fade-up">
          {mode === "verifying" && (
            <div className="card p-8 bg-white border border-surface-border shadow-card text-center">
              <p className="text-sm font-semibold text-ink-500 animate-pulse">Verifying your reset link…</p>
            </div>
          )}

          {mode === "expired" && (
            <div className="card p-8 bg-white border border-surface-border shadow-card text-center">
              <span className="inline-block rounded-full bg-brand-red/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-brand-red">
                Link expired
              </span>
              <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink-900">
                This reset link is invalid or has expired.
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">
                Password reset links can only be used once and expire after a short time. Request a new one below.
              </p>
              <button
                type="button"
                onClick={() => setMode("request")}
                className="btn-primary mt-6 w-full justify-center"
              >
                Request a new link
              </button>
            </div>
          )}

          {mode === "request" && (
            <>
              <p className="eyebrow text-brand-red">RESET PASSWORD</p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-ink-900">
                Forgot your password?
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-ink-500">
                Enter your email and we'll send you a link to set a new password.
              </p>

              {requestSent ? (
                <div className="card mt-8 p-6 bg-white border border-surface-border shadow-card text-center">
                  <p className="text-sm leading-relaxed text-ink-700">
                    If an account exists for <span className="font-bold">{email.trim()}</span>, a password reset link has been sent. Follow it to set a new password.
                  </p>
                </div>
              ) : (
                <form onSubmit={submitRequest} className="card mt-8 p-6 bg-white border border-surface-border shadow-card">
                  <label className="field-label" htmlFor="reset-email">Email</label>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={requestSubmitting}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="you@example.com"
                  />
                  <button
                    type="submit"
                    disabled={requestSubmitting}
                    className="btn-primary mt-6 w-full justify-center disabled:opacity-60"
                  >
                    {requestSubmitting ? "Sending…" : "Send reset link"}
                  </button>
                  {requestError && (
                    <div role="alert" className="mt-4 rounded-xl border border-brand-red/20 bg-brand-red-soft p-3 text-xs font-bold text-brand-red">
                      {requestError}
                    </div>
                  )}
                </form>
              )}

              <div className="mt-4 text-center">
                <Link href="/login" className="text-xs font-bold text-ink-400 hover:text-brand-blue">
                  ← Back to login
                </Link>
              </div>
            </>
          )}

          {mode === "update" && (
            <>
              <p className="eyebrow text-brand-red">RESET PASSWORD</p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-ink-900">
                Set a new password.
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-ink-500">
                Choose a new password for your DU Science Hub account.
              </p>

              {updateSuccess ? (
                <div className="card mt-8 p-6 bg-white border border-surface-border shadow-card text-center">
                  <p className="text-sm leading-relaxed text-ink-700">
                    Your password has been updated.
                  </p>
                  <Link href="/dashboard" className="btn-primary mt-5 w-full justify-center">
                    Go to my dashboard
                  </Link>
                </div>
              ) : (
                <form onSubmit={submitUpdate} className="card mt-8 p-6 bg-white border border-surface-border shadow-card">
                  <label className="field-label" htmlFor="reset-new-password">New Password</label>
                  <input
                    id="reset-new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    disabled={updateSubmitting}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="At least 8 characters"
                  />
                  <label className="field-label mt-4" htmlFor="reset-confirm-password">Confirm New Password</label>
                  <input
                    id="reset-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    disabled={updateSubmitting}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="Re-enter new password"
                  />
                  <button
                    type="submit"
                    disabled={updateSubmitting}
                    className="btn-primary mt-6 w-full justify-center disabled:opacity-60"
                  >
                    {updateSubmitting ? "Saving…" : "Save new password"}
                  </button>
                  {updateError && (
                    <div role="alert" className="mt-4 rounded-xl border border-brand-red/20 bg-brand-red-soft p-3 text-xs font-bold text-brand-red">
                      {updateError}
                    </div>
                  )}
                </form>
              )}
            </>
          )}
        </div>
      </section>
    </PageShell>
  );
}
