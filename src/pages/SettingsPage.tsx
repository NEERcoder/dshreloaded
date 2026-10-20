import { useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import Icon from "../components/Icon";
import { Link } from "../lib/router";
import { useAuth } from "../context/AuthContext";
import {
  getCurrentUserProfile,
  setProfileVisibility,
  type ProfileRecord,
} from "../lib/dataAccess";

/**
 * The settings surface, scoped to the one setting that exists today: whether
 * the student's profile appears in CIRCLE. It reads and writes the real
 * `is_public` column through the existing data-access path — no new field, no
 * policy change. The switch never shows "saved" before the write succeeds, and
 * rapid toggles are blocked while a save is in flight.
 */
export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getCurrentUserProfile().then((result) => {
      if (cancelled) return;
      if (result.error) setMessage({ tone: "error", text: result.error });
      setProfile(result.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  async function toggleVisibility() {
    if (!profile || saving) return;
    const next = !profile.isPublic;
    setSaving(true);
    setMessage(null);
    const result = await setProfileVisibility(next);
    setSaving(false);
    if (result.error) {
      // The write failed — keep the switch on the last confirmed value.
      setMessage({ tone: "error", text: result.error });
      return;
    }
    setProfile({ ...profile, isPublic: next });
    setMessage({
      tone: "ok",
      text: next
        ? "Your profile is now visible in CIRCLE."
        : "Your profile is hidden from CIRCLE.",
    });
  }

  const isPublic = profile?.isPublic ?? false;

  return (
    <PageShell title="Settings | JAVLIN" description="Manage your JAVLIN account settings.">
      <section className="container-px py-10 sm:py-14">
        <div className="mx-auto max-w-xl">
          <p className="eyebrow">ACCOUNT</p>
          <h1 className="page-title mt-2">Settings</h1>

          {authLoading || loading ? (
            <div className="card mt-8 p-6 text-sm font-semibold text-ink-500 animate-pulse">
              Loading your settings…
            </div>
          ) : !user ? (
            <div className="card mt-8 p-6 text-center">
              <p className="text-sm font-semibold text-ink-600">
                Sign in to manage your profile visibility.
              </p>
              <Link href="/login" className="btn-primary mt-4 inline-flex">
                Log in
              </Link>
            </div>
          ) : (
            <div className="card mt-8 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold text-ink-900">Profile visibility</h2>
                  <p className="mt-1 text-sm leading-relaxed text-ink-500">
                    When on, your profile appears in the CIRCLE student directory and to anyone with
                    your profile link. When off, it is hidden from CIRCLE.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPublic}
                  aria-label="Profile visibility"
                  onClick={toggleVisibility}
                  disabled={saving}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 disabled:opacity-60 ${
                    isPublic ? "bg-brand-blue" : "bg-ink-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      isPublic ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs font-bold">
                <span className={isPublic ? "text-brand-blue" : "text-ink-500"}>
                  {isPublic ? "Visible in CIRCLE" : "Hidden from CIRCLE"}
                </span>
                {saving && (
                  <span className="inline-flex items-center gap-1 text-ink-500">
                    <Icon name="loader" className="h-3.5 w-3.5 animate-spin" /> Saving…
                  </span>
                )}
              </div>

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
          )}
        </div>
      </section>
    </PageShell>
  );
}
