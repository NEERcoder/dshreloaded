-- 018_opportunity_detail_columns.sql
--
-- STATUS: PROPOSED — NOT APPLIED. Review first.
--
-- Six nullable columns on public.opportunities, each one the answer to a slot in
-- the redesign's own reference cards that the current table cannot fill. Every
-- statement is `add column if not exists` with no default rewrite and no new
-- constraint on existing rows, so an existing row keeps its exact values and a
-- row written before this migration simply has NULLs.
--
-- WHY EACH ONE IS HERE
--   kind                 /hackathons currently has to read the organiser's own
--                        wording (src/lib/opportunityKind.ts matches "hackathon"
--                        in the title or field). That is a guess about intent,
--                        and it is the weakest link in the six pages. One text
--                        column with no CHECK list means a new programme type
--                        never needs another migration.
--   supervisor,
--   department           The research card's first two lines in the reference
--                        sheet. Today the card prints `organization` and `field`
--                        instead, and says so; these columns let it say what the
--                        design asked for.
--   skills_required[]    The internship card's "Skills needed" panel. There is no
--                        skills column at all, so the panel currently carries the
--                        listing's own field/course facts under a different name.
--   perks[]              Same for the "Perks" panel, which today falls back to
--                        `rewards` (a competition-shaped column).
--   stipend_amount_monthly
--                        The reference's "Pay level ₹0K–₹20K+" control. It is NOT
--                        built, because `stipend` is free text and a range slider
--                        over text is a control that only looks functional. With a
--                        real number, a range becomes honest — and
--                        compensationState() in src/lib/opportunityFilters.ts can
--                        stop inferring paid/unpaid from prose.
--
-- NOTHING READS THESE COLUMNS YET, ON PURPOSE. Each is optional and every reader
-- treats NULL as "not stated", so applying this is inert until the app is
-- changed to use it; not applying it changes nothing either. The existing
-- column-retry path in saveOpportunity() (src/lib/dataAccess.ts, the
-- migration-013/016 branch) is the pattern any future write should follow:
-- detect the missing column from the database error, then write without it, so a
-- project that has not applied this migration keeps saving listings normally.
--
-- NO POLICY, GRANT, CONSTRAINT OR INDEX ON EXISTING DATA IS TOUCHED. RLS on
-- public.opportunities is unchanged, so a new column inherits exactly the
-- visibility its row already had.

alter table public.opportunities add column if not exists kind text;
alter table public.opportunities add column if not exists supervisor text;
alter table public.opportunities add column if not exists department text;
alter table public.opportunities add column if not exists skills_required text[]
  not null default '{}';
alter table public.opportunities add column if not exists perks text[]
  not null default '{}';
alter table public.opportunities add column if not exists stipend_amount_monthly numeric(10, 2)
  check (stipend_amount_monthly is null or stipend_amount_monthly >= 0);

comment on column public.opportunities.kind is
  'Programme shape within a category: hackathon, summit, bootcamp, residency. Free text, no CHECK, so a new kind needs no migration. NULL means the organiser never said.';
comment on column public.opportunities.supervisor is
  'Principal investigator or supervising faculty, as typed by the listing owner. Never inferred.';
comment on column public.opportunities.department is
  'Department or centre within the institution. Distinct from field, which is the subject.';
comment on column public.opportunities.skills_required is
  'Skills the listing asks for, one entry each. Empty array means unstated, never "none required".';
comment on column public.opportunities.perks is
  'Non-monetary benefits, one entry each. Display text, not a taxonomy.';
comment on column public.opportunities.stipend_amount_monthly is
  'Monthly amount in the currency the listing states, when a number was actually given. NULL plus the free-text stipend is the normal case; do not backfill by parsing prose.';

create index if not exists opportunities_kind_idx
  on public.opportunities (kind)
  where kind is not null;
