-- PROPOSED — NOT APPLIED. Phase 2, file 3 of 6.
--
-- PURPOSE
-- Fix the two privilege findings that the live project confirmed this session:
--   L-1  anon holds TABLE-LEVEL SELECT on public.admin_users (only a row policy
--        keeps the admin roster invisible today).
--   L-2  anon can EXECUTE public.new_team_invite_code().
-- Both are symptoms of the same mechanism, so the file fixes the mechanism
-- rather than only the two named objects.
--
-- MECHANISM (verified by simulation and consistent with the live observations)
-- Supabase's project bootstrap installs ALTER DEFAULT PRIVILEGES that grant ALL
-- on future public tables, sequences and functions to anon, authenticated and
-- service_role at creation time. A migration that later writes
-- `revoke all on ... from public` removes the privileges granted to the
-- pseudo-role PUBLIC, which does NOT remove the explicit grant recorded for the
-- named role anon. Every revoke in this file therefore names anon and
-- authenticated explicitly.
--
-- DEPENDENCIES
--   * 001 (admin_users, is_admin), 010 (new_team_invite_code), 002 (invite-code
--     RPCs), 013 (team RPCs). Run after 000_read_only_preflight.sql.
--
-- PRECONDITIONS — verified from the live project on 2026-11-03, re-verify first:
--   * anon -> admin_users: 200 with 0 rows (privilege present, row policy hides it)
--   * anon -> rpc/new_team_invite_code: 200
--   * anon -> rpc/is_admin: 200 returning false  (MUST STAY, see below)
--
-- SECURITY RATIONALE
--   * Least privilege at the GRANT layer means a future policy mistake on
--     admin_users stops being a total compromise: membership of that table IS
--     adminhood, and its role column is CHECK-bound to 'admin'.
--   * is_admin() keeps anon EXECUTE on purpose. 001 installs anon-visible
--     policies that call it (001:229, 001:242), and PostgREST evaluates those
--     expressions as anon. Revoking it by reflex would break public listings.
--     A draft of this work did exactly that and was corrected.
--   * No privilege an authorized workflow needs is removed: anon keeps SELECT
--     on the public listings, authenticated keeps the grants each migration's
--     policies depend on, and service_role is untouched.
--
-- WRITE ACCESS DELIBERATELY NOT TOUCHED HERE
-- TRUNCATE, REFERENCES and TRIGGER are revoked because no API role has a
-- legitimate use for them. Ordinary INSERT/UPDATE/DELETE grants stay as their
-- migrations set them — narrowing those is a policy question with functional
-- consequences and belongs to 023/024, not to a privilege sweep.

begin;

-- ---------------------------------------------------------------------------
-- 1. L-1 — the privilege table.
--    authenticated keeps SELECT because the client verifies adminhood twice:
--    is_admin() first, then a direct read of its own mapping row, and
--    001:290's policy restricts that read to the caller's own row.
-- ---------------------------------------------------------------------------
revoke all on public.admin_users from public, anon, authenticated;
grant select on public.admin_users to authenticated;

do $$
declare
  r record;
begin
  if has_table_privilege('anon', 'public.admin_users', 'SELECT') then
    raise exception 'anon still holds SELECT on admin_users';
  end if;
  if not has_table_privilege('authenticated', 'public.admin_users', 'SELECT') then
    raise exception 'authenticated lost SELECT on admin_users — admin sign-in would break';
  end if;
  for r in select privilege_type from information_schema.role_table_grants
            where table_schema = 'public' and table_name = 'admin_users'
              and grantee in ('anon','authenticated') loop
    raise notice 'admin_users privilege remaining for an API role: %', r.privilege_type;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. L-2 — the invite-code generator. authenticated must keep EXECUTE: it is
--    competition_teams.invite_code's column DEFAULT, so the inserting role
--    evaluates it (that is what 010:46-47 documented).
-- ---------------------------------------------------------------------------
revoke all on function public.new_team_invite_code() from public, anon;
grant execute on function public.new_team_invite_code() to authenticated;

do $$
begin
  if has_function_privilege('anon', 'public.new_team_invite_code()', 'EXECUTE') then
    raise exception 'anon can still execute new_team_invite_code()';
  end if;
  if not has_function_privilege('authenticated', 'public.new_team_invite_code()', 'EXECUTE') then
    raise exception 'authenticated lost EXECUTE on new_team_invite_code() — team creation would break';
  end if;
  -- The dependency that must not be revoked.
  if not has_function_privilege('anon', 'public.is_admin()', 'EXECUTE') then
    raise exception 'anon lost EXECUTE on is_admin() — public listings would break';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2b. The same mechanism, generalized — because 028 V6 found nine more cases.
--     025 §2 fixed the one definer-looking function the live pass happened to
--     probe. Re-running the suite against these files showed that EVERY
--     SECURITY DEFINER function created by 006/011/013 is also executable by
--     anon, for the same reason: the bootstrap granted it at CREATE time and the
--     migrations only ever added grants. Those functions all raise "must be
--     signed in" when called without a session, so nothing leaks today — but
--     that is a code review conclusion, not a privilege boundary, and it is one
--     forgotten auth.uid() check away from being live and anonymous.
--
--     So: revoke anon EXECUTE on every SECURITY DEFINER function in public
--     except the ones an anonymous page legitimately needs. The allowlist is
--     short and each entry has a reason; anything not on it must be explicitly
--     granted by its own migration, which is the same rule 025 §4 installs for
--     tables. `authenticated` is untouched here — signed-in students call these
--     RPCs, and revoking would be an outage, not a hardening.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  v_allowed text[] := array[
    -- Required by anon row policies installed in 001 (001:229, 001:242).
    'is_admin',
    -- Public CIRCLE cards: level lookups check is_public inside the function.
    'get_javlin_level', 'get_javlin_levels',
    -- Public FIELD listings: participation counts and discoverable teams, both
    -- of which filter on the opportunity's public status internally.
    'competition_registered_team_count', 'competition_discoverable_teams'];
begin
  for r in
    select p.oid::regprocedure as sig, p.proname
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
     where p.prosecdef
       and not (p.proname = any (v_allowed))
       and has_function_privilege('anon', p.oid, 'EXECUTE')
     order by p.proname
  loop
    execute format('revoke all on function %s from public, anon', r.sig);
    raise notice 'phase2/025 revoked anonymous EXECUTE on definer function %', r.proname;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. The mechanism, table by table, for every relation that exists at run time.
--    Written as a loop on purpose: the repository's own list is not a description
--    of production (017-020 are not applied, 015/016 are), so a static list would
--    either abort on a missing relation or silently skip a live one.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select c.oid::regclass as rel
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'r'                      -- plain tables; no views, no storage
     order by c.relname
  loop
    execute format('revoke truncate, references, trigger on %s from public, anon, authenticated', r.rel);
  end loop;
end;
$$;

-- Sequences: `anon` loses them, because nothing anonymous consumes one.
-- `authenticated` deliberately KEEPS USAGE and UPDATE here. A table whose id or
-- position column defaults to nextval('...') needs the INSERTING role to
-- evaluate that default, and stripping sequence privileges from authenticated
-- turns legitimate inserts into 42501 while looking like hardening. The revoke
-- below names only `public, anon` for exactly that reason, and the file's prose
-- has to say so rather than claiming a blanket rule it does not implement.
do $$
declare
  r record;
begin
  for r in
    select c.oid::regclass as rel
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'S'
     order by c.relname
  loop
    execute format('revoke all on %s from public, anon', r.rel);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Stop the hole at its source for relations created later — with the scope
--    stated exactly, because the first draft of this section claimed more than
--    the three statements below do.
--
--    WHAT EACH LINE DOES
--      tables      : both API roles lose the inherited ALL. A table that needs
--                    to be readable must say so in its own migration. This is
--                    the F-04/L-1 fix and it is complete for tables.
--      sequences   : anon only. authenticated KEEPS them (see section 3 — an
--                    insert that evaluates nextval() needs USAGE).
--      functions   : anon only. authenticated KEEPS default EXECUTE.
--
--    MEASURED LIMITATION of these three statements, found by testing them rather
--    than reading the documentation: revoking the function default does not stop
--    a future function being executable by anon. Two spellings were observed on
--    PGlite 0.3.14 / PostgreSQL 17.5. Empty the default ACL and the next
--    function's proacl is NULL, meaning "use the system default", and the system
--    default for a function is EXECUTE to PUBLIC. Leave a default ACL naming
--    other roles — which is the state after the third statement below — and the
--    next function's ACL carries an explicit `=X/<grantor>` entry for PUBLIC
--    anyway. In both cases anon can execute it, because anon inherits every
--    privilege granted to PUBLIC, and `has_function_privilege('anon', ...)`
--    returns true through that route.
--    Consequences, and they are the reason section 2b exists:
--      * for FUNCTIONS, the only real control is the explicit revoke in the
--        migration that creates the function (section 2b does it for everything
--        that exists today) plus 028 V6, which refuses verification for any
--        definer function anon can reach that is not allowlisted;
--      * for TABLES the statement does work as intended, because a table's
--        system default is not "all privileges to PUBLIC" once a default ACL
--        entry exists — which is why 028 V10 can gate on the pg_default_acl row
--        for tables and only report it for functions;
--      * a future migration that adds a definer RPC and forgets the revoke will
--        be caught by V6, not by this file. That is the correct place for it:
--        the check runs against the live catalog, which is the only thing that
--        can see what actually got created.
--    scripts/security-phase2-check.mjs asserts all of this in its R-6 test, so
--    none of it has to be re-derived under time pressure on staging.
--
--    EXPLICIT DECISION — should `authenticated` retain default EXECUTE on newly
--    created functions? YES, for now, and deliberately. Three reasons:
--      1. It would be theatre. Because the function default resolves to the
--         system default — EXECUTE to PUBLIC — revoking the `authenticated`
--         entry removes nothing: the same role still reaches the function
--         through PUBLIC. A revoke that changes no privilege is worse than no
--         revoke, because it reads as a fix in the migration file.
--         If PUBLIC EXECUTE is ever removed project-wide, revisit this with
--         preflight P11 and a full RPC inventory first.
--      2. The ACL cannot tell an auditor HOW a grant arrived. `authenticated=X/
--         rin=authenticated` from the bootstrap is byte-identical to the same
--         entry from an explicit `grant execute`. So "revoke the default" is not
--         verifiable by looking at the grant list; only the migration source
--         settles it. 028 V10 therefore enumerates every SECURITY DEFINER
--         function with its owner, path pin and grantee list, so the residual
--         question — is any definer function reachable by a role that should not
--         reach it — is answered by reading a bounded list, not by guessing.
--      3. The tightening has a clear precondition and it is recorded: once every
--         function in public is granted explicitly by its own migration, add
--         `alter default privileges in schema public revoke all on functions
--         from authenticated;` here. That is a follow-up, not this file's job.
--
--    OPERATOR TRAP, and this is why preflight P11 exists. ALTER DEFAULT
--    PRIVILEGES applies to objects created by THE ROLE THAT EXECUTES THIS
--    STATEMENT. In the simulation the owner installs every migration, so one
--    run covers everything. On Supabase, SQL-editor runs execute as `postgres`
--    while a CLI apply, a branch promote or a dashboard snippet may run as
--    another role — and for those creators the bootstrap grant stays exactly as
--    it was. Run section 4 as the role that will create future objects, then
--    confirm with `000` P11 (pg_default_acl, per creating role) rather than
--    assuming. P11b additionally answers whether anon/authenticated can CREATE
--    in public, which is what decides whether an unpinned definer search_path is
--    exploitable at all (028 V10).
--
--    service_role is left alone: Supabase internals rely on it, and it is not
--    reachable from a browser.
-- ---------------------------------------------------------------------------
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

-- Every committed migration from 005 onward already grants table privileges
-- explicitly, so the tables line changes behaviour only for an object created by
-- someone who forgot to. 001-004 did not grant explicitly, and their tables are
-- handled by the explicit revokes in sections 1 and 3.

-- ---------------------------------------------------------------------------
-- 5. Inventory for the reviewer: what each API role can still do, and what the
--    default privileges will hand out next time something is created.
-- ---------------------------------------------------------------------------
select grantee, privilege_type, count(*) as relations
  from information_schema.role_table_grants
 where table_schema = 'public' and grantee in ('anon','authenticated')
 group by grantee, privilege_type
 order by grantee, privilege_type;

commit;

-- EXPECTED TEST RESULTS (scripts/security-phase2-check.mjs)
--   anon SELECT on admin_users                    -> denied  (was permitted, 0 rows)
--   anon EXECUTE new_team_invite_code()           -> denied  (was permitted)
--   anon EXECUTE is_admin()                       -> permitted, still returns false
--   anon / authenticated TRUNCATE on any table     -> denied  (was permitted for admin_users)
--   anon public listings (colleges, videos, mentors, team_members, team_roles,
--   opportunities, pulse posts, profiles public projection) -> unchanged
--   authenticated: own admin mapping read, team creation with generated code     -> unchanged
--
-- ROLLBACK — PARTIAL. THIS FILE IS NOT FULLY REVERSIBLE BY A STATIC BLOCK.
--   `--$ ` lines are executed verbatim by scripts/security-phase2-check.mjs. The
--   ROLLOUT phase proves this block is PARTIAL: it restores §1, §2 and §4 exactly
--   and deliberately does NOT restore the dynamic §2b/§3 sweeps, then re-applies
--   025 and asserts every restriction returns. That green test is named
--   "025 rollback is PARTIAL by design" so it can never be read as a complete
--   restore. See SECURITY_MIGRATION_GUIDE.md → "025 is the exception".
--
--   RESTORED by the block below (static, exactly-invertible halves):
--     §1  admin_users — anon/authenticated regain ALL (L-1 reopens).
--     §2  new_team_invite_code() — anon regains EXECUTE (L-2 reopens). PUBLIC is
--         NOT re-granted: 010:43 already revoked PUBLIC before 025 ran, so
--         granting it here would over-restore beyond the actual previous state.
--     §4  default privileges — anon regains the bootstrap ALL on future tables,
--         sequences and functions; authenticated regains it on tables (the
--         authenticated sequence/function grants below are no-ops, because §4
--         only ever revoked those from anon). F-04 reopens for new objects.
--
--   NOT RESTORED (dynamic, catalog-dependent halves — no portable static inverse):
--     §2b  anon EXECUTE on every non-allowlisted SECURITY DEFINER function. The
--          affected set is read from pg_proc at run time, and each function's
--          pre-025 PUBLIC-EXECUTE state differs by its creating migration, so a
--          static re-grant would either miss objects or over-restore PUBLIC.
--     §3   anon/authenticated TRUNCATE/REFERENCES/TRIGGER on every public table,
--          and anon ALL on every public sequence. The object set depends on which
--          migrations are applied (016-shaped live vs the full 021 schema), so a
--          static list is wrong on one of them — the same reason §3 is a loop.
--
--   TO RESTORE §2b/§3 EXACTLY: capture the pre-025 state first with
--   000_read_only_preflight.sql (P4 table grants, P6 function EXECUTE, P8 sequence
--   ACLs, P11 default privileges per creating role) and replay the recorded grants
--   for precisely those objects. Without that snapshot, do NOT invent grants.
--   Prefer a controlled forward-fix over a rollback: rolling back reopens L-1,
--   L-2 and F-04 while leaving §2b/§3 hardened — a mixed state, not the original.
--$ begin;
--$ grant all on public.admin_users to anon, authenticated;
--$ grant all on function public.new_team_invite_code() to anon;
--$ alter default privileges in schema public grant all on tables to anon, authenticated;
--$ alter default privileges in schema public grant all on sequences to anon, authenticated;
--$ alter default privileges in schema public grant all on functions to anon, authenticated;
--$ commit;
