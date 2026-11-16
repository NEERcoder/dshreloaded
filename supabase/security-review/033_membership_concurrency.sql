-- PROPOSED — NOT APPLIED. Phase 2.1 complete remediation, file 4 of 4 (030-033).
--
-- PURPOSE — live finding B, concurrency. 013's guard_competition_team_membership
-- locks the TEAM row (013:214 `for update`) before counting members. That makes
-- SAME-TEAM capacity race-safe: two students racing for the last seat serialize
-- on the one team row. But the ONE-TEAM-PER-COMPETITION rule (013:233-244) is
-- checked across DIFFERENT teams, which lock DIFFERENT rows. Two concurrent
-- INSERTs of the SAME student into two teams of the same competition therefore
-- do not serialize: both read v_other_teams = 0, both pass, both insert. The
-- unique index is only (team_id, user_id) (002:136-137) — different team_ids, so
-- it does not catch this. 013:199-201's comment claims a race "cannot slip
-- through"; that is true for capacity and FALSE for the cross-team rule.
--
-- FIX: take a transaction-scoped advisory lock keyed on (user_id, competition_id)
-- before the one-team check, on INSERT. All joins for one student in one
-- competition — across any teams — now serialize on that key, so the second
-- INSERT re-counts against the first's committed row and is rejected. The lock
-- releases at commit/rollback; no schema change, no new column, no new index.
--
-- LOCK ORDERING: every join path (join_competition_team_by_code,
-- approve_team_join_request, the captain bootstrap) inserts a SINGLE membership
-- row per transaction, so the order is always team-row-lock then advisory-lock
-- for one key — no cycle. A hypothetical multi-row insert spanning teams could
-- order advisory keys differently; none of the application's writes do that.
--
-- This is a CREATE OR REPLACE of the existing function: the trigger binding
-- (competition_team_members_guard, 013:265-268) references it by OID and is
-- preserved. Everything else in the body is byte-for-byte 013's logic.
--
-- DEPENDENCIES: 013 (the function and its trigger), 002 (the tables). 024 closes
--   the UPDATE redirect that bypassed these checks entirely; this file closes
--   the INSERT race that remained.

begin;

-- ---------------------------------------------------------------------------
-- 0. Preflight: the guard and its trigger must exist as 013 created them.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regprocedure('public.guard_competition_team_membership()') is null then
    raise exception 'ABORT: guard_competition_team_membership() does not exist — 013 is not applied here';
  end if;
  if not exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
                  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
                 where c.relname = 'competition_team_members'
                   and t.tgname = 'competition_team_members_guard' and not t.tgisinternal) then
    raise exception 'ABORT: the membership guard trigger is absent; do not apply 033';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. The guard, with the cross-team advisory lock added. Identical to 013
--    except the marked block.
-- ---------------------------------------------------------------------------
create or replace function public.guard_competition_team_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team public.competition_teams;
  v_competition public.opportunities;
  v_members int;
  v_other_teams int;
begin
  select * into v_team from public.competition_teams where id = coalesce(new.team_id, old.team_id) for update;
  if not found then
    raise exception 'Team no longer exists';
  end if;

  select * into v_competition from public.opportunities where id = v_team.competition_id;
  if not found then
    raise exception 'Competition no longer exists';
  end if;

  if not public.competition_registration_open(v_team.competition_id) then
    raise exception 'The deadline for % has passed — team rosters are locked.', v_competition.title;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  -- 033: serialize same-student/same-competition joins across DIFFERENT teams.
  -- The team-row lock above only serializes same-team capacity. Transaction-
  -- scoped; released at commit. pg_catalog qualified so search_path cannot
  -- shadow the lock functions.
  if tg_op = 'INSERT' then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(new.user_id::text || ':' || v_team.competition_id::text, 0));
  end if;

  -- One student, one team per competition.
  if tg_op = 'INSERT' then
    select count(*) into v_other_teams
    from public.competition_team_members m
    join public.competition_teams t on t.id = m.team_id
    where m.user_id = new.user_id
      and t.competition_id = v_team.competition_id
      and m.team_id <> new.team_id;

    if v_other_teams > 0 then
      raise exception 'You are already on a team for this competition';
    end if;
  end if;

  select count(*) into v_members
  from public.competition_team_members
  where team_id = new.team_id;

  if tg_op = 'INSERT' and v_competition.max_team_size is not null
     and v_members + 1 > v_competition.max_team_size then
    raise exception 'This team is full (maximum % members)', v_competition.max_team_size;
  end if;

  if not v_competition.team_formation_enabled then
    raise exception 'Team formation is not enabled for this competition';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Convergence: the lock is in the body and the trigger still fires it.
-- ---------------------------------------------------------------------------
do $$
declare
  v_def text;
begin
  select pg_get_functiondef('public.guard_competition_team_membership()'::regprocedure) into v_def;
  if position('pg_advisory_xact_lock' in coalesce(v_def, '')) = 0 then
    raise exception 'the cross-team advisory lock is not present in the guard body';
  end if;
  if not exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
                  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
                 where c.relname = 'competition_team_members'
                   and t.tgname = 'competition_team_members_guard'
                   and t.tgfoid = 'public.guard_competition_team_membership()'::regprocedure
                   and t.tgenabled <> 'D') then
    raise exception 'the guard trigger is missing, disabled, or bound to a different function';
  end if;
end;
$$;

commit;

-- EXPECTED TEST RESULTS (scripts/security-phase2-check.mjs)
--   sequential one-team-per-competition                 -> second join rejected (unchanged)
--   same-team capacity                                  -> last seat goes to exactly one (unchanged)
--   concurrent cross-team joins, same student           -> exactly one succeeds (NEW; PGlite
--                                                          single-connection cannot truly race, so the
--                                                          harness proves the lock is taken and the
--                                                          re-count rejects; real concurrency needs staging)
--   deadline / team-formation / leave / remove          -> unchanged
--
-- ROLLBACK (staging only; restores 013's body WITHOUT the advisory lock, reopening
-- the cross-team race). `--$ ` lines are authoritative.
--$ begin;
--$ create or replace function public.guard_competition_team_membership()
--$ returns trigger language plpgsql security definer set search_path = public as $fn$
--$ declare
--$   v_team public.competition_teams;
--$   v_competition public.opportunities;
--$   v_members int;
--$   v_other_teams int;
--$ begin
--$   select * into v_team from public.competition_teams where id = coalesce(new.team_id, old.team_id) for update;
--$   if not found then raise exception 'Team no longer exists'; end if;
--$   select * into v_competition from public.opportunities where id = v_team.competition_id;
--$   if not found then raise exception 'Competition no longer exists'; end if;
--$   if not public.competition_registration_open(v_team.competition_id) then
--$     raise exception 'The deadline for % has passed — team rosters are locked.', v_competition.title;
--$   end if;
--$   if tg_op = 'DELETE' then return old; end if;
--$   if tg_op = 'INSERT' then
--$     select count(*) into v_other_teams from public.competition_team_members m
--$       join public.competition_teams t on t.id = m.team_id
--$      where m.user_id = new.user_id and t.competition_id = v_team.competition_id and m.team_id <> new.team_id;
--$     if v_other_teams > 0 then raise exception 'You are already on a team for this competition'; end if;
--$   end if;
--$   select count(*) into v_members from public.competition_team_members where team_id = new.team_id;
--$   if tg_op = 'INSERT' and v_competition.max_team_size is not null and v_members + 1 > v_competition.max_team_size then
--$     raise exception 'This team is full (maximum % members)', v_competition.max_team_size;
--$   end if;
--$   if not v_competition.team_formation_enabled then raise exception 'Team formation is not enabled for this competition'; end if;
--$   return new;
--$ end;
--$ $fn$;
--$ commit;
