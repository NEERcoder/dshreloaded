-- =====================================================================
-- 003_team_join_requests.sql
-- =====================================================================
-- Captain-approval join requests for competition teams.
--
-- RECONSTRUCTION NOTE: like 002, this migration was applied to production
-- out of band and never committed. It is written idempotently: running it
-- against an already-migrated project is a safe no-op. Requires 002.

create table if not exists public.competition_team_join_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.competition_teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- A student can have at most one pending request per team; rejected or
-- approved history does not block a fresh request.
create unique index if not exists competition_team_join_requests_one_pending
  on public.competition_team_join_requests (team_id, user_id)
  where status = 'pending';

create index if not exists competition_team_join_requests_team_status_idx
  on public.competition_team_join_requests (team_id, status);

alter table public.competition_team_join_requests enable row level security;

-- Students see their own requests (to show request status); captains see
-- all requests for the teams they captain. Anonymous visitors see none.
drop policy if exists "Students read own requests, captains read team requests" on public.competition_team_join_requests;
create policy "Students read own requests, captains read team requests"
  on public.competition_team_join_requests for select to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.competition_teams t
      where t.id = team_id and t.captain_user_id = auth.uid()
    )
  );

-- Requests can only be created for yourself, and only as pending.
drop policy if exists "Students can request to join" on public.competition_team_join_requests;
create policy "Students can request to join"
  on public.competition_team_join_requests for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending');

-- Only the team's captain can approve or reject requests.
drop policy if exists "Captains process join requests" on public.competition_team_join_requests;
create policy "Captains process join requests"
  on public.competition_team_join_requests for update to authenticated
  using (
    exists (
      select 1 from public.competition_teams t
      where t.id = team_id and t.captain_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.competition_teams t
      where t.id = team_id and t.captain_user_id = auth.uid()
    )
  );

grant select, insert, update on public.competition_team_join_requests to authenticated;
