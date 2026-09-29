-- 010_team_invite_code_generation.sql
-- Task 6: the database becomes the source of truth for team invite codes.
--
-- invite_code has been NOT NULL with no default since 002, which meant the
-- only code a team ever had was one the browser invented and sent in the
-- INSERT. If that call was skipped, retried, or the response lost, the team
-- existed with a code nobody could reconstruct. This moves generation into the
-- column default so a team cannot exist without a database-issued code.
--
-- What this deliberately does NOT touch:
--   * Migration 004's column-level grants. invite_code stays invisible to the
--     API roles; only the DEFAULT and the get_team_invite_code RPC can surface
--     it, and that RPC still authorises captain-or-member server-side.
--   * find_team_by_invite_code, which still compares upper() and never returns
--     the code itself.
--   * The existing unique index on invite_code, which remains the real
--     collision guard.

-- Same alphabet the app has always used: no O/0/I/1 so codes survive being
-- read aloud or typed from a phone.
create or replace function public.new_team_invite_code()
returns text
language sql
volatile
as $$
  select 'DSH-' || array_to_string(
    array(
      select substr(
        'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
        (get_byte(gen_random_uuid()::bytea, 0) % 32) + 1,
        1
      )
      from generate_series(1, 5) as g(n)
    ),
    ''
  );
$$;

comment on function public.new_team_invite_code() is
  'Database-side generator for competition_teams.invite_code. Volatile on purpose: it is the column default.';

revoke all on function public.new_team_invite_code() from public;
grant execute on function public.new_team_invite_code() to authenticated;

-- The inserting role evaluates a column default, so authenticated must be able
-- to call the generator. anon is not granted — it cannot create teams anyway.

alter table public.competition_teams
  alter column invite_code set default public.new_team_invite_code();

-- Repair any legacy blank code. The unique index makes duplicates impossible,
-- so this only has to catch empty or whitespace values.
update public.competition_teams
  set invite_code = public.new_team_invite_code()
  where invite_code is null or btrim(invite_code) = '';

-- A format CHECK is intentionally not added: migration 002 left existing rows
-- free-form, and a validated constraint over history cannot be enforced from
-- here without risking a failed deploy. New rows are covered by the default.
