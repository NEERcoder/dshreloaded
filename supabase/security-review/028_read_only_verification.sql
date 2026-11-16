-- PROPOSED — NOT APPLIED. Phase 2 verification companion to 023-027 and 029. Read-only.
--
-- PURPOSE
-- Prove each approved rule and finding by observing EFFECTIVE catalog and storage
-- state, not by re-reading the migration files. Run immediately after 023-027 on
-- staging and again after any production window. It contains no DDL: every check
-- raises, so a silent pass is impossible.
--
-- DEPENDENCIES: 023, 024, 025, 026, 027 applied in that order. V9 self-skips the
-- relations 027 guards, so this file also runs against today's live schema, where
-- 017/019/021 are absent.
--
-- PRECONDITIONS: run 000_read_only_preflight.sql first and archive both outputs.
-- The comparison between them is the evidence; this file's own pass is not enough.
--
-- SCOPE: this verifies grants and policies. It cannot verify PostgREST request
-- behaviour, storage delivery over HTTP or GoTrue settings — see the checklist at
-- the end, which is what the two-account staging tests are for.

-- V1 Rule 2/5 row visibility: exactly one authenticated SELECT policy on profiles
--    and no surviving permissive-all clause.
do $$
declare
  v int;
begin
  select count(*) into v
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
    join unnest(p.polroles) r(roleid) on true
    join pg_roles ro on ro.oid = r.roleid
   where c.relname = 'profiles' and p.polcmd = 'r' and ro.rolname = 'authenticated';
  if v <> 1 then raise exception 'V1 FAIL: profiles has % authenticated SELECT policies, expected 1', v; end if;

  select count(*) into v
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
   where c.relname = 'profiles' and p.polcmd = 'r' and p.polqual is null;
  if v > 0 then raise exception 'V1 FAIL: a permissive-all SELECT policy still exists on profiles'; end if;

  select count(*) into v
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
   where c.relname = 'profiles' and p.polcmd = 'r' and pg_get_expr(p.polqual, p.polrelid) like '%student_connections%';
  if v > 0 then raise exception 'V1 FAIL: a connection branch was added to the profiles row policy — that would expose whole private rows, breaching rule 3'; end if;

  raise notice 'V1 PASS: profile rows are owner/public/admin only, name path is a function';
end;
$$;

-- V2 Rule 3 at the privilege layer: which profile columns an API reader can reach.
do $$
declare
  v_columns text;
begin
  if has_column_privilege('authenticated', 'public.profiles', 'gender', 'SELECT') then
    raise exception 'V2 FAIL: gender is still readable through the API role (F-01 half remains)';
  end if;
  if has_table_privilege('authenticated', 'public.profiles', 'SELECT') then
    raise exception 'V2 FAIL: table-wide SELECT on profiles is still granted';
  end if;
  if has_column_privilege('authenticated', 'public.profiles', 'id', 'SELECT')
     or has_column_privilege('authenticated', 'public.profiles', 'created_at', 'SELECT') then
    raise exception 'V2 FAIL: private profile metadata (id / timestamps) is still readable';
  end if;
  if not has_column_privilege('authenticated', 'public.profiles', 'full_name', 'SELECT') then
    raise exception 'V2 FAIL: CIRCLE could no longer render any name';
  end if;
  if not has_function_privilege('authenticated', 'public.get_own_profile()', 'EXECUTE') then
    raise exception 'V2 FAIL: the owner lost the only path to their own gender and timestamps';
  end if;
  if not has_function_privilege('authenticated', 'public.get_connected_peer_names()', 'EXECUTE') then
    raise exception 'V2 FAIL: the accepted-connection name path is not executable';
  end if;
  if has_function_privilege('anon', 'public.get_connected_peer_names()', 'EXECUTE')
     or has_function_privilege('anon', 'public.get_own_profile()', 'EXECUTE') then
    raise exception 'V2 FAIL: an anonymous caller can reach an owner-scoped or relationship-scoped function';
  end if;

  select string_agg(a.attname, ',' order by a.attnum) into v_columns
    from pg_attribute a
   where a.attrelid = 'public.profiles'::regclass and a.attnum > 0 and not a.attisdropped
     and has_column_privilege('authenticated', 'public.profiles', a.attname, 'SELECT');
  raise notice 'V2 PASS: profile columns reachable by authenticated are: %', v_columns;
end;
$$;

-- V3 Rule 4: membership and team identity immutable to the API role, guards intact.
do $$
declare
  v_column text;
  v_trigger text;
begin
  foreach v_column in array array['team_id', 'user_id', 'id', 'joined_at'] loop
    if has_column_privilege('authenticated', 'public.competition_team_members', v_column, 'UPDATE') then
      raise exception 'V3 FAIL: competition_team_members.% is still writable (F-02 open)', v_column;
    end if;
  end loop;

  foreach v_column in array array['invite_code', 'competition_id', 'id', 'created_at', 'updated_at'] loop
    if has_column_privilege('authenticated', 'public.competition_teams', v_column, 'UPDATE') then
      raise exception 'V3 FAIL: competition_teams.% is still writable (F-03 open)', v_column;
    end if;
  end loop;

  if not has_column_privilege('authenticated', 'public.competition_teams', 'captain_user_id', 'UPDATE') then
    raise exception 'V3 FAIL: captain transfer is broken';
  end if;
  if has_column_privilege('authenticated', 'public.competition_team_join_requests', 'user_id', 'UPDATE') then
    raise exception 'V3 FAIL: a captain can still re-point someone else''s join request';
  end if;

  foreach v_trigger in array array[
      'competition_team_members_derive_role',   -- added by 024
      'competition_teams_guard_captain',         -- added by 024
      'competition_teams_reassign_roles',        -- added by 024
      'competition_team_members_guard'           -- 013 capacity/deadline, must survive
    ] loop
    if not exists (
      select 1 from pg_trigger t
        join pg_class c on c.oid = t.tgrelid
       where t.tgname = v_trigger and not t.tgisinternal) then
      raise exception 'V3 FAIL: trigger % is missing', v_trigger;
    end if;
  end loop;

  raise notice 'V3 PASS: membership identity immutable, role derived, 013 guards intact';
end;
$$;

-- V4 Rule 5 and the live-confirmed privilege findings L-1 / L-2.
do $$
begin
  if has_table_privilege('anon', 'public.admin_users', 'SELECT') then
    raise exception 'V4 FAIL: anon still holds SELECT on admin_users (L-1 open)';
  end if;
  if has_table_privilege('anon', 'public.admin_users', 'INSERT')
     or has_table_privilege('authenticated', 'public.admin_users', 'INSERT') then
    raise exception 'V4 FAIL: the privilege table is still writable by an API role';
  end if;
  if not has_table_privilege('authenticated', 'public.admin_users', 'SELECT') then
    raise exception 'V4 FAIL: admin sign-in lost its own-mapping read (rule 5)';
  end if;
  if has_function_privilege('anon', 'public.new_team_invite_code()', 'EXECUTE') then
    raise exception 'V4 FAIL: anon can still execute the invite-code generator (L-2 open)';
  end if;
  if not has_function_privilege('authenticated', 'public.new_team_invite_code()', 'EXECUTE') then
    raise exception 'V4 FAIL: team creation broke: the inserting role cannot evaluate the column default';
  end if;
  if not has_function_privilege('anon', 'public.is_admin()', 'EXECUTE') then
    raise exception 'V4 FAIL: anon lost is_admin(), which 001 public policies depend on';
  end if;
  if not has_function_privilege('anon', 'public.get_javlin_levels(uuid[])', 'EXECUTE') then
    raise exception 'V4 FAIL: CIRCLE cards lost the batched level lookup';
  end if;
  raise notice 'V4 PASS: anon privileges corrected without breaking admin, team or directory paths';
end;
$$;

-- V5 No API role may TRUNCATE any table: RLS and row triggers are both bypassed by
--    TRUNCATE, which is what made the bootstrap grant a real hole.
do $$
declare
  r record;
  v_hits text := '';
begin
  for r in select c.relname
             from pg_class c
             join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
            where c.relkind = 'r'
            order by c.relname
  loop
    if has_table_privilege('anon', 'public.' || r.relname, 'TRUNCATE')
       or has_table_privilege('authenticated', 'public.' || r.relname, 'TRUNCATE') then
      v_hits := v_hits || case when v_hits = '' then '' else ', ' end || r.relname;
    end if;
  end loop;
  if v_hits <> '' then raise exception 'V5 FAIL: TRUNCATE still granted on %', v_hits; end if;
  raise notice 'V5 PASS: no API role can TRUNCATE any public table';
end;
$$;

-- V6 SECURITY DEFINER hygiene, as a GATE rather than a note. The file's own
--    promise is that every check raises, and a NOTICE about an unpinned definer
--    function is not proof of anything: it is the F-08 defect class, reported
--    and passed.
--
--    Read of the committed migrations before you change this list: every
--    SECURITY DEFINER function in 001-013, 023 and 024 already pins its
--    search_path, so the gate below has NO exceptions today. If it fires, either
--    someone added an unpinned definer function or the live database contains a
--    function the repository does not describe. Both are findings.
do $$
declare
  r record;
  v_loose text := '';
  v_anon_public text := '';
  -- Definer functions anon may legitimately reach: they are called from anon
  -- row policies (is_admin) or back the public CIRCLE/FIELD projections, and
  -- each one checks auth.uid()/is_public internally.
  v_allowed text[] := array[
    'is_admin', 'get_javlin_level', 'get_javlin_levels',
    'competition_registered_team_count', 'competition_discoverable_teams'];
begin
  for r in
    select p.oid::regprocedure as sig, p.proname, p.proconfig, p.prosecdef,
           has_function_privilege('anon', p.oid, 'EXECUTE') as anon_x,
           pg_catalog.pg_get_userbyid(p.proowner) as owner
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
     where p.prosecdef
     order by p.proname
  loop
    if r.proconfig is null then
      v_loose := v_loose || case when v_loose = '' then '' else ', ' end
        || r.sig::text || ' owned by ' || r.owner;
    end if;

    if r.anon_x and not (r.proname = any (v_allowed)) then
      v_anon_public := v_anon_public || case when v_anon_public = '' then '' else ', ' end || r.proname;
    end if;
  end loop;

  if v_loose <> '' then
    raise exception 'V6 FAIL: SECURITY DEFINER function(s) with no search_path pin: %. A definer function that resolves names through the CALLER''s path lets a role that can CREATE in a schema on the path substitute an object — see preflight P11b for whether that is currently possible here. Add `set search_path = ''''` and schema-qualify every reference, or make the function invoker-rights.', v_loose;
  end if;

  if v_anon_public <> '' then
    raise exception 'V6 FAIL: anon can execute definer function(s) not on the allowlist: %. Either the grant is drift (the L-2 mechanism) or the function belongs in V6''s allow list WITH a written reason for why an anonymous caller can reach it.', v_anon_public;
  end if;

  -- The two paths this work added must be present, definer, pinned AND not
  -- anon-reachable. Checked separately so a partial apply cannot pass V6 by
  -- having no definer functions at all.
  if exists (
    select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
     where p.proname in ('get_connected_peer_names', 'get_own_profile')
       and (p.proconfig is distinct from array['search_path=public'] or not p.prosecdef)) then
    raise exception 'V6 FAIL: a Phase 2 definer function is not search_path-pinned and definer';
  end if;
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       and n.nspname = 'public' where p.proname in ('get_connected_peer_names', 'get_own_profile')) <> 2 then
    raise exception 'V6 FAIL: 023''s definer paths are missing, so rules 2 and 5 have no enforcement path';
  end if;
  raise notice 'V6 PASS: every SECURITY DEFINER function pins its path; anon reaches only the allowlisted public projections';
end;
$$;

-- V10 Residual privilege surface this design does NOT close, made visible
--     instead of asserted away. Two things an auditor must see to judge 025 §4:
--     what a future object will inherit, and whether an API role can create
--     objects at all.
do $$
declare
  r record;
  v_tables_armed text := '';
  v_retained text := '';
  v_created int := 0;
begin
  -- (a) Default privileges, per CREATING role. 025 §4 revoked only for the role
  --     that ran it, so a second creator row here means the hole is still live
  --     for that role's future objects. This reports; the fix is operational
  --     (run 025 §4 as the migration role) and is decided by a human.
  for r in
    select pg_catalog.pg_get_userbyid(d.defaclrole) as creating_role,
           case d.defaclobjtype when 'r' then 'tables' when 'S' then 'sequences'
                                when 'f' then 'functions' else d.defaclobjtype::text end as kind,
           (select string_agg(a.grantee::regrole::text || ':' || a.privilege_type::text, ' ' order by 1)
              from pg_catalog.aclexplode(d.defaclacl) a) as acl
      from pg_catalog.pg_default_acl d order by 1, 2
  loop
    v_created := v_created + 1;
    if r.kind = 'tables' and (r.acl like '%anon%' or r.acl like '%authenticated%') then
      -- The one class 025 §4 claims to have closed for BOTH API roles.
      v_tables_armed := v_tables_armed || case when v_tables_armed = '' then '' else '; ' end
        || r.creating_role || ' defaults new tables to ' || r.acl;
    elsif r.kind <> 'tables' and (r.acl like '%anon%' or r.acl like '%authenticated%') then
      -- Sequences/functions for `authenticated` are retained on purpose (025 §4
      -- explains why, and records the measured fact that a function default
      -- cannot remove PUBLIC EXECUTE anyway). Reported, never a failure, so the
      -- exception cannot rot into silence. The FUNCTION flank is gated where it
      -- is actually observable: V6, against the live catalog.
      v_retained := v_retained || case when v_retained = '' then '' else '; ' end
        || r.creating_role || '/' || r.kind;
    end if;
  end loop;

  if v_tables_armed <> '' then
    raise exception
      'V10 FAIL: a creating role still hands default table privileges to an API role: %. 025 section 4 must be executed as the role that creates migrations here (preflight P11 lists every creating role), otherwise the next table someone adds inherits TRUNCATE/REFERENCES/TRIGGER exactly like the ones L-1 and L-2 were.',
      v_tables_armed;
  end if;

  -- (c) Can an API role CREATE in public? That is the precondition for any
  --     search_path hijack of a definer function, so it is recorded rather than
  --     assumed. V6 already refuses unpinned definers, which makes this a
  --     defence-in-depth reading, not the only control.
  if has_schema_privilege('anon', 'public', 'CREATE')
     or has_schema_privilege('authenticated', 'public', 'CREATE') then
    raise exception 'V10 FAIL: an API role holds CREATE on schema public. Any unpinned name resolution becomes an attack surface and every "least privilege" claim in this directory needs re-reading; grant revocation is the fix, not a policy edit.';
  end if;

  raise notice 'V10 PASS: no creating role arms default TABLE privileges for an API role; retained by design (025 §4): %; API roles hold no CREATE on public',
    coalesce(nullif(v_retained, ''), 'nothing');
end;
$$;

-- V7 Rule 1: avatars must still be public. Read-only assertion on bucket config —
--    this work must not have flipped it, and must not have touched object policies.
do $$
declare
  v_public boolean;
  v_policies int;
begin
  select b.public into v_public from storage.buckets b where b.id = 'student-avatars';
  if v_public is distinct from true then
    raise exception 'V7 FAIL: student-avatars is no longer public — rule 1 breached';
  end if;

  select count(*) into v_policies from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'storage' and c.relname = 'objects'
     and (coalesce(pg_get_expr(p.polqual, p.polrelid), '') || coalesce(pg_get_expr(p.polwithcheck, p.polrelid), ''))
         like '%student-avatars%';
  if v_policies < 4 then
    raise exception 'V7 FAIL: only % student-avatars object policies exist; 007 creates 4 — upload/replace/delete/read must all survive', v_policies;
  end if;
  raise notice 'V7 PASS: student-avatars remains public and its four object policies are intact';
end;
$$;

-- V8 Finding F-05 / 026: the accumulated grant is gone, the two app writes
--    remain, and the notification table has no API write privilege it does not
--    use.
do $$
declare
  v_column text;
begin
  foreach v_column in array array['id', 'requester_user_id', 'recipient_user_id', 'created_at', 'updated_at'] loop
    if has_column_privilege('authenticated', 'public.student_connections', v_column, 'UPDATE') then
      raise exception 'V8 FAIL: student_connections.% is still writable — 026 did not converge', v_column;
    end if;
  end loop;
  foreach v_column in array array['id', 'user_id', 'type', 'actor_user_id', 'connection_id', 'created_at'] loop
    if has_column_privilege('authenticated', 'public.student_notifications', v_column, 'UPDATE') then
      raise exception 'V8 FAIL: student_notifications.% is still writable — an actor can still be forged', v_column;
    end if;
  end loop;
  if not has_column_privilege('authenticated', 'public.student_connections', 'status', 'UPDATE') then
    raise exception 'V8 FAIL: accepting a connection request broke';
  end if;
  if not has_column_privilege('authenticated', 'public.student_notifications', 'read_at', 'UPDATE') then
    raise exception 'V8 FAIL: marking a notification read broke';
  end if;
  if not has_table_privilege('authenticated', 'public.student_connections', 'INSERT')
     or not has_table_privilege('authenticated', 'public.student_connections', 'DELETE') then
    raise exception 'V8 FAIL: sending or cancelling a connection request broke';
  end if;
  if has_table_privilege('authenticated', 'public.student_notifications', 'INSERT')
     or has_table_privilege('authenticated', 'public.student_notifications', 'DELETE') then
    raise exception 'V8 FAIL: the bell table still carries a bootstrap write privilege no application path uses';
  end if;
  raise notice 'V8 PASS: connection and notification identities immutable, the two real client writes intact';
end;
$$;

-- V9 What 027 owns: attestation and record identity are not owner-writable, and
--    the adders are still writable. Each half is guarded because 027 is
--    existence-safe: on today's live schema these relations do not exist yet.
do $$
declare
  v_skipped text := '';
begin
  if to_regclass('public.student_skills') is not null then
    if has_column_privilege('authenticated', 'public.student_skills', 'source', 'INSERT')
       or has_column_privilege('authenticated', 'public.student_skills', 'source', 'UPDATE') then
      raise exception 'V9 FAIL: a student can still attest their own endorsement (F-09 open)';
    end if;
    if not has_column_privilege('authenticated', 'public.student_skills', 'name', 'INSERT')
       or not has_column_privilege('authenticated', 'public.student_skills', 'is_public', 'UPDATE') then
      raise exception 'V9 FAIL: the skill adder/editor broke';
    end if;
  else
    v_skipped := v_skipped || 'student_skills, ';
  end if;

  if to_regclass('public.student_experience') is not null then
    if has_column_privilege('authenticated', 'public.student_experience', 'id', 'INSERT')
       or has_column_privilege('authenticated', 'public.student_experience', 'created_at', 'UPDATE') then
      raise exception 'V9 FAIL: experience identity or timestamps are still client-writable';
    end if;
    if not has_column_privilege('authenticated', 'public.student_experience', 'role', 'INSERT') then
      raise exception 'V9 FAIL: adding an experience broke';
    end if;
  else
    v_skipped := v_skipped || 'student_experience, ';
  end if;

  if to_regclass('public.profile_moderation_flags') is not null then
    -- F-11 stays an OPEN DECISION. 027 deliberately changes nothing here, so this
    -- asserts only that the conflict is still the one described, not that it is
    -- fixed. Re-read this line before believing any admin-deletion runbook.
    if exists (
      select 1 from pg_attribute a
        join pg_constraint con on con.conrelid = a.attrelid and con.conkey @> array[a.attnum]
       where a.attrelid = 'public.profile_moderation_flags'::regclass
         and a.attname = 'created_by' and a.attnotnull
         and con.contype = 'f' and con.confdeltype = 'n') then
      raise notice 'V9 NOTE: F-11 still open — profile_moderation_flags.created_by is NOT NULL with ON DELETE SET NULL, so deleting a moderator account fails';
    end if;
  else
    v_skipped := v_skipped || 'profile_moderation_flags, ';
  end if;

  if v_skipped <> '' then
    raise notice 'V9 PASS with skips, relations absent exactly as on live: %', rtrim(v_skipped, ', ');
  else
    raise notice 'V9 PASS: skills and experience write surfaces narrowed, adders intact';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- HTTP-level checks this SQL cannot make. Run against staging with the browser or
-- curl, using two SYNTHETIC accounts and never real student data:
--
--   A. as reader B: GET /rest/v1/profiles?select=is_public&is_public=eq.false
--      -> 0 rows. Direct test of F-01 on the authenticated role, which anonymous
--         probes could not reach (docs/security/LIVE_DB_VERIFICATION.md §0).
--   B. as reader B: GET /rest/v1/profiles?select=gender&is_public=eq.true
--      -> 401/42501. Proves rule 3 at the column layer, not in src/lib/dataAccess.ts.
--   C. as reader B: GET /rest/v1/profiles?select=*  -> 401/42501.
--   D. accepted peer: POST /rest/v1/rpc/get_connected_peer_names {}
--      -> only {user_id, full_name}. Pending requester -> [].
--   E. as a stranger: POST /rest/v1/competition_team_members with another team id
--      -> 401/403 (F-02 denied through the API, not only in simulation).
--   F. GET a student-avatars public URL after that student set is_public=false
--      -> still 200 (the accepted consequence of rule 1).
--   G. admin sign-in plus one admin mutation, then a full team workflow:
--      create -> invite by code -> join -> request -> approve -> transfer ->
--      capacity error -> deadline error -> leave. All must behave as before.
-- ---------------------------------------------------------------------------
