-- 009_pulse_posts.sql
-- Task 10: PULSE editorial CMS.
--
-- PULSE has no content table at all today — the page assembles itself from
-- videos and opportunities, and its headlines are written in the frontend.
-- Admins need authored posts with a publish switch, so this adds the table the
-- feature was always missing.
--
-- Security posture:
--   * RLS enabled. Only public.admin_users members (via public.is_admin())
--     may write, matching every other admin policy in this schema.
--   * Anonymous and signed-in readers see published rows ONLY: a draft never
--     leaves the database, so "unpublished" is enforced by the policy rather
--     than by a filter in the app.

create table if not exists public.pulse_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 180),
  summary text not null default '' check (char_length(summary) <= 500),
  content text not null default '',
  category text not null default 'announcement' check (category in (
    'announcement',
    'campus_story',
    'opportunity_alert',
    'results',
    'interview',
    'guide'
  )),
  image_url text check (image_url is null or image_url ~ '^https?://'),
  external_url text check (external_url is null or external_url ~ '^https?://'),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  author_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.pulse_posts is
  'Admin-authored PULSE feed. Homepage and /pulse both read this, published rows only.';
comment on column public.pulse_posts.published_at is
  'Set when a post is first published; ordering key for the public feed.';

create index if not exists pulse_posts_published_idx
  on public.pulse_posts (published_at desc)
  where status = 'published';

create index if not exists pulse_posts_status_idx on public.pulse_posts (status);

drop trigger if exists pulse_posts_set_updated_at on public.pulse_posts;
create trigger pulse_posts_set_updated_at before update on public.pulse_posts
  for each row execute function public.set_updated_at();

alter table public.pulse_posts enable row level security;

drop policy if exists "Public can read published pulse posts" on public.pulse_posts;
create policy "Public can read published pulse posts"
  on public.pulse_posts for select to anon, authenticated
  using (status = 'published');

drop policy if exists "Admins manage pulse posts" on public.pulse_posts;
create policy "Admins manage pulse posts"
  on public.pulse_posts for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.pulse_posts to anon, authenticated;
grant insert, update, delete on public.pulse_posts to authenticated;

-- Keep created_at/updated_at honest for the admin form's optimistic rows.
alter table public.pulse_posts alter column created_at set default now();
alter table public.pulse_posts alter column updated_at set default now();

-- ---------------------------------------------------------------------------
-- Cover images: admin-uploaded, publicly readable (same shape as 002 buckets)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('pulse-media', 'pulse-media', true)
  on conflict (id) do nothing;

drop policy if exists "Admins can upload pulse media" on storage.objects;
create policy "Admins can upload pulse media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'pulse-media' and public.is_admin());

drop policy if exists "Admins can update pulse media" on storage.objects;
create policy "Admins can update pulse media"
  on storage.objects for update to authenticated
  using (bucket_id = 'pulse-media' and public.is_admin());

drop policy if exists "Admins can delete pulse media" on storage.objects;
create policy "Admins can delete pulse media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'pulse-media' and public.is_admin());

drop policy if exists "Public can view pulse media" on storage.objects;
create policy "Public can view pulse media"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'pulse-media');
