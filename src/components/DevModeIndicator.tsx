export default function DevModeIndicator() {
  // Admin access is strictly governed by Supabase Auth and admin_users.
  // No development bypass or unauthenticated admin link is permitted.
  return null;
}
