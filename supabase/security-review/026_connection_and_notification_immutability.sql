-- PROPOSED — NOT APPLIED. Phase 2, file 4 of 6.
--
-- PURPOSE — finding F-05.
-- 005 and 006 wrote careful row policies and then used the per-column grant idiom
-- (`grant update (status)`, `grant update (read_at)`) intending to make the
-- participants and the actor immutable. But both migrations ran under Supabase's
-- default privileges, which had already granted table-wide UPDATE to
-- `authenticated` at CREATE time, and neither revoked it. PostgreSQL accumulates
-- grants, so the narrow grant sat beside the broad one and did nothing.
--
-- The live project demonstrated this exact mechanism twice in other objects
-- (L-1: anon holds table SELECT on admin_users; L-2: anon can execute
-- new_team_invite_code() despite `revoke all ... from public`). This file applies
-- the same lesson to the two privacy tables the repository thought were finished.
--
-- DEPENDENCIES
--   005 (student_connections + guard_student_connection_status trigger),
--   006 (student_notifications + guard_student_notification_read trigger and the
--   two notify_* triggers). Nothing in this file changes a policy or trigger.
--
-- PRECONDITIONS
--   Both tables exist with SELECT, INSERT and DELETE for authenticated, as 005:118
--   and 006:141-142 grant them. Verified live on 2026-11-03: both tables exist and
--   anon is denied by privilege, so only the authenticated UPDATE grant is loose.
--
-- SECURITY RATIONALE
--   * student_connections: rewriting requester_user_id would let a recipient turn
--     someone else's pending request into their own accepted connection, and
--     rewriting recipient_user_id would let a requester self-accept by moving the
--     row onto themselves. 005's policy blocks the second move today, but only as
--     long as that policy is the one in production.
--   * student_notifications: actor_user_id is the audit trail of who requested and
--     who accepted. It is written by 006's definer triggers and must never be
--     reachable from an API write.

begin;

-- ---------------------------------------------------------------------------
-- 0. Preflight.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.student_connections') is null then
    raise exception 'student_connections does not exist — 005 must be applied first';
  end if;
  if to_regclass('public.student_notifications') is null then
    raise exception 'student_notifications does not exist — 006 must be applied first';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Collapse the accumulated grant, then re-grant exactly what the app writes.
--    The client writes only these: status (accepting a request) and read_at
--    (marking a notification read). Cancelling a connection travels through
--    DELETE on student_connections, which 005 grants and this file preserves.
-- ---------------------------------------------------------------------------
revoke update on public.student_connections from public, anon, authenticated;
grant update (status) on public.student_connections to authenticated;

revoke update on public.student_notifications from public, anon, authenticated;
grant update (read_at) on public.student_notifications to authenticated;

-- Notifications are created only by 006's two SECURITY DEFINER triggers, which
-- run as the schema owner, so removing the API role's INSERT and DELETE costs no
-- path: src/lib/dataAccess.ts has no notification insert or delete call and 006
-- defines no INSERT or DELETE policy for this table. Those privileges came from
-- the default-privilege bootstrap — 006:140 revokes `from anon` and never names
-- authenticated, which is the exact mechanism L-1 was. RLS turned them into
-- no-ops; this removes them instead of relying on a policy to hide them.
revoke insert, delete on public.student_notifications from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Convergence assertions, written as a loop over the columns that must stop
--    being writable and a direct check of the ones that must survive.
-- ---------------------------------------------------------------------------
do $$
declare
  v_column text;
begin
  foreach v_column in array array[
    'id', 'requester_user_id', 'recipient_user_id', 'created_at', 'updated_at'
  ] loop
    if has_column_privilege('authenticated', 'public.student_connections', v_column, 'UPDATE') then
      raise exception 'student_connections.% is still writable by authenticated', v_column;
    end if;
  end loop;

  foreach v_column in array array[
    'id', 'user_id', 'type', 'actor_user_id', 'connection_id', 'created_at'
  ] loop
    if has_column_privilege('authenticated', 'public.student_notifications', v_column, 'UPDATE') then
      raise exception 'student_notifications.% is still writable by authenticated', v_column;
    end if;
  end loop;

  if not has_column_privilege('authenticated', 'public.student_connections', 'status', 'UPDATE') then
    raise exception 'accepting a connection would break: status is not writable';
  end if;
  if not has_column_privilege('authenticated', 'public.student_notifications', 'read_at', 'UPDATE') then
    raise exception 'marking a notification read would break: read_at is not writable';
  end if;
  if not has_table_privilege('authenticated', 'public.student_connections', 'DELETE') then
    raise exception 'cancelling or removing a connection would break: DELETE removed';
  end if;
  if not has_table_privilege('authenticated', 'public.student_connections', 'INSERT') then
    raise exception 'sending a connection request would break: INSERT removed';
  end if;
  if not has_table_privilege('authenticated', 'public.student_notifications', 'SELECT') then
    raise exception 'the notification bell would break: SELECT removed';
  end if;
  if has_table_privilege('authenticated', 'public.student_notifications', 'INSERT')
     or has_table_privilege('authenticated', 'public.student_notifications', 'DELETE') then
    raise exception 'student_notifications still carries a bootstrap write privilege the application never uses';
  end if;
end;
$$;

commit;

-- EXPECTED TEST RESULTS
--   recipient accepts their own request              -> succeeds
--   recipient rewrites requester_user_id             -> denied  (before: permitted)
--   requester rewrites recipient_user_id to self      -> denied  (before: permitted)
--   owner marks own notification read                -> succeeds
--   owner rewrites actor_user_id / user_id / type    -> denied  (before: permitted)
--   direct INSERT or DELETE on notifications         -> 42501, from the privilege
--     revoke in section 1. Before it RLS turned those statements into silent
--     no-ops: same outcome, but a future INSERT policy would have made them real
--     writes, which is exactly the class of drift F-04/L-1 describe.
--   the two 005/006 transition triggers              -> unchanged, still raise
--
-- ROLLBACK (staging only; reopens F-05)
--   The `--$ ` lines are the authoritative procedure and are executed by
--   scripts/security-phase2-check.mjs, which then re-applies 026 and asserts
--   the state returns. Section 1 has three revokes now, not two, so a rollback
--   that restores only the UPDATE grants leaves half the file undone — which is
--   exactly how an operator comes to believe the bell table is writable again
--   when it is not.
--$ begin;
--$ grant update on public.student_connections to authenticated;
--$ grant update on public.student_notifications to authenticated;
--$ grant insert, delete on public.student_notifications to authenticated;
--$ commit;
--   Restoring INSERT and DELETE here returns the bootstrap privileges 026
--   removed. RLS (006 defines no INSERT or DELETE policy on notifications) is
--   then the only thing making them no-ops again, which is the pre-fix state
--   and the whole point of F-05.
