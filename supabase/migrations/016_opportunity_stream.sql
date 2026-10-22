-- 016_opportunity_stream.sql
-- Part 3: a real `stream` column on opportunities.
--
-- The approved filter vocabulary is Science / Commerce / Arts / Analytics,
-- single-select. Nothing in the current schema stores it: `field` and
-- `eligible_courses` are free text and a course list, and mapping either onto
-- a "stream" in the browser would be the app inventing data the admin never
-- entered — which is precisely what a filter must not do. So the column is
-- added, and the UI hides the Stream filter until this migration exists on the
-- project (see `opportunitiesStreamAvailable` in src/lib/dataAccess.ts).
--
-- Deliberately narrow: this adds ONE column, the only one the approved Part 3
-- filter set genuinely needs. Payment (`is_paid`), a numeric stipend range, a
-- structured Indian state/UT, certification price and a `published_at` stamp are
-- all real gaps found in the audit, but none of them backs a filter the product
-- has asked for yet, so they are left out rather than speculatively added.
--
-- Dependencies: assumes 001_platform_schema.sql created `public.opportunities`.
-- It does not depend on 013 or 015. Safe to apply on its own.
--
-- Backfill: none is attempted. Existing rows keep `stream` null, which the app
-- reads as "not specified" and the admin form can fill in listing by listing.
-- Until at least one row carries a value, the Stream filter stays hidden —
-- correct behaviour, not a bug: an empty facet is worse than an absent one.
--
-- NOT APPLIED. Prepared for review only; nothing has been run against any
-- database.

alter table public.opportunities
  add column if not exists stream text;

do $$
begin
  -- Named so re-running the migration cannot stack duplicate constraints.
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.opportunities'::regclass
      and conname = 'opportunities_stream_check'
  ) then
    alter table public.opportunities
      add constraint opportunities_stream_check
      check (stream is null or stream in ('Science', 'Commerce', 'Arts', 'Analytics'));
  end if;
end
$$;

comment on column public.opportunities.stream is
  'Academic stream a listing is aimed at. Nullable means unspecified, never guessed. Drives the single-select Stream filter on the opportunity feeds.';

-- The public feeds filter and count within a category first, so a partial index
-- on the non-null rows is enough and keeps the common "not specified" rows out.
create index if not exists opportunities_stream_idx
  on public.opportunities (stream)
  where stream is not null;
