-- 008_student_records.sql
-- Task 9: external student records for MARK.
--
-- MARK currently derives everything from competition team memberships, so a
-- student cannot document an internship, a project or a certification at all.
-- This is a dedicated table rather than more columns on profiles: a student
-- holds many records, each with its own visibility, and profiles rows are
-- already projected by migration 002/007 policies.
--
-- Security posture:
--   * RLS enabled, owner does all CRUD.
--   * Anonymous visitors reach records ONLY through public SELECT on
--     is_public = true rows belonging to a profile that is itself public
--     (migration 007), so a private profile can never leak its achievements.
--   * Admins get read only, matching how the rest of the schema treats
--     moderation. No one else may write another student's rows.

create table if not exists public.student_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null check (category in (
    'internship',
    'achievement',
    'competition',
    'project',
    'certification',
    'leadership',
    'research',
    'fellowship',
    'scholarship',
    'other'
  )),
  title text not null check (char_length(trim(title)) between 1 and 160),
  organization text not null default '' check (char_length(trim(organization)) <= 160),
  description text check (description is null or char_length(description) <= 2000),
  year integer not null check (year between 1990 and 2200),
  proof_url text check (proof_url is null or proof_url ~ '^https?://'),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.student_records is
  'Student-authored external accomplishments shown on MARK and, when public, on the CIRCLE profile.';
comment on column public.student_records.proof_url is
  'Optional public link supplied by the owner. Never used as a verification signal.';

create index if not exists student_records_user_idx
  on public.student_records (user_id, year desc);

create index if not exists student_records_public_idx
  on public.student_records (user_id)
  where is_public = true;

drop trigger if exists student_records_set_updated_at on public.student_records;
create trigger student_records_set_updated_at before update on public.student_records
  for each row execute function public.set_updated_at();

alter table public.student_records enable row level security;

-- Owner: full control of their own rows.
drop policy if exists "Students can read their own records" on public.student_records;
create policy "Students can read their own records"
  on public.student_records for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Students can create their own records" on public.student_records;
create policy "Students can create their own records"
  on public.student_records for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Students can update their own records" on public.student_records;
create policy "Students can update their own records"
  on public.student_records for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Students can delete their own records" on public.student_records;
create policy "Students can delete their own records"
  on public.student_records for delete to authenticated
  using (user_id = auth.uid());

-- Readers: the public projection. Applies to every role, including the owner,
-- and is unioned with the owner policy above.
drop policy if exists "Anyone can read public records of public profiles" on public.student_records;
create policy "Anyone can read public records of public profiles"
  on public.student_records for select to anon, authenticated
  using (
    is_public = true
    and exists (
      select 1 from public.profiles pr
      where pr.user_id = student_records.user_id
        and pr.is_public = true
    )
  );

-- Moderation: read only, same gate every other admin policy in this schema uses.
drop policy if exists "Admins can read all student records" on public.student_records;
create policy "Admins can read all student records"
  on public.student_records for select to authenticated
  using (public.is_admin());

grant select on public.student_records to anon, authenticated;
grant insert, update, delete on public.student_records to authenticated;
