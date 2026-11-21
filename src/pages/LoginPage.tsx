import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PageShell from "../components/PageShell";
import Icon from "../components/Icon";
import BrandMark from "../components/BrandMark";
import MethodTabs from "../components/auth/MethodTabs";
import PhoneField from "../components/auth/PhoneField";
import OtpCodeInput from "../components/auth/OtpCodeInput";
import PasswordField from "../components/auth/PasswordField";
import { Link, useLocation } from "../lib/router";
import { useAuth } from "../context/AuthContext";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  buildE164Phone,
  friendlyAuthError,
  getAuthClientError,
  isValidEmail,
  resendEmailConfirmation,
  resendPhoneOtp,
  sendPhoneRecoveryOtp,
  signInWithEmail,
  signInWithPhone,
  updateAuthPassword,
  verifyPhoneOtp,
  type AuthMethod,
} from "../lib/auth";

type RecoveryStep = "request" | "verify" | "done";

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="mt-4 rounded-xl border border-brand-red/20 bg-brand-red-soft p-3 text-sm font-semibold text-brand-red-ink"
    >
      {children}
    </div>
  );
}

export default function LoginPage() {
  const { user, loading } = useAuth();
  const { navigate, search } = useLocation();

  /**
   * Where to send the student after a successful sign in.
   *
   * Registering for a competition needs a session, so the competition page
   * sends them here with `?next=`. Only a single-slash in-app path is accepted:
   * `//host` is protocol-relative and `/\host` is normalised to the same thing
   * by some browsers, so both would turn a login into an open redirect. Anything
   * else falls back to the dashboard.
   */
  const nextPath = (() => {
    const raw = new URLSearchParams(search).get("next") ?? "";
    return /^\/[^/\s\\]/.test(raw) ? raw : "/dashboard";
  })();

  const [method, setMethod] = useState<AuthMethod>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dialCode, setDialCode] = useState("+91");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [recoveryMethod, setRecoveryMethod] = useState<AuthMethod>("email");
  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>("request");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [recoveryDialCode, setRecoveryDialCode] = useState("+91");
  const [recoveryPhoneE164, setRecoveryPhoneE164] = useState("");
  const [recoveryOtp, setRecoveryOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryInfo, setRecoveryInfo] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Already signed in — no reason to show the login form. While the recovery
  // dialog is open, a successful SMS verification signs the user in
  // immediately; keep them in the dialog so they can set a new password
  // before the normal post-login redirect runs.
  useEffect(() => {
    if (!loading && user && !forgotOpen) {
      navigate(nextPath, { replace: true });
    }
  }, [user, loading, navigate, nextPath, forgotOpen]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(
      () => setResendCooldown((current) => Math.max(0, current - 1)),
      1000
    );
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (!forgotOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !recoveryLoading) {
        setForgotOpen(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [forgotOpen, recoveryLoading]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInfoMessage(null);
    setShowResendConfirmation(false);

    const unavailable = getAuthClientError();
    if (unavailable) {
      setError(unavailable);
      return;
    }

    if (method === "email") {
      const cleanEmail = email.trim().toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        setError("Please enter a valid email address.");
        return;
      }
      if (!password) {
        setError("Please enter your password.");
        return;
      }

      setSubmitting(true);
      try {
        const result = await signInWithEmail(cleanEmail, password);
        if (result.error) {
          if (result.error.message.toLowerCase().includes("email not confirmed")) {
            setShowResendConfirmation(true);
          }
          setError(friendlyAuthError(result.error, "login"));
          setSubmitting(false);
          return;
        }
        // AuthContext's onAuthStateChange listener will pick up the new
        // session; navigate once it does (handled by the effect above),
        // but also navigate directly for a snappier transition.
        navigate(nextPath, { replace: true });
      } catch (err) {
        setError(friendlyAuthError(err instanceof Error ? err.message : null));
        setSubmitting(false);
      }
      return;
    }

    const phoneResult = buildE164Phone(dialCode, phone);
    if (!phoneResult.ok) {
      setError(phoneResult.error);
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signInWithPhone(phoneResult.value, password);
      if (result.error) {
        setError(friendlyAuthError(result.error, "phone"));
        setSubmitting(false);
        return;
      }
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : null));
      setSubmitting(false);
    }
  }

  async function handleResendConfirmation() {
    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      setError("Please enter a valid email address first.");
      return;
    }

    setError(null);
    setInfoMessage(null);
    setResendingConfirmation(true);
    try {
      const result = await resendEmailConfirmation(cleanEmail);
      if (result.error) {
        setError(friendlyAuthError(result.error, "signup"));
      } else {
        setShowResendConfirmation(false);
        setInfoMessage("A fresh confirmation link is on its way. Check your inbox.");
      }
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : null));
    } finally {
      setResendingConfirmation(false);
    }
  }

  function openForgotPassword() {
    setRecoveryMethod(method);
    setRecoveryEmail(email);
    setRecoveryPhone(phone);
    setRecoveryDialCode(dialCode);
    setRecoveryPhoneE164("");
    setRecoveryOtp("");
    setNewPassword("");
    setRecoveryStep("request");
    setRecoveryError(null);
    setRecoveryInfo(null);
    setResendCooldown(0);
    setInfoMessage(null);
    setForgotOpen(true);
  }

  function closeForgotPassword() {
    if (recoveryLoading) return;
    setForgotOpen(false);
  }

  async function handleSendEmailReset(event: FormEvent) {
    event.preventDefault();
    setRecoveryError(null);
    setRecoveryInfo(null);

    if (!supabase || !isSupabaseConfigured) {
      setRecoveryError("Student accounts are not configured on this deployment yet.");
      return;
    }

    const cleanEmail = recoveryEmail.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      setRecoveryError("Please enter a valid email address.");
      return;
    }

    setRecoveryLoading(true);
    try {
      // window.location.origin resolves to whatever this app is currently
      // running on — localhost during development, the production domain
      // once deployed — so nothing here needs to be hardcoded either way.
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setRecoveryError(friendlyAuthError(error, "reset"));
      } else {
        setRecoveryInfo(
          "If an account exists for this email, a reset link is on its way. Check your inbox."
        );
      }
    } catch (err) {
      setRecoveryError(friendlyAuthError(err instanceof Error ? err.message : null, "reset"));
    } finally {
      setRecoveryLoading(false);
    }
  }

  async function handleSendPhoneReset(event: FormEvent) {
    event.preventDefault();
    setRecoveryError(null);
    setRecoveryInfo(null);

    const phoneResult = buildE164Phone(recoveryDialCode, recoveryPhone);
    if (!phoneResult.ok) {
      setRecoveryError(phoneResult.error);
      return;
    }

    setRecoveryLoading(true);
    try {
      const result = await sendPhoneRecoveryOtp(phoneResult.value);
      if (result.error) {
        setRecoveryError(friendlyAuthError(result.error, "reset"));
        return;
      }
      setRecoveryPhoneE164(phoneResult.value);
      setRecoveryStep("verify");
      setResendCooldown(30);
    } catch (err) {
      setRecoveryError(friendlyAuthError(err instanceof Error ? err.message : null, "reset"));
    } finally {
      setRecoveryLoading(false);
    }
  }

  async function handleVerifyPhoneReset(event: FormEvent) {
    event.preventDefault();
    setRecoveryError(null);
    setRecoveryInfo(null);

    if (!recoveryPhoneE164) {
      setRecoveryError("Request a new code to continue.");
      return;
    }
    if (recoveryOtp.length !== 6) {
      setRecoveryError("Enter the 6-digit code from the SMS.");
      return;
    }
    if (newPassword.length < 8) {
      setRecoveryError("Choose a new password with at least 8 characters.");
      return;
    }

    setRecoveryLoading(true);
    try {
      const verified = await verifyPhoneOtp(recoveryPhoneE164, recoveryOtp);
      if (verified.error) {
        setRecoveryError(friendlyAuthError(verified.error, "phone"));
        return;
      }

      const updated = await updateAuthPassword(newPassword);
      if (updated.error) {
        setRecoveryError(
          `We verified your phone, but couldn’t update the password. ${friendlyAuthError(
            updated.error,
            "reset"
          )}`
        );
        setRecoveryStep("request");
        setRecoveryOtp("");
        setNewPassword("");
        setResendCooldown(0);
        return;
      }

      setRecoveryStep("done");
      setRecoveryOtp("");
      setNewPassword("");
    } catch (err) {
      setRecoveryError(friendlyAuthError(err instanceof Error ? err.message : null, "reset"));
    } finally {
      setRecoveryLoading(false);
    }
  }

  async function handleResendRecoveryCode() {
    if (!recoveryPhoneE164 || resendCooldown > 0 || recoveryLoading) return;

    setRecoveryLoading(true);
    setRecoveryError(null);
    setRecoveryInfo(null);
    try {
      const result = await resendPhoneOtp(recoveryPhoneE164);
      if (result.error) {
        setRecoveryError(friendlyAuthError(result.error, "phone"));
      } else {
        setResendCooldown(30);
        setRecoveryInfo("A fresh code is on its way.");
      }
    } catch (err) {
      setRecoveryError(friendlyAuthError(err instanceof Error ? err.message : null, "reset"));
    } finally {
      setRecoveryLoading(false);
    }
  }

  function finishRecovery() {
    setForgotOpen(false);
    setRecoveryStep("request");
    navigate(nextPath, { replace: true });
  }

  return (
    <PageShell
      title="Log in | JAVLIN"
      description="Log in to your JAVLIN student account."
      backgroundPreset="explore"
    >
      <section className="container-px py-10 sm:py-14">
        <div className="mx-auto max-w-md animate-fade-up">
          <BrandMark className="h-10 w-auto" />
          <p className="eyebrow mt-4">STUDENT ACCOUNT</p>
          <h1 className="page-title mt-3">
            Welcome back.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            Log in to view and manage your JAVLIN profile.
          </p>

          <div className="mt-8">
            <MethodTabs
              value={method}
              onChange={(next) => {
                setMethod(next);
                setError(null);
                setInfoMessage(null);
                setShowResendConfirmation(false);
              }}
              disabled={submitting}
            />
          </div>

          <form onSubmit={handleLogin} className="card p-6" noValidate>
            {error && <ErrorNote>{error}</ErrorNote>}
            {infoMessage && (
              <div
                role="status"
                className="mt-4 rounded-xl border border-brand-blue/20 bg-brand-blue-soft p-3 text-sm font-semibold text-brand-blue"
              >
                {infoMessage}
              </div>
            )}

            {showResendConfirmation && (
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendingConfirmation}
                className="mt-3 text-xs font-bold text-brand-blue hover:text-brand-blue-dark hover:underline disabled:text-ink-400 disabled:no-underline"
              >
                {resendingConfirmation ? "Sending…" : "Resend confirmation email"}
              </button>
            )}

            {method === "email" ? (
              <div className="mt-4">
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
              </div>
            ) : (
              <div className="mt-4">
                <PhoneField
                  id="login-phone"
                  dialCode={dialCode}
                  onDialCodeChange={setDialCode}
                  value={phone}
                  onChange={setPhone}
                  disabled={submitting}
                />
              </div>
            )}

            <div className="mt-4">
              <PasswordField
                id="login-password"
                value={password}
                onChange={setPassword}
                disabled={submitting}
                autoComplete="current-password"
                action={
                  <button
                    type="button"
                    onClick={openForgotPassword}
                    className="text-xs font-bold text-brand-blue hover:text-brand-blue-dark hover:underline"
                  >
                    Forgot password?
                  </button>
                }
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary mt-6 w-full justify-center disabled:opacity-60"
            >
              {submitting ? "Logging in…" : "Log in"}
            </button>
          </form>

          {forgotOpen &&
            createPortal(
              <div
                className="fixed inset-0 z-[60] flex items-end justify-center bg-brand-navy/50 p-4 backdrop-blur-sm animate-fade-in sm:items-center"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) closeForgotPassword();
                }}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="forgot-password-title"
                  className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-[1.75rem] border border-surface-border bg-white p-6 shadow-lift sm:p-8"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-blue-soft text-brand-blue">
                        <Icon name="lock" className="h-5 w-5" />
                      </span>
                      <h2
                        id="forgot-password-title"
                        className="mt-3 font-display text-2xl text-ink-900"
                      >
                        Reset your password
                      </h2>
                      <p className="mt-2 text-xs leading-relaxed text-ink-500">
                        {recoveryStep === "request"
                          ? recoveryMethod === "email"
                            ? "We’ll email you a secure link to choose a new password."
                            : "We’ll text you a code to verify your phone number."
                          : recoveryStep === "verify"
                            ? "Enter the code and choose a new password."
                            : "Your password has been updated."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeForgotPassword}
                      disabled={recoveryLoading}
                      aria-label="Close password reset"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-400 transition-colors hover:bg-surface-soft hover:text-ink-900 disabled:opacity-50"
                    >
                      <Icon name="close" className="h-4 w-4" />
                    </button>
                  </div>

                  {recoveryStep === "request" && (
                    <div className="mt-6">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500">
                          {recoveryMethod === "email" ? "Email recovery" : "SMS recovery"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setRecoveryMethod(recoveryMethod === "email" ? "phone" : "email");
                            setRecoveryError(null);
                            setRecoveryInfo(null);
                          }}
                          className="text-[11px] font-bold text-brand-blue hover:text-brand-blue-dark hover:underline"
                        >
                          Use {recoveryMethod === "email" ? "phone" : "email"} instead
                        </button>
                      </div>

                      {recoveryError && <ErrorNote>{recoveryError}</ErrorNote>}
                      {recoveryInfo && (
                        <div
                          role="status"
                          className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"
                        >
                          {recoveryInfo}
                        </div>
                      )}

                      {recoveryMethod === "email" ? (
                        <form onSubmit={handleSendEmailReset} className="mt-4 space-y-4" noValidate>
                          <div>
                            <label className="field-label" htmlFor="recovery-email">
                              Email
                            </label>
                            <input
                              id="recovery-email"
                              type="email"
                              autoComplete="email"
                              value={recoveryEmail}
                              onChange={(event) => setRecoveryEmail(event.target.value)}
                              disabled={recoveryLoading}
                              autoFocus
                              className="field-input disabled:cursor-not-allowed disabled:opacity-60"
                              placeholder="you@example.com"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={recoveryLoading}
                            className="btn-primary w-full justify-center disabled:opacity-60"
                          >
                            {recoveryLoading ? "Sending link…" : "Send reset link"}
                          </button>
                        </form>
                      ) : (
                        <form onSubmit={handleSendPhoneReset} className="mt-4 space-y-4" noValidate>
                          <PhoneField
                            id="recovery-phone"
                            dialCode={recoveryDialCode}
                            onDialCodeChange={setRecoveryDialCode}
                            value={recoveryPhone}
                            onChange={setRecoveryPhone}
                            disabled={recoveryLoading}
                            autoFocus
                            helperText="We’ll text a verification code to this number."
                          />
                          <button
                            type="submit"
                            disabled={recoveryLoading}
                            className="btn-primary w-full justify-center disabled:opacity-60"
                          >
                            {recoveryLoading ? "Sending code…" : "Send SMS code"}
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                  {recoveryStep === "verify" && (
                    <form onSubmit={handleVerifyPhoneReset} className="mt-6 space-y-4" noValidate>
                      {recoveryError && <ErrorNote>{recoveryError}</ErrorNote>}
                      {recoveryInfo && (
                        <div
                          role="status"
                          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"
                        >
                          {recoveryInfo}
                        </div>
                      )}
                      <OtpCodeInput
                        id="recovery-otp"
                        value={recoveryOtp}
                        onChange={setRecoveryOtp}
                        disabled={recoveryLoading}
                        autoFocus
                        helperText={`Sent to ${recoveryPhoneE164}`}
                      />
                      <PasswordField
                        id="recovery-new-password"
                        label="New password"
                        value={newPassword}
                        onChange={setNewPassword}
                        disabled={recoveryLoading}
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                      />
                      <button
                        type="submit"
                        disabled={recoveryLoading}
                        className="btn-primary w-full justify-center disabled:opacity-60"
                      >
                        {recoveryLoading ? "Updating password…" : "Update password"}
                      </button>
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={handleResendRecoveryCode}
                          disabled={recoveryLoading || resendCooldown > 0}
                          className="text-[11px] font-bold text-brand-blue transition-colors hover:text-brand-blue-dark hover:underline disabled:cursor-not-allowed disabled:text-ink-400 disabled:no-underline"
                        >
                          {resendCooldown > 0
                            ? `Resend code in ${resendCooldown}s`
                            : "Resend code"}
                        </button>
                      </div>
                    </form>
                  )}

                  {recoveryStep === "done" && (
                    <div className="mt-6">
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                        <div className="flex items-center gap-2">
                          <Icon name="unlock" className="h-4 w-4" />
                          Password updated
                        </div>
                        <p className="mt-2 text-xs font-medium leading-relaxed text-emerald-700">
                          You’re signed in. Continue to JAVLIN to pick up where you left off.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={finishRecovery}
                        className="btn-primary mt-4 w-full justify-center"
                      >
                        Continue to JAVLIN
                      </button>
                    </div>
                  )}
                </div>
              </div>,
              document.body
            )}

          <p className="mt-6 text-center text-sm text-ink-600">
            New to JAVLIN?{" "}
            <Link href="/signup" className="font-bold text-brand-blue hover:text-brand-blue-dark">
              Create an account
            </Link>
          </p>

          <div className="mt-4 text-center">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-500 hover:text-brand-blue">
              <Icon name="arrow" className="h-3.5 w-3.5 rotate-180" /> Return to JAVLIN Homepage
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}