-- =====================================================================
-- 005_student_connections.sql
-- =====================================================================
-- PART 8 — student-to-student connections inside CIRCLE.
--
-- MODEL: one row per PAIR of students, never one row per direction. A row
-- starts life as the requester's pending request and becomes the accepted
-- connection in place, so a pair cannot hold two relationships at once.
-- Rejecting, cancelling and removing all delete the row — there is no
-- stored "rejected" history for anyone to read.
--
-- Requires 001 (public.set_updated_at) and the auth.users setup from 002.

create table if not exists public.student_connections (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users (id) on delete cascade,
  recipient_user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_connections_no_self_request check (requester_user_id <> recipient_user_id)
);

-- Canonical-pair uniqueness. least/greatest collapse the two directions, so
-- this single index enforces: no duplicate pair, no duplicate pending
-- request, no second accepted connection, and B→A can never sit alongside
-- A→B. Deleting a row on auth-user removal is handled by the FKs above.
create unique index if not exists student_connections_pair_unique
  on public.student_connections (
    least(requester_user_id, recipient_user_id),
    greatest(requester_user_id, recipient_user_id)
  );

-- Both inboxes are read constantly (received requests, sent requests,
-- accepted connections), and each filters on status.
create index if not exists student_connections_recipient_status_idx
  on public.student_connections (recipient_user_id, status);

create index if not exists student_connections_requester_status_idx
  on public.student_connections (requester_user_id, status);

alter table public.student_connections enable row level security;

drop trigger if exists student_connections_set_updated_at on public.student_connections;
create trigger student_connections_set_updated_at before update on public.student_connections
  for each row execute function public.set_updated_at();

-- A connection moves in exactly one direction: pending -> accepted. Row
-- security can compare the new values but never the old ones, so the legal
-- transition is enforced here instead. This blocks a recipient from
-- re-processing a connection or reopening an accepted one.
create or replace function public.guard_student_connection_status()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status
     and (old.status <> 'pending' or new.status <> 'accepted') then
    raise 'a student connection can only move from pending to accepted'
      using hint = 'Reject or remove the request instead of changing its status.';
  end if;
  return new;
end;
$$;

drop trigger if exists student_connections_guard_status on public.student_connections;
create trigger student_connections_guard_status before update on public.student_connections
  for each row execute function public.guard_student_connection_status();

-- A student sees only rows they are a participant in: their sent requests,
-- their received requests, and their accepted connections. Nobody can read
-- the graph, and anonymous visitors match no row at all.
drop policy if exists "Students read their own connections" on public.student_connections;
create policy "Students read their own connections"
  on public.student_connections for select to authenticated
  using (
    auth.uid() = requester_user_id
    or auth.uid() = recipient_user_id
  );

-- Requests can only be created on your own behalf, never against yourself,
-- and always start as pending.
drop policy if exists "Students can send connection requests" on public.student_connections;
create policy "Students can send connection requests"
  on public.student_connections for insert to authenticated
  with check (
    auth.uid() = requester_user_id
    and auth.uid() <> recipient_user_id
    and status = 'pending'
  );

-- Only the recipient resolves a request, and only by accepting it. The
-- per-column grant below restricts the writable column to `status`, so a
-- recipient cannot rewrite which student sent the request.
drop policy if exists "Recipients can accept their requests" on public.student_connections;
create policy "Recipients can accept their requests"
  on public.student_connections for update to authenticated
  using (auth.uid() = recipient_user_id)
  with check (
    auth.uid() = recipient_user_id
    and status = 'accepted'
  );

-- Either student can end it: the requester cancels a pending request, and
-- anyone drops an accepted connection.
drop policy if exists "Students can remove their connections" on public.student_connections;
create policy "Students can remove their connections"
  on public.student_connections for delete to authenticated
  using (
    auth.uid() = requester_user_id
    or auth.uid() = recipient_user_id
  );

-- Anonymous access is removed at the privilege layer too, rather than
-- relying on RLS alone. `authenticated` gets an explicit per-column UPDATE
-- so the participants' identities in a row are immutable.
revoke all on public.student_connections from anon;
grant select, insert, delete on public.student_connections to authenticated;
grant update (status) on public.student_connections to authenticated;

-- The guard trigger only ever runs as part of an UPDATE, so it isn't callable
-- through the API surface (`revoke ... from public`) while authenticated still
-- satisfies the trigger-function privilege check.
revoke all on function public.guard_student_connection_status() from public, anon;
grant execute on function public.guard_student_connection_status() to authenticated;
