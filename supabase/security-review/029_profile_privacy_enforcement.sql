-- PROPOSED — NOT APPLIED. Phase 2, file 6 of 6 — ROLLOUT PHASE C (RESTRICTIVE).
--
-- PURPOSE
-- Close F-01 for real. Remove the permissive-all authenticated SELECT policy on
-- public.profiles and the table-wide SELECT/INSERT/UPDATE privileges that
-- 002:44-47 and 002:63 installed, then grant back exactly the discovery
-- projection approved rules 2 and 3 describe.
--
-- THIS IS THE HALF THAT CAN BREAK THE APP. Apply it only after:
--   1. 023_profile_privacy_name_only.sql — both definer functions must already
--      exist, or the owner loses every path to their own `gender`, `id`,
--      `created_at` and `updated_at`. Section 0 asserts this and aborts.
--   2. The client that calls them is deployed. src/lib/dataAccess.ts reads the
--      owner's row through `get_own_profile()` and never asks the `profiles`
--      table for a column outside the ten granted below. Until that build is
--      live, an owner profile read using `select=*` becomes a privilege error.
--
-- DEPENDENCIES
--   * 023 (the two functions), 002 (the policies and grants replaced),
--     005 (student_connections), 007 (is_public, avatar_url, anon projection),
--     011 (instagram_handle), 014 (headline).
--   * 000_read_only_preflight.sql run first, on the same database, and archived.
--
-- PRECONDITIONS — verified by assertion in section 0, never assumed:
--   * the authenticated SELECT policy set on profiles matches, expression for
--     expression, what the repository says is there. An unidentified permissive
--     policy aborts the file, because dropping a policy by guessed name can
--     leave the hole open while looking closed.
--
-- SECURITY INVARIANTS
--   1. Column privileges, not React, decide what leaves the database. This file
--      replaces the table-wide authenticated SELECT from 002:63 with the
--      discovery projection, so `gender`, `id`, `created_at` and `updated_at`
--      become unreachable for every reader except the owner (who reads them
--      through a definer function) and an admin (through is_admin()).
--   2. The private row itself stays invisible to a connection, which is why the
--      client keeps its null-peer path working rather than pretending a row
--      exists. Rule 2's name arrives through 023's function; nothing widens rows.
--   3. anon access is neither widened nor narrowed here: 007's projection and
--      its policy are left exactly as applied.

begin;

-- ---------------------------------------------------------------------------
-- 0. Refuse to restrict anything you cannot describe.
--    Three checks, all fail-closed: the Phase A functions must exist, every
--    SELECT policy on profiles must be one this file can name, and each named
--    policy must carry the expression that was reviewed.
--
--    Measured, not assumed: in PostgreSQL 17 `pg_get_expr(polqual)` renders
--    `using (true)` as the bare string `true`, NOT `(true)`, and it is NOT null.
--    An earlier draft of this logic treated permissive-all as `polqual IS NULL`,
--    which silently never matched — so recognition below accepts both spellings
--    and treats a null expression as permissive-all too, which is what a
--    policy without a USING clause actually is.
-- ---------------------------------------------------------------------------
do $$
declare
  v_kind text;
  v_rec record;
  v_permissive boolean;
  v_unexpected text := '';
  v_all_for_auth int := 0;
begin
  foreach v_kind in array array['public.get_connected_peer_names()', 'public.get_own_profile()'] loop
    if to_regprocedure(v_kind) is null then
      raise exception
        'ABORT: % does not exist. 023 (the additive half) must be applied first — without it this file removes the owner''s only path to their own gender, id and timestamps.',
        v_kind;
    end if;
    if not has_function_privilege('authenticated', v_kind::regprocedure, 'EXECUTE') then
      raise exception 'ABORT: % exists but authenticated cannot execute it; 023 was applied incompletely', v_kind;
    end if;
  end loop;

  for v_rec in
    select p.polname, p.polcmd::text as cmd, p.polpermissive,
           pg_get_expr(p.polqual, p.polrelid) as using_expr,
           coalesce(nullif(array_to_string(array(
             select case when u = 0::oid then 'public' else ro.rolname end
               from unnest(p.polroles) u left join pg_roles ro on ro.oid = u), ','), ''), 'public') as roles
      from pg_policy p
      join pg_class c on c.oid = p.polrelid
      join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
     where c.relname = 'profiles' and p.polcmd in ('r', '*')
  loop
    if not v_rec.polpermissive then
      raise exception 'ABORT: policy "%" on profiles is RESTRICTIVE; this file only reasons about permissive-OR sets. Reconcile live state (preflight P2) first.', v_rec.polname;
    end if;

    v_permissive := v_rec.using_expr is null or v_rec.using_expr in ('true', '(true)');

    if v_rec.polname = 'Authenticated users can read profiles' then
      -- The F-01 hole. It must be exactly what 002:44-47 wrote, for
      -- authenticated, permissive-all. Anything else is a different object and
      -- dropping it by name would be a guess.
      if not v_permissive or position('authenticated' in v_rec.roles) = 0 then
        raise exception
          'ABORT: "Authenticated users can read profiles" reads as [%] USING % for roles [%], not the permissive-all authenticated policy 002 created. Do not drop what has not been recognised.',
          v_rec.cmd, coalesce(v_rec.using_expr, '<null>'), v_rec.roles;
      end if;
    elsif v_rec.polname = 'Public profiles are readable by anyone' then
      if position('is_public' in coalesce(v_rec.using_expr, '')) = 0 then
        raise exception 'ABORT: 007''s anon policy "%" no longer tests is_public (USING %); it is not the object this file leaves alone.', v_rec.polname, v_rec.using_expr;
      end if;
    elsif v_rec.polname in ('Students read public, own and moderated profiles',
                            'Students read public, own, connected and moderated profiles') then
      -- This file's own output, or a superseded variant: recognised so that a
      -- re-apply converges instead of aborting on its own footprint.
      if position('is_public' in coalesce(v_rec.using_expr, '')) = 0
         or position('auth.uid()' in coalesce(v_rec.using_expr, '')) = 0 then
        raise exception 'ABORT: policy "%" is not the reviewed owner/public shape (USING %).', v_rec.polname, v_rec.using_expr;
      end if;
    else
      if v_permissive and position('authenticated' in v_rec.roles) > 0 then
        v_all_for_auth := v_all_for_auth + 1;
      end if;
      v_unexpected := v_unexpected || case when v_unexpected = '' then '' else ', ' end
        || '"' || v_rec.polname || '" [' || v_rec.cmd || '] for [' || v_rec.roles
        || '] USING ' || coalesce(v_rec.using_expr, '<null>');
    end if;
  end loop;

  -- The accumulation guard. Permissive policies are OR-combined, so one
  -- unnamed permissive-all SELECT policy for authenticated re-opens F-01 even
  -- after this file narrows everything it knows about.
  if v_all_for_auth > 0 then
    raise exception
      'ABORT: % permissive-all SELECT policy/policies on profiles apply to authenticated but are not named in this file. Revoke the columns and rows you have not read and the hole stays open anyway. Reconcile from preflight P2/P3 first.',
      v_all_for_auth;
  end if;

  if v_unexpected <> '' then
    raise exception
      'ABORT: unrecognised SELECT policy/policies on profiles: %. Add a policy to section 0 only after establishing how it got there.',
      v_unexpected;
  end if;

  if not exists (select 1 from pg_policy p join pg_class c on c.oid = p.polrelid
                  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
                 where c.relname = 'profiles') then
    raise exception 'ABORT: profiles has no policies at all — RLS may be disabled, or this is not the table 002 created';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Row visibility: owner, opted-in public rows, and moderation. Private rows
--    are visible to NOBODY but the owner and admins — the connection path is
--    023's function, deliberately not a row policy.
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated users can read profiles" on public.profiles;
drop policy if exists "Students read public, own and moderated profiles" on public.profiles;
drop policy if exists "Students read public, own, connected and moderated profiles" on public.profiles;

create policy "Students read public, own and moderated profiles"
  on public.profiles for select to authenticated
  using (user_id = auth.uid() or is_public = true or public.is_admin());

-- 007's anon policy (`is_public = true`) is left exactly as applied; this file
-- neither widens nor narrows anonymous access.

-- ---------------------------------------------------------------------------
-- 2. Column privileges. This is the half that actually closes gender discovery:
--    a projection in src/lib/dataAccess.ts is not a boundary.
--    INSERT and UPDATE are narrowed to the columns the owner's own forms write,
--    so a caller cannot stamp a timestamp or swap a primary key.
-- ---------------------------------------------------------------------------
revoke select on public.profiles from authenticated;

grant select (
  user_id, full_name, college_id, course, year_of_study, graduation_year,
  is_public, avatar_url, instagram_handle, headline
) on public.profiles to authenticated;

revoke insert, update on public.profiles from authenticated;
grant insert (
  user_id, full_name, college_id, course, year_of_study, graduation_year, gender,
  is_public, avatar_url, instagram_handle, headline
) on public.profiles to authenticated;
grant update (
  full_name, college_id, course, year_of_study, graduation_year, gender,
  is_public, avatar_url, instagram_handle, headline
) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Convergence: the protection is in place AND the legitimate reads survived.
--    A file that only proves the first half bricks the product.
-- ---------------------------------------------------------------------------
do $$
declare
  v_count int;
begin
  select count(*) into v_count
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
    join unnest(p.polroles) r(roleid) on true
    join pg_roles ro on ro.oid = r.roleid
   where c.relname = 'profiles' and p.polcmd = 'r' and ro.rolname = 'authenticated';
  if v_count <> 1 then
    raise exception 'expected exactly 1 authenticated SELECT policy on profiles, found %', v_count;
  end if;

  if has_column_privilege('authenticated', 'public.profiles', 'gender', 'SELECT') then
    raise exception 'authenticated still holds SELECT on profiles.gender';
  end if;
  if has_column_privilege('authenticated', 'public.profiles', 'id', 'SELECT') then
    raise exception 'authenticated still holds SELECT on profiles.id';
  end if;
  if has_table_privilege('authenticated', 'public.profiles', 'SELECT') then
    raise exception 'authenticated still holds TABLE-WIDE SELECT on profiles';
  end if;
  if not has_column_privilege('authenticated', 'public.profiles', 'full_name', 'SELECT') then
    raise exception 'authenticated lost SELECT on profiles.full_name — the directory would break';
  end if;
  if not has_column_privilege('authenticated', 'public.profiles', 'headline', 'SELECT') then
    raise exception 'authenticated lost SELECT on profiles.headline — CIRCLE cards would break';
  end if;
  -- The owner's writes must still land, and must still be able to set the two
  -- fields that only the owner ever writes.
  if not has_column_privilege('authenticated', 'public.profiles', 'gender', 'UPDATE') then
    raise exception 'the owner could no longer save their own gender';
  end if;
  if has_column_privilege('authenticated', 'public.profiles', 'updated_at', 'UPDATE') then
    raise exception 'updated_at is still client-writable';
  end if;
  -- And the paths this file depends on must still be executable, or the owner
  -- has been locked out of their own row.
  if not has_function_privilege('authenticated', 'public.get_own_profile()', 'EXECUTE') then
    raise exception 'get_own_profile() is not executable: the owner has no full read path';
  end if;
  if not has_function_privilege('authenticated', 'public.get_connected_peer_names()', 'EXECUTE') then
    raise exception 'get_connected_peer_names() is not executable: rule 2 cannot be met';
  end if;
end;
$$;

commit;

-- EXPECTED TEST RESULTS (asserted by scripts/security-phase2-check.mjs)
--   * applied without 023                                             ABORTS in
--     section 0 — that abort is the rollout guard, not a failure
--   * owner reads own row incl. gender through get_own_profile()            pass
--   * accepted peer reads name via get_connected_peer_names()               pass
--   * accepted peer reads peer's gender/college/course/headline             FAIL (denied)
--   * accepted peer reads peer's profile_contacts phone                     FAIL (denied)
--   * unconnected / pending / cancelled reader reads private name           FAIL (denied)
--   * admin reads private rows for moderation                               pass
--   * anon public projection and public avatar URLs unchanged               pass
--   * count(*)/aggregate over an ungranted column                           FAIL (denied)
--
-- ROLLBACK (reopen the previous behaviour deliberately, staging only)
--   `--$ ` lines are executed verbatim by scripts/security-phase2-check.mjs,
--   which then re-applies 029 and asserts the restricted state returns.
--$ begin;
--$ drop policy if exists "Students read public, own and moderated profiles" on public.profiles;
--$ create policy "Authenticated users can read profiles"
--$   on public.profiles for select to authenticated using (true);
--$ grant select on public.profiles to authenticated;
--$ grant insert, update on public.profiles to authenticated;
--$ commit;
--   Doing so reinstates F-01: every private profile and the gender column become
--   readable by any account again. Treat rollback as an incident to resolve the
--   same day, not a resting state.
--   Leave 023's functions in place. They grant no additional access — each one
--   can only return rows the caller already owns or is connected to — so an
--   accidental drop here would take away the owner path while the broad read is
--   being restored.
--
-- WHAT THIS FILE DOES NOT DO
--   * it creates no function (023 owns both);
--   * it touches no storage bucket, object policy or avatar URL (rule 1);
--   * it changes no anon grant or policy (007's shape is left as applied);
--   * it does not narrow admin access: `is_admin()` readers keep what 002 gave.
