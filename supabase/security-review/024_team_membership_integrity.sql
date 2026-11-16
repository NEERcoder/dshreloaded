-- PROPOSED — NOT APPLIED. Phase 2, file 2 of 6.
--
-- PURPOSE — approved rule 4, and findings F-02 / F-03.
-- A student must not be able to manufacture or redirect a team membership in
-- order to reach another student's private data, and a captain must not be able
-- to rewrite a team's identity. Membership grants access to teammates' phone
-- numbers twice over: the profile_contacts teammate policy (011:81-93) and the
-- definer roster RPC get_team_member_profiles (011:102-146).
--
-- SUPERSEDES the team half of the discarded 022_rls_privacy_hardening.sql.
--
-- DEPENDENCIES
--   002 (tables, the two policies and the grants this file replaces),
--   004 (competition_teams column-level SELECT for captain_user_id, which the
--   derivation trigger below must be able to read as authenticated),
--   011 (the two membership-gated data paths),
--   013 (guard_competition_team_membership trigger, join_by_code and
--   approve_team_join_request definer RPCs — neither is modified here).
--
-- PRECONDITIONS — re-verify with 000_read_only_preflight.sql first.
--   002/003 are reconstructions of SQL applied out of band, and the live project
--   already proved one committed policy wrong (L-4). The preflight block below
--   aborts rather than dropping policies it cannot identify.
--
-- DESIGN NOTE: WHAT RUNS AS WHOM
-- Section 3 and section 4's guard run as the calling role: authenticated can
-- already read competition_teams.captain_user_id (004:30-31) and its own team's
-- membership rows, so a plain trigger function can do the checking, and 022's
-- definer treatment of these was unnecessary surface area that is deliberately
-- not repeated.
-- Section 4b is the one exception, and it is provably required: in the instant
-- after captain_user_id changes, the old captain no longer satisfies 002's UPDATE
-- policy on the new captain's row, so an invoker-rights label rewrite updates zero
-- rows and leaves the team showing no captain at all. It is definer for exactly
-- that statement, takes no parameters, touches one column, pins search_path, and
-- is not callable with useful arguments through the API.
--
-- WHAT IS PRESERVED
--   * a captain creating a team plus their own initial membership row (the exact
--     two writes src/lib/dataAccess.ts createCompetitionTeam already performs);
--   * joining with an invite code and captain approval, which go through 013's
--     definer RPCs and satisfy the new INSERT policy as the roster owner;
--   * members leaving, captains removing members, captain transfer;
--   * capacity limits, deadline locks and one-team-per-competition, which stay in
--     013's guard trigger untouched.

begin;

-- ---------------------------------------------------------------------------
-- 0. Preflight: refuse to act on a policy set this file cannot describe.
--    Counting was not enough. A live database can hold exactly the number of
--    policies 002 created and still differ in what they ALLOW — and 024 then
--    narrows column privileges underneath a row policy nobody read, which can
--    leave a permissive UPDATE branch in place while looking closed. So each
--    policy is checked on five things: name, command, roles, permissive flag,
--    and the expression itself.
--    Expressions are matched on structure rather than byte-for-byte text,
--    because pg_get_expr formatting is not stable across PostgreSQL majors. The
--    structural facts that matter here are: which roles the policy applies to,
--    whether it is permissive-all, and whether it names captain_user_id.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  v_unexpected text := '';
  v_copies int;
begin
  for r in
    select c.relname as tbl, p.polname, p.polcmd::text as cmd, p.polpermissive,
           nullif(array_to_string(array(
             select case when u = 0::oid then 'public' else ro.rolname end
               from unnest(p.polroles) u
               left join pg_roles ro on ro.oid = u
              order by 1), ','), '') as roles,
           pg_get_expr(p.polqual, p.polrelid) as using_expr,
           pg_get_expr(p.polwithcheck, p.polrelid) as check_expr
      from pg_policy p
      join pg_class c on c.oid = p.polrelid
      join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
     where c.relname in ('competition_teams', 'competition_team_members')
     order by c.relname, p.polcmd, p.polname
  loop
    -- A RESTRICTIVE policy is not OR-combined with the others; if one exists
    -- out of band, every conclusion below about "who can write" is wrong.
    if not r.polpermissive then
      raise exception 'ABORT: policy "%" on %.% is RESTRICTIVE. This file only reasons about permissive-OR policy sets; reconcile live state (preflight P2) before applying.',
        r.polname, r.tbl, r.cmd;
    end if;

    case r.tbl || '/' || r.polname
      -- ---------------- competition_team_members ----------------
      when 'competition_team_members/Team memberships are publicly readable' then
        -- Permissive-all is EXPECTED here: roster user IDs are public by design
        -- (finding L-3). Verified rather than assumed, because 024 leaves it.
        if r.cmd <> 'r' or position('anon' in r.roles) = 0 then
          raise exception 'ABORT: "Team memberships are publicly readable" is % for [%], not SELECT for anon as 002:145-147 creates it', r.cmd, r.roles;
        end if;

      when 'competition_team_members/Members join themselves or captains add members' then
        -- The F-02 hole: `auth.uid() = user_id` standing alone. Recognised, and
        -- replaced in section 1, but only if it is the reviewed shape.
        if r.cmd <> 'a' or position('auth.uid()' in coalesce(r.check_expr, '')) = 0 then
          raise exception 'ABORT: the membership INSERT policy "%" does not have the 002:150-159 shape (WITH CHECK naming auth.uid()); found cmd=% using=% check=%',
            r.polname, r.cmd, r.using_expr, r.check_expr;
        end if;

      when 'competition_team_members/Captains create their own membership' then
        -- This file's own output: recognised so that a re-apply is idempotent.
        if r.cmd <> 'a' or position('captain_user_id' in coalesce(r.check_expr, '')) = 0 then
          raise exception 'ABORT: "Captains create their own membership" is not the policy 024 creates (cmd=% check=%)', r.cmd, r.check_expr;
        end if;

      when 'competition_team_members/Members and captains can update memberships' then
        if r.cmd <> 'w' or coalesce(position('captain_user_id' in r.using_expr), 0) = 0
                        or coalesce(position('captain_user_id' in r.check_expr), 0) = 0 then
          raise exception 'ABORT: the membership UPDATE policy "%" is not the 002:163-179 owner-or-captain pair (cmd=% using=% check=%). 024 narrows the column grant underneath this policy, so an unexpected UPDATE expression could leave roster rows writable.',
            r.polname, r.cmd, r.using_expr, r.check_expr;
        end if;

      when 'competition_team_members/Members leave, captains remove' then
        if r.cmd <> 'd' or coalesce(position('captain_user_id' in r.using_expr), 0) = 0 then
          raise exception 'ABORT: the membership DELETE policy "%" is not 002:182-191 (cmd=% using=%)', r.polname, r.cmd, r.using_expr;
        end if;

      -- ---------------- competition_teams ----------------
      when 'competition_teams/Teams are publicly readable' then
        if r.cmd <> 'r' then
          raise exception 'ABORT: "Teams are publicly readable" is cmd=%, expected SELECT', r.cmd;
        end if;
        -- Measured on PG17: `using (true)` renders as the bare `true`, not
        -- `(true)`, and a policy with no clause renders as NULL. Both spellings
        -- mean permissive-all here.
        if r.using_expr is distinct from 'true'
           and r.using_expr is distinct from '(true)'
           and r.using_expr is not null then
          raise exception
            'NOTE-DIVERGENCE: the live teams SELECT policy is USING %, not the committed permissive-all. This is L-4, and it must be reconciled before 024 is trusted: 024 leaves this policy in place and relies on it for team discoverability.',
            r.using_expr;
        end if;

      when 'competition_teams/Users can create teams they captain' then
        if r.cmd <> 'a' or coalesce(position('captain_user_id' in r.check_expr), 0) = 0 then
          raise exception 'ABORT: the team INSERT policy "%" is not 002:106-109 (cmd=% check=%)', r.polname, r.cmd, r.check_expr;
        end if;

      when 'competition_teams/Captains can update their teams' then
        if r.cmd <> 'w' then
          raise exception 'ABORT: "Captains can update their teams" is cmd=%, expected UPDATE', r.cmd;
        end if;
        if coalesce(position('captain_user_id' in r.using_expr), 0) = 0 then
          raise exception 'ABORT: the team UPDATE policy selects rows by % rather than captain_user_id. 024 would narrow columns underneath a policy that matches every team, leaving invite_code writable by whoever the policy admits.', r.using_expr;
        end if;
        -- with check (true) is REQUIRED for captain transfer (002's own comment).
        -- Anything narrower means the transfer flow breaks the moment 024 applies.
        if r.check_expr is distinct from 'true' and r.check_expr is distinct from '(true)' then
          raise exception 'ABORT: the team UPDATE WITH CHECK is "%", not the committed permissive-all. Captain transfer depends on that; applying 024 against this expression would leave captaincy un-transferable.', r.check_expr;
        end if;

      else
        v_unexpected := v_unexpected || case when v_unexpected = '' then '' else ', ' end
          || r.tbl || ' [' || r.cmd || '] "' || r.polname || '" for [' || r.roles || ']';
    end case;
  end loop;

  if v_unexpected <> '' then
    raise exception
      'ABORT: unrecognised policies on the team tables: %. 024 will not narrow grants underneath a policy set it has not read. Add the policy to section 0''s expectations only after establishing how it got there (preflight P2 gives name, command, roles and both expressions).',
      v_unexpected;
  end if;

  -- Exactly one policy per command per table: two UPDATE policies on either
  -- table are OR-combined, so narrowing one is not narrowing the set.
  select count(*) into v_copies from (
    select c.relname, p.polcmd, count(*) n
      from pg_policy p join pg_class c on c.oid = p.polrelid
      join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
     where c.relname in ('competition_teams','competition_team_members')
     group by 1,2 having count(*) > 1
  ) d;
  if v_copies > 0 then
    raise exception 'ABORT: % command(s) on the team tables carry more than one policy. Permissive-OR means 024 must account for all of them; it currently recognises one per command.', v_copies;
  end if;

  -- The two objects this file depends on rather than changes.
  if not exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
                  where c.relname = 'competition_team_members'
                    and t.tgname = 'competition_team_members_guard' and not t.tgisinternal) then
    raise exception 'ABORT: 013''s guard_competition_team_membership trigger is absent. 024 assumes capacity and deadline checks exist.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Insert: your own membership row, only into a team you already captain.
--    002:151-159 allowed `auth.uid() = user_id` on its own — that branch is the
--    hole: team ids are world-readable (002:102-104), so anyone with an account
--    could join any roster and then read its phone numbers.
--    The captain branch stays, so a captain can still add an approved member.
-- ---------------------------------------------------------------------------
drop policy if exists "Members join themselves or captains add members"
  on public.competition_team_members;
drop policy if exists "Captains create their own membership"
  on public.competition_team_members;

create policy "Captains create their own membership"
  on public.competition_team_members for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.competition_teams t
      where t.id = team_id and t.captain_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Membership identity is immutable. 002:163-179 gave the row owner and the
--    captain a table-wide UPDATE, so `set team_id = ...` moved a membership
--    between teams — the second door into a stranger's roster, and it fired 013's
--    guard as a legitimate-looking join. Only the display label stays writable;
--    even that is corrected by the trigger below.
--    RLS cannot express this: a policy compares values it is given, and the owner
--    branch is satisfied either way. Column privileges are the only enforcement.
-- ---------------------------------------------------------------------------
revoke update on public.competition_team_members from public, anon, authenticated;
grant update (role) on public.competition_team_members to authenticated;

-- ---------------------------------------------------------------------------
-- 3. role is derived from authority, never supplied by the caller. captain_user_id
--    on the team row is the only thing that ever grants captain power; this keeps
--    the stored label honest so a roster can never claim a second captain.
-- ---------------------------------------------------------------------------
create or replace function public.derive_membership_role()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_captain uuid;
begin
  select t.captain_user_id into v_captain
    from public.competition_teams t
   where t.id = new.team_id;

  new.role := case when v_captain = new.user_id then 'captain' else 'member' end;
  return new;
end;
$$;

revoke all on function public.derive_membership_role() from public, anon, authenticated;

drop trigger if exists competition_team_members_derive_role
  on public.competition_team_members;
create trigger competition_team_members_derive_role
  before insert or update of role on public.competition_team_members
  for each row execute function public.derive_membership_role();

-- ---------------------------------------------------------------------------
-- 4. Team row: only name, status and captaincy are writable. invite_code (013:87
--    unique index, 004 hidden column) and competition_id — which decides whose
--    registration and roster a team touches — stop being writable, closing F-03.
--    The 002 UPDATE policy keeps its `with check (true)` so captain transfer,
--    which moves captain_user_id to someone else, still works.
-- ---------------------------------------------------------------------------
revoke update on public.competition_teams from public, anon, authenticated;
grant update (name, status, captain_user_id) on public.competition_teams to authenticated;

-- A captain may only hand captaincy to somebody already on the roster. Without
-- this, captain_user_id could point at a stranger, giving that stranger's
-- memberships roster-level significance, and 002's delete/insert policies would
-- leave the team with two people who look like captains.
create or replace function public.guard_team_captain_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.captain_user_id is distinct from old.captain_user_id
     and not exists (
       select 1 from public.competition_team_members m
       where m.team_id = new.id and m.user_id = new.captain_user_id
     ) then
    raise exception 'The new captain must already be a team member';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_team_captain_identity() from public, anon, authenticated;

drop trigger if exists competition_teams_guard_captain on public.competition_teams;
create trigger competition_teams_guard_captain
  before update of captain_user_id on public.competition_teams
  for each row execute function public.guard_team_captain_identity();

-- 4b. When captaincy moves, the two affected labels move with it in the same
--     statement. This one HAS to be SECURITY DEFINER: in the instant after
--     captain_user_id changes, the old captain no longer satisfies 002's UPDATE
--     policy for the new captain's row, so an invoker-rights rewrite silently
--     updates nothing and the team is left showing zero captains. Same idiom and
--     the same privilege handling as 006's notify_* triggers: no parameters, two
--     columns touched, pinned search_path, not callable through the API.
create or replace function public.reassign_membership_roles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.competition_team_members m
     set role = case when m.user_id = new.captain_user_id then 'captain' else 'member' end
   where m.team_id = new.id
     and m.user_id in (new.captain_user_id, old.captain_user_id);
  return new;
end;
$$;

revoke all on function public.reassign_membership_roles() from public, anon;
grant execute on function public.reassign_membership_roles() to authenticated;

drop trigger if exists competition_teams_reassign_roles on public.competition_teams;
create trigger competition_teams_reassign_roles
  after update of captain_user_id on public.competition_teams
  for each row when (old.captain_user_id is distinct from new.captain_user_id)
  execute function public.reassign_membership_roles();

-- ---------------------------------------------------------------------------
-- 5. Join requests: only the decision changes. 003:50-63 already requires the
--    caller to captain the team for both USING and WITH CHECK, but the table-wide
--    UPDATE grant from 003:65 still allowed rewriting which student the request
--    was from, or which team it targeted.
-- ---------------------------------------------------------------------------
revoke update on public.competition_team_join_requests from public, anon, authenticated;
grant update (status) on public.competition_team_join_requests to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Convergence assertions: the protections are in place AND the legitimate
--    writes survived. A migration that passes only the first half breaks JAVLIN.
-- ---------------------------------------------------------------------------
do $$
begin
  if has_column_privilege('authenticated', 'public.competition_team_members', 'team_id', 'UPDATE') then
    raise exception 'membership team_id is still writable — F-02 stays open';
  end if;
  if has_column_privilege('authenticated', 'public.competition_team_members', 'user_id', 'UPDATE') then
    raise exception 'membership user_id is still writable — F-02 stays open';
  end if;
  if has_column_privilege('authenticated', 'public.competition_teams', 'invite_code', 'UPDATE') then
    raise exception 'invite_code is still writable — F-03 stays open';
  end if;
  if has_column_privilege('authenticated', 'public.competition_teams', 'competition_id', 'UPDATE') then
    raise exception 'competition_id is still writable — F-03 stays open';
  end if;
  if has_column_privilege('authenticated', 'public.competition_team_join_requests', 'user_id', 'UPDATE') then
    raise exception 'join-request user_id is still writable';
  end if;

  if not has_column_privilege('authenticated', 'public.competition_teams', 'captain_user_id', 'UPDATE') then
    raise exception 'captain transfer would break: captain_user_id is not writable';
  end if;
  if not has_column_privilege('authenticated', 'public.competition_team_members', 'role', 'UPDATE') then
    raise exception 'role label cannot be written; derivation is fine but 002 clients expect it';
  end if;
  if not has_column_privilege('authenticated', 'public.competition_team_join_requests', 'status', 'UPDATE') then
    raise exception 'captains could no longer approve or reject a request';
  end if;
  if not has_table_privilege('authenticated', 'public.competition_team_members', 'DELETE') then
    raise exception 'leaving a team would break: DELETE privilege removed';
  end if;
  if not has_table_privilege('authenticated', 'public.competition_team_members', 'INSERT') then
    raise exception 'creating a team would break: INSERT privilege removed';
  end if;
  if not exists (
    select 1 from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
     where t.tgname = 'competition_team_members_guard' and c.relname = 'competition_team_members') then
    raise exception '013 capacity/deadline guard trigger is missing — do not apply this file';
  end if;
  if (select count(distinct t.tgname) from pg_trigger t
        join pg_class c on c.oid = t.tgrelid
       where c.relname = 'competition_teams'
         and t.tgname in ('competition_teams_guard_captain', 'competition_teams_reassign_roles')) <> 2 then
    raise exception 'captaincy guards incomplete: both competition_teams_guard_captain and competition_teams_reassign_roles must exist';
  end if;
end;
$$;

commit;

-- EXPECTED TEST RESULTS (asserted in scripts/security-phase2-check.mjs)
--   self-insert into someone else's team               -> denied   (before: permitted)
--   insert a membership for another student            -> denied
--   re-point own membership at another team            -> denied   (before: permitted)
--   rewrite another student's membership               -> denied
--   member sets own role to 'captain'                  -> stored value stays 'member'
--   captain rewrites invite_code / competition_id / id -> denied   (before: permitted)
--   transfer captaincy to a non-member                 -> denied, team unchanged
--   transfer captaincy to a member                     -> succeeds, one captain label
--   code join / approval / capacity / deadline / one-team / leave / remove -> unchanged
--
-- ROLLBACK (staging only; reopens F-02, F-03 and F-06)
--   A rollback has to reach the state that existed BEFORE this file, or the
--   operator is reasoning about an incident using a picture that is wrong. The
--   first draft of this block left the captaincy-sync trigger behind, so a
--   "rolled back" team table still rewrote role labels on transfer — F-06's
--   symptom closed while F-02 and F-03 were open, the worst combination.
--   The lines prefixed `--$ ` below are the authoritative procedure:
--   scripts/security-phase2-check.mjs extracts and executes exactly them, then
--   re-applies 024 and asserts the state returns. Edit the prose freely; edit
--   those lines and the harness proves they still work.
--$ begin;
--$ drop trigger if exists competition_team_members_derive_role on public.competition_team_members;
--$ drop trigger if exists competition_teams_guard_captain on public.competition_teams;
--$ drop trigger if exists competition_teams_reassign_roles on public.competition_teams;
--$ revoke all on function public.derive_membership_role() from public, anon, authenticated;
--$ revoke all on function public.guard_team_captain_identity() from public, anon, authenticated;
--$ revoke all on function public.reassign_membership_roles() from public, anon, authenticated;
--$ drop function if exists public.derive_membership_role();
--$ drop function if exists public.guard_team_captain_identity();
--$ drop function if exists public.reassign_membership_roles();
--   Membership INSERT policy 024 §1 replaced, restored verbatim from
--   002:150-159 — including the bare `auth.uid() = user_id` branch that IS the
--   F-02 hole. It comes back deliberately: a rollback that quietly keeps half
--   the protection is worse than no rollback at all, because nobody then
--   re-applies with the urgency it deserves.
--$ drop policy if exists "Captains create their own membership" on public.competition_team_members;
--$ create policy "Members join themselves or captains add members"
--$   on public.competition_team_members for insert to authenticated
--$   with check (auth.uid() = user_id or exists (select 1 from public.competition_teams t
--$     where t.id = team_id and t.captain_user_id = auth.uid()));
--   The write surface 024 §2, §4 and §5 collapsed, back to table-wide.
--$ grant update on public.competition_team_members to authenticated;
--$ grant update on public.competition_teams to authenticated;
--$ grant update on public.competition_team_join_requests to authenticated;
--$ commit;
--   After this: F-02 (self-insert, team_id redirect), F-03 (invite_code,
--   competition_id, id rewrites), F-06 (caller-supplied role label) and the
--   join-request identity rewrite are all open again. 013's
--   capacity/deadline guard trigger, which this file never modified, is still
--   the only thing constraining a join.
--   There is no partial rollback that closes F-02 while leaving the rest: the
--   protections and the grants are the same statements. Treat rollback as an
--   incident to resolve the same day, not a resting configuration.
