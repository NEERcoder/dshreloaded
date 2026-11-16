-- PROPOSED — NOT APPLIED. Phase 2, file 5 of 6.
--
-- PURPOSE
-- Carry the three corrections that belong to relations the LIVE project does not
-- have yet, without making this file a prerequisite for 023-026.
--
-- Why a separate file: the live verification established that 017, 018, 019 and
-- 020 are NOT applied (finding L-6, docs/security/LIVE_DB_VERIFICATION.md §2). The
-- discarded 022 migration revoked privileges on public.events, public.student_skills,
-- public.student_experience and public.profile_moderation_flags inside one
-- explicit transaction, so applying it as written today fails with 42P01 and rolls
-- back the profiles and team protections too. Every statement below is therefore
-- guarded by existence, which makes this file safe to run before OR after the
-- feature migrations, in either order.
--
-- DEPENDENCIES: 025 (the privilege bootstrap it follows), and whichever of
-- 017 / 019 / 021 have been applied.
--
-- PRECONDITIONS: none. The preflight block reports what it found instead of
-- assuming it.
--
-- SECURITY RATIONALE
--   * student_skills.source: 019's own comment defines 'verified' as attestation by
--     someone else, and says "nothing in the app can set verified today". Under
--     019's table-wide INSERT/UPDATE grant an owner could set it anyway, which is
--     a claim of endorsement the system cannot support.
--   * events / profile_moderation_flags: tables created by default privileges
--     arrive with TRUNCATE/REFERENCES/TRIGGER for the API roles. Nothing
--     application-facing needs them, and TRUNCATE bypasses RLS and row triggers.
--   * 021's created_by column is documented below as an open decision, not
--     silently changed.

begin;

-- ---------------------------------------------------------------------------
-- 0. Report, do not assume.
-- ---------------------------------------------------------------------------
do $$
declare
  v_missing text := '';
  v_present text := '';
  v_rel text;
begin
  foreach v_rel in array array['public.events', 'public.student_skills',
                               'public.student_experience', 'public.profile_moderation_flags']
  loop
    if to_regclass(v_rel) is null then
      v_missing := v_missing || case when v_missing = '' then '' else ', ' end || v_rel;
    else
      v_present := v_present || case when v_present = '' then '' else ', ' end || v_rel;
    end if;
  end loop;
  raise notice 'phase2/027 present=% missing=%',
    coalesce(nullif(v_present, ''), 'none'), coalesce(nullif(v_missing, ''), 'none');
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. student_skills: attestation is not owner-writable.
--    Idempotent against both the original 019 grant set and the corrected one,
--    because it revokes first and then grants only the columns the client writes
--    (src/lib/dataAccess.ts createStudentSkill sends user_id, name, is_public).
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.student_skills') is null then
    raise notice 'student_skills absent (019 not applied) — nothing to narrow';
    return;
  end if;

  revoke insert, update on public.student_skills from public, anon, authenticated;
  grant insert (user_id, name, is_public, position) on public.student_skills to authenticated;
  grant update (name, is_public, position) on public.student_skills to authenticated;

  if has_column_privilege('authenticated', 'public.student_skills', 'source', 'INSERT')
     or has_column_privilege('authenticated', 'public.student_skills', 'source', 'UPDATE') then
    raise exception 'student_skills.source is still owner-writable';
  end if;
  if not has_column_privilege('authenticated', 'public.student_skills', 'name', 'INSERT') then
    raise exception 'adding a skill would break: name is not insertable';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Same narrowing for experience rows, whose free-text fields the owner does
--    legitimately control. Only the identity and the timestamps stop being
--    writable, so the adders keep working.
--    INSERT is included: 019:180 grants it table-wide, which lets a client
--    supply its own `id`, `created_at` or `updated_at` for a new row.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.student_experience') is null then
    raise notice 'student_experience absent (019 not applied) — nothing to narrow';
    return;
  end if;

  revoke insert, update on public.student_experience from public, anon, authenticated;
  -- The columns createStudentExperience in src/lib/dataAccess.ts:3060 actually
  -- sends are user_id, role, organization, period, location, is_public. The rest
  -- of this list is what an editor of the same record would need; the adder must
  -- not break when one is wired up.
  grant insert (user_id, role, organization, period, start_month, end_month,
                location, description, is_current, is_public, position)
    on public.student_experience to authenticated;
  grant update (role, organization, period, start_month, end_month, location,
                description, is_current, is_public, position)
    on public.student_experience to authenticated;

  if has_column_privilege('authenticated', 'public.student_experience', 'id', 'INSERT')
     or has_column_privilege('authenticated', 'public.student_experience', 'created_at', 'UPDATE') then
    raise exception 'student_experience identity or timestamps are still writable';
  end if;
  if not has_column_privilege('authenticated', 'public.student_experience', 'role', 'INSERT') then
    raise exception 'adding an experience would break: role is not insertable';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Bootstrap privileges on whichever of these relations exist. Same revoke set
--    as 025 step 3, kept here so a later apply of 017/019/021 can be hardened
--    without re-running 025.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select c.oid::regclass as rel
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join unnest(array['events','student_skills','student_experience','profile_moderation_flags'])
             as want(name) on want.name = c.relname
     where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('revoke truncate, references, trigger on %s from public, anon, authenticated', r.rel);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. profile_moderation_flags: an admin action must survive the deletion of the
--    admin who performed it. 021 declared
--      created_by uuid not null references auth.users (id) on delete set null
--    which CREATEs and ALTERs cleanly (verified in PostgreSQL 17: the DDL is
--    accepted), so the conflict surfaces only when a moderator account is deleted
--    and SET NULL meets NOT NULL. Leaving that unaddressed means deleting a
--    departed admin's auth user fails, or the audit trail is silently lost.
--
--    This file does NOT decide the retention question — it is a product/records
--    choice. It states both options and makes the table exist-safe.
--
--      Option A (recommended): allow null, keep the FK.
--        alter table public.profile_moderation_flags alter column created_by drop not null;
--        -- flags survive admin deletion; the actor becomes unknown, which is the
--        -- truthful state. resolved_by already allows null, so this makes the
--        -- table internally consistent.
--
--      Option B: keep the trail, refuse the deletion.
--        alter table public.profile_moderation_flags
--          drop constraint profile_moderation_flags_created_by_fkey,
--          add constraint profile_moderation_flags_created_by_fkey
--              foreign key (created_by) references auth.users (id) on delete restrict;
--        -- deleting an admin account then fails until the flags are reassigned,
--        -- which needs an operator process that does not exist yet.
--
--    Until the owner chooses, apply nothing in this section.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.profile_moderation_flags') is null then
    raise notice 'profile_moderation_flags absent (021 not applied, or live state unknown)';
  else
    raise notice 'profile_moderation_flags exists — resolve the created_by NOT NULL / ON DELETE SET NULL conflict (see section 4) before deleting any admin auth user';
  end if;
end;
$$;

commit;

-- EXPECTED TEST RESULTS
--   027 applied with 017/019/021 ABSENT   -> succeeds, reports skips (this is the
--                                            live state today; the discarded 022 failed here)
--   027 applied after 017/019/021          -> succeeds and narrows
--   owner INSERT with source='verified'    -> denied
--   owner UPDATE of source                 -> denied
--   owner add/update a skill normally      -> succeeds
--   owner INSERT of an experience with a chosen id -> denied
--   owner UPDATE of experience id/created_at       -> denied
--   owner add/update an experience normally        -> succeeds
--   anon TRUNCATE on events                -> denied
--
-- ROLLBACK
--   `--$ ` lines are executed verbatim by scripts/security-phase2-check.mjs,
--   which then re-applies 027 and asserts the narrowed write surface returns.
--   Guarded on existence for the same reason the body is: on today's live
--   schema these relations do not exist, and an unguarded rollback would abort
--   the whole incident procedure.
--$ do $$
--$ begin
--$   if to_regclass('public.student_skills') is not null then
--$     grant insert, update on public.student_skills to authenticated;
--$   end if;
--$   if to_regclass('public.student_experience') is not null then
--$     grant insert, update on public.student_experience to authenticated;
--$   end if;
--$ end
--$ $$;
--   That restores the pre-fix write surface. The 021 conflict is not a rollback
--   concern — it is still unresolved either way.
