-- PROPOSED — NOT APPLIED. Phase 2.1 complete remediation, file 2 of 4 (030-033).
--
-- PURPOSE — live finding D. competition_registrations carries a frozen
-- roster_snapshot (array of {user_id, full_name, role}) and participant_user_id.
-- 013:371-372 grants authenticated TABLE-WIDE SELECT, so any row the policy
-- admits exposes every column — including the snapshot of names that may since
-- have left the team. The only client read (dataAccess.ts getMyCompetitionRegistrations)
-- selects id, competition_id, registration_type, team_id, registered_at and
-- filters on status; it never reads roster_snapshot or participant_user_id.
-- No client reads roster_snapshot at all (it is an admin-export artefact).
--
-- DECISION (least privilege, confirmed against the UI):
--   * authenticated keeps SELECT on exactly the six columns the client uses;
--   * roster_snapshot, participant_user_id and updated_at become admin-only,
--     reachable through the SECURITY DEFINER competition_registration_records
--     RPC (013:784-847, is_admin()-gated) which bypasses column grants;
--   * the ROW policy is unchanged: a participant still sees their own solo
--     registration, a team member still sees their team's registration. RLS
--     policy expressions may reference participant_user_id even though the
--     caller cannot SELECT that column — policies are not column-privilege
--     checked. This is verified, not assumed, by the convergence block and the
--     harness.
--
-- Fabricated membership can no longer unlock a registration because 024 closes
-- the membership INSERT/UPDATE holes; this file removes the column over-exposure
-- that remained even for legitimately-admitted rows.
--
-- DEPENDENCIES: 013 (table, grants, the sole SELECT policy, the admin RPC),
--   024 (membership integrity). Does not modify the policy or any function.

begin;

-- ---------------------------------------------------------------------------
-- 0. Preflight: the table and its single SELECT policy must be the 013 shape.
-- ---------------------------------------------------------------------------
do $$
declare
  v_policies int;
  v_cmd text;
begin
  if to_regclass('public.competition_registrations') is null then
    raise exception 'ABORT: competition_registrations does not exist — 013 is not applied here';
  end if;

  select count(*) into v_policies from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
   where c.relname = 'competition_registrations';
  if v_policies <> 1 then
    raise exception 'ABORT: competition_registrations has % policies; expected the single SELECT policy 013:355-366 creates. Reconcile live state first.', v_policies;
  end if;

  select p.polcmd::text into v_cmd from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
   where c.relname = 'competition_registrations';
  if v_cmd <> 'r' then
    raise exception 'ABORT: the registration policy is cmd=%, expected SELECT (013 grants no write policy)', v_cmd;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Collapse table-wide SELECT to the six columns the client actually reads.
--    roster_snapshot / participant_user_id / updated_at fall out of the API
--    role's reach; the admin RPC still returns them as the definer.
-- ---------------------------------------------------------------------------
revoke select on public.competition_registrations from authenticated;
grant select (id, competition_id, registration_type, team_id, status, registered_at)
  on public.competition_registrations to authenticated;

-- anon and service_role are untouched: 013:371 already revoked anon, and
-- service_role is Supabase-managed. No write grant is added — writes remain
-- exclusive to the 013 definer RPCs.

-- ---------------------------------------------------------------------------
-- 2. Convergence.
-- ---------------------------------------------------------------------------
do $$
begin
  if has_column_privilege('authenticated', 'public.competition_registrations', 'roster_snapshot', 'SELECT') then
    raise exception 'roster_snapshot is still readable by authenticated — finding D stays open';
  end if;
  if has_column_privilege('authenticated', 'public.competition_registrations', 'participant_user_id', 'SELECT') then
    raise exception 'participant_user_id is still readable by authenticated';
  end if;
  if has_column_privilege('authenticated', 'public.competition_registrations', 'updated_at', 'SELECT') then
    raise exception 'updated_at is still readable by authenticated';
  end if;

  -- The client read must still work: every column it selects or filters on.
  if not has_column_privilege('authenticated', 'public.competition_registrations', 'id', 'SELECT')
     or not has_column_privilege('authenticated', 'public.competition_registrations', 'competition_id', 'SELECT')
     or not has_column_privilege('authenticated', 'public.competition_registrations', 'registration_type', 'SELECT')
     or not has_column_privilege('authenticated', 'public.competition_registrations', 'team_id', 'SELECT')
     or not has_column_privilege('authenticated', 'public.competition_registrations', 'status', 'SELECT')
     or not has_column_privilege('authenticated', 'public.competition_registrations', 'registered_at', 'SELECT') then
    raise exception 'getMyCompetitionRegistrations would break: a required column lost SELECT';
  end if;

  -- The row policy survived and still references the (now unselectable) owner
  -- column — proving RLS does not need a column grant to evaluate.
  if not exists (select 1 from pg_policy p join pg_class c on c.oid = p.polrelid
                  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
                 where c.relname = 'competition_registrations'
                   and p.polname = 'Students read their own registrations' and p.polcmd = 'r') then
    raise exception 'the registration row policy is missing';
  end if;
  if has_table_privilege('anon', 'public.competition_registrations', 'SELECT') then
    raise exception 'anon can read competition_registrations — it must not';
  end if;
end;
$$;

commit;

-- EXPECTED TEST RESULTS (scripts/security-phase2-check.mjs)
--   member selects roster_snapshot on their team's registration  -> denied (was permitted)
--   member selects participant_user_id                           -> denied
--   member runs getMyCompetitionRegistrations projection         -> succeeds, rows visible
--   non-member reads another team's registration                 -> 0 rows (policy unchanged)
--   admin RPC competition_registration_records                   -> still returns roster/email/phone
--
-- ROLLBACK (staging only; restores table-wide SELECT, re-exposing roster_snapshot
-- and participant_user_id to every admitted row). `--$ ` lines are authoritative.
--$ begin;
--$ grant select on public.competition_registrations to authenticated;
--$ commit;
