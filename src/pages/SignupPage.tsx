import { FormEvent, useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import AuthFrame, { AuthLead } from "../components/auth/AuthFrame";
import MethodTabs from "../components/auth/MethodTabs";
import PhoneField from "../components/auth/PhoneField";
import PasswordField from "../components/auth/PasswordField";
import OtpCodeInput from "../components/auth/OtpCodeInput";
import {
  authError,
  authInput,
  authLabel,
  authLink,
  authPrimaryButton,
  authSecondaryButton,
} from "../components/auth/authStyles";
import { Link, useLocation } from "../lib/router";
import { useAuth } from "../context/AuthContext";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  buildE164Phone,
  friendlyAuthError,
  resendPhoneOtp,
  signUpWithPhone,
  verifyPhoneOtp,
  type AuthMethod,
} from "../lib/auth";

const QUOTE = "Opportunities don’t happen, you create them.";
const QUOTE_BY = "— Chris Grosser";

export default function SignupPage() {
  const { user, loading } = useAuth();
  const { navigate } = useLocation();

  const [method, setMethod] = useState<AuthMethod>("email");
  const [email, setEmail] = useState("");
  const [dialCode, setDialCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // Phone sign-up: Supabase sends an SMS code and only opens a session once
  // the code is verified, so the form swaps to a verification step in place.
  const [awaitingPhoneOtp, setAwaitingPhoneOtp] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneOtpError, setPhoneOtpError] = useState<string | null>(null);
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsManualLogin, setNeedsManualLogin] = useState(false);

  // The account exists and a session is open: show the Finish / Full profile choice.
  const [registered, setRegistered] = useState(false);
  // A new session would otherwise trigger the "already signed in" redirect below
  // before the choice screen has had a chance to render.
  const [holdRedirect, setHoldRedirect] = useState(false);

  // Already signed in — no reason to show the signup form.
  useEffect(() => {
    if (!loading && user && !holdRedirect) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, user, holdRedirect, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(
      () => setResendCooldown((current) => Math.max(0, current - 1)),
      1000
    );
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  function validate(): string | null {
    if (method === "email") {
      const cleanEmail = email.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) return "Please enter a valid email address.";
    } else {
      const phoneResult = buildE164Phone(dialCode, phone);
      if (!phoneResult.ok) return phoneResult.error;
    }
    if (password.length < 8) return "Password must be at least 8 characters long.";
    return null;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!supabase || !isSupabaseConfigured) {
      setError("Student accounts are not configured on this deployment yet.");
      return;
    }

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setHoldRedirect(true);

    try {
      if (method === "phone") {
        const phoneResult = buildE164Phone(dialCode, phone);
        if (!phoneResult.ok) {
          setError(phoneResult.error);
          setSubmitting(false);
          setHoldRedirect(false);
          return;
        }

        // 1. Create the Supabase Auth account with the phone number.
        const { data, error: signUpError } = await signUpWithPhone(phoneResult.value, password);

        if (signUpError) {
          setError(friendlyAuthError(signUpError, "phone"));
          setSubmitting(false);
          setHoldRedirect(false);
          return;
        }

        if (!data.user) {
          setError("We couldn't create your account. Please try again.");
          setSubmitting(false);
          setHoldRedirect(false);
          return;
        }

        // 2. Phone sign-ups only open a session after the SMS code is
        // verified, so swap to the verification step in place.
        if (!data.session) {
          setSubmitting(false);
          setHoldRedirect(false);
          setPhoneOtpError(null);
          setResendCooldown(30);
          setAwaitingPhoneOtp(true);
          return;
        }

        // 3. Session already present (e.g. phone confirmation disabled).
        setSubmitting(false);
        setRegistered(true);
        return;
      }

      const cleanEmail = email.trim().toLowerCase();

      // 1. Create the Supabase Auth account.
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (signUpError) {
        setError(friendlyAuthError(signUpError.message));
        setSubmitting(false);
        setHoldRedirect(false);
        return;
      }

      if (!data.user) {
        setError("We couldn't create your account. Please try again.");
        setSubmitting(false);
        setHoldRedirect(false);
        return;
      }

      // 2. Immediately obtain the authenticated user/session.
      if (!data.session) {
        // The connected Supabase project still requires email confirmation
        // at the project level. Frontend code cannot bypass that setting —
        // it must be turned off in the Supabase Dashboard.
        setSubmitting(false);
        setHoldRedirect(false);
        setNeedsManualLogin(true);
        return;
      }

      setSubmitting(false);
      setRegistered(true);
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : null));
      setSubmitting(false);
      setHoldRedirect(false);
    }
  }

  async function handleVerifyPhoneOtp(event: FormEvent) {
    event.preventDefault();
    setPhoneOtpError(null);

    const phoneResult = buildE164Phone(dialCode, phone);
    if (!phoneResult.ok) {
      setPhoneOtpError(phoneResult.error);
      return;
    }
    if (phoneOtp.length !== 6) {
      setPhoneOtpError("Enter the 6-digit code from the SMS.");
      return;
    }

    setVerifyingPhone(true);
    setHoldRedirect(true);
    try {
      const verified = await verifyPhoneOtp(phoneResult.value, phoneOtp);
      if (verified.error) {
        setPhoneOtpError(friendlyAuthError(verified.error, "phone"));
        setHoldRedirect(false);
        return;
      }
      setAwaitingPhoneOtp(false);
      setRegistered(true);
    } catch (err) {
      setPhoneOtpError(friendlyAuthError(err instanceof Error ? err.message : null));
      setHoldRedirect(false);
    } finally {
      setVerifyingPhone(false);
    }
  }

  async function handleResendPhoneOtp() {
    if (resendCooldown > 0 || verifyingPhone || submitting) return;

    const phoneResult = buildE164Phone(dialCode, phone);
    if (!phoneResult.ok) {
      setPhoneOtpError(phoneResult.error);
      return;
    }

    setVerifyingPhone(true);
    try {
      const result = await resendPhoneOtp(phoneResult.value);
      if (result.error) {
        setPhoneOtpError(friendlyAuthError(result.error, "phone"));
      } else {
        setResendCooldown(30);
      }
    } catch (err) {
      setPhoneOtpError(friendlyAuthError(err instanceof Error ? err.message : null));
    } finally {
      setVerifyingPhone(false);
    }
  }

  // ---- After registration: Finish or set up the full profile -------------
  if (registered) {
    return (
      <PageShell title="Welcome to JAVLIN" description="Your JAVLIN account is ready." backgroundPreset="explore">
        <AuthFrame lead={<AuthLead quote={QUOTE} caption={QUOTE_BY} />}>
          <h1 className="text-lg font-semibold text-ink-900">You’re in. Account created.</h1>

          <div className="mt-4 space-y-4">
            <div>
              <button type="button" onClick={() => navigate("/", { replace: true })} className={authPrimaryButton}>
                Finish
              </button>
              <p className="mt-1.5 text-xs leading-snug text-ink-500">
                Enter JAVLIN now. You can complete your profile whenever you’re ready.
              </p>
            </div>

            <div>
              <button type="button" onClick={() => navigate("/dashboard", { replace: true })} className={authSecondaryButton}>
                Set Up Full Profile
                <span className="ml-2 rounded bg-surface-pale px-1.5 py-0.5 text-[11px] font-medium text-ink-500">
                  Optional
                </span>
              </button>
              <p className="mt-1.5 text-xs leading-snug text-ink-500">
                Add your details and personalise your JAVLIN experience.
              </p>
            </div>
          </div>
        </AuthFrame>
      </PageShell>
    );
  }

  // ---- Phone verification -------------------------------------------------
  if (awaitingPhoneOtp) {
    return (
      <PageShell
        title="Verify your phone | JAVLIN"
        description="Enter the SMS code to finish creating your JAVLIN account."
        backgroundPreset="explore"
      >
        <AuthFrame lead={<AuthLead quote={QUOTE} caption={QUOTE_BY} />}>
          <h1 className="text-lg font-semibold text-ink-900">Check your messages</h1>
          <p className="mt-1 text-[13px] leading-snug text-ink-500">
            We sent a 6-digit code to{" "}
            <span className="font-semibold text-ink-700">
              {dialCode} {phone.trim()}
            </span>
            .
          </p>

          <form onSubmit={handleVerifyPhoneOtp} className="mt-4 space-y-3" noValidate>
            {phoneOtpError && (
              <p role="alert" className={authError}>
                {phoneOtpError}
              </p>
            )}
            <OtpCodeInput
              id="signup-phone-otp"
              value={phoneOtp}
              onChange={setPhoneOtp}
              disabled={verifyingPhone || submitting}
              autoFocus
            />
            <button type="submit" disabled={verifyingPhone || submitting} className={authPrimaryButton}>
              {verifyingPhone || submitting ? "Verifying…" : "Verify and create account"}
            </button>
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleResendPhoneOtp}
                disabled={verifyingPhone || submitting || resendCooldown > 0}
                className={`${authLink} disabled:cursor-not-allowed disabled:text-ink-400 disabled:no-underline`}
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAwaitingPhoneOtp(false);
                  setPhoneOtp("");
                  setPhoneOtpError(null);
                  setResendCooldown(0);
                }}
                disabled={verifyingPhone || submitting}
                className="font-semibold text-ink-500 hover:text-brand-blue disabled:opacity-60"
              >
                Use a different number
              </button>
            </div>
          </form>
        </AuthFrame>
      </PageShell>
    );
  }

  // ---- Email confirmation still required by the project ------------------
  if (needsManualLogin) {
    return (
      <PageShell title="Account created | JAVLIN" backgroundPreset="explore">
        <AuthFrame lead={<AuthLead quote={QUOTE} caption={QUOTE_BY} />}>
          <h1 className="text-lg font-semibold text-ink-900">Your account is ready</h1>
          <p className="mt-1 text-[13px] leading-snug text-ink-500">
            We couldn’t sign you in automatically. Log in to continue.
          </p>
          <Link href="/login" className={`${authPrimaryButton} mt-4`}>
            Go to login
          </Link>
        </AuthFrame>
      </PageShell>
    );
  }

  // ---- Registration form --------------------------------------------------
  return (
    <PageShell
      title="Create your account | JAVLIN"
      description="Create a JAVLIN student account."
      backgroundPreset="explore"
    >
      <AuthFrame lead={<AuthLead quote={QUOTE} caption={QUOTE_BY} />}>
        <h1 className="text-lg font-semibold text-ink-900">Create your account</h1>

        <form onSubmit={submit} className="mt-3 space-y-3" noValidate>
          <MethodTabs
            value={method}
            onChange={(next) => {
              setMethod(next);
              setError(null);
              setAwaitingPhoneOtp(false);
            }}
            disabled={submitting}
          />

          {method === "email" ? (
            <div>
              <label className={authLabel} htmlFor="signup-email">
                Email address
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                required
                disabled={submitting}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={authInput}
                placeholder="you@example.com"
              />
            </div>
          ) : (
            <PhoneField
              id="signup-account-phone"
              dialCode={dialCode}
              onDialCodeChange={setDialCode}
              value={phone}
              onChange={setPhone}
              disabled={submitting}
              helperText="We’ll text a 6-digit code to verify this number."
            />
          )}

          <PasswordField
            id="signup-password"
            label="Create password"
            value={password}
            onChange={setPassword}
            disabled={submitting}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            required
          />

          {error && (
            <p role="alert" className={authError}>
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className={`${authPrimaryButton} !mt-4`}>
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-3 text-center text-[11px] leading-snug text-ink-500">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className={authLink}>
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className={authLink}>
            Privacy Policy
          </Link>
          .
        </p>

        <p className="mt-4 text-center text-[13px] text-ink-600">
          Already have an account?{" "}
          <Link href="/login" className={authLink}>
            Log in
          </Link>
        </p>
      </AuthFrame>
    </PageShell>
  );
}
