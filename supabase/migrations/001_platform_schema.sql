-- DU Science Hub Phase 2 backend foundation.
-- The connected Supabase project was inspected before this migration was written:
-- no application tables or prior Supabase migrations were present.
-- This migration intentionally inserts no content.

create extension if not exists "pgcrypto";

create table if not exists public.colleges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_description text,
  campus text not null default '',
  location text not null default '',
  categories text[] not null default '{}',
  popular_courses text[] not null default '{}',
  college_type text not null default '',
  hero_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.college_reviews (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  rating integer not null check (rating between 1 and 5),
  review text not null check (char_length(trim(review)) between 10 and 3000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  youtube_url text,
  thumbnail_url text,
  category text not null check (category in (
    'college_review',
    'campus_tour',
    'student_interview',
    'podcast',
    'cuet_guidance',
    'campus_story'
  )),
  college_id uuid references public.colleges(id) on delete set null,
  description text,
  duration text,
  featured boolean not null default false,
  active boolean not null default false,
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mentors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_url text,
  college text,
  course text,
  year text,
  designation text,
  bio text,
  expertise text,
  contact_url text,
  active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_url text,
  role text,
  college text,
  course text,
  short_bio text,
  linkedin_url text,
  active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_roles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  short_description text not null default '',
  full_description text not null default '',
  responsibilities text[] not null default '{}',
  requirements text[] not null default '{}',
  benefits text[] not null default '{}',
  work_mode text,
  duration text,
  google_form_url text,
  is_open boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organization text not null,
  category text not null check (category in (
    'internship',
    'competition',
    'research',
    'certification',
    'job',
    'fellowship',
    'scholarship'
  )),
  description text not null,
  eligibility text,
  field text,
  eligible_courses text[] not null default '{}',
  location text,
  mode text,
  stipend text,
  duration text,
  deadline date,
  application_url text,
  image_url text,
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'closed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role = 'admin'),
  created_at timestamptz not null default now()
);

create table if not exists public.general_applications (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  cv_path text not null,
  status text not null default 'new' check (status in ('new', 'reviewed', 'archived')),
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid() and role = 'admin'
  );
$$;

drop trigger if exists colleges_set_updated_at on public.colleges;
create trigger colleges_set_updated_at before update on public.colleges
for each row execute function public.set_updated_at();
drop trigger if exists college_reviews_set_updated_at on public.college_reviews;
create trigger college_reviews_set_updated_at before update on public.college_reviews
for each row execute function public.set_updated_at();
drop trigger if exists videos_set_updated_at on public.videos;
create trigger videos_set_updated_at before update on public.videos
for each row execute function public.set_updated_at();
drop trigger if exists mentors_set_updated_at on public.mentors;
create trigger mentors_set_updated_at before update on public.mentors
for each row execute function public.set_updated_at();
drop trigger if exists team_members_set_updated_at on public.team_members;
create trigger team_members_set_updated_at before update on public.team_members
for each row execute function public.set_updated_at();
drop trigger if exists team_roles_set_updated_at on public.team_roles;
create trigger team_roles_set_updated_at before update on public.team_roles
for each row execute function public.set_updated_at();
drop trigger if exists opportunities_set_updated_at on public.opportunities;
create trigger opportunities_set_updated_at before update on public.opportunities
for each row execute function public.set_updated_at();

create index if not exists colleges_name_idx on public.colleges (name);
create index if not exists college_reviews_college_id_idx on public.college_reviews (college_id);
create index if not exists college_reviews_status_idx on public.college_reviews (status);
create index if not exists college_reviews_created_at_idx on public.college_reviews (created_at desc);
create index if not exists videos_college_id_idx on public.videos (college_id);
create index if not exists videos_category_idx on public.videos (category);
create index if not exists videos_active_idx on public.videos (active);
create index if not exists mentors_active_sort_order_idx on public.mentors (active, sort_order);
create index if not exists team_members_active_sort_order_idx on public.team_members (active, sort_order);
create index if not exists team_roles_is_open_idx on public.team_roles (is_open);
create index if not exists opportunities_category_idx on public.opportunities (category);
create index if not exists opportunities_status_idx on public.opportunities (status);
create index if not exists opportunities_deadline_idx on public.opportunities (deadline);

alter table public.colleges enable row level security;
alter table public.college_reviews enable row level security;
alter table public.videos enable row level security;
alter table public.mentors enable row level security;
alter table public.team_members enable row level security;
alter table public.team_roles enable row level security;
alter table public.opportunities enable row level security;
alter table public.admin_users enable row level security;
alter table public.general_applications enable row level security;

create policy "Public can read colleges"
  on public.colleges for select to anon, authenticated
  using (true);

create policy "Public can read approved reviews"
  on public.college_reviews for select to anon, authenticated
  using (status = 'approved' or public.is_admin());

create policy "Anyone can submit pending reviews"
  on public.college_reviews for insert to anon, authenticated
  with check (status = 'pending');

create policy "Admins manage reviews"
  on public.college_reviews for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Public can read active videos"
  on public.videos for select to anon, authenticated
  using (active = true or public.is_admin());

create policy "Public can read active mentors"
  on public.mentors for select to anon, authenticated
  using (active = true or public.is_admin());

create policy "Public can read active team members"
  on public.team_members for select to anon, authenticated
  using (active = true or public.is_admin());

create policy "Public can read open team roles"
  on public.team_roles for select to anon, authenticated
  using (is_open = true or public.is_admin());

create policy "Public can read published opportunities"
  on public.opportunities for select to anon, authenticated
  using (status = 'published' or public.is_admin());

create policy "Admins manage colleges"
  on public.colleges for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins manage videos"
  on public.videos for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins manage mentors"
  on public.mentors for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins manage team members"
  on public.team_members for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins manage team roles"
  on public.team_roles for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins manage opportunities"
  on public.opportunities for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Users can read their admin mapping"
  on public.admin_users for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "Admins can read applications"
  on public.general_applications for select to authenticated
  using (public.is_admin());

create policy "Admins can update application status"
  on public.general_applications for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('general-applications', 'general-applications', false)
on conflict (id) do nothing;

create policy "Admins can read private application CVs"
  on storage.objects for select to authenticated
  using (bucket_id = 'general-applications' and public.is_admin());

create policy "Admins can manage private application CVs"
  on storage.objects for all to authenticated
  using (bucket_id = 'general-applications' and public.is_admin())
  with check (bucket_id = 'general-applications' and public.is_admin());
