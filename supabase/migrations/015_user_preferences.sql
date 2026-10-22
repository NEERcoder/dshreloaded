-- 015_user_preferences.sql
-- Part 3: owner-scoped filter and sort preferences.
--
-- Why a table at all: a signed-in student who arranges the Internships feed the
-- way they like should get the same view on a second device, and the same view
-- must never leak into whoever else uses this browser. Neither of those is
-- possible from localStorage, and `public.profiles` cannot hold them: policy
-- 002 "Authenticated users can read profiles" grants every signed-in student
-- select on every profile row with `using (true)`, so any column added there is
-- public to all students by construction. A dedicated table keyed on the auth
-- uid is the smallest structure that can be private by default.
--
-- Security posture:
--   * RLS enabled, with owner-only select / insert / update. No delete policy:
--     the row is removed by the `on delete cascade` when the account goes.
--   * `to authenticated` on every policy, and `revoke ... from anon`, so an
--     anonymous visitor has no read or write path at any point.
--   * The value is an unvalidated jsonb object on purpose. Its shape is defined
--     and enforced in the application (`src/lib/opportunityFilters.ts`
--     `sanitizeFilters`), which is the only reader, and a preference can never
--     grant access to anything — it only chooses filters over rows the same user
--     could already see. The CHECK keeps the column an object so a stray scalar
--     or array cannot be written.
--
-- NOT APPLIED. This file is prepared for review; nothing here has been run
-- against any database. The app degrades to browser storage until it is applied,
-- and `src/lib/dataAccess.ts` caches that verdict for the session.

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_filters_is_object check (jsonb_typeof(filters) = 'object')
);

comment on table public.user_preferences is
  'Per-student UI preferences (opportunity filters and sort). Owner-only read and write; never joined into any public projection and never a security input.';
comment on column public.user_preferences.filters is
  'Opaque object validated by the client. Empty object means "no saved choice", which is distinct from a row that does not exist.';

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at before update on public.user_preferences
  for each row execute function public.set_updated_at();

alter table public.user_preferences enable row level security;

-- The owner reads their own row. Nothing else can.
drop policy if exists "Students read their own preferences" on public.user_preferences;
create policy "Students read their own preferences"
  on public.user_preferences for select to authenticated
  using (user_id = auth.uid());

-- The owner creates their own row. `user_id` must equal the caller, so a
-- request cannot mint a row for somebody else.
drop policy if exists "Students create their own preferences" on public.user_preferences;
create policy "Students create their own preferences"
  on public.user_preferences for insert to authenticated
  with check (user_id = auth.uid());

-- The owner updates their own row, and cannot move it to somebody else.
drop policy if exists "Students update their own preferences" on public.user_preferences;
create policy "Students update their own preferences"
  on public.user_preferences for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.user_preferences from anon;
grant select on public.user_preferences to authenticated;
grant insert, update on public.user_preferences to authenticated;
