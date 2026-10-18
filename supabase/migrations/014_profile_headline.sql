-- =====================================================================
-- 014_profile_headline.sql
-- =====================================================================
-- Adds an optional, owner-authored public headline to student profiles.
--
-- The dashboard lets a student set a short headline. The 60-word rule and this
-- character cap are enforced in the application data layer (validateHeadline /
-- MAX_HEADLINE_CHARS in src/lib/dataAccess.ts, reused by the form in
-- src/pages/DashboardPage.tsx). This migration adds the column plus a matching
-- 1000-character DB backstop that guards against absurdly large values even if
-- a write path ever bypasses the app. 1000 comfortably fits an ordinary 60-word
-- headline (~12 characters per word plus spaces) while bounding storage/abuse.
-- No default content is fabricated — the column is nullable and empty by
-- default.
--
-- PUBLIC-VISIBILITY SAFETY:
--   * This column joins the existing public projection. Anonymous visitors may
--     read it ONLY for rows that migration 007's row policy already exposes
--     ("Public profiles are readable by anyone" ... using (is_public = true)).
--   * Column-level GRANTs in Postgres are additive, so granting select on
--     `headline` to anon adds exactly one column to the set 007 already granted
--     and does NOT widen any row policy or expose any other column.
--   * Authenticated users already hold table-wide select on profiles (002), so
--     signed-in viewers need no additional grant.
--
-- Idempotent: safe to re-run. Applies nothing destructive.

-- 1. Column (nullable, no default).
alter table public.profiles
  add column if not exists headline text;

-- 2. Named length constraint so a re-run converges instead of piling up checks.
alter table public.profiles
  drop constraint if exists profiles_headline_check;

alter table public.profiles
  add constraint profiles_headline_check
  check (headline is null or char_length(headline) <= 1000);

comment on column public.profiles.headline is
  'Optional owner-authored public headline (max 60 words, enforced in the app). Part of the public projection only when is_public = true.';

-- 3. Add `headline` to the anonymous public projection. The 007 row policy
--    (is_public = true) still governs which rows anon can read at all.
grant select (headline) on public.profiles to anon;
