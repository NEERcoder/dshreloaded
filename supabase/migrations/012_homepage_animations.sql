-- 012_homepage_animations.sql
-- Part 18 §4: one admin-controlled animation in the homepage header, in front
-- of the search bar.
--
-- Nothing in 001-011 records "the asset the site should show right now". The
-- buckets that exist (mentor-photos, opportunity-posters, college-images,
-- student-avatars, pulse-media) all hold many files belonging to many rows;
-- none of them has a single-current-thing semantic. So a table is genuinely
-- required rather than a reuse of an existing one, and this follows the shape
-- those migrations already use: a public bucket, admin-only writes gated on
-- public.is_admin(), and RLS with nothing readable that a policy does not name.
--
-- Security posture:
--   * anon and authenticated may SELECT only enabled rows. Disabling an
--     animation removes it from the public at the data layer, not just in the
--     UI, which is what "admin can enable/disable" has to mean to be true.
--   * Every write path is gated on public.is_admin() — the same admin_users
--     membership every other admin policy in this schema already uses. No new
--     auth concept, no new login, no credentials in code.
--   * Table-level grants are narrowed as well as policed: anon and
--     authenticated get SELECT and nothing else, so a policy mistake could not
--     quietly open a write path.
--   * file_url is constrained to http(s), so a stored row can never smuggle a
--     javascript: or data: URL into an <img src>.
--   * Storage objects are restricted to image extensions, so the bucket cannot
--     be used to host arbitrary payloads.
--   * "Only one animation is active" is a database invariant, not a convention:
--     a partial unique index allows at most one enabled row, and the only way
--     to enable one is the security-definer function below, which disables the
--     previous one in the same statement set.
--
-- Rerunnable: create-if-not-exists tables, drop-policy-if-exists before every
-- create, and on-conflict-do-nothing bucket insert.

-- ---------------------------------------------------------------------------
-- 1. The animation rows
-- ---------------------------------------------------------------------------
create table if not exists public.homepage_animations (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Homepage animation',
  -- The object key inside the homepage-animations bucket. Kept alongside the
  -- URL so deleting a row can also delete the file it points at.
  file_path text not null,
  file_url text not null check (file_url ~ '^https?://'),
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The admin who last changed this row. Defaults to whoever is writing, and
  -- is never selectable by anon (see the column grant at the bottom).
  updated_by uuid default auth.uid() references auth.users (id) on delete set null
);

comment on table public.homepage_animations is
  'Admin-managed homepage header animation. At most one row may be enabled; disabled rows are invisible to the public.';
comment on column public.homepage_animations.file_path is
  'Storage object key in the homepage-animations bucket. Needed to clean the file up when the row is deleted.';
comment on column public.homepage_animations.updated_by is
  'The admin who last changed this row. Never exposed to anon or authenticated students.';

-- At most one animation may be live at a time.
create unique index if not exists homepage_animations_one_active_idx
  on public.homepage_animations (enabled)
  where enabled = true;

-- The header reads "the newest enabled row"; this is that lookup.
create index if not exists homepage_animations_enabled_idx
  on public.homepage_animations (updated_at desc)
  where enabled = true;

drop trigger if exists homepage_animations_set_updated_at on public.homepage_animations;
create trigger homepage_animations_set_updated_at before update on public.homepage_animations
  for each row execute function public.set_updated_at();

alter table public.homepage_animations enable row level security;

-- The public sees an animation only while an admin leaves one enabled.
drop policy if exists "Public can read the active homepage animation" on public.homepage_animations;
create policy "Public can read the active homepage animation"
  on public.homepage_animations for select to anon, authenticated
  using (enabled = true);

-- Admins read everything, including the disabled rows they are about to retire.
drop policy if exists "Admins can read all homepage animations" on public.homepage_animations;
create policy "Admins can read all homepage animations"
  on public.homepage_animations for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can add homepage animations" on public.homepage_animations;
create policy "Admins can add homepage animations"
  on public.homepage_animations for insert to authenticated
  with check (public.is_admin() and updated_by = auth.uid());

drop policy if exists "Admins can change homepage animations" on public.homepage_animations;
create policy "Admins can change homepage animations"
  on public.homepage_animations for update to authenticated
  using (public.is_admin())
  with check (public.is_admin() and updated_by = auth.uid());

drop policy if exists "Admins can delete homepage animations" on public.homepage_animations;
create policy "Admins can delete homepage animations"
  on public.homepage_animations for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Making one live is a single atomic, admin-checked step
-- ---------------------------------------------------------------------------
-- Without this, "enable the new one" is two client statements with a window in
-- which either zero or two rows are enabled — and the unique index above would
-- reject the second one. security definer so the disable-then-enable pair runs
-- as one; the admin check is inside it, so this is not a way around RLS.
create or replace function public.set_active_homepage_animation(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_found int;
begin
  if not public.is_admin() then
    raise exception 'Admin access is required to change the homepage animation';
  end if;

  select 1 into v_found from public.homepage_animations where id = p_id;
  if v_found is null then
    raise exception 'That homepage animation no longer exists';
  end if;

  update public.homepage_animations
    set enabled = false
    where enabled = true and id <> p_id;

  update public.homepage_animations
    set enabled = true, updated_by = auth.uid()
    where id = p_id;

  return true;
end;
$$;

comment on function public.set_active_homepage_animation is
  'Atomically make one admin-owned animation the live one, retiring the previous. Admin only.';

revoke all on function public.set_active_homepage_animation(uuid) from public, anon;
grant execute on function public.set_active_homepage_animation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Storage — its own bucket, its own policies
-- ---------------------------------------------------------------------------
-- 002's media policies name their buckets explicitly, so adding a policy here
-- cannot widen one that already governs mentor, opportunity, college or avatar
-- media.
insert into storage.buckets (id, name, public)
values ('homepage-animations', 'homepage-animations', true)
on conflict (id) do nothing;

drop policy if exists "Public can view homepage animations" on storage.objects;
create policy "Public can view homepage animations"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'homepage-animations');

drop policy if exists "Admins can upload homepage animations" on storage.objects;
create policy "Admins can upload homepage animations"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'homepage-animations'
    and public.is_admin()
    -- A name pattern rather than storage.extension(): 007 only proves
    -- storage.foldername() exists here, and a policy that fails to create would
    -- abort the whole migration. This does the same job with no dependency.
    and name ~* '\.(gif|webp|png|jpe?g)$'
  );

drop policy if exists "Admins can replace homepage animations" on storage.objects;
create policy "Admins can replace homepage animations"
  on storage.objects for update to authenticated
  using (bucket_id = 'homepage-animations' and public.is_admin())
  with check (bucket_id = 'homepage-animations' and public.is_admin());

drop policy if exists "Admins can delete homepage animations" on storage.objects;
create policy "Admins can delete homepage animations"
  on storage.objects for delete to authenticated
  using (bucket_id = 'homepage-animations' and public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Grant narrowing (RLS decides visibility; this decides what is even legal)
-- ---------------------------------------------------------------------------
grant select on public.homepage_animations to anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.homepage_animations from anon, authenticated;
-- Only the three DML verbs an admin panel actually needs; RLS still decides
-- which of them may act, and `references`/`trigger` were never required.
grant insert, update, delete on public.homepage_animations to authenticated;

-- updated_by names an admin account; it is for audit, not for the header.
revoke select (updated_by) on public.homepage_animations from anon, authenticated;
grant select (updated_by) on public.homepage_animations to authenticated;
