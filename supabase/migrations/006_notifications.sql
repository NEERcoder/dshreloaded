-- =====================================================================
-- 006_notifications.sql
-- =====================================================================
-- PART 9 — the first notification layer: connection activity only.
--
-- V1 types: connection_request, connection_accepted. Nothing else.
--
-- WHO WRITES THEM: nobody through the API. Rows are produced by triggers on
-- public.student_connections (migration 005) running as the schema owner, so
-- a student can never claim an event happened by posting a row themselves.
-- `authenticated` is granted SELECT and a per-column UPDATE of read_at only.
--
-- Rejecting, cancelling and removing a connection delete the connection row,
-- so those notifications disappear with it and no "rejected" notice is ever
-- written. Requires 005.

create table if not exists public.student_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('connection_request', 'connection_accepted')),
  actor_user_id uuid references auth.users (id) on delete set null,
  connection_id uuid references public.student_connections (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- One notification per event per recipient. A connection pair already holds a
-- single row (005), so a repeated or reversed request has nothing new to
-- insert here; the ON CONFLICT DO NOTHING in the triggers makes that explicit
-- rather than letting a race surface as a duplicate bell.
create unique index if not exists student_notifications_event_unique
  on public.student_notifications (user_id, connection_id, type);

create index if not exists student_notifications_user_created_idx
  on public.student_notifications (user_id, created_at desc);

-- The navbar badge asks "how many are unread" on every authenticated page.
create index if not exists student_notifications_user_unread_idx
  on public.student_notifications (user_id)
  where read_at is null;

alter table public.student_notifications enable row level security;

-- A student reads and marks only their own inbox. There is deliberately no
-- INSERT or UPDATE-FOR-ANYONE policy: reads never leave the owner's hands and
-- anonymous visitors match no row at all.
drop policy if exists "Students read their own notifications" on public.student_notifications;
create policy "Students read their own notifications"
  on public.student_notifications for select to authenticated
  using (auth.uid() = user_id);

-- Own rows only, and the writable column is narrowed to read_at below, so a
-- student cannot re-point a notification at themselves or rename its type.
drop policy if exists "Students mark their own notifications read" on public.student_notifications;
create policy "Students mark their own notifications read"
  on public.student_notifications for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Row policies can compare new values but not old ones, so the one legal read
-- transition (unread -> read) is enforced here instead: no un-reading, and no
-- using UPDATE as a way to rewrite anything else.
create or replace function public.guard_student_notification_read()
returns trigger
language plpgsql
as $$
begin
  if new.read_at is distinct from old.read_at
     and (old.read_at is not null or new.read_at is null) then
    raise 'a student notification can only be marked read once'
      using hint = 'Set read_at to a timestamp on a notification that is still unread.';
  end if;
  return new;
end;
$$;

drop trigger if exists student_notifications_guard_read on public.student_notifications;
create trigger student_notifications_guard_read before update on public.student_notifications
  for each row execute function public.guard_student_notification_read();

-- ---------------------------------------------------------------------
-- Generation: triggers on the connection row, executed as the owner so the
-- recipient — who has no INSERT privilege — is never the one writing about
-- what happened to them.
-- ---------------------------------------------------------------------

create or replace function public.notify_connection_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.student_notifications (user_id, type, actor_user_id, connection_id)
  values (new.recipient_user_id, 'connection_request', new.requester_user_id, new.id)
  on conflict do nothing;
  return new;
end;
$$;

create or replace function public.notify_connection_accepted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.student_notifications (user_id, type, actor_user_id, connection_id)
  values (new.requester_user_id, 'connection_accepted', new.recipient_user_id, new.id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists student_notifications_on_request on public.student_connections;
create trigger student_notifications_on_request after insert on public.student_connections
  for each row execute function public.notify_connection_request();

-- The status guard from 005 already limits this to pending -> accepted, and
-- accepted is the only update a recipient can make, so this fires once.
drop trigger if exists student_notifications_on_accept on public.student_connections;
create trigger student_notifications_on_accept after update of status on public.student_connections
  for each row
  when (new.status = 'accepted' and old.status is distinct from 'accepted')
  execute function public.notify_connection_accepted();

-- These are trigger functions: they return `trigger`, so the API can't invoke
-- them even though they live in the exposed schema. They stay unexecutable for
-- anon, and authenticated holds EXECUTE purely to satisfy the pre-15 trigger
-- privilege check.
revoke all on function public.notify_connection_request() from public, anon;
revoke all on function public.notify_connection_accepted() from public, anon;
revoke all on function public.guard_student_notification_read() from public, anon;
grant execute on function public.notify_connection_request() to authenticated;
grant execute on function public.notify_connection_accepted() to authenticated;
grant execute on function public.guard_student_notification_read() to authenticated;

-- No INSERT, no DELETE, no broad UPDATE — anonymous access is closed at the
-- privilege layer as well as through RLS.
revoke all on public.student_notifications from anon;
grant select on public.student_notifications to authenticated;
grant update (read_at) on public.student_notifications to authenticated;
