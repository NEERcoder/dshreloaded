-- PROPOSED — NOT APPLIED. Phase 2, file 1 of 6 — ROLLOUT PHASE A (ADDITIVE ONLY).
--
-- PURPOSE
-- Install the two paths approved rules 2 and 5 need, and change nothing else.
-- This half ADDS capability: a definer function for the owner's own full row,
-- and a parameterless definer function for an accepted peer's name. It removes no
-- policy, no table privilege and no column privilege, so a database with this
-- file applied behaves exactly as it did before for every query the client that
-- is running today makes.
--
-- Rules the pair eventually satisfies (the enforcement itself lands in 029):
--   Rule 2: an accepted connection may read the private owner's NAME.
--   Rule 3: nothing else about a private profile reaches that connection.
--   Rule 5: the owner keeps their own fields; admins keep admin rights.
--   Rule 1: untouched — no statement here or in 029 touches storage buckets,
--   object policies or avatar URLs, so public avatar delivery keeps working.
--
-- WHY 023 IS SPLIT IN TWO
-- supabase/security-review/029_profile_privacy_enforcement.sql removes the broad
-- `authenticated` access that F-01 depends on. Applying 029 before this file
-- leaves the owner with no path to their own `gender`, `id` or timestamps;
-- applying 029 before the client that calls these functions is deployed breaks
-- the owner's dashboard, because their own read becomes a privilege error.
-- Neither half is safe alone, so the rollout is expand (023) -> deploy client ->
-- contract (029), and each half is written to be verified in isolation.
--
-- ORDER OF OPERATIONS (the whole sequence, not just this file)
--   023  this file            additive: nothing is lost by applying it early
--   024-027                    team, privileges, connections, late tables
--   ->   deploy the client     src/lib/dataAccess.ts calls both RPCs
--   029                       restrictive: closes F-01, requires that client
--   028                       read-only verification, run last
--
-- SUPERSEDES supabase/migrations/022_rls_privacy_hardening.sql (authored during
-- the first audit, applied nowhere, and dependent on relations that do not exist
-- live). Numbering starts at 023 because the live ledger already contains 015 and
-- 016, which the repository headers claim are unapplied.
--
-- DEPENDENCIES
--   * 001 (is_admin, set_updated_at), 002 (profiles + its grants),
--     005 (student_connections), 007 (is_public, avatar_url, anon projection),
--     011 (instagram_handle), 014 (headline).
--   * Run 000_read_only_preflight.sql first. Statements here assert rather than
--     blind-drop, so out-of-band drift aborts instead of leaving a hole.
--
-- PRECONDITIONS
--   * `authenticated` currently holds table-wide SELECT on public.profiles
--     (002:63) and the permissive-all SELECT policy (002:44-47) is present. That
--     is the state this file deliberately leaves untouched.
--   * No connection row uses a status outside ('pending','accepted') — 005's
--     CHECK constraint guarantees this, and "blocked"/"rejected" do not exist as
--     stored states: rejecting or cancelling DELETES the pair row (005:9-10), so
--     those cases qualify as "no accepted row" and are denied by construction.
--   * Both functions may already exist from a previous run: `create or replace`
--     plus explicit grants make this file idempotent.
--
-- SECURITY INVARIANTS OF THIS HALF
--   1. Neither function takes a parameter. A caller cannot point
--      `get_own_profile()` at another student, and cannot ask
--      `get_connected_peer_names()` about a relationship it does not hold.
--   2. `get_connected_peer_names()` re-checks student_connections inside the
--      function, because the peer's row is invisible to the caller by design.
--   3. `anon` gets no EXECUTE on either. The revoke names `anon` explicitly —
--      `from public` alone would not remove a grant the default-privilege
--      bootstrap recorded for the named role (the L-1/L-2 mechanism).
--   4. Every reference inside both functions is schema-qualified
--      (`public.student_connections`, `public.profiles`, `auth.uid()`), so no
--      name can be steered by an object placed in another schema. The pin is
--      `public` rather than `''` because these are SQL functions returning
--      `public` types; the qualification is what closes the hijack route.

begin;

-- ---------------------------------------------------------------------------
-- 1. Name-only path for accepted connections (approved rule 2).
--    Returns (user_id, full_name) and nothing else. `security definer` is
--    required because the row is invisible to the caller by design; the function
--    therefore re-checks the relationship itself and reads only two columns.
-- ---------------------------------------------------------------------------
create or replace function public.get_connected_peer_names()
returns table (user_id uuid, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.user_id, p.full_name
  from public.student_connections c
  join public.profiles p
    on p.user_id = case
         when c.requester_user_id = auth.uid() then c.recipient_user_id
         else c.requester_user_id
       end
  where c.status = 'accepted'
    and (c.requester_user_id = auth.uid() or c.recipient_user_id = auth.uid())
    and auth.uid() is not null;
$$;

comment on function public.get_connected_peer_names() is
  'Accepted connections of the current student, name only. No parameters: a caller cannot ask about another student, and only a caller holding an accepted row learns anything.';

revoke all on function public.get_connected_peer_names() from public, anon, authenticated;
grant execute on function public.get_connected_peer_names() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Owner-only full read, including the columns that must never be discoverable
--    (approved rule 5). Harmless while 029 has not run: the owner could already
--    read this row from the table directly, which is what keeps the client that
--    has not shipped yet working throughout Phase A.
-- ---------------------------------------------------------------------------
create or replace function public.get_own_profile()
returns setof public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select p.* from public.profiles p where p.user_id = auth.uid();
$$;

comment on function public.get_own_profile() is
  'The caller''s own profile row, all columns. The only path by which gender, id and timestamps leave the table for a non-admin.';

revoke all on function public.get_own_profile() from public, anon, authenticated;
grant execute on function public.get_own_profile() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Prove this half created its two paths with the right execution
--    boundaries, and that the rest of the database is in ONE of the two states
--    this rollout recognises. A first draft asserted "nothing was removed"
--    unconditionally, which made a legitimate re-apply after 029 fail — the
--    guard was checking the whole database for a property that belongs to the
--    sequence, not to this file. So the assertion is now an explicit XOR:
--      state A (029 not applied): broad access must still be intact, so this
--        half really was additive;
--      state B (029 applied): broad access must be gone, so the restriction
--        arrived from the file that owns it;
--      any mixture: someone narrowed privileges without the enforcing policy,
--        or installed the policy without narrowing privileges. Both leave a
--        hole, and both abort.
-- ---------------------------------------------------------------------------
do $$
declare
  v_kind text;
  v_enforcing boolean;
  v_broad boolean;
begin
  foreach v_kind in array array['public.get_connected_peer_names()', 'public.get_own_profile()'] loop
    if to_regprocedure(v_kind) is null then
      raise exception '% was not created', v_kind;
    end if;
    if not has_function_privilege('authenticated', v_kind::regprocedure, 'EXECUTE') then
      raise exception 'authenticated cannot execute %, so the client cannot use it', v_kind;
    end if;
    if has_function_privilege('anon', v_kind::regprocedure, 'EXECUTE') then
      raise exception 'anon can execute %, which is an owner- or relationship-scoped path', v_kind;
    end if;
  end loop;

  select exists (
    select 1 from pg_policy p
      join pg_class c on c.oid = p.polrelid
      join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
     where c.relname = 'profiles' and p.polcmd = 'r'
       and p.polname = 'Students read public, own and moderated profiles')
    into v_enforcing;

  select has_table_privilege('authenticated', 'public.profiles', 'SELECT')
         and has_column_privilege('authenticated', 'public.profiles', 'gender', 'SELECT')
    into v_broad;

  if v_enforcing = v_broad then
    raise exception
      'ABORT: profiles is in no state this rollout recognises (enforcing policy present: %, broad SELECT+gender present: %). Either 029 installed its row policy without narrowing the privileges, or privileges were narrowed without the policy — both leave F-01 reachable. The two halves are 023 (additive) and 029_profile_privacy_enforcement.sql (restrictive); no third combination is expected.',
      v_enforcing, v_broad;
  end if;

  raise notice 'phase2/023 verified against state %',
    case when v_enforcing then 'B (029 applied: broad access correctly removed)'
         else 'A (029 not applied: additive half changed nothing else)' end;
end;
$$;

commit;

-- EXPECTED TEST RESULTS (asserted by scripts/security-phase2-check.mjs, phase
-- ROLLOUT, which applies this file on its own, before 029 exists)
--   * both functions exist, are SECURITY DEFINER, and pin their path         pass
--   * authenticated can execute both; anon cannot                            pass
--   * owner reads own row including gender through get_own_profile()          pass
--   * accepted peer reads name via get_connected_peer_names()                pass
--   * the OLD client path still works: table-wide SELECT and gender remain
--     granted to authenticated                                                pass
--     (this is the property that makes Phase A deployable immediately)
--   * re-running this file converges to the same effective state              pass
--
-- ROLLBACK
--   `--$ ` lines are executed verbatim by scripts/security-phase2-check.mjs.
--$ begin;
--$ revoke all on function public.get_connected_peer_names() from public, anon, authenticated;
--$ revoke all on function public.get_own_profile() from public, anon, authenticated;
--$ drop function if exists public.get_connected_peer_names();
--$ drop function if exists public.get_own_profile();
--$ commit;
--   Safe on its own, because this half removed nothing. But if 029 has already
--   been applied, dropping these functions leaves the owner with no path to their
--   own gender, id or timestamps: roll 029 back first.
--
-- WHAT THIS FILE DELIBERATELY DOES NOT DO
--   * it does not touch any policy on public.profiles;
--   * it does not revoke or narrow any column privilege on public.profiles;
--   * it does not change anon access at all (007's projection stays as applied);
--   * it does not touch storage buckets, object policies or avatar URLs.
-- All four belong to 029_profile_privacy_enforcement.sql.
