-- 019_student_skills_and_experience.sql
--
-- STATUS: PROPOSED — NOT APPLIED. Review first.
--
-- WHY THIS EXISTS
-- The CIRCLE reference sheet gives the student two adders — "Add skills" and
-- "+ Add experience" — and the profile card shows skill chips. Neither has
-- anywhere to live:
--
--   * public.profiles has no skills or experience column (001, 007, 011, 014).
--   * public.student_records (008) accepts exactly ten categories —
--     internship, achievement, competition, project, certification, leadership,
--     research, fellowship, scholarship, other. Widening that CHECK list is a
--     constraint rewrite on a populated table, not an addition, and it would
--     change how every existing reader of `category` behaves.
--
-- So these two tables are the smallest honest shape: new tables, owner-scoped
-- exactly like student_records, nothing existing touched.
--
-- WHAT BREAKS IF YOU SKIP IT
-- Nothing. The CIRCLE Mark column says plainly that skills and work history have
-- no column yet and points the student at MARK categories that do exist. No form
-- pretends to save.
--
-- SECURITY POSTURE (mirrors 008_student_records.sql)
--   * Owner reads, writes, updates and deletes their own rows only.
--   * A skill or entry is public only when BOTH the row says is_public AND the
--     owner's profile is public — the same two-key rule 008 uses, so opting out
--     of CIRCLE cannot leak a record.
--   * Admins may read for moderation, and may not write: an admin must never be
--     able to author a student's achievements. 021 covers the moderation path.

-- ---------------------------------------------------------------------------
-- Skills
-- ---------------------------------------------------------------------------
create table if not exists public.student_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  -- Endorsement is a separate question from existence. 'self' is what a student
  -- typing their own skill means; nothing here claims a second person agreed.
  source text not null default 'self' check (source in ('self', 'verified')),
  is_public boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_skills_one_per_name unique (user_id, lower(name))
);

comment on table public.student_skills is
  'Skills a student lists on their own profile. Owner-written; public only when the profile is public.';
comment on column public.student_skills.source is
  'self = typed by the student, verified = attested by someone else. Nothing in the app can set verified today.';

create index if not exists student_skills_user_idx on public.student_skills (user_id, position);

drop trigger if exists student_skills_set_updated_at on public.student_skills;
create trigger student_skills_set_updated_at before update on public.student_skills
  for each row execute function public.set_updated_at();

alter table public.student_skills enable row level security;

drop policy if exists "Students can read their own skills" on public.student_skills;
create policy "Students can read their own skills"
  on public.student_skills for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Students can create their own skills" on public.student_skills;
create policy "Students can create their own skills"
  on public.student_skills for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Students can update their own skills" on public.student_skills;
create policy "Students can update their own skills"
  on public.student_skills for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Students can delete their own skills" on public.student_skills;
create policy "Students can delete their own skills"
  on public.student_skills for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "Anyone can read public skills of public profiles" on public.student_skills;
create policy "Anyone can read public skills of public profiles"
  on public.student_skills for select to anon, authenticated
  using (
    is_public = true
    and exists (
      select 1 from public.profiles p
      where p.user_id = student_skills.user_id and p.is_public = true
    )
  );

drop policy if exists "Admins can read all skills" on public.student_skills;
create policy "Admins can read all skills"
  on public.student_skills for select to authenticated
  using (public.is_admin());

grant select on public.student_skills to anon, authenticated;
grant insert, update, delete on public.student_skills to authenticated;

-- ---------------------------------------------------------------------------
-- Experience
-- ---------------------------------------------------------------------------
create table if not exists public.student_experience (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (char_length(trim(role)) between 1 and 120),
  organization text not null default '' check (char_length(organization) <= 160),
  -- Free text, because "Jan 2025 – present" is what a student actually has.
  period text,
  start_month text,
  end_month text,
  location text,
  description text not null default '',
  is_current boolean not null default false,
  is_public boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.student_experience is
  'Work experience and internships a student lists themselves. Distinct from student_records, which is the MARK evidence trail.';
comment on column public.student_experience.period is
  'Display text. start_month/end_month hold the machine-readable pair when the student gives one.';

create index if not exists student_experience_user_idx
  on public.student_experience (user_id, position);

drop trigger if exists student_experience_set_updated_at on public.student_experience;
create trigger student_experience_set_updated_at before update on public.student_experience
  for each row execute function public.set_updated_at();

alter table public.student_experience enable row level security;

drop policy if exists "Students can read their own experience" on public.student_experience;
create policy "Students can read their own experience"
  on public.student_experience for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Students can create their own experience" on public.student_experience;
create policy "Students can create their own experience"
  on public.student_experience for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Students can update their own experience" on public.student_experience;
create policy "Students can update their own experience"
  on public.student_experience for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Students can delete their own experience" on public.student_experience;
create policy "Students can delete their own experience"
  on public.student_experience for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "Anyone can read public experience of public profiles" on public.student_experience;
create policy "Anyone can read public experience of public profiles"
  on public.student_experience for select to anon, authenticated
  using (
    is_public = true
    and exists (
      select 1 from public.profiles p
      where p.user_id = student_experience.user_id and p.is_public = true
    )
  );

drop policy if exists "Admins can read all experience" on public.student_experience;
create policy "Admins can read all experience"
  on public.student_experience for select to authenticated
  using (public.is_admin());

grant select on public.student_experience to anon, authenticated;
grant insert, update, delete on public.student_experience to authenticated;
