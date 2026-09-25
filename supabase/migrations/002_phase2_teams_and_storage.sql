-- =====================================================================
-- 002_phase2_teams_and_storage.sql
-- =====================================================================
-- Student profiles, competition teams, team formation on opportunities,
-- public media buckets, and the find_team_by_invite_code RPC.
--
-- RECONSTRUCTION NOTE: this migration was applied to production out of
-- band and never committed to the repository. This file rebuilds the
-- schema the frontend queries, written fully idempotently so that:
--   * running it against the already-migrated production project is a
--     safe no-op (tables/columns/indexes/triggers use IF NOT EXISTS and
--     policies are dropped then recreated to the same effect), and
--   * a fresh environment can rebuild the complete schema by running
--     migrations 001 -> 002 -> 003 -> 004 in order.
--
-- Run order matters: apply 003 (join requests) and 004 (invite-code
-- security hardening) after this file.

-- ---------------------------------------------------------------------
-- 1. STUDENT PROFILES
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text not null,
  college_id uuid not null references public.colleges (id),
  course text not null,
  year_of_study integer not null,
  graduation_year integer not null,
  gender text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- Signed-in students can read profiles (team member lists and join
-- requests display names/colleges of other students). Anonymous visitors
-- cannot read any profile data.
drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
  on public.profiles for select to authenticated
  using (true);

-- A profile row can only ever be written for the signed-in user. The
-- frontend resolves user_id from the auth session and never accepts it
-- from caller input.
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 2. TEAM FORMATION COLUMNS ON OPPORTUNITIES
-- ---------------------------------------------------------------------
alter table public.opportunities
  add column if not exists team_formation_enabled boolean not null default false,
  add column if not exists min_team_size integer,
  add column if not exists max_team_size integer;

-- ---------------------------------------------------------------------
-- 3. COMPETITION TEAMS
-- ---------------------------------------------------------------------
create table if not exists public.competition_teams (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.opportunities (id) on delete cascade,
  name text not null,
  invite_code text not null,
  captain_user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'closed', 'disbanded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists competition_teams_invite_code_key
  on public.competition_teams (invite_code);
create index if not exists competition_teams_competition_id_idx
  on public.competition_teams (competition_id);

drop trigger if exists competition_teams_set_updated_at on public.competition_teams;
create trigger competition_teams_set_updated_at before update on public.competition_teams
  for each row execute function public.set_updated_at();

alter table public.competition_teams enable row level security;

-- Team names/status/competition are shown publicly (team listings inside
-- the opportunity detail drawer). The invite_code column itself is
-- protected separately by migration 004.
drop policy if exists "Teams are publicly readable" on public.competition_teams;
create policy "Teams are publicly readable"
  on public.competition_teams for select to anon, authenticated
  using (true);

drop policy if exists "Users can create teams they captain" on public.competition_teams;
create policy "Users can create teams they captain"
  on public.competition_teams for insert to authenticated
  with check (auth.uid() = captain_user_id);

-- with check (true) is required so a captain can transfer captaincy
-- (the new row's captain_user_id is someone else). Row selection is
-- still restricted to the captain's own team.
drop policy if exists "Captains can update their teams" on public.competition_teams;
create policy "Captains can update their teams"
  on public.competition_teams for update to authenticated
  using (auth.uid() = captain_user_id)
  with check (true);

grant select on public.competition_teams to anon, authenticated;
grant insert, update on public.competition_teams to authenticated;

-- ---------------------------------------------------------------------
-- 4. COMPETITION TEAM MEMBERS
-- ---------------------------------------------------------------------
create table if not exists public.competition_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.competition_teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('captain', 'member')),
  joined_at timestamptz not null default now()
);

-- One membership row per user per team; the database enforces what the
-- frontend can only check with a race condition.
create unique index if not exists competition_team_members_team_user_key
  on public.competition_team_members (team_id, user_id);
create index if not exists competition_team_members_user_id_idx
  on public.competition_team_members (user_id);

alter table public.competition_team_members enable row level security;

drop policy if exists "Team memberships are publicly readable" on public.competition_team_members;
create policy "Team memberships are publicly readable"
  on public.competition_team_members for select to anon, authenticated
  using (true);

-- Students add themselves (join by invite code) and captains add members
-- (approving join requests).
drop policy if exists "Members join themselves or captains add members" on public.competition_team_members;
create policy "Members join themselves or captains add members"
  on public.competition_team_members for insert to authenticated
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.competition_teams t
      where t.id = team_id and t.captain_user_id = auth.uid()
    )
  );

-- Captains update member roles when transferring captaincy; members can
-- update their own row.
drop policy if exists "Members and captains can update memberships" on public.competition_team_members;
create policy "Members and captains can update memberships"
  on public.competition_team_members for update to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.competition_teams t
      where t.id = team_id and t.captain_user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.competition_teams t
      where t.id = team_id and t.captain_user_id = auth.uid()
    )
  );

-- Members leave; captains remove members.
drop policy if exists "Members leave, captains remove" on public.competition_team_members;
create policy "Members leave, captains remove"
  on public.competition_team_members for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.competition_teams t
      where t.id = team_id and t.captain_user_id = auth.uid()
    )
  );

grant select on public.competition_team_members to anon, authenticated;
grant insert, update, delete on public.competition_team_members to authenticated;

-- ---------------------------------------------------------------------
-- 5. INVITE-CODE LOOKUP RPC
-- ---------------------------------------------------------------------
-- Resolves a team code to the team's public columns only. Runs as
-- security definer so it can read invite_code without granting that
-- column to the API roles, and never returns the code itself.
create or replace function public.find_team_by_invite_code(p_code text)
returns table (id uuid, competition_id uuid, name text, status text)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only signed-in students can resolve a code to a team.
  if auth.uid() is null then
    return;
  end if;

  return query
  select t.id, t.competition_id, t.name, t.status
  from public.competition_teams t
  where upper(t.invite_code) = upper(trim(p_code))
  limit 1;
end;
$$;

-- Security-definer functions default to executable by PUBLIC; lock that
-- down to authenticated users only.
revoke execute on function public.find_team_by_invite_code(text) from public, anon;
grant execute on function public.find_team_by_invite_code(text) to authenticated;

-- ---------------------------------------------------------------------
-- 6. PUBLIC MEDIA BUCKETS (admin-managed, publicly viewable)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('mentor-photos', 'mentor-photos', true),
  ('opportunity-posters', 'opportunity-posters', true),
  ('college-images', 'college-images', true)
on conflict (id) do nothing;

drop policy if exists "Public can view media" on storage.objects;
create policy "Public can view media"
  on storage.objects for select to anon, authenticated
  using (bucket_id in ('mentor-photos', 'opportunity-posters', 'college-images'));

drop policy if exists "Admins can upload media" on storage.objects;
create policy "Admins can upload media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('mentor-photos', 'opportunity-posters', 'college-images')
    and public.is_admin()
  );

drop policy if exists "Admins can update media" on storage.objects;
create policy "Admins can update media"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('mentor-photos', 'opportunity-posters', 'college-images')
    and public.is_admin()
  )
  with check (
    bucket_id in ('mentor-photos', 'opportunity-posters', 'college-images')
    and public.is_admin()
  );

drop policy if exists "Admins can delete media" on storage.objects;
create policy "Admins can delete media"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('mentor-photos', 'opportunity-posters', 'college-images')
    and public.is_admin()
  );
