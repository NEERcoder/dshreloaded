-- 011_profile_contacts_and_team_phone.sql
-- Part 16: a private phone number, a public Instagram handle, and the team
-- roster RPC the CREW member page has been calling since 82f8324's predecessor
-- (src/lib/dataAccess.ts fetchTeamProfiles) with no migration behind it.
--
-- Security posture — read this before editing:
--
--   * phone_number deliberately does NOT live on public.profiles. Migration 002
--     grants every authenticated student TABLE-WIDE select on profiles with a
--     `using (true)` row policy, and RLS filters rows, not columns. A phone
--     column there would therefore be readable by any signed-in student, which
--     is exactly what this migration must prevent. A separate table gives the
--     column its own policy instead of asking row policy to do column work.
--
--   * public.profile_contacts is owner-writable and readable by the owner plus,
--     SELECT only, by students who share a team with the owner. anon has no
--     access at all, so no public profile query can reach it.
--
--   * get_team_member_profiles is security definer and therefore bypasses RLS,
--     so it re-checks membership twice: the target must sit on p_team_id, and
--     the CALLER must sit on p_team_id (or captain it). A student cannot
--     enumerate a team they are not on.
--
--   * instagram_handle is public by design. It is granted to anon as a single
--     additive column privilege, so this file applies cleanly whether or not
--     migration 007 has been applied yet.
--
-- Idempotent: safe to re-run. Nothing here drops or rewrites an existing
-- policy, and no existing column is touched.

-- ---------------------------------------------------------------------------
-- 1. Public Instagram handle (bare name, never a URL)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists instagram_handle text;

-- Named constraint so a re-run converges instead of piling up anonymous checks.
alter table public.profiles
  drop constraint if exists profiles_instagram_handle_check;

alter table public.profiles
  add constraint profiles_instagram_handle_check
  check (instagram_handle is null or instagram_handle ~ '^[A-Za-z0-9._]{1,30}$');

comment on column public.profiles.instagram_handle is
  'Bare Instagram handle without the @ and without a URL, e.g. neer_singh. Public on the student profile.';

grant select (instagram_handle) on public.profiles to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Private contact details, one row per student
-- ---------------------------------------------------------------------------
create table if not exists public.profile_contacts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  phone_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_contacts_phone_check check (
    phone_number is null
    or (phone_number ~ '^\+?[0-9][0-9\s()-]{5,18}$' and length(btrim(phone_number)) <= 20)
  )
);

comment on table public.profile_contacts is
  'Private per-student contact details. Never joined into a public profile projection; teammates may read phone_number only through a shared-team membership check.';

drop trigger if exists profile_contacts_set_updated_at on public.profile_contacts;
create trigger profile_contacts_set_updated_at before update on public.profile_contacts
  for each row execute function public.set_updated_at();

alter table public.profile_contacts enable row level security;

-- The owner runs their own row.
drop policy if exists "Students manage their own contact details" on public.profile_contacts;
create policy "Students manage their own contact details"
  on public.profile_contacts for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Teammates may read, never write. This is the only non-owner path to a number.
drop policy if exists "Teammates can read shared-team contacts" on public.profile_contacts;
create policy "Teammates can read shared-team contacts"
  on public.profile_contacts for select to authenticated
  using (
    exists (
      select 1
      from public.competition_team_members mine
      join public.competition_team_members theirs
        on theirs.team_id = mine.team_id
      where mine.user_id = auth.uid()
        and theirs.user_id = profile_contacts.user_id
    )
  );

revoke all on public.profile_contacts from anon;
grant select on public.profile_contacts to authenticated;
grant insert, update on public.profile_contacts to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Team roster profiles, membership-gated on the server
-- ---------------------------------------------------------------------------
create or replace function public.get_team_member_profiles(
  p_team_id uuid,
  p_user_ids uuid[]
)
returns table (
  user_id uuid,
  full_name text,
  college_id uuid,
  course text,
  instagram_handle text,
  phone_number text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.user_id,
    p.full_name,
    p.college_id,
    p.course,
    p.instagram_handle,
    c.phone_number
  from public.profiles p
  left join public.profile_contacts c on c.user_id = p.user_id
  where p.user_id = any (coalesce(p_user_ids[1:200], '{}'::uuid[]))
    -- the row must belong to this team's roster
    and exists (
      select 1 from public.competition_team_members m
      where m.team_id = p_team_id and m.user_id = p.user_id
    )
    -- and the caller must be on this team too (captain counts even if their
    -- membership row was ever lost)
    and (
      exists (
        select 1 from public.competition_team_members me
        where me.team_id = p_team_id and me.user_id = auth.uid()
      )
      or exists (
        select 1 from public.competition_teams t
        where t.id = p_team_id and t.captain_user_id = auth.uid()
      )
    );
$$;

comment on function public.get_team_member_profiles(uuid, uuid[]) is
  'Roster profiles for one team, including phone_number. Returns nothing unless the caller is a member or captain of that team.';

revoke all on function public.get_team_member_profiles(uuid, uuid[]) from public, anon;
grant execute on function public.get_team_member_profiles(uuid, uuid[]) to authenticated;
