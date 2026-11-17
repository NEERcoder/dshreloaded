-- =====================================================================
-- 022_push_subscriptions.sql
-- =====================================================================
-- Firebase Cloud Messaging push delivery: device tokens, per-student push
-- preferences, and a server-only delivery ledger. Requires 001 (auth.users
-- reference + public.set_updated_at()).
--
-- NOT APPLIED to production yet. The client degrades gracefully until this
-- migration and the send-push-notification Edge Function are deployed:
-- registration reports "not enabled on the server yet" and nothing else in
-- the app changes. This file is deliberately isolated from the pending
-- security-review proposals (supabase/security-review/023-033); applying it
-- neither requires nor applies any of them.
--
-- Ownership model:
--   * An FCM token identifies a BROWSER, not an account. One row per token
--     (unique), re-pointed at whichever student is signed in on that browser.
--   * A student may hold many rows (many devices). Deleting an account
--     cascades every row it owns; other devices are never touched.
--   * The delivery ledger is readable/writable only by trusted server
--     privileges (the Edge Function's service role, which bypasses RLS).
--     No client role holds any grant on it.

-- ---------------------------------------------------------------------
-- Device subscriptions
-- ---------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  fcm_token text not null unique,
  device_name text,
  device_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

comment on table public.push_subscriptions is
  'One row per browser FCM registration token, owned by the account currently signed in on that browser. Owner-only access; the send-push-notification Edge Function reads tokens with server privileges.';

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

-- A student reads only their own device rows. Tokens are delivery secrets;
-- nobody else's token is ever visible through the API.
drop policy if exists "Students read their own push subscriptions" on public.push_subscriptions;
create policy "Students read their own push subscriptions"
  on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());

-- Registration is always for yourself: the WITH CHECK makes it impossible to
-- mint a row against another student's id, and anon holds no grant at all.
drop policy if exists "Students register their own push tokens" on public.push_subscriptions;
create policy "Students register their own push tokens"
  on public.push_subscriptions for insert to authenticated
  with check (user_id = auth.uid());

-- Owner-only updates (device metadata, last_seen_at). Cross-account token
-- claim does NOT go through this policy: PostgreSQL applies the SELECT
-- policy to the existing row during ON CONFLICT DO UPDATE, so an owner-only
-- SELECT makes a client-side claim upsert impossible. The claim is therefore
-- a narrow SECURITY DEFINER RPC below — the one place definer is genuinely
-- necessary, because no RLS shape can express "re-point a row you cannot
-- read" without also exposing other students' tokens.
drop policy if exists "Students claim a browser token for their own account" on public.push_subscriptions;
drop policy if exists "Students update their own push subscriptions" on public.push_subscriptions;
create policy "Students update their own push subscriptions"
  on public.push_subscriptions for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Disabling notifications removes only rows you own.
drop policy if exists "Students remove their own push subscriptions" on public.push_subscriptions;
create policy "Students remove their own push subscriptions"
  on public.push_subscriptions for delete to authenticated
  using (user_id = auth.uid());

-- The upsert may re-write fcm_token to the SAME value (PostgREST includes it
-- in DO UPDATE SET); any actual change is rejected. SECURITY INVOKER, empty
-- search_path — it references nothing outside its own row.
create or replace function public.push_subscriptions_guard_token()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.fcm_token is distinct from old.fcm_token then
    raise exception 'fcm_token identifies a push subscription and cannot be changed'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists push_subscriptions_guard_token on public.push_subscriptions;
create trigger push_subscriptions_guard_token before update on public.push_subscriptions
  for each row execute function public.push_subscriptions_guard_token();

-- Revoke the schema-default ALL first so the column restriction below is the
-- real boundary (Supabase default privileges otherwise grant every column).
revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert, delete on public.push_subscriptions to authenticated;
-- created_at/updated_at stay trigger-managed and unwritable by clients.
grant update (fcm_token, user_id, device_name, device_type, last_seen_at)
  on public.push_subscriptions to authenticated;

-- The token-claim RPC: registers this browser's token for the CALLER, or
-- re-points an existing token row (from a previous account on this browser)
-- at the caller. SECURITY DEFINER is genuinely necessary here — the claim
-- must touch a row the caller cannot SELECT, and no RLS policy shape allows
-- that without exposing every student's token. The function never accepts a
-- user id: ownership always comes from auth.uid(); the token value itself is
-- never changed (the guard trigger enforces that even for the owner).
create or replace function public.claim_push_token(
  p_fcm_token text,
  p_device_name text default null,
  p_device_type text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Sign in to register for push notifications' using errcode = '28000';
  end if;
  if p_fcm_token is null or length(p_fcm_token) < 20 or length(p_fcm_token) > 4096 then
    raise exception 'Invalid push token' using errcode = '22023';
  end if;

  insert into public.push_subscriptions (user_id, fcm_token, device_name, device_type, last_seen_at)
  values (v_uid, p_fcm_token, left(p_device_name, 120), left(p_device_type, 40), now())
  on conflict (fcm_token) do update set
    user_id = excluded.user_id,
    device_name = excluded.device_name,
    device_type = excluded.device_type,
    last_seen_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.claim_push_token(text, text, text) from public, anon;
grant execute on function public.claim_push_token(text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Push preferences (master toggle + the five delivery categories)
-- ---------------------------------------------------------------------
-- A dedicated table rather than user_preferences (015): that row is an
-- opaque filter object sanitized by opportunityFilters, and mixing delivery
-- consent into it would couple two unrelated sanitizers. No row means
-- "everything enabled" — the server treats a missing row as all-true, and a
-- student without a registered token receives nothing regardless.
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  push_enabled boolean not null default true,
  opportunities boolean not null default true,
  connections boolean not null default true,
  teams boolean not null default true,
  competitions boolean not null default true,
  announcements boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.notification_preferences is
  'Per-student push delivery consent. The Edge Function must consult push_enabled and the matching category before every send; a disabled category is never pushed.';

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;

drop policy if exists "Students read their own notification preferences" on public.notification_preferences;
create policy "Students read their own notification preferences"
  on public.notification_preferences for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Students create their own notification preferences" on public.notification_preferences;
create policy "Students create their own notification preferences"
  on public.notification_preferences for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Students update their own notification preferences" on public.notification_preferences;
create policy "Students update their own notification preferences"
  on public.notification_preferences for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.notification_preferences from anon, authenticated;
grant select, insert, update on public.notification_preferences to authenticated;

-- ---------------------------------------------------------------------
-- Delivery ledger (server-only)
-- ---------------------------------------------------------------------
-- One row per (event, token) attempt. The unique pair is the duplicate-send
-- guard: the Edge Function inserts BEFORE sending and skips on conflict, so
-- a retried event can never push twice to the same device. initiated_by +
-- created_at back the per-caller rate limit. No policy and no grant for any
-- client role: only the service role (bypasses RLS) ever touches this table.
create table if not exists public.push_delivery_log (
  id uuid primary key default gen_random_uuid(),
  delivery_key text not null,
  fcm_token text not null,
  user_id uuid references auth.users (id) on delete cascade,
  initiated_by uuid references auth.users (id) on delete set null,
  status text not null check (status in ('sent', 'failed', 'skipped', 'stale_removed')),
  error_code text,
  created_at timestamptz not null default now(),
  constraint push_delivery_log_event_token_unique unique (delivery_key, fcm_token)
);

create index if not exists push_delivery_log_created_idx
  on public.push_delivery_log (created_at desc);
create index if not exists push_delivery_log_initiator_idx
  on public.push_delivery_log (initiated_by, created_at desc);

alter table public.push_delivery_log enable row level security;

revoke all on public.push_delivery_log from anon, authenticated;