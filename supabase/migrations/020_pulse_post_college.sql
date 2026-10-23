-- 020_pulse_post_college.sql
--
-- STATUS: PROPOSED — NOT APPLIED. Review first.
--
-- WHY THIS EXISTS
-- The PULSE reference sheet filters news by campus: a "Campus" rail with a
-- college search and a Popular list (IIT Delhi, DU, BITS Pilani). `pulse_posts`
-- (009) has no college column at all, so that rail cannot be built honestly —
-- the redesign ships topic filters only, which are real (`category`), and leaves
-- the campus rail out rather than guess which college a story belongs to from its
-- prose.
--
-- One nullable FK is the whole change. Existing posts keep working: a NULL
-- college_id means "not tied to a campus", which is a real and common case
-- (national announcements), and the rail would simply not list them.
--
-- WHAT BREAKS IF YOU SKIP IT
-- Nothing. /pulse has no campus filter, and says nothing about one.
--
-- NO POLICY CHANGE. RLS on pulse_posts is untouched: a post is readable exactly
-- when it is published, whether or not it names a college.

alter table public.pulse_posts
  add column if not exists college_id uuid
  references public.colleges (id) on delete set null;

comment on column public.pulse_posts.college_id is
  'The college a story is about, when there is one. NULL means national or campus-independent, not unknown.';

create index if not exists pulse_posts_college_idx
  on public.pulse_posts (college_id)
  where college_id is not null;
