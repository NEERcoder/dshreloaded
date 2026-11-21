import { FormEvent, useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import Icon from "../components/Icon";
import BrandMark from "../components/BrandMark";
import CollegeSearch from "../components/CollegeSearch";
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
import MethodTabs from "../components/auth/MethodTabs";
import PhoneField from "../components/auth/PhoneField";
import OtpCodeInput from "../components/auth/OtpCodeInput";
import { getColleges, createProfile, normalizePhoneNumber, type CollegeRecord, type ProfileInput } from "../lib/dataAccess";

const GENDER_OPTIONS = ["Female", "Male", "Non-binary", "Prefer not to say"];

export default function SignupPage() {
  const { user, loading } = useAuth();
  const { navigate } = useLocation();

  const currentYear = new Date().getFullYear();
  const graduationYearOptions = useMemo(
    () => Array.from({ length: 8 }, (_, i) => currentYear + i),
    [currentYear]
  );

  const [colleges, setColleges] = useState<CollegeRecord[]>([]);
  const [collegesLoading, setCollegesLoading] = useState(true);

  // Account fields
  const [method, setMethod] = useState<AuthMethod>("email");
  const [email, setEmail] = useState("");
  const [dialCode, setDialCode] = useState("+91");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Phone sign-up: Supabase sends an SMS code and only opens a session once
  // the code is verified, so the form swaps to a verification step in place.
  const [awaitingPhoneOtp, setAwaitingPhoneOtp] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneOtpError, setPhoneOtpError] = useState<string | null>(null);
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [course, setCourse] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [gender, setGender] = useState("");
  /** Optional and never verified — collected so a team captain can reach you. */
  const [phone, setPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [needsManualLogin, setNeedsManualLogin] = useState(false);

  // Already signed in — no reason to show the signup form.
  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    let isMounted = true;
    getColleges().then((result) => {
      if (!isMounted) return;
      setColleges(result.data);
      setCollegesLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

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
    if (password !== confirmPassword) return "Passwords do not match.";
    if (fullName.trim().length < 2) return "Full name must be at least 2 characters.";
    if (!collegeId) return "Please select your college.";
    if (!course.trim()) return "Please enter your course.";

    const yos = Number(yearOfStudy);
    if (!yearOfStudy || Number.isNaN(yos) || yos < 1 || yos > 6) {
      return "Year of study must be between 1 and 6.";
    }

    const gradYear = Number(graduationYear);
    if (!graduationYear || Number.isNaN(gradYear) || gradYear < currentYear) {
      return `Graduation year must be ${currentYear} or later.`;
    }

    if (!gender) return "Please select a gender.";

    // In phone mode the account number above is the profile number, so the
    // dedicated profile field is not shown and needs no separate check.
    if (method === "email") {
      if (!phone.trim()) {
        return "Please enter your mobile phone number.";
      }
      if (!normalizePhoneNumber(phone)) {
        return "Enter a valid phone number (at least 6 digits; include your country code for international numbers).";
      }
    }

    return null;
  }

  async function attemptCreateProfile() {
    setSubmitting(true);
    setProfileError(null);

    // In phone mode the account number is collected as dial code + national
    // number, so persist the combined E.164 value on the profile.
    let profilePhone = phone;
    if (method === "phone") {
      const phoneResult = buildE164Phone(dialCode, phone);
      if (phoneResult.ok) profilePhone = phoneResult.value;
    }

    const input: ProfileInput = {
      fullName: fullName.trim(),
      collegeId,
      course: course.trim(),
      yearOfStudy: Number(yearOfStudy),
      graduationYear: Number(graduationYear),
      gender,
      phone: profilePhone,
    };

    const result = await createProfile(input);
    if (result.error || !result.data) {
      setProfileError(result.error || "We couldn't save your profile details.");
      setSubmitting(false);
      return;
    }

    navigate("/dashboard", { replace: true });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setProfileError(null);

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

    try {
      if (method === "phone") {
        const phoneResult = buildE164Phone(dialCode, phone);
        if (!phoneResult.ok) {
          setError(phoneResult.error);
          setSubmitting(false);
          return;
        }

        // 1. Create the Supabase Auth account with the phone number.
        const { data, error: signUpError } = await signUpWithPhone(phoneResult.value, password);

        if (signUpError) {
          setError(friendlyAuthError(signUpError, "phone"));
          setSubmitting(false);
          return;
        }

        if (!data.user) {
          setError("We couldn't create your account. Please try again.");
          setSubmitting(false);
          return;
        }

        // 2. Phone sign-ups only open a session after the SMS code is
        // verified, so swap to the verification step in place.
        if (!data.session) {
          setSubmitting(false);
          setPhoneOtpError(null);
          setResendCooldown(30);
          setAwaitingPhoneOtp(true);
          return;
        }

        // 3. Session already present (e.g. phone confirmation disabled):
        // create the profile and redirect.
        await attemptCreateProfile();
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
        return;
      }

      if (!data.user) {
        setError("We couldn't create your account. Please try again.");
        setSubmitting(false);
        return;
      }

      // 2. Immediately obtain the authenticated user/session.
      if (!data.session) {
        // The connected Supabase project still requires email confirmation
        // at the project level. Frontend code cannot bypass that setting —
        // it must be turned off in the Supabase Dashboard (see final report).
        setSubmitting(false);
        setNeedsManualLogin(true);
        return;
      }

      // 3. Create the corresponding public.profiles record, then redirect.
      await attemptCreateProfile();
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : null));
      setSubmitting(false);
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
    try {
      const verified = await verifyPhoneOtp(phoneResult.value, phoneOtp);
      if (verified.error) {
        setPhoneOtpError(friendlyAuthError(verified.error, "phone"));
        return;
      }
      // The session now exists (AuthContext picks it up), so the profile
      // record can be created against the authenticated user.
      await attemptCreateProfile();
    } catch (err) {
      setPhoneOtpError(friendlyAuthError(err instanceof Error ? err.message : null));
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

  if (awaitingPhoneOtp) {
    return (
      <PageShell
        title="Verify your phone | JAVLIN"
        description="Enter the SMS code to finish creating your JAVLIN account."
        backgroundPreset="explore"
      >
        <section className="container-px py-10 sm:py-14">
          <div className="mx-auto max-w-md animate-fade-up">
            <BrandMark className="h-10 w-auto" />
            <p className="eyebrow mt-4">VERIFY PHONE</p>
            <h1 className="page-title mt-3">
              Check your messages.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-500">
              We sent a 6-digit code to <span className="font-bold text-ink-700">{phone.trim()}</span>.
              Enter it below to finish creating your account.
            </p>

            <form onSubmit={handleVerifyPhoneOtp} className="card mt-8 p-6" noValidate>
              {phoneOtpError && (
                <div role="alert" className="mb-4 rounded-xl border border-brand-red/20 bg-brand-red-soft p-3 text-sm font-semibold text-brand-red-ink">
                  {phoneOtpError}
                </div>
              )}
              <OtpCodeInput
                id="signup-phone-otp"
                value={phoneOtp}
                onChange={setPhoneOtp}
                disabled={verifyingPhone || submitting}
                autoFocus
                helperText="The code expires after a short time."
              />
              <button
                type="submit"
                disabled={verifyingPhone || submitting}
                className="btn-primary mt-6 w-full justify-center disabled:opacity-60"
              >
                {verifyingPhone || submitting ? "Verifying…" : "Verify and create account"}
              </button>
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={handleResendPhoneOtp}
                  disabled={verifyingPhone || submitting || resendCooldown > 0}
                  className="text-xs font-bold text-brand-blue hover:text-brand-blue-dark hover:underline disabled:cursor-not-allowed disabled:text-ink-400 disabled:no-underline"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAwaitingPhoneOtp(false);
                    setPhoneOtp("");
                    setPhoneOtpError(null);
                    setResendCooldown(0);
                  }}
                  disabled={verifyingPhone || submitting}
                  className="text-xs font-bold text-ink-500 hover:text-brand-blue disabled:opacity-60"
                >
                  Use a different number
                </button>
              </div>
            </form>
          </div>
        </section>
      </PageShell>
    );
  }

  if (needsManualLogin) {
    return (
      <PageShell title="Account created | JAVLIN" backgroundPreset="explore">
        <section className="container-px py-10 sm:py-14">
          <div className="mx-auto max-w-md text-center animate-fade-up">
            <span className="inline-block rounded-full bg-brand-blue-soft px-3.5 py-1 text-xs font-black uppercase tracking-wider text-brand-blue">
              Account created
            </span>
            <h1 className="section-title mt-4">
              Your account is ready.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-ink-600">
              We couldn't sign you in automatically. Please log in to finish setting up your profile.
            </p>
            <Link href="/login" className="btn-primary mt-8 w-full justify-center">
              Go to login
            </Link>
          </div>
        </section>
      </PageShell>
    );
  }

  if (profileError) {
    return (
      <PageShell title="Almost done | JAVLIN" backgroundPreset="explore">
        <section className="container-px py-10 sm:py-14">
          <div className="mx-auto max-w-md text-center animate-fade-up">
            <span className="inline-block rounded-full bg-brand-red/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-brand-red-ink">
              One step left
            </span>
            <h1 className="section-title mt-4">
              Your account was created.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-ink-600">
              You're signed in, but we couldn't save your profile details yet:
            </p>
            <div role="alert" className="mt-3 rounded-xl border border-brand-red/20 bg-brand-red-soft p-3 text-sm font-semibold text-brand-red-ink">
              {profileError}
            </div>
            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                onClick={attemptCreateProfile}
                disabled={submitting}
                className="btn-primary w-full justify-center disabled:opacity-60"
              >
                {submitting ? "Retrying…" : "Try saving my profile again"}
              </button>
              <Link href="/dashboard" className="btn-ghost w-full justify-center">
                Skip for now — finish this from my dashboard
              </Link>
            </div>
          </div>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Create your account | JAVLIN"
      description="Create a JAVLIN student account."
      backgroundPreset="explore"
    >
      <section className="container-px py-10 sm:py-14">
        <div className="mx-auto max-w-xl animate-fade-up">
          <BrandMark className="h-10 w-auto" />
          <p className="eyebrow mt-4">STUDENT ACCOUNT</p>
          <h1 className="page-title mt-3">
            Create your account.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            Set up your profile once — no email confirmation, no waiting.
          </p>

          <form onSubmit={submit} className="card mt-8 p-6 sm:p-8">
            <MethodTabs
              value={method}
              onChange={(next) => {
                setMethod(next);
                setError(null);
                setProfileError(null);
                setAwaitingPhoneOtp(false);
              }}
              disabled={submitting}
            />

            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-500">Account</h2>
            <div className="mt-3 grid gap-4">
              {method === "email" ? (
                <div>
                  <label className="field-label" htmlFor="signup-email">Email</label>
                  <input
                    id="signup-email"
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="signup-password">Password</label>
                  <input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    disabled={submitting}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="At least 8 characters"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="signup-confirm-password">Confirm Password</label>
                  <input
                    id="signup-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    disabled={submitting}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="Re-enter password"
                  />
                </div>
              </div>
            </div>

            <h2 className="mt-6 text-xs font-bold uppercase tracking-wider text-ink-500">Profile</h2>
            <div className="mt-3 grid gap-4">
              <div>
                <label className="field-label" htmlFor="signup-full-name">Full Name</label>
                <input
                  id="signup-full-name"
                  type="text"
                  autoComplete="name"
                  required
                  disabled={submitting}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="e.g. Ananya Sharma"
                />
              </div>

              <CollegeSearch
                id="signup-college"
                label="College"
                placeholder={collegesLoading ? "Loading colleges…" : "Search your college…"}
                colleges={colleges}
                value={collegeId}
                onChange={(id) => setCollegeId(id)}
                disabled={submitting || collegesLoading}
              />

              <div>
                <label className="field-label" htmlFor="signup-course">Course</label>
                <input
                  id="signup-course"
                  type="text"
                  required
                  disabled={submitting}
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="e.g. BSc (Hons) Physics"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="signup-year">Year of Study</label>
                  <select
                    id="signup-year"
                    required
                    disabled={submitting}
                    value={yearOfStudy}
                    onChange={(e) => setYearOfStudy(e.target.value)}
                    className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="" disabled>Select year</option>
                    {[1, 2, 3, 4, 5, 6].map((y) => (
                      <option key={y} value={y}>
                        {y}{y === 1 ? "st" : y === 2 ? "nd" : y === 3 ? "rd" : "th"} Year
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="signup-graduation-year">Graduation Year / Post-Graduation Year</label>
                  <select
                    id="signup-graduation-year"
                    required
                    disabled={submitting}
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                    className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="" disabled>Select year</option>
                    {graduationYearOptions.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="field-label" htmlFor="signup-gender">Gender</label>
                <select
                  id="signup-gender"
                  required
                  disabled={submitting}
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="" disabled>Select gender</option>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {method === "email" && (
                <div>
                  <label className="field-label" htmlFor="signup-phone">Phone Number</label>
                  <input
                    id="signup-phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    inputMode="tel"
                    maxLength={20}
                    disabled={submitting}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="+91 98765 43210"
                  />
                  <p className="mt-1 meta">
                    Required, but not verified — no code is sent. It stays private: only the captain of a
                    team you belong to can see it.
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary mt-6 w-full justify-center disabled:opacity-60"
            >
              {submitting ? "Creating account…" : "Create account"}
            </button>

            {error && (
              <div role="alert" className="mt-4 rounded-xl border border-brand-red/20 bg-brand-red-soft p-3 text-sm font-semibold text-brand-red-ink">
                {error}
              </div>
            )}

            <p className="mt-4 text-center text-xs leading-relaxed text-ink-500">
              By creating an account, you agree to our{" "}
              <Link
                href="/terms"
                className="rounded font-semibold text-brand-blue hover:text-brand-blue-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40"
              >
                Terms &amp; Conditions
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="rounded font-semibold text-brand-blue hover:text-brand-blue-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-ink-600">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-brand-blue hover:text-brand-blue-dark">
              Log in
            </Link>
          </p>

          <div className="mt-4 text-center">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-500 hover:text-brand-blue">
              <Icon name="arrow-left" className="h-3.5 w-3.5" /> Return to JAVLIN Homepage
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
