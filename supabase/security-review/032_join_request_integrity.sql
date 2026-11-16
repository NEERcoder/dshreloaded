-- PROPOSED — NOT APPLIED. Phase 2.1 complete remediation, file 3 of 4 (030-033).
--
-- PURPOSE — live finding E. 003 already forces INSERT to status='pending'
-- (003:46) and restricts UPDATE to the team captain (003:49-63). The remaining
-- defect: a captain can UPDATE status='approved' DIRECTLY through PostgREST.
-- That path sets the label but does NOT insert a competition_team_members row
-- and does NOT run the capacity/deadline re-checks — only the BEFORE-UPDATE
-- deadline trigger fires. The result is an "approved" request with no membership.
--
-- The atomic path is approve_team_join_request (013:528-582): it locks the team,
-- re-checks captaincy/status/deadline/capacity, then inserts the membership and
-- flips the request in ONE definer transaction. Because it is SECURITY DEFINER
-- it bypasses RLS, so a row-policy restriction on direct writes does not affect
-- it.
--
-- FIX: the captain UPDATE policy keeps its captain-only USING, but its WITH
-- CHECK now forbids 'approved'. Direct writes can only reject (or re-open to
-- pending); approval is reachable exclusively through the RPC, which is the
-- only path that also creates the membership. 024 §5 already narrowed the
-- column grant to status; this file re-asserts it so 032 is self-contained.
--
-- WHAT IS PRESERVED
--   * applicants create pending requests (003 INSERT policy untouched);
--   * applicants still cannot UPDATE their own status (captain-only USING);
--   * captains reject directly (dataAccess.ts rejectCompetitionTeamJoinRequest);
--   * captains approve via approve_team_join_request (unchanged);
--   * the pending-only partial unique index (003:20-22) and request history.
--
-- DEPENDENCIES: 003 (table + policies), 013 (approve RPC + deadline guard),
--   024 §5 (status-column grant; re-asserted here).

begin;

-- ---------------------------------------------------------------------------
-- 0. Preflight: recognise the 003 captain UPDATE policy, or this file's output.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  v_update int := 0;
  v_insert int := 0;
  v_unexpected text := '';
begin
  for r in
    select p.polname, p.polcmd::text as cmd, p.polpermissive,
           pg_get_expr(p.polqual, p.polrelid) as using_expr,
           pg_get_expr(p.polwithcheck, p.polrelid) as check_expr
      from pg_policy p
      join pg_class c on c.oid = p.polrelid
      join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
     where c.relname = 'competition_team_join_requests'
     order by p.polcmd, p.polname
  loop
    if not r.polpermissive then
      raise exception 'ABORT: policy "%" on competition_team_join_requests is RESTRICTIVE; reconcile live state first.', r.polname;
    end if;

    case r.polname
      when 'Captains process join requests' then
        if r.cmd <> 'w'
           or position('captain_user_id' in coalesce(r.using_expr, '')) = 0
           or position('captain_user_id' in coalesce(r.check_expr, '')) = 0 then
          raise exception 'ABORT: the captain UPDATE policy is not the 003:49-63 captain-only pair (cmd=% using=% check=%)', r.cmd, r.using_expr, r.check_expr;
        end if;
        v_update := v_update + 1;

      when 'Students can request to join' then
        if r.cmd <> 'a' or position('pending' in coalesce(r.check_expr, '')) = 0 then
          raise exception 'ABORT: the INSERT policy no longer forces pending (cmd=% check=%) — finding E isn''t the one this file expects', r.cmd, r.check_expr;
        end if;
        v_insert := v_insert + 1;

      when 'Students read own requests, captains read team requests' then
        if r.cmd <> 'r' then
          raise exception 'ABORT: the SELECT policy is cmd=%, expected SELECT', r.cmd;
        end if;

      else
        v_unexpected := v_unexpected || case when v_unexpected = '' then '' else ', ' end
          || '[' || r.cmd || '] "' || r.polname || '"';
    end case;
  end loop;

  if v_unexpected <> '' then
    raise exception 'ABORT: unrecognised policies on competition_team_join_requests: %', v_unexpected;
  end if;
  if v_update <> 1 or v_insert <> 1 then
    raise exception 'ABORT: expected one captain UPDATE and one pending INSERT policy; found % and %', v_update, v_insert;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Approval becomes RPC-only. Reject stays a direct captain write.
-- ---------------------------------------------------------------------------
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
    status <> 'approved'
    and exists (
      select 1 from public.competition_teams t
      where t.id = team_id and t.captain_user_id = auth.uid()
    )
  );

-- Re-assert the status-only column grant (024 §5) so this file converges whether
-- or not 024 ran first. Identity columns stay immutable.
revoke update on public.competition_team_join_requests from public, anon, authenticated;
grant update (status) on public.competition_team_join_requests to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Convergence.
-- ---------------------------------------------------------------------------
do $$
declare
  v_check text;
begin
  select pg_get_expr(p.polwithcheck, p.polrelid) into v_check
    from pg_policy p join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
   where c.relname = 'competition_team_join_requests' and p.polname = 'Captains process join requests';
  if position('approved' in coalesce(v_check, '')) = 0 then
    raise exception 'the UPDATE WITH CHECK does not forbid approved — direct approval is still possible';
  end if;

  if has_column_privilege('authenticated', 'public.competition_team_join_requests', 'user_id', 'UPDATE')
     or has_column_privilege('authenticated', 'public.competition_team_join_requests', 'team_id', 'UPDATE') then
    raise exception 'join-request identity columns are still writable';
  end if;
  if not has_column_privilege('authenticated', 'public.competition_team_join_requests', 'status', 'UPDATE') then
    raise exception 'captains could no longer reject a request';
  end if;
  if not has_function_privilege('authenticated', 'public.approve_team_join_request(uuid)', 'EXECUTE') then
    raise exception 'the atomic approval RPC is not executable by authenticated';
  end if;
end;
$$;

commit;

-- EXPECTED TEST RESULTS (scripts/security-phase2-check.mjs)
--   applicant INSERTs status='approved'                 -> denied (003, unchanged)
--   applicant UPDATEs own request status                -> denied (captain-only USING)
--   captain UPDATEs status='approved' directly          -> denied (NEW: WITH CHECK)
--   captain UPDATEs status='rejected' directly          -> succeeds
--   captain calls approve_team_join_request             -> membership + approved, atomic
--   non-captain calls approve_team_join_request         -> denied
--
-- ROLLBACK (staging only; reopens direct approval-without-membership). `--$ `
-- lines are authoritative; the harness executes them then re-applies 032.
--$ begin;
--$ drop policy if exists "Captains process join requests" on public.competition_team_join_requests;
--$ create policy "Captains process join requests"
--$   on public.competition_team_join_requests for update to authenticated
--$   using (exists (select 1 from public.competition_teams t where t.id = team_id and t.captain_user_id = auth.uid()))
--$   with check (exists (select 1 from public.competition_teams t where t.id = team_id and t.captain_user_id = auth.uid()));
--$ commit;
