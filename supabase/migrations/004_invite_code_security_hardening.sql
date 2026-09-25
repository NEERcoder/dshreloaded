-- =====================================================================
-- 004_invite_code_security_hardening.sql
-- =====================================================================
-- Closes the invite-code disclosure hole at the database level.
--
-- Before this migration, any query against competition_teams (including
-- one crafted in a browser console with the public anon key) could read
-- every team's invite_code, because RLS is row-level only and cannot
-- hide individual columns. Frontend stripping of the field was cosmetic.
--
-- This migration:
--   1. Revokes table-level SELECT on competition_teams from the API
--      roles and re-grants it on every column EXCEPT invite_code.
--      service_role is unaffected and retains full access.
--   2. Adds get_team_invite_code(p_team_id): a security-definer RPC that
--      returns the code only to that team's members and captain.
--   3. Re-asserts execution grants on find_team_by_invite_code.
--
-- DEPLOYMENT ORDER: ship the frontend build that calls
-- get_team_invite_code BEFORE applying this migration. The updated
-- dataAccess layer falls back to reading the column directly whenever
-- the RPC is unavailable, so it works both before and after 004. The
-- previous frontend build may stop displaying invite codes for members
-- once 004 is applied (team pages otherwise keep working).
--
-- Idempotent: safe to re-run at any time.

-- 1. Column-level security on competition_teams.invite_code.
revoke select on public.competition_teams from anon, authenticated;
grant select (id, competition_id, name, captain_user_id, status, created_at, updated_at)
  on public.competition_teams to anon, authenticated;

-- 2. Members-only invite code retrieval.
create or replace function public.get_team_invite_code(p_team_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if auth.uid() is null then
    return null;
  end if;

  select t.invite_code into v_code
  from public.competition_teams t
  where t.id = p_team_id
    and (
      t.captain_user_id = auth.uid()
      or exists (
        select 1 from public.competition_team_members m
        where m.team_id = t.id and m.user_id = auth.uid()
      )
    );

  return v_code;
end;
$$;

revoke execute on function public.get_team_invite_code(uuid) from public, anon;
grant execute on function public.get_team_invite_code(uuid) to authenticated;

-- 3. Re-assert the execution lock on the code-lookup RPC (no-op when 002
--    already ran; converges grants if it did not).
revoke execute on function public.find_team_by_invite_code(text) from public, anon;
grant execute on function public.find_team_by_invite_code(text) to authenticated;
