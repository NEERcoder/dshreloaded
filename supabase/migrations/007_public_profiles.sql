-- 007_public_profiles.sql
-- Task 4/5: opt-in public student profiles.
--
-- Until now public.profiles was readable only by signed-in students
-- (migration 002), so a shared profile link was dead for everyone else.
-- This migration adds a per-student visibility switch and gives anonymous
-- visitors the narrowest possible read: chosen columns, public rows only.
--
-- Security posture:
--   * RLS stays enabled; nothing is widened for authenticated or service roles.
--   * anon gets COLUMN-LEVEL select only — same hardening idiom migration 004
--     uses for competition_teams.invite_code. gender, id, and every timestamp
--     remain unreadable to anon, and a "select *" request cannot succeed.
--   * The row policy is is_public = true, and is_public defaults to FALSE, so
--     no existing student's data is exposed until they turn it on themselves.

-- ---------------------------------------------------------------------------
-- 1. New columns
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_public boolean not null default false,
  add column if not exists avatar_url text;

comment on column public.profiles.is_public is
  'Owner-controlled switch. When true, anonymous visitors may read the public projection of this profile.';
comment on column public.profiles.avatar_url is
  'Public URL of an image in the student-avatars bucket, chosen by the owner.';

create index if not exists profiles_is_public_idx
  on public.profiles (is_public)
  where is_public = true;

-- ---------------------------------------------------------------------------
-- 2. Anonymous read of the public projection
-- ---------------------------------------------------------------------------
revoke select on public.profiles from anon;

grant select (user_id, full_name, college_id, course, year_of_study, graduation_year, is_public, avatar_url)
  on public.profiles to anon;

drop policy if exists "Public profiles are readable by anyone" on public.profiles;
create policy "Public profiles are readable by anyone"
  on public.profiles for select to anon
  using (is_public = true);

-- Owners keep managing their own row; migration 002's authenticated policies
-- and grants are left exactly as they were.

-- ---------------------------------------------------------------------------
-- 3. Student-owned avatars
-- ---------------------------------------------------------------------------
-- Avatars are the one media type students manage themselves. Everything else
-- (mentor photos, posters, college images) stays admin-written in 002.
insert into storage.buckets (id, name, public)
  values ('student-avatars', 'student-avatars', true)
  on conflict (id) do nothing;

drop policy if exists "Students can upload their own avatar" on storage.objects;
create policy "Students can upload their own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'student-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Students can replace their own avatar" on storage.objects;
create policy "Students can replace their own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'student-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Students can delete their own avatar" on storage.objects;
create policy "Students can delete their own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'student-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Public can view student avatars" on storage.objects;
create policy "Public can view student avatars"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'student-avatars');

-- ---------------------------------------------------------------------------
-- 4. Real JAVLIN level for another student
-- ---------------------------------------------------------------------------
-- CIRCLE cards must show a student's actual level, and MARK tiers are defined
-- as "distinct competitions the student holds a team membership in". Counting
-- that per profile on the client would be an N+1 and would still be gated by
-- RLS, so the count comes from here. Only the COUNT leaves the database — no
-- team names, no competition titles, no membership rows.
--
-- Thresholds deliberately stay in src/lib/markTier.ts; this returns a number.
create or replace function public.get_javlin_level(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(count(distinct t.competition_id), 0)::integer
  from public.competition_team_members m
  join public.competition_teams t on t.id = m.team_id
  join public.opportunities o on o.id = t.competition_id
  where m.user_id = p_user_id
    and o.category = 'competition'
    and (
      m.user_id = auth.uid()
      or public.is_admin()
      or exists (
        select 1 from public.profiles pr
        where pr.user_id = p_user_id and pr.is_public = true
      )
    );
$$;

revoke all on function public.get_javlin_level(uuid) from public;
grant execute on function public.get_javlin_level(uuid) to anon, authenticated;

comment on function public.get_javlin_level(uuid) is
  'Distinct competitions a student has joined. Returns 0 unless the caller is the owner, an admin, or the profile is public.';

-- The CIRCLE carousel shows around ten students at once. Doing that with the
-- scalar function above is one round trip per card, so this batched twin
-- answers a whole page of cards in a single call. Same visibility rule.
create or replace function public.get_javlin_levels(p_user_ids uuid[])
returns table (student_id uuid, competitions integer)
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id, count(distinct t.competition_id)::integer
  from public.competition_team_members m
  join public.competition_teams t on t.id = m.team_id
  join public.opportunities o on o.id = t.competition_id
  where m.user_id = any (p_user_ids[1:200])
    and o.category = 'competition'
    and (
      m.user_id = auth.uid()
      or public.is_admin()
      or exists (
        select 1 from public.profiles pr
        where pr.user_id = m.user_id and pr.is_public = true
      )
    )
  group by m.user_id;
$$;

revoke all on function public.get_javlin_levels(uuid[]) from public;
grant execute on function public.get_javlin_levels(uuid[]) to anon, authenticated;
