-- PROPOSED — NOT APPLIED ANYWHERE. Read-only preflight for Phase 2.
-- Run this first, on production and on staging, and archive the output.
-- It changes nothing; every later file in this directory is written so it can
-- be checked against these answers rather than against the repository's
-- assumption of what production looks like.
--
-- Why this exists: the live project returned 0 anonymous rows for
-- competition_teams while the committed 002 declares `using (true)`, and 015 is
-- applied although its own header says it is not. Committed SQL is therefore not
-- a reliable description of production (see docs/security/LIVE_DB_VERIFICATION.md,
-- findings L-4 and the migration table in §2).

-- P1 Which relations actually exist. Every guarded statement below keys off this.
select c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind in ('r', 'v', 'p')
 order by c.relname;

-- P2 The full current policy text for the tables Phase 2 touches.
--    Corrected 2026-11-10: this used `array(select r.rolname from unnest(p.polroles) r)`,
--    which fails 42703 — aliasing a one-column function names the COLUMN `r`,
--    not a record with a `rolname` field. Roles are resolved through pg_roles
--    and PUBLIC (oid 0) is labelled explicitly, because a policy for PUBLIC is
--    reachable by anon and that distinction is the whole L-1/L-2 mechanism.
select c.relname as table_name, p.polname, p.polpermissive, p.polcmd,
       (select array_agg(case when u = 0::oid then 'PUBLIC' else ro.rolname end
                           order by 1)
          from unnest(p.polroles) u
          left join pg_roles ro on ro.oid = u) as role_names,
       pg_get_expr(p.polqual, p.polrelid) as using_expr,
       pg_get_expr(p.polwithcheck, p.polrelid) as with_check_expr
  from pg_policy p join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
 where c.relname in ('profiles', 'competition_teams', 'competition_team_members',
                     'competition_team_join_requests', 'student_connections',
                     'student_notifications', 'admin_users', 'profile_contacts')
 order by c.relname, p.polcmd, p.polname;

-- P3 The policy-name preflight that 023 and 024 assert before they act.
--    Expected from the repository: exactly one authenticated SELECT policy on
--    profiles named "Authenticated users read profiles", and one INSERT
--    policy on competition_team_members named
--    "Members join themselves or captains add members". Anything else in
--    production is out-of-band drift and must be understood first.
--    Corrected 2026-11-10: `p.polcmd` is type "char", and `text || "char"` is
--    an ambiguous operator (42725). Nothing executed this file before, which is
--    how it survived. The cast is required.
select c.relname as table_name, count(*) as policy_count,
       string_agg(p.polname || ' [' || p.polcmd::text || ']', ' | ' order by p.polname) as policies
  from pg_policy p join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
 where c.relname in ('profiles', 'competition_team_members')
 group by c.relname order by c.relname;

-- P4 Table privileges for the API roles, including the admin table (finding L-1).
select grantee, table_name, string_agg(privilege_type, ',' order by privilege_type) as privileges
  from information_schema.role_table_grants
 where table_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role')
 group by grantee, table_name order by table_name, grantee;

-- P5 Column privileges. Anything listed here for profiles is reachable on every
--    row the reader's policies make visible — row policy does not filter columns.
select c.relname as table_name, a.attname as column_name,
       pg_catalog.array_to_string(a.attacl, ' | ') as column_acl
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
 where c.relname in ('profiles', 'student_skills', 'student_connections', 'student_notifications')
 order by c.relname, a.attnum;

-- P6 Functions: context, owner, search_path, and who can execute (findings L-2,
--    and the is_admin() dependency that must NOT be revoked from anon).
select p.proname,
       pg_get_function_arguments(p.oid) as arguments,
       case p.prosecdef when true then 'DEFINER' else 'INVOKER' end as context,
       pg_get_function_identity_arguments(p.oid) = '' as noargs,
       p.proconfig as settings,
       r.rolname as owner,
       has_function_privilege('anon', p.oid, 'execute') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute,
       pg_get_function_sqlbody(p.oid) is null as body_hidden
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
  join pg_roles r on r.oid = p.proowner
 order by p.proname;

-- P7 Triggers that enforce team/role/notification invariants.
select tgrelid::regclass as table_name, tgname, tgfoid::regprocedure as function_name,
       case when tgtype & 2 = 2 then 'BEFORE' else 'AFTER' end as timing,
       case when tgtype & 4 = 4 then 'INSERT' else '' end
    || case when tgtype & 8 = 8 then ' DELETE' else '' end
    || case when tgtype & 16 = 16 then ' UPDATE' else '' end as events
  from pg_trigger
 where not tgisinternal and tgrelid::regclass::text like 'public.%'
 order by 1, 2;

-- P8 Schema, sequence and view surface.
select n.nspname, n.nspacl from pg_namespace n where n.nspname in ('public', 'storage', 'auth');
select c.relname, c.relkind, pg_catalog.array_to_string(c.relacl, ' | ') as acl
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind in ('S', 'v', 'm') order by 1;

-- P9 Storage configuration that migrations cannot express (finding DB-03).
select id, name, public, file_size_limit, allowed_mime_types
  from storage.buckets order by id;

-- P10 Migration ledger versus the repository's claim (015/016 are live despite
--     their headers; 017-020 are not).
--
--     Corrected 2026-11-10. This was written as
--     `select * from public._supabase_migrations.schema_migrations`, which is a
--     three-part name: PostgreSQL reads the first part as a DATABASE, so the
--     query fails `42703`-class `0A000 cross-database references are not
--     implemented` on every project, measured in PGlite 0.3.14 / PG 17.5. The
--     ledger lives in the `_supabase_migrations` SCHEMA, so the reference is
--     two-part. P10a is safe everywhere; P10b answers only where the ledger
--     exists, and P10a says which case you are in.
select case when to_regclass('_supabase_migrations.schema_migrations') is not null
       then 'PRESENT: run P10b'
       else 'ABSENT: this project records migrations elsewhere. ABSENT IS NOT EVIDENCE THAT NOTHING IS APPLIED — Supabase writes this table only for migrations applied through its own tooling, so an out-of-band SQL-editor apply leaves it empty or missing. Fall back to per-object probes (P1/P2/P4) before concluding anything about history.'
       end as p10a_ledger_availability;

-- P10b the ledger itself. Skipped safely when P10a reports ABSENT.
do $$
declare
  r record;
begin
  if to_regclass('_supabase_migrations.schema_migrations') is null then
    raise notice 'p10b skipped: no migration ledger in this project';
    return;
  end if;
  for r in execute 'select version, name, statements from _supabase_migrations.schema_migrations order by version'
  loop
    raise notice 'ledger version=% name=% statements=%',
      r.version, coalesce(r.name, '<none>'), coalesce(r.statements::text, '<none>');
  end loop;
end;
$$;

-- P11 Default privileges, i.e. what a table/function/sequence created AFTER this
--     audit will hand to anon and authenticated without anyone granting it
--     (findings L-1, L-2, F-04, and the fix in 025 §4).
--     pg_default_acl rows are per CREATING ROLE: no row for a role means that
--     role creates objects with the system default, which in Supabase includes
--     ALL to the API roles. 025 §4 therefore has to be executed by the same role
--     that will create future objects — check who that is before believing the
--     fix applies to your migrations.
select pg_catalog.pg_get_userbyid(d.defaclrole) as creating_role,
       case d.defaclobjtype when 'r' then 'tables' when 'S' then 'sequences'
                            when 'f' then 'functions' when 'n' then 'types'
                            else d.defaclobjtype::text end as object_kind,
       (select string_agg(a.grantee::regrole::text || ':' || a.privilege_type::text
                            || case when a.is_grantable then ' (grantable)' else '' end,
                          ' | ')
          from pg_catalog.aclexplode(d.defaclacl) a) as default_privileges
  from pg_catalog.pg_default_acl d
 order by 1, 2;

-- P11b Can an API role create objects in public at all? This is what decides
--      whether an unpinned SECURITY DEFINER search_path is exploitable (028 V6):
--      CREATE on schema public to anon/authenticated turns name resolution into
--      an attack surface. Expected answer on a current Supabase project: no
--      CREATE for anon, and none for authenticated since the 2024 hardening.
select n.nspname,
       has_schema_privilege('anon', n.oid, 'CREATE') as anon_create,
       has_schema_privilege('authenticated', n.oid, 'CREATE') as authenticated_create,
       pg_catalog.array_to_string(n.nspacl, ' | ') as schema_acl
  from pg_namespace n where n.nspname in ('public', 'storage', 'auth');

-- P12 Row visibility as the API roles themselves, at the ENGINE level. This is
--     the probe that separates RLS behaviour from PostgREST behaviour, and it is
--     how L-4 gets answered: live returns 0 anonymous rows for competition_teams
--     although committed 002 declares using (true). If the count here is nonzero
--     while HTTP returns nothing, the cause is the API layer, not the policy.
--     Read-only. Run each pair on its own; `set local role` needs a transaction.
--
--   begin; set local role anon;          select count(*) from public.competition_teams; rollback;
--   begin; set local role authenticated; select count(*) from public.competition_teams; rollback;  -- needs a session
--   begin; set local role anon;          select count(*) from public.admin_users;      rollback;  -- L-1
--   begin; set local role anon;          select public.new_team_invite_code();         rollback;  -- L-2
