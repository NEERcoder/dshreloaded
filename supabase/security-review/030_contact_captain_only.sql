-- PROPOSED — NOT APPLIED. Phase 2.1 complete remediation, file 1 of 4 (030-033).
--
-- PURPOSE — live finding C, and the spec's captain-only contact rule.
-- 011:81-93 lets ANY student who shares ANY team with the owner read that
-- owner's whole profile_contacts row (phone_number included). The definer
-- roster RPC get_team_member_profiles (011:102-146) hands the same number to
-- any caller on the team. The product rule is narrower:
--
--   ONLY THE TEAM CAPTAIN may read the phone numbers of that team's members.
--   Ordinary members must not receive one another's numbers. Former members
--   lose access the instant their membership row is gone.
--
-- This file changes BOTH doors — the row policy and the RPC — because closing
-- one while leaving the other is not a fix. It does not touch profiles, the
-- membership policies (024) or the connection/notification grants (026).
--
-- DEPENDENCIES
--   011 (profile_contacts, its two policies, get_team_member_profiles),
--   002 (competition_teams.captain_user_id is the authority this file reads),
--   024 (membership can no longer be fabricated, so "shares a team" is now a
--        trustworthy predicate — but this file stops relying on it for phone).
--
-- PRECONDITIONS — re-verify with 000_read_only_preflight.sql first. 011 is
--   confirmed applied live; the authenticated row behaviour was not observable
--   anonymously, so the preflight below reads the policy set rather than
--   assuming it.
--
-- WHAT IS PRESERVED
--   * the owner reads and writes their own contact row (policy A, untouched);
--   * roster NAMES, college, course and instagram for every teammate — the RPC
--     still returns those to any member; only phone_number becomes captain-only;
--   * anon has no access at all (011:95 revoke stands).

begin;

-- ---------------------------------------------------------------------------
-- 0. Preflight: refuse to act on a policy set this file cannot describe.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  v_unexpected text := '';
  v_owner int := 0;
  v_read int := 0;
begin
  for r in
    select p.polname, p.polcmd::text as cmd, p.polpermissive,
           pg_get_expr(p.polqual, p.polrelid) as using_expr
      from pg_policy p
      join pg_class c on c.oid = p.polrelid
      join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
     where c.relname = 'profile_contacts'
     order by p.polcmd, p.polname
  loop
    if not r.polpermissive then
      raise exception 'ABORT: policy "%" on profile_contacts is RESTRICTIVE. This file reasons about permissive-OR sets only; reconcile live state (preflight P2) first.', r.polname;
    end if;

    case r.polname
      when 'Students manage their own contact details' then
        if r.cmd <> '*' or position('auth.uid()' in coalesce(r.using_expr, '')) = 0 then
          raise exception 'ABORT: the owner contact policy is not 011:74-78 (cmd=% using=%)', r.cmd, r.using_expr;
        end if;
        v_owner := v_owner + 1;

      when 'Teammates can read shared-team contacts' then
        -- The exposure this file replaces. Recognised so it can be dropped.
        if r.cmd <> 'r' then
          raise exception 'ABORT: "Teammates can read shared-team contacts" is cmd=%, expected SELECT', r.cmd;
        end if;
        v_read := v_read + 1;

      when 'Captains can read team member contacts' then
        -- This file's own output: recognised so a re-apply is idempotent.
        if r.cmd <> 'r' or position('captain_user_id' in coalesce(r.using_expr, '')) = 0 then
          raise exception 'ABORT: "Captains can read team member contacts" is not the policy 030 creates (cmd=% using=%)', r.cmd, r.using_expr;
        end if;
        v_read := v_read + 1;

      else
        v_unexpected := v_unexpected || case when v_unexpected = '' then '' else ', ' end
          || '[' || r.cmd || '] "' || r.polname || '"';
    end case;
  end loop;

  if v_unexpected <> '' then
    raise exception 'ABORT: unrecognised policies on profile_contacts: %. 030 will not replace a policy set it has not read.', v_unexpected;
  end if;
  if v_owner <> 1 then
    raise exception 'ABORT: expected exactly one owner contact policy, found %', v_owner;
  end if;
  if v_read <> 1 then
    raise exception 'ABORT: expected exactly one non-owner SELECT policy (teammate or captain), found %', v_read;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Replace the teammate-reads-any-phone policy with captain-only.
--    A captain reads the contact row of any CURRENT member of a team they
--    captain. The membership join is what makes "former member" lose access:
--    delete the membership row and the EXISTS stops matching.
-- ---------------------------------------------------------------------------
drop policy if exists "Teammates can read shared-team contacts" on public.profile_contacts;
drop policy if exists "Captains can read team member contacts" on public.profile_contacts;

create policy "Captains can read team member contacts"
  on public.profile_contacts for select to authenticated
  using (
    exists (
      select 1
      from public.competition_team_members m
      join public.competition_teams t on t.id = m.team_id
      where m.user_id = profile_contacts.user_id
        and t.captain_user_id = auth.uid()
    )
  );

-- The owner policy (011:74-78) and the anon revoke (011:95) are deliberately
-- left in place. Re-assert the authenticated grants so a re-run converges even
-- if 025 §3 stripped table privileges earlier in the same apply.
grant select on public.profile_contacts to authenticated;
grant insert, update on public.profile_contacts to authenticated;

-- ---------------------------------------------------------------------------
-- 2. The RPC door. get_team_member_profiles is SECURITY DEFINER and bypasses
--    RLS, so the policy above does NOT constrain it. Return phone_number only
--    when the caller captains this team; everyone else gets NULL for phone but
--    still gets the roster's names/college/course/instagram. The membership
--    gate on the whole result is unchanged.
-- ---------------------------------------------------------------------------
create or replace function public.get_team_member_profiles(
  p_team_id uuid,
  p_user_ids uuid[]
)
returns table (
  user_id uuid,
  full_name text,
  college_id uuid,
  course text,
  instagram_handle text,
  phone_number text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.user_id,
    p.full_name,
    p.college_id,
    p.course,
    p.instagram_handle,
    case when exists (
      select 1 from public.competition_teams t
      where t.id = p_team_id and t.captain_user_id = auth.uid()
    ) then c.phone_number else null end as phone_number
  from public.profiles p
  left join public.profile_contacts c on c.user_id = p.user_id
  where p.user_id = any (coalesce(p_user_ids[1:200], '{}'::uuid[]))
    and exists (
      select 1 from public.competition_team_members m
      where m.team_id = p_team_id and m.user_id = p.user_id
    )
    and (
      exists (
        select 1 from public.competition_team_members me
        where me.team_id = p_team_id and me.user_id = auth.uid()
      )
      or exists (
        select 1 from public.competition_teams t
        where t.id = p_team_id and t.captain_user_id = auth.uid()
      )
    );
$$;

comment on function public.get_team_member_profiles(uuid, uuid[]) is
  'Roster profiles for one team. Names/college/course/instagram for any member; phone_number only when the caller captains the team (030). Returns nothing unless the caller is on the team.';

revoke all on function public.get_team_member_profiles(uuid, uuid[]) from public, anon;
grant execute on function public.get_team_member_profiles(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Convergence: the exposure is closed AND the legitimate paths survived.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_policy p join pg_class c on c.oid = p.polrelid
              join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
             where c.relname = 'profile_contacts'
               and p.polname = 'Teammates can read shared-team contacts') then
    raise exception 'the teammate phone policy still exists — finding C stays open';
  end if;
  if not exists (select 1 from pg_policy p join pg_class c on c.oid = p.polrelid
                  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
                 where c.relname = 'profile_contacts'
                   and p.polname = 'Captains can read team member contacts' and p.polcmd = 'r') then
    raise exception 'the captain-only contact policy is missing';
  end if;
  if not exists (select 1 from pg_policy p join pg_class c on c.oid = p.polrelid
                  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
                 where c.relname = 'profile_contacts'
                   and p.polname = 'Students manage their own contact details') then
    raise exception 'owner contact management would break: the owner policy is gone';
  end if;
  if has_table_privilege('anon', 'public.profile_contacts', 'SELECT') then
    raise exception 'anon can read profile_contacts — it must not';
  end if;
  if not has_function_privilege('authenticated', 'public.get_team_member_profiles(uuid,uuid[])', 'EXECUTE') then
    raise exception 'roster loading would break: authenticated lost EXECUTE on get_team_member_profiles';
  end if;
  if has_function_privilege('anon', 'public.get_team_member_profiles(uuid,uuid[])', 'EXECUTE') then
    raise exception 'anon can execute the roster RPC — it must not';
  end if;
end;
$$;

commit;

-- EXPECTED TEST RESULTS (scripts/security-phase2-check.mjs)
--   ordinary member reads a teammate's phone via profile_contacts -> denied (was permitted)
--   ordinary member reads a teammate's phone via the RPC          -> NULL   (was the number)
--   captain reads a current member's phone (policy and RPC)       -> the number
--   former member reads the ex-teammate's phone                   -> denied
--   owner reads/updates their own contact row                     -> unchanged
--   anon reads profile_contacts / executes the RPC                -> denied
--
-- ROLLBACK (staging only; reopens finding C — every teammate's phone becomes
-- readable by every other teammate again). The `--$ ` lines are authoritative;
-- the harness extracts and executes them, then re-applies 030 and asserts the
-- captain-only state returns.
--$ begin;
--$ drop policy if exists "Captains can read team member contacts" on public.profile_contacts;
--$ create policy "Teammates can read shared-team contacts"
--$   on public.profile_contacts for select to authenticated
--$   using (exists (select 1 from public.competition_team_members mine
--$     join public.competition_team_members theirs on theirs.team_id = mine.team_id
--$     where mine.user_id = auth.uid() and theirs.user_id = profile_contacts.user_id));
--$ create or replace function public.get_team_member_profiles(p_team_id uuid, p_user_ids uuid[])
--$ returns table (user_id uuid, full_name text, college_id uuid, course text, instagram_handle text, phone_number text)
--$ language sql stable security definer set search_path = public as $fn$
--$   select p.user_id, p.full_name, p.college_id, p.course, p.instagram_handle, c.phone_number
--$   from public.profiles p left join public.profile_contacts c on c.user_id = p.user_id
--$   where p.user_id = any (coalesce(p_user_ids[1:200], '{}'::uuid[]))
--$     and exists (select 1 from public.competition_team_members m where m.team_id = p_team_id and m.user_id = p.user_id)
--$     and (exists (select 1 from public.competition_team_members me where me.team_id = p_team_id and me.user_id = auth.uid())
--$       or exists (select 1 from public.competition_teams t where t.id = p_team_id and t.captain_user_id = auth.uid()));
--$ $fn$;
--$ revoke all on function public.get_team_member_profiles(uuid, uuid[]) from public, anon;
--$ grant execute on function public.get_team_member_profiles(uuid, uuid[]) to authenticated;
--$ commit;
