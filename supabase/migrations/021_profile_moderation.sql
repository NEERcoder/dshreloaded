-- 021_profile_moderation.sql
--
-- STATUS: PROPOSED — NOT APPLIED. Review first.
--
-- WHY THIS EXISTS
-- The admin side of the redesign asks for a Circle management section. Today an
-- admin already has broad READ access — 002 lets any authenticated user read
-- public.profiles, and 008 lets an admin read every student_record — but no way
-- to record that something on a profile needs attention, and no trail of what a
-- moderator decided.
--
-- The obvious shortcut is an admin UPDATE policy on public.profiles. This
-- migration deliberately does not do that. Letting an admin write a student's
-- profile row would quietly reverse the rule the whole directory is built on —
-- that a profile says what its owner chose to say — and it is a policy change on
-- a live, populated table, not an addition.
--
-- So this is a separate, append-style table: an admin flags a profile with a
-- reason, the owner can see the flag on their own profile, and nothing about
-- either student's own rows changes. Hiding, unlisting or deleting a profile
-- stays a decision to make explicitly, with its own review, rather than a side
-- effect of a write policy.
--
-- WHAT BREAKS IF YOU SKIP IT
-- Nothing. The admin Circle panel states that profile moderation has no path
-- yet, and shows the live public-directory count it can actually read.
--
-- READS, IN ONE LOOK
--   * the owner: their own flags.
--   * an admin: every flag (write allowed, because a flag is about a profile,
--     never part of one).
--   * everyone else: nothing. A flag is not public information about a student.

create table if not exists public.profile_moderation_flags (
  id uuid primary key default gen_random_uuid(),
  profile_user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 3 and 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  -- Which surface the flag points at, so a resolver knows what to look at
  -- without the flag itself carrying any of the student's content.
  subject text check (subject is null or subject in ('profile', 'headline', 'avatar', 'record', 'connection')),
  created_by uuid not null references auth.users (id) on delete set null,
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profile_moderation_flags is
  'Admin-raised review notes about a profile. Never part of what a student publishes.';
comment on column public.profile_moderation_flags.status is
  'open needs a decision; resolved and dismissed are terminal and record who made them.';

create index if not exists profile_flags_open_idx
  on public.profile_moderation_flags (created_at desc)
  where status = 'open';

create index if not exists profile_flags_subject_user_idx
  on public.profile_moderation_flags (profile_user_id);

drop trigger if exists profile_flags_set_updated_at on public.profile_moderation_flags;
create trigger profile_flags_set_updated_at before update on public.profile_moderation_flags
  for each row execute function public.set_updated_at();

alter table public.profile_moderation_flags enable row level security;

drop policy if exists "Owners can read flags on their own profile" on public.profile_moderation_flags;
create policy "Owners can read flags on their own profile"
  on public.profile_moderation_flags for select to authenticated
  using (profile_user_id = auth.uid());

drop policy if exists "Admins can read every flag" on public.profile_moderation_flags;
create policy "Admins can read every flag"
  on public.profile_moderation_flags for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can raise a flag" on public.profile_moderation_flags;
create policy "Admins can raise a flag"
  on public.profile_moderation_flags for insert to authenticated
  with check (public.is_admin() and created_by = auth.uid());

-- A policy cannot compare a row's old and new values, so "an admin may change a
-- flag's status but not the student it is about" is not something this table can
-- enforce in RLS. If that rule matters, it belongs in a trigger or an RPC that
-- takes only (id, status, resolved_by) — noted here so the gap is not a surprise.
drop policy if exists "Admins can resolve a flag" on public.profile_moderation_flags;
create policy "Admins can resolve a flag"
  on public.profile_moderation_flags for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update on public.profile_moderation_flags to authenticated;
