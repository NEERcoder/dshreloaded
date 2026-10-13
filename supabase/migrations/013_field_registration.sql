-- 013_field_registration.sql
-- FIELD 2.0 — competition registration, roster locking, rounds, rewards,
-- organizer contact and the card crop.
--
-- Additive only. Nothing is dropped and no existing column changes type, so
-- every listing, team, membership and join request already in production keeps
-- working. Where an existing table already covers a need (competition_teams,
-- competition_team_members, competition_team_join_requests, student_connections,
-- profile_contacts) this migration extends it rather than adding a parallel one.
--
-- ---------------------------------------------------------------------
-- WHY THE RULES LIVE IN TRIGGERS AND FUNCTIONS, NOT POLICIES
-- ---------------------------------------------------------------------
-- Migration 002 lets a student INSERT their own row into
-- competition_team_members and DELETE it again, and lets a captain INSERT a
-- member. That is the right shape for ownership, but a row policy cannot
-- express "the competition's deadline has not passed", "this team is under its
-- maximum size" or "this student is not already on another team for this
-- competition" — those need to read other rows, which a policy may not do.
--
-- Until now all three were checked in the browser, so any client calling
-- PostgREST directly could register after the deadline, overfill a team, or
-- join two teams for one competition. The guards below move those three rules
-- into the database, where the frontend cannot bypass them and a race cannot
-- slip through, because each one takes a row lock on the team before counting.
--
-- ---------------------------------------------------------------------
-- SECURITY POSTURE
-- ---------------------------------------------------------------------
--   * Registration records hold a participant's name, email and phone. They
--     are never readable by anon, and never readable by a student who is not
--     the participant. Personal contact details are not copied into any table
--     at all — see get_competition_registration_export, which reads them from
--     auth.users and profile_contacts at the moment an admin asks, so the
--     export cannot go stale and there is no second copy of the data to leak.
--   * Every security-definer function sets search_path and revokes EXECUTE
--     from public/anon; the admin-only ones re-check public.is_admin() inside,
--     so they are not a way around RLS.
--   * No service_role key is used anywhere; this is all plain RLS + grants.

-- ---------------------------------------------------------------------------
-- 1. OPPORTUNITY COLUMNS
-- ---------------------------------------------------------------------------
-- `deadline` stays a `date` because existing listings and the admin form
-- already write one, and rewriting history would shift real deadlines. The new
-- `deadline_at` is the precise instant, stored in UTC like every timestamptz,
-- and is what the countdown and every expiry rule use when present.
alter table public.opportunities
  add column if not exists deadline_at timestamptz,
  add column if not exists start_at timestamptz,
  add column if not exists prize_amount numeric check (prize_amount is null or prize_amount >= 0),
  add column if not exists rewards text,
  add column if not exists rounds jsonb not null default '[]'::jsonb,
  add column if not exists poster_crop jsonb,
  add column if not exists organizer_email text,
  add column if not exists organizer_whatsapp text,
  add column if not exists organizer_website text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'opportunities_rounds_is_array'
  ) then
    alter table public.opportunities
      add constraint opportunities_rounds_is_array check (jsonb_typeof(rounds) = 'array');
  end if;

  -- A crop is stored as normalised geometry, never as a rewritten image: the
  -- original poster keeps its own aspect ratio for the detail page, and the
  -- card renders this crop over it. Values are clamped so a bad client cannot
  -- store a crop that shows nothing but sky.
  if not exists (
    select 1 from pg_constraint where conname = 'opportunities_poster_crop_shape'
  ) then
    alter table public.opportunities
      add constraint opportunities_poster_crop_shape check (
        poster_crop is null
        or (
          jsonb_typeof(poster_crop) = 'object'
          -- Each value is type-checked before it is cast. A bare
          -- (poster_crop->>'zoom')::double precision would raise 22P02 on a
          -- client that stored the word "big", and an error inside a check
          -- constraint is a far worse answer than a rejection.
          and jsonb_typeof(poster_crop -> 'zoom') = 'number'
          and (poster_crop->>'zoom')::double precision between 1 and 4
          and jsonb_typeof(poster_crop -> 'x') = 'number'
          and (poster_crop->>'x')::double precision between -1 and 2
          and jsonb_typeof(poster_crop -> 'y') = 'number'
          and (poster_crop->>'y')::double precision between -1 and 2
          -- `ar` is the original poster's own width ÷ height. It is optional
          -- because crops saved before it existed still have to be accepted,
          -- and a card can fall back to a plain cover crop without it.
          and (
            poster_crop ->> 'ar' is null
            or (
              jsonb_typeof(poster_crop -> 'ar') = 'number'
              and (poster_crop->>'ar')::double precision between 0.05 and 20
            )
          )
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'opportunities_team_size_order'
  ) then
    alter table public.opportunities
      add constraint opportunities_team_size_order check (
        min_team_size is null or max_team_size is null or min_team_size <= max_team_size
      ),
      add constraint opportunities_min_team_size_positive check (
        min_team_size is null or min_team_size >= 1
      ),
      add constraint opportunities_max_team_size_positive check (
        max_team_size is null or max_team_size >= 1
      );
  end if;
end $$;

comment on column public.opportunities.deadline_at is
  'Exact registration deadline in UTC. When present it wins over the legacy `deadline` date; see competition_deadline_at().';
comment on column public.opportunities.poster_crop is
  'Normalised {x,y,zoom,ar} describing how the original poster is framed into the 676:451 card. The original image is never modified; `ar` is its own aspect ratio so a card can reproduce the framing at any size.';
comment on column public.opportunities.rewards is
  'Free-text non-monetary rewards, shown alongside prize_amount. Never invented when null.';

-- ---------------------------------------------------------------------------
-- 2. THE ONE SOURCE OF TRUTH FOR "IS THIS COMPETITION STILL OPEN?"
-- ---------------------------------------------------------------------------
-- Two deadline columns and no single answer is exactly how a listing ends up
-- visible in one public feed and hidden in another. `deadline_effective` is a
-- stored generated column that resolves the two once, at write time, so every
-- query — grids, search, Trending, the triggers below — filters on the same
-- value. Both input forms are immutable, which is what makes a generated column
-- legal here.
do $$
begin
  if not exists (
    select 1 from pg_attribute
    where attrelid = 'public.opportunities'::regclass
      and attname = 'deadline_effective'
      and not attisdropped
  ) then
    alter table public.opportunities add column deadline_effective timestamptz generated always as (
      coalesce(
        deadline_at,
        -- `timestamp at time zone zone` reads the timestamp as wall-clock time
        -- in that zone and yields the UTC instant. Doing it this way is what
        -- keeps IST from being applied twice.
        ((deadline::timestamp + interval '23:59:59') at time zone 'Asia/Kolkata')
      )
    ) stored;
  end if;
end $$;

create index if not exists opportunities_deadline_effective_idx
  on public.opportunities (deadline_effective)
  where status = 'published';

comment on column public.opportunities.deadline_effective is
  'The registration deadline as a UTC instant: deadline_at, else the legacy date at 23:59:59 Asia/Kolkata. Null means no deadline, which is open, not expired.';

create or replace function public.competition_deadline_at(p_opportunity_id uuid)
returns timestamptz
language sql
stable
set search_path = public
as $$
  select deadline_effective from public.opportunities where id = p_opportunity_id;
$$;

comment on function public.competition_deadline_at is
  'The registration deadline as a UTC instant. Reads the generated column so the function and every query agree by construction.';

create or replace function public.competition_registration_open(p_opportunity_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  -- No deadline is not the same as an expired one: a rolling listing stays
  -- open, and nothing is invented about it.
  select case
    when o.deadline_effective is null then true
    else now() < o.deadline_effective
  end
  from public.opportunities o
  where o.id = p_opportunity_id;
$$;

revoke all on function public.competition_deadline_at(uuid) from public;
revoke all on function public.competition_registration_open(uuid) from public;
grant execute on function public.competition_deadline_at(uuid) to anon, authenticated, service_role;
grant execute on function public.competition_registration_open(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. TEAM MEMBERSHIP GUARDS
-- ---------------------------------------------------------------------------
-- The team row is locked first. Two students racing for the last seat each
-- block on the other's lock and are then re-counted against the same
-- committed state, so exactly one of them gets in.
create or replace function public.guard_competition_team_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team public.competition_teams;
  v_competition public.opportunities;
  v_members int;
  v_other_teams int;
begin
  select * into v_team from public.competition_teams where id = coalesce(new.team_id, old.team_id) for update;
  if not found then
    raise exception 'Team no longer exists';
  end if;

  select * into v_competition from public.opportunities where id = v_team.competition_id;
  if not found then
    raise exception 'Competition no longer exists';
  end if;

  if not public.competition_registration_open(v_team.competition_id) then
    raise exception 'The deadline for % has passed — team rosters are locked.', v_competition.title;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  -- One student, one team per competition.
  if tg_op = 'INSERT' then
    select count(*) into v_other_teams
    from public.competition_team_members m
    join public.competition_teams t on t.id = m.team_id
    where m.user_id = new.user_id
      and t.competition_id = v_team.competition_id
      and m.team_id <> new.team_id;

    if v_other_teams > 0 then
      raise exception 'You are already on a team for this competition';
    end if;
  end if;

  select count(*) into v_members
  from public.competition_team_members
  where team_id = new.team_id;

  -- An UPDATE does not change the headcount; an INSERT adds one unless the
  -- row already existed (which the unique index would have caught anyway).
  if tg_op = 'INSERT' and v_competition.max_team_size is not null
     and v_members + 1 > v_competition.max_team_size then
    raise exception 'This team is full (maximum % members)', v_competition.max_team_size;
  end if;

  if not v_competition.team_formation_enabled then
    raise exception 'Team formation is not enabled for this competition';
  end if;

  return new;
end;
$$;

drop trigger if exists competition_team_members_guard on public.competition_team_members;
create trigger competition_team_members_guard
  before insert or update or delete on public.competition_team_members
  for each row execute function public.guard_competition_team_membership();

-- A captain must not be able to keep approving requests against a locked
-- competition either; the policy in 003 only proves they captain the team.
create or replace function public.guard_competition_join_request_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team public.competition_teams;
begin
  select * into v_team from public.competition_teams where id = new.team_id;
  if v_team.id is not null and not public.competition_registration_open(v_team.competition_id) then
    raise exception 'The deadline for this competition has passed — join requests can no longer be processed.';
  end if;
  return new;
end;
$$;

drop trigger if exists competition_join_requests_guard on public.competition_team_join_requests;
create trigger competition_join_requests_guard
  before update on public.competition_team_join_requests
  for each row execute function public.guard_competition_join_request_change();

comment on function public.guard_competition_team_membership is
  'Authoritative deadline lock, team-capacity and one-team-per-competition rules for competition_team_members.';

-- ---------------------------------------------------------------------------
-- 4. REGISTRATIONS
-- ---------------------------------------------------------------------------
-- A registration is an *entry*, not a team. A team that is still short of its
-- minimum never appears here, which is what makes "registered teams" a number
-- that can be quoted to an organiser without caveating it in the UI.
create table if not exists public.competition_registrations (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.opportunities (id) on delete cascade,
  -- solo entries carry a user and no team; team entries carry both, and the
  -- team is what the roster snapshot belongs to.
  registration_type text not null check (registration_type in ('solo', 'team')),
  participant_user_id uuid not null references auth.users (id) on delete cascade,
  team_id uuid references public.competition_teams (id) on delete cascade,
  status text not null default 'registered' check (status in ('registered', 'withdrawn')),
  -- Names captured at submit time, so the final roster an admin exports after
  -- the deadline still describes the people who actually entered even if a
  -- profile is edited or deleted later. No email or phone is stored here —
  -- those are read live, admin-only, by the export function.
  roster_snapshot jsonb not null default '[]'::jsonb,
  registered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint competition_registrations_team_needs_team_type
    check ((registration_type = 'team') = (team_id is not null)),
  -- A solo entrant may not also be on a registered team, and may not register
  -- solo twice.
  constraint competition_registrations_solo_unique unique (competition_id, participant_user_id)
);

-- One registration per team, ever.
create unique index if not exists competition_registrations_team_key
  on public.competition_registrations (team_id)
  where team_id is not null;

create index if not exists competition_registrations_competition_status_idx
  on public.competition_registrations (competition_id, status);

create index if not exists competition_registrations_participant_idx
  on public.competition_registrations (participant_user_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'competition_registrations_roster_is_array'
  ) then
    alter table public.competition_registrations
      add constraint competition_registrations_roster_is_array check (jsonb_typeof(roster_snapshot) = 'array');
  end if;
end $$;

drop trigger if exists competition_registrations_set_updated_at on public.competition_registrations;
create trigger competition_registrations_set_updated_at before update on public.competition_registrations
  for each row execute function public.set_updated_at();

alter table public.competition_registrations enable row level security;

-- A student sees their own entry, and can see that a team they are on has
-- registered. Nothing about anyone else.
drop policy if exists "Students read their own registrations" on public.competition_registrations;
create policy "Students read their own registrations"
  on public.competition_registrations for select to authenticated
  using (
    participant_user_id = auth.uid()
    or (
      team_id is not null and exists (
        select 1 from public.competition_team_members m
        where m.team_id = competition_registrations.team_id and m.user_id = auth.uid()
      )
    )
  );

-- No INSERT, UPDATE or DELETE policy at all: writes go exclusively through the
-- functions below, which is what keeps status transitions and the roster
-- snapshot consistent.
revoke all on public.competition_registrations from anon, authenticated, service_role;
grant select on public.competition_registrations to authenticated;

comment on table public.competition_registrations is
  'Competition entries that have actually been submitted. Teams still forming are not represented here.';

-- ---------------------------------------------------------------------------
-- 5. AUTHORITATIVE WRITE PATHS
-- ---------------------------------------------------------------------------
create or replace function public.register_for_competition_solo(p_competition_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_competition public.opportunities;
  v_existing uuid;
  v_registration uuid;
begin
  if v_user is null then
    raise exception 'You must be signed in to register';
  end if;

  select * into v_competition from public.opportunities where id = p_competition_id for share;
  if not found then
    raise exception 'Competition not found';
  end if;
  if v_competition.status <> 'published' then
    raise exception 'This competition is not open for registration';
  end if;
  if not public.competition_registration_open(p_competition_id) then
    raise exception 'Registration for % closed.', v_competition.title;
  end if;
  -- Solo means solo: a competition that needs a crew of two must not offer it.
  if v_competition.min_team_size is not null and v_competition.min_team_size > 1 then
    raise exception 'This competition requires teams of at least % people', v_competition.min_team_size;
  end if;

  -- Already on a registered team for this competition? Then they have entered.
  select r.id into v_existing
  from public.competition_registrations r
  where r.competition_id = p_competition_id
    and r.status = 'registered'
    and (
      r.participant_user_id = v_user
      or exists (
        select 1 from public.competition_team_members m where m.team_id = r.team_id and m.user_id = v_user
      )
    )
  limit 1;
  if v_existing is not null then
    raise exception 'You are already registered for this competition';
  end if;

  insert into public.competition_registrations (
    competition_id, registration_type, participant_user_id, roster_snapshot
  ) values (
    p_competition_id, 'solo', v_user,
    coalesce((
      select jsonb_build_array(jsonb_build_object('user_id', p.id, 'full_name', nullif(p.full_name, '')))
      from public.profiles p where p.user_id = v_user limit 1
    ), '[]'::jsonb)
  )
  returning id into v_registration;

  return v_registration;
end;
$$;

create or replace function public.submit_competition_team_registration(p_team_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_team public.competition_teams;
  v_competition public.opportunities;
  v_roster jsonb;
  v_size int;
  v_existing uuid;
  v_registration uuid;
begin
  if v_user is null then
    raise exception 'You must be signed in to register a team';
  end if;

  -- Locking the team serialises two captains submitting at once, and makes the
  -- capacity re-check below true at the moment it is read.
  select * into v_team from public.competition_teams where id = p_team_id for update;
  if not found then
    raise exception 'Team not found';
  end if;
  if v_team.captain_user_id <> v_user then
    raise exception 'Only the team captain can submit registration';
  end if;
  if v_team.status <> 'active' then
    raise exception 'This team is not active';
  end if;

  select * into v_competition from public.opportunities where id = v_team.competition_id;
  if v_competition.status <> 'published' then
    raise exception 'This competition is not open for registration';
  end if;
  if not public.competition_registration_open(v_team.competition_id) then
    raise exception 'Registration for % closed.', v_competition.title;
  end if;

  select count(*), coalesce(jsonb_agg(jsonb_build_object(
    'user_id', m.user_id,
    'full_name', nullif(p.full_name, ''),
    'role', m.role
  ) order by m.role desc, m.joined_at), '[]'::jsonb)
  into v_size, v_roster
  from public.competition_team_members m
  left join public.profiles p on p.user_id = m.user_id
  where m.team_id = p_team_id;

  -- A team that is still looking for members is not an entry. This is the rule
  -- that keeps the registered-team count honest.
  if v_competition.min_team_size is not null and v_size < v_competition.min_team_size then
    raise exception 'Registration pending — this team needs at least % members (currently %)',
      v_competition.min_team_size, v_size;
  end if;
  if v_competition.max_team_size is not null and v_size > v_competition.max_team_size then
    raise exception 'This team exceeds the maximum of % members', v_competition.max_team_size;
  end if;

  select id into v_existing from public.competition_registrations where team_id = p_team_id;
  if v_existing is not null then
    -- Re-submitting refreshes the snapshot rather than duplicating the entry,
    -- because the roster may legitimately have changed before the deadline.
    update public.competition_registrations
      set roster_snapshot = v_roster, status = 'registered'
      where id = v_existing;
    return v_existing;
  end if;

  insert into public.competition_registrations (
    competition_id, registration_type, participant_user_id, team_id, roster_snapshot
  ) values (
    v_team.competition_id, 'team', v_user, p_team_id, v_roster
  )
  returning id into v_registration;

  return v_registration;
end;
$$;

-- The browser has called this since migration 003, but no migration ever
-- defined it — approving a request was therefore either done client-side (the
-- direct INSERT that 002's policy allows and that the capacity rules could not
-- see) or not at all. Defining it here makes the repository authoritative and
-- puts the capacity and deadline checks in the same transaction as the insert.
create or replace function public.approve_team_join_request(p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_request public.competition_team_join_requests;
  v_team public.competition_teams;
  v_competition public.opportunities;
  v_members int;
begin
  if v_user is null then
    raise exception 'You must be signed in';
  end if;

  select * into v_request from public.competition_team_join_requests where id = p_request_id;
  if not found then
    raise exception 'Request not found';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'That request has already been processed';
  end if;

  select * into v_team from public.competition_teams where id = v_request.team_id for update;
  if v_team.captain_user_id <> v_user then
    raise exception 'Only the team captain can approve requests';
  end if;
  if v_team.status <> 'active' then
    raise exception 'This team is not accepting members';
  end if;

  select * into v_competition from public.opportunities where id = v_team.competition_id;
  if not public.competition_registration_open(v_team.competition_id) then
    raise exception 'The deadline for this competition has passed — rosters are locked.';
  end if;

  select count(*) into v_members from public.competition_team_members where team_id = v_team.id;
  if v_competition.max_team_size is not null and v_members >= v_competition.max_team_size then
    raise exception 'This team is full (maximum % members)', v_competition.max_team_size;
  end if;

  -- The membership trigger re-checks one-team-per-competition and capacity
  -- under the same lock; a duplicate membership is caught by the unique index.
  insert into public.competition_team_members (team_id, user_id, role)
  values (v_team.id, v_request.user_id, 'member');

  update public.competition_team_join_requests
    set status = 'approved'
    where id = p_request_id;

  return true;
end;
$$;

-- Joining by an intentionally shared code is immediate membership (that is what
-- a code means); browsing publicly still goes through a pending request.
create or replace function public.join_competition_team_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_team public.competition_teams;
  v_competition public.opportunities;
begin
  if v_user is null then
    raise exception 'You must be signed in to join a team';
  end if;

  select * into v_team from public.competition_teams
  where upper(invite_code) = upper(trim(coalesce(p_code, '')))
  for update;
  if not found then
    raise exception 'Team code not found. Check the code and try again.';
  end if;
  if v_team.status <> 'active' then
    raise exception 'This team is no longer accepting members';
  end if;

  select * into v_competition from public.opportunities where id = v_team.competition_id;
  if not v_competition.team_formation_enabled then
    raise exception 'Team formation is not enabled for this competition';
  end if;
  if v_competition.status <> 'published' then
    raise exception 'This competition is no longer active';
  end if;
  if not public.competition_registration_open(v_team.competition_id) then
    raise exception 'The deadline for % has passed.', v_competition.title;
  end if;

  -- Capacity and the one-team rule are enforced again by the membership
  -- trigger; this check exists to give the student a readable message.
  if v_competition.max_team_size is not null and (
    select count(*) from public.competition_team_members where team_id = v_team.id
  ) >= v_competition.max_team_size then
    raise exception 'This team is full (maximum % members)', v_competition.max_team_size;
  end if;

  insert into public.competition_team_members (team_id, user_id, role)
  values (v_team.id, v_user, 'member');

  return v_team.id;
end;
$$;

-- Withdrawal is allowed only while the roster is still editable.
create or replace function public.withdraw_competition_registration(p_registration_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_registration public.competition_registrations;
begin
  if v_user is null then
    raise exception 'You must be signed in';
  end if;

  select * into v_registration from public.competition_registrations where id = p_registration_id for update;
  if not found then
    raise exception 'Registration not found';
  end if;

  if not (
    v_registration.participant_user_id = v_user
    or exists (
      select 1 from public.competition_teams t
      where t.id = v_registration.team_id and t.captain_user_id = v_user
    )
  ) then
    raise exception 'Only the participant or their team captain can withdraw';
  end if;

  if not public.competition_registration_open(v_registration.competition_id) then
    raise exception 'The deadline has passed — this registration is final.';
  end if;

  update public.competition_registrations set status = 'withdrawn' where id = p_registration_id;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. PUBLIC READS THAT MUST NOT LEAK ANYTHING
-- ---------------------------------------------------------------------------
-- Registered teams, not teams that exist. Forming teams are excluded by
-- construction because they have no row in competition_registrations.
create or replace function public.competition_registered_team_count(p_competition_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.competition_registrations r
  where r.competition_id = p_competition_id
    and r.status = 'registered'
    and r.registration_type = 'team';
$$;

-- Public discovery for one competition: enough to choose a team, never enough
-- to identify anyone. No user ids, no member names, no emails, no phones.
create or replace function public.competition_discoverable_teams(p_competition_id uuid)
returns table (
  id uuid,
  name text,
  member_count integer,
  places_available integer,
  recruiting boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    t.name,
    counts.member_count,
    case when o.max_team_size is null then null
         else greatest(o.max_team_size - counts.member_count, 0)::integer end,
    t.status = 'active'
      and public.competition_registration_open(t.competition_id)
      and (o.max_team_size is null or counts.member_count < o.max_team_size)
  from public.competition_teams t
  join public.opportunities o on o.id = t.competition_id
  cross join lateral (
    select count(*)::integer as member_count
    from public.competition_team_members m
    where m.team_id = t.id
  ) counts
  where t.competition_id = p_competition_id
    and t.status = 'active'
    and o.team_formation_enabled
    -- A registered team has its crew; it is not looking for one.
    and not exists (
      select 1 from public.competition_registrations r
      where r.team_id = t.id and r.status = 'registered'
    );
$$;

-- The caller's own standing on a competition, in one round trip, so the UI
-- cannot guess at a registration state from separately-fetched rows.
create or replace function public.my_competition_registration(p_competition_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
begin
  if v_user is null then
    return '{}'::jsonb;
  end if;

  select jsonb_build_object(
    'registrationId', r.id,
    'registrationType', r.registration_type,
    'status', r.status,
    'teamId', r.team_id,
    'registeredAt', r.registered_at
  ) into v_result
  from public.competition_registrations r
  where r.competition_id = p_competition_id
    and r.status = 'registered'
    and (
      r.participant_user_id = v_user
      or exists (
        select 1 from public.competition_team_members m
        where m.team_id = r.team_id and m.user_id = v_user
      )
    )
  limit 1;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. ADMIN-ONLY REGISTRATION RECORDS AND EXPORT DATA
-- ---------------------------------------------------------------------------
-- Contact details are read here, live, rather than copied into a table at
-- registration time. The function is security definer because a normal admin
-- cannot select auth.users or another student's profile_contacts — that is the
-- point: the only door to those rows for an admin query is this one, and it
-- checks is_admin() itself.
create or replace function public.competition_registration_records(p_competition_id uuid)
returns table (
  registration_id uuid,
  registration_type text,
  registration_status text,
  registered_at timestamptz,
  contestant_name text,
  contestant_email text,
  contestant_phone text,
  team_id uuid,
  team_name text,
  captain_name text,
  roster jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required to view registration records';
  end if;

  return query
  select
    r.id,
    r.registration_type,
    r.status,
    r.registered_at,
    nullif(p.full_name, ''),
    u.email,
    pc.phone_number,
    r.team_id,
    t.name,
    cap.full_name,
    -- Live roster while the deadline is open, frozen snapshot once it is not.
    case
      when public.competition_registration_open(r.competition_id) and r.team_id is not null then
        coalesce((
          select jsonb_agg(jsonb_build_object(
            'user_id', m.user_id,
            'full_name', nullif(mp.full_name, ''),
            'email', mu.email,
            'phone', mpc.phone_number,
            'role', m.role
          ) order by m.role desc, m.joined_at)
          from public.competition_team_members m
          left join public.profiles mp on mp.user_id = m.user_id
          left join auth.users mu on mu.id = m.user_id
          left join public.profile_contacts mpc on mpc.user_id = m.user_id
          where m.team_id = r.team_id
        ), r.roster_snapshot)
      else r.roster_snapshot
    end
  from public.competition_registrations r
  left join public.competition_teams t on t.id = r.team_id
  left join public.profiles p on p.user_id = r.participant_user_id
  left join auth.users u on u.id = r.participant_user_id
  left join public.profile_contacts pc on pc.user_id = r.participant_user_id
  left join public.profiles cap on cap.user_id = t.captain_user_id
  where r.competition_id = p_competition_id
  order by r.registered_at;
end;
$$;

revoke all on function public.competition_registered_team_count(uuid) from public;
revoke all on function public.competition_discoverable_teams(uuid) from public;
revoke all on function public.my_competition_registration(uuid) from public;
revoke all on function public.competition_registration_records(uuid) from public;
revoke all on function public.register_for_competition_solo(uuid) from public;
revoke all on function public.submit_competition_team_registration(uuid) from public;
revoke all on function public.approve_team_join_request(uuid) from public;
revoke all on function public.join_competition_team_by_code(text) from public;
revoke all on function public.withdraw_competition_registration(uuid) from public;

grant execute on function public.competition_registered_team_count(uuid) to anon, authenticated;
grant execute on function public.competition_discoverable_teams(uuid) to anon, authenticated;
grant execute on function public.my_competition_registration(uuid) to authenticated;
grant execute on function public.register_for_competition_solo(uuid) to authenticated;
grant execute on function public.submit_competition_team_registration(uuid) to authenticated;
grant execute on function public.approve_team_join_request(uuid) to authenticated;
grant execute on function public.join_competition_team_by_code(text) to authenticated;
grant execute on function public.withdraw_competition_registration(uuid) to authenticated;
-- Deliberately no grant to anon: this returns email addresses and phone numbers.
grant execute on function public.competition_registration_records(uuid) to authenticated;

comment on function public.competition_registration_records is
  'Admin-only registration records including contact details. Reads auth.users and profile_contacts, so it must never be exposed to anon.';
