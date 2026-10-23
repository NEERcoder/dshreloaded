-- 017_college_events.sql
--
-- STATUS: PROPOSED — NOT APPLIED. No migration in this file set has been run
-- against any database. Review, then apply by hand if approved.
--
-- WHY THIS EXISTS
-- /events is a real page in the redesign, and its reference card needs four
-- things no existing table carries: a start AND end instant (an opportunity has
-- one `deadline` and one optional `start_at`, both of which mean something else),
-- a venue beside a city, a ticket price with a ticket URL, and a date on which
-- registration closes. Bending a competition row into an event would mean
-- redefining what `deadline` means for every other reader of that column, which
-- is the opposite of additive.
--
-- `opportunities.category` has a CHECK constraint listing seven values, so
-- adding an eighth "event" value would be a constraint rewrite — a change to an
-- existing table's rules, not an addition. A new table avoids that entirely.
--
-- WHAT BREAKS IF YOU SKIP IT
-- Nothing. `getPublishedEvents()` in src/lib/eventsAccess.ts reports
-- `unavailable` when the table is absent, /events renders its honest empty
-- state, and the admin Events panel says the table is not applied. Applying this
-- turns both on with no code change.
--
-- SECURITY POSTURE (mirrors 009_pulse_posts.sql)
--   * RLS enabled. Only public.admin_users members (via public.is_admin()) write.
--   * Anonymous and signed-in readers see published rows ONLY, so "draft" is
--     enforced by the policy rather than by a filter in the app.
--   * Nothing here touches an existing table, policy, constraint or grant.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 180),
  organizer text not null check (char_length(trim(organizer)) between 1 and 160),
  description text not null default '',

  -- Free text on purpose: an event taxonomy is not decided yet, and a CHECK
  -- list written now would need a migration for every new kind of event.
  category text,
  venue text,
  city text,
  -- 'Online' | 'In person' | 'Hybrid' in practice; unchecked so an organiser's
  -- own wording is never silently rejected.
  mode text,

  starts_at timestamptz,
  ends_at timestamptz,
  registration_deadline date,

  -- `ticket_price` is display text, exactly like opportunities.stipend: "Free",
  -- "₹250", "₹250 / team". A number column would invite comparisons nothing can
  -- support yet; 018 shows the shape one would take.
  ticket_price text,
  ticket_url text check (ticket_url is null or ticket_url ~ '^https?://'),
  eligibility text,
  image_url text check (image_url is null or image_url ~ '^https?://'),

  status text not null default 'draft'
    check (status in ('draft', 'published', 'closed', 'archived')),
  featured boolean not null default false,

  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- An event that ends before it starts is a typo, and it would render as a
  -- backwards date range on the card.
  constraint events_end_after_start
    check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

comment on table public.events is
  'College events for /events. Published rows only reach students.';
comment on column public.events.ticket_price is
  'Organiser-typed display text, not a number. Never rendered as "Free" unless it says so.';
comment on column public.events.featured is
  'Drives the Trending chip on /events. It is an editor flag, not a popularity metric.';

create index if not exists events_published_starts_at_idx
  on public.events (starts_at asc nulls last)
  where status = 'published';

create index if not exists events_status_idx on public.events (status);
create index if not exists events_city_idx on public.events (city) where city is not null;

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;

drop policy if exists "Public can read published events" on public.events;
create policy "Public can read published events"
  on public.events for select to anon, authenticated
  using (status = 'published');

drop policy if exists "Admins manage events" on public.events;
create policy "Admins manage events"
  on public.events for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
