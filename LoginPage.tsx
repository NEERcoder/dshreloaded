import { FormEvent, useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import { Link, useLocation } from "../lib/router";
import { useAuth } from "../context/AuthContext";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { friendlyAuthError } from "../lib/authErrors";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const { navigate } = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in — no reason to show the login form.
  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, user, navigate]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!supabase || !isSupabaseConfigured) {
      setError("Student accounts are not configured on this deployment yet.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (signInError) {
        setError(friendlyAuthError(signInError.message));
        setSubmitting(false);
        return;
      }
      // AuthContext's onAuthStateChange listener will pick up the new
      // session; navigate once it does (handled by the effect above),
      // but also navigate directly for a snappier transition.
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : null));
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Log in | DU Science Hub"
      description="Log in to your DU Science Hub student account."
      backgroundPreset="explore"
    >
      <section className="container-px py-16 sm:py-24">
        <div className="mx-auto max-w-md animate-fade-up">
          <p className="eyebrow text-brand-red">STUDENT ACCOUNT</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-ink-900">
            Welcome back.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            Log in to view and manage your DU Science Hub profile.
          </p>

          <form onSubmit={submit} className="card mt-8 p-6 bg-white border border-surface-border shadow-card">
            <label className="field-label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              disabled={submitting}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="you@example.com"
            />

            <div className="mt-4 flex items-center justify-between gap-2">
              <label className="field-label" htmlFor="login-password">
                Password
              </label>
              <Link href="/reset-password" className="text-xs font-bold text-brand-blue hover:text-brand-blue-dark">
                Forgot password?
              </Link>
            </div>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              disabled={submitting}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="••••••••"
            />

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary mt-6 w-full justify-center disabled:opacity-60"
            >
              {submitting ? "Logging in…" : "Log in"}
            </button>

            {error && (
              <div role="alert" className="mt-4 rounded-xl border border-brand-red/20 bg-brand-red-soft p-3 text-xs font-bold text-brand-red">
                {error}
              </div>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-ink-600">
            New to DU Science Hub?{" "}
            <Link href="/signup" className="font-bold text-brand-blue hover:text-brand-blue-dark">
              Create an account
            </Link>
          </p>

          <div className="mt-4 text-center">
            <Link href="/" className="text-xs font-bold text-ink-400 hover:text-brand-blue">
              ← Return to DU Science Hub Homepage
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
