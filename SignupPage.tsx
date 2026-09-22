import { FormEvent, useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import { Link, useLocation } from "../lib/router";
import { useAuth } from "../context/AuthContext";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { friendlyAuthError } from "../lib/authErrors";
import { getColleges, createProfile, type CollegeRecord, type ProfileInput } from "../lib/dataAccess";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [course, setCourse] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [gender, setGender] = useState("");

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

  function validate(): string | null {
    const cleanEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) return "Please enter a valid email address.";
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

    return null;
  }

  async function attemptCreateProfile() {
    setSubmitting(true);
    setProfileError(null);

    const input: ProfileInput = {
      fullName: fullName.trim(),
      collegeId,
      course: course.trim(),
      yearOfStudy: Number(yearOfStudy),
      graduationYear: Number(graduationYear),
      gender,
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
    const cleanEmail = email.trim().toLowerCase();

    try {
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

  if (needsManualLogin) {
    return (
      <PageShell title="Account created | DU Science Hub" backgroundPreset="explore">
        <section className="container-px py-16 sm:py-24">
          <div className="mx-auto max-w-md text-center animate-fade-up">
            <span className="inline-block rounded-full bg-brand-blue-soft px-3.5 py-1 text-xs font-black uppercase tracking-wider text-brand-blue">
              Account created
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink-900">
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
      <PageShell title="Almost done | DU Science Hub" backgroundPreset="explore">
        <section className="container-px py-16 sm:py-24">
          <div className="mx-auto max-w-md text-center animate-fade-up">
            <span className="inline-block rounded-full bg-brand-red/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-brand-red">
              One step left
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink-900">
              Your account was created.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-ink-600">
              You're signed in, but we couldn't save your profile details yet:
            </p>
            <div role="alert" className="mt-3 rounded-xl border border-brand-red/20 bg-brand-red-soft p-3 text-xs font-bold text-brand-red">
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
      title="Create your account | DU Science Hub"
      description="Create a DU Science Hub student account."
      backgroundPreset="explore"
    >
      <section className="container-px py-16 sm:py-24">
        <div className="mx-auto max-w-xl animate-fade-up">
          <p className="eyebrow text-brand-red">STUDENT ACCOUNT</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-ink-900">
            Create your account.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            Set up your profile once — no email confirmation, no waiting.
          </p>

          <form onSubmit={submit} className="card mt-8 p-6 sm:p-8 bg-white border border-surface-border shadow-card">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-400">Account</h2>
            <div className="mt-3 grid gap-4">
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

            <h2 className="mt-6 text-xs font-bold uppercase tracking-wider text-ink-400">Profile</h2>
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

              <div>
                <label className="field-label" htmlFor="signup-college">College</label>
                <select
                  id="signup-college"
                  required
                  disabled={submitting || collegesLoading}
                  value={collegeId}
                  onChange={(e) => setCollegeId(e.target.value)}
                  className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="" disabled>
                    {collegesLoading ? "Loading colleges…" : "Select your college"}
                  </option>
                  {colleges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.campus ? `(${c.campus})` : ""}
                    </option>
                  ))}
                </select>
              </div>

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
                  <label className="field-label" htmlFor="signup-graduation-year">Graduation Year</label>
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
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary mt-6 w-full justify-center disabled:opacity-60"
            >
              {submitting ? "Creating account…" : "Create account"}
            </button>

            {error && (
              <div role="alert" className="mt-4 rounded-xl border border-brand-red/20 bg-brand-red-soft p-3 text-xs font-bold text-brand-red">
                {error}
              </div>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-ink-600">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-brand-blue hover:text-brand-blue-dark">
              Log in
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
