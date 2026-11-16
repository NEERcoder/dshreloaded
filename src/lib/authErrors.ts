export function friendlyAuthError(rawMessage: string | null | undefined): string {
  const message = (rawMessage || "").trim();
  if (!message) return "Something went wrong. Please try again.";
  const lower = message.toLowerCase();

  if (lower.includes("already registered") || lower.includes("already exists") || lower.includes("user already")) {
    return "Unable to create an account with these details. Try signing in or resetting your password.";
  }
  if (lower.includes("invalid login credentials") || lower.includes("invalid email or password") || lower.includes("user not found")) {
    return "Incorrect email or password. Please try again.";
  }
  if (lower.includes("email not confirmed")) {
    return "Unable to sign in. Check your email for a confirmation link or contact support.";
  }
  if (lower.includes("password") && (lower.includes("at least") || lower.includes("should be") || lower.includes("weak") || lower.includes("short"))) {
    return "That password is too weak. Use at least 8 characters.";
  }
  if (lower.includes("unable to validate email") || lower.includes("invalid email")) {
    return "Please enter a valid email address.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (lower.includes("network") || lower.includes("failed to fetch")) {
    return "We couldn't reach the server. Check your connection and try again.";
  }
  if (lower.includes("same password") || lower.includes("different from the old")) {
    return "Your new password must be different from your current password.";
  }
  if (lower.includes("session") && (lower.includes("expired") || lower.includes("missing") || lower.includes("invalid"))) {
    return "This link has expired or was already used. Please request a new one.";
  }

  return "Something went wrong. Please try again.";
}
