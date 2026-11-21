import { supabase, isSupabaseConfigured } from "./supabase";
import { normalizePhone } from "./phone";

export type AuthMethod = "email" | "phone";

export type CountryCode = {
  code: string;
  country: string;
  short: string;
};

export const COUNTRY_CODES: CountryCode[] = [
  { code: "+91", country: "India", short: "IN" },
  { code: "+1", country: "US / Canada", short: "US" },
  { code: "+44", country: "United Kingdom", short: "UK" },
  { code: "+971", country: "United Arab Emirates", short: "AE" },
  { code: "+61", country: "Australia", short: "AU" },
  { code: "+65", country: "Singapore", short: "SG" },
];

export function isAuthConfigured(): boolean {
  return isSupabaseConfigured && Boolean(supabase);
}

export function authUnavailableMessage(): string {
  return "Student accounts are not configured on this deployment yet.";
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export type PhoneBuildResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

/**
 * Combines the selected country dial code with the national number and
 * validates the result against the same rule the database uses for phone
 * values (10–15 digits, optional leading +).
 */
export function buildE164Phone(dialCode: string, national: string): PhoneBuildResult {
  const raw = (national ?? "").trim();

  if (!raw) {
    return { ok: false, error: "Enter your phone number." };
  }

  if (!/^\+?[0-9\s().-]+$/.test(raw)) {
    return {
      ok: false,
      error: "Phone number can only contain digits and +, spaces, dashes, dots or parentheses.",
    };
  }

  if (raw.startsWith("+")) {
    return normalizePhone(raw);
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 12) {
    return { ok: false, error: "Enter a valid phone number." };
  }

  const dial = dialCode.replace(/\D/g, "");
  return normalizePhone(`+${dial}${digits}`);
}

function messageFrom(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "";
}

export type AuthErrorContext = "signup" | "login" | "phone" | "reset";

/**
 * Turns Supabase's raw auth errors into short, human sentences. The raw
 * message is kept as a last resort so a newly introduced provider error is
 * still visible instead of being silently swallowed.
 */
export function friendlyAuthError(error: unknown, context: AuthErrorContext = "login"): string {
  const raw = messageFrom(error);
  const message = raw.toLowerCase();

  if (!raw) {
    return "Something went wrong. Please try again.";
  }

  if (message.includes("invalid login credentials")) {
    return "That email or password doesn’t match. Check your details and try again.";
  }

  if (message.includes("email not confirmed")) {
    return "Confirm your email first. Open the verification link we sent to your inbox.";
  }

  if (message.includes("phone") && message.includes("already")) {
    return "An account with this phone number already exists. Log in instead.";
  }

  if (message.includes("user already registered") || message.includes("already been registered")) {
    return "An account with these details already exists. Log in instead.";
  }

  if (message.includes("password") && message.includes("least")) {
    return "Choose a password with at least 8 characters.";
  }

  if (message.includes("phone signups are disabled") || message.includes("phone provider")) {
    return "Phone sign-ups aren’t available right now. Continue with email instead.";
  }

  if (message.includes("email signups are disabled") || message.includes("email provider")) {
    return "Email sign-ups aren’t available right now. Please try again later.";
  }

  if (
    message.includes("sms provider") ||
    message.includes("sms is not configured") ||
    message.includes("sms not configured")
  ) {
    return "Text-message verification isn’t available right now. Continue with email instead.";
  }

  if (
    message.includes("error sending confirmation sms") ||
    message.includes("failed to send sms")
  ) {
    return "We couldn’t send the SMS code. Please try again or continue with email.";
  }

  if (message.includes("signups not allowed")) {
    return "New sign-ups are paused right now. Please try again later.";
  }

  if (message.includes("email link is invalid") || message.includes("link has expired")) {
    return "That link has expired or is invalid. Request a fresh one.";
  }

  if (message.includes("rate limit") || message.includes("too many")) {
    return "Too many attempts. Please wait a minute and try again.";
  }

  if (message.includes("sms") || message.includes("otp") || message.includes("token")) {
    return "We couldn’t verify that code. Request a fresh code and try again.";
  }

  if (message.includes("network") || message.includes("fetch") || message.includes("failed to fetch")) {
    return "We couldn’t reach the sign-in service. Check your connection and try again.";
  }

  if (context === "reset" && message.includes("user not found")) {
    return "If an account exists with these details, a reset message is on its way.";
  }

  return raw;
}

export function getAuthClientError(): string | null {
  if (isAuthConfigured()) return null;
  return authUnavailableMessage();
}

export async function signUpWithEmail(email: string, password: string) {
  if (!supabase) {
    return { data: null, error: new Error(authUnavailableMessage()) };
  }
  return supabase.auth.signUp({ email, password });
}

export async function signUpWithPhone(phone: string, password: string) {
  if (!supabase) {
    return { data: null, error: new Error(authUnavailableMessage()) };
  }
  return supabase.auth.signUp({ phone, password });
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) {
    return { data: null, error: new Error(authUnavailableMessage()) };
  }
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signInWithPhone(phone: string, password: string) {
  if (!supabase) {
    return { data: null, error: new Error(authUnavailableMessage()) };
  }
  return supabase.auth.signInWithPassword({ phone, password });
}

export async function resendEmailConfirmation(email: string) {
  if (!supabase) {
    return { error: new Error(authUnavailableMessage()) };
  }
  return supabase.auth.resend({ type: "signup", email });
}

export async function resendPhoneOtp(phone: string) {
  if (!supabase) {
    return { error: new Error(authUnavailableMessage()) };
  }
  return supabase.auth.resend({ type: "sms", phone });
}

export async function verifyPhoneOtp(phone: string, token: string) {
  if (!supabase) {
    return { data: null, error: new Error(authUnavailableMessage()) };
  }
  return supabase.auth.verifyOtp({ phone, token, type: "sms" });
}

/**
 * Starts an SMS-based password recovery. `shouldCreateUser: false` keeps this
 * from silently opening a new account for an unknown number.
 */
export async function sendPhoneRecoveryOtp(phone: string) {
  if (!supabase) {
    return { error: new Error(authUnavailableMessage()) };
  }
  return supabase.auth.signInWithOtp({
    phone,
    options: { shouldCreateUser: false },
  });
}

export async function updateAuthPassword(password: string) {
  if (!supabase) {
    return { error: new Error(authUnavailableMessage()) };
  }
  return supabase.auth.updateUser({ password });
}