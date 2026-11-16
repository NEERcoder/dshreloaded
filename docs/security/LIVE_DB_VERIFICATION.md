# JAVLIN — read-only live Supabase verification

Date 2026-11-03. Project `impbwhaigoqjtxzyqvct.supabase.co` (host read from tracked `.replit`). Repository compared: `E:\dsh-repo` @ `175c93b` plus the uncommitted audit changes described in [SECURITY_AUDIT_REPORT.md](file:///E:/dsh-repo/docs/security/SECURITY_AUDIT_REPORT.md).

Approved privacy rules under test: (1) avatars stay public, (2) private owners' **names** visible to valid connected students, (3) all other private details hidden from connected students, (4) no manufactured or redirected team membership granting private data.

**Access level actually obtained — read this before trusting any statement below.** No SQL session was reachable: no `.env`, no `psql`/`supabase` CLI, no connection string, no `SUPABASE_ACCESS_TOKEN`, and `GET /rest/v1/` correctly answers `42501 Secret API key required`. All live evidence therefore comes from **anonymous** PostgREST/Storage/RPC requests signed with the publishable client key that is already public by design. Every request was a read: `GET`, or `POST /rpc/<stable-or-immutable-lookup>()`, with `Range-Unit: items` + `Range: 0-0` so at most one row could transfer and **no row body, identifier or credential is recorded in this file or in the probe script**. No write, no auth endpoint, no account creation, no listing of objects, no migration, no policy change.

Consequence: the anonymous role is fully characterised; the `authenticated` role — which is exactly where F-01 and F-02 live — could **not** be observed. Those remain repository-confirmed and simulated, never live-confirmed.

## Deliverable 1 — Repository policies versus live policies

| Path | Committed repository intent | Live anonymous observation | Assessment |
|---|---|---|---|
| `profiles` rows, `is_public=false` | 007: anon reads only `is_public = true` | `206`, **0 rows**, while `is_public=true` returns **4 rows** | **Aligned.** Anonymous visitors cannot read private profiles |
| `profiles.gender`, `.id`, `.created_at`, `.updated_at` | 007: not granted to anon | `401 / 42501 permission denied for table profiles` | **Aligned.** Column-level grants are enforced live, not just on paper |
| `profiles.user_id, full_name, headline, instagram_handle, avatar_url, college_id` | 007/011/014 public projection | `206`, 4 rows each | **Aligned** |
| `select=*` on `profiles` | 007 promises it must fail | `401 / 42501` | **Aligned** |
| `profile_contacts` (phone) | 011: `revoke all … from anon` | table exists (400 on my wrong `id` probe; PK is `user_id`); `select=phone_number` → `401 / 42501` | **Aligned.** Phone unreachable anonymously |
| `competition_teams.invite_code` | 004 column-level grant | `401 / 42501` | **Aligned.** Codes not readable through the table |
| `competition_teams` rows | 002 `using (true)` anon+auth | `200`, 0 rows | **Divergence, live is stricter than the repository.** With 2 membership rows visible and a FK from `competition_team_members.team_id`, at least one team must exist, yet anon sees none — so the live `teams` SELECT policy cannot be `using (true)` as committed. Either 002/003 were reconstructed incompletely or a policy was changed out of band. **Unexplained drift; resolve from `pg_policies` before retiring or replacing any policy.** Practical consequence: the local PGlite suite runs *more permissive* than production here, so simulated results are a lower bound on exposure, never an upper bound |
| `competition_team_members.user_id` | 002 `using (true)` | `206`, 2 rows | **Aligned with 002** — and it confirms rule-relevant exposure: raw roster user IDs are public by design |
| `student_connections`, `student_notifications` | 005/006 revoke anon | `401 / 42501` (tables exist) | **Aligned** |
| `competition_registrations` | 013 revoked anon | `401 / 42501` | **Aligned** |
| **`admin_users`** | 001 contains no grant/revoke at all; only the "Users can read their admin mapping" row policy hides rows | **`200` with 0 rows — the anonymous role holds table-level SELECT** | **Confirmed live divergence from intent (finding L-1).** RLS is the only thing standing between an anonymous `GET /rest/v1/admin_users` and the admin roster; there is no privilege backstop |
| **`public.new_team_invite_code()`** | 010: `revoke all … from public; grant execute … to authenticated` | **`200` when called as anon** (value not recorded) | **Confirmed live (L-2).** `revoke … from public` does not remove the explicit `anon` EXECUTE that Supabase's default privileges create — the same mechanism that produces L-1 |
| `public.is_admin()` | 001, and anon policies at `001:229`/`001:242` depend on it | `200`, returns false | **Aligned, and anon EXECUTE must be retained.** An earlier 022 draft revoked it; that draft was wrong |
| `public.get_javlin_level(uuid)` | 007 definer re-checks owner/admin/`is_public` | `200`, 1-byte return (zero) for a nil UUID | **Aligned** — internal visibility check is live |
| `student_records` (008), `pulse_posts` (009), `homepage_animations` (012) | public read of approved/published/active rows | 0 / 2 / 1 rows | **Aligned** |
| `storage` — `student-avatars` | 007 creates it `public = true`, public read policy | `NoSuchKey Object not found` for a non-existent key | **Confirmed public delivery is enabled** (a non-public bucket answers `NoSuchBucket` instead) → rule 1 satisfied live |
| `storage` — `college-images`, `mentor-photos`, `pulse-media`, `homepage-animations` | 002/009/012 public media | `NoSuchKey` | **Confirmed public delivery enabled** |
| `storage` — `general-applications` (CVs) | 001 private bucket, admin-read | `NoSuchBucket Bucket not found` on the public path | **Confirmed not publicly deliverable** |
| `storage` object listing without a user token | should not list | `NoSuchBucket` (anon cannot resolve the bucket) | **Aligned.** Not proof of a policy; just no listing achieved |

Not inspected, and not inspectable anonymously: `pg_policies` text, `relrowsecurity`/`relforcerowsecurity`, table/schema/sequence/column grant listings, views and their security barriers, function owners and `proconfig`, trigger inventory, `storage.buckets.file_size_limit` / `allowed_mime_types`, and the Supabase migration ledger. **Live drift is already proven twice in this repository's own comments** (002/003 reconstructed after out-of-band application; 013 records an RPC the browser called before any migration defined it), and the `competition_teams` row above is a third, independent sign of drift.

## Deliverable 2 — Migration-history discrepancies

Inference rules: `PGRST205 Could not find the table in the schema cache` → relation absent from anon's exposed schema; `42703 column … does not exist` → relation exists, column missing; `42501 permission denied` → relation exists, privilege missing.

| Migration | Repository claim | Live evidence | Conclusion |
|---|---|---|---|
| 001–009, 011–014 | 002/003 applied out of band and reconstructed | every probed relation and column resolves; grants behave as committed | **Applied** |
| 015 `user_preferences` | file header: “**NOT APPLIED** … nothing here has been run against any database” | relation exists (`42703` on `id`; PK is `user_id`) | **DISCREPANCY — 015 is live and its header is wrong** |
| 016 `opportunity_stream` | historically recorded as unapplied | `opportunities.stream` → `200` | **DISCREPANCY — 016 is live** |
| 017 `college_events` | PROPOSED — NOT APPLIED | `PGRST205 public.events`, although 017 grants public read of published events | **Not applied** |
| 018 `opportunity_detail_columns` | PROPOSED — NOT APPLIED | `kind`, `supervisor`, `department`, `skills_required`, `perks`, `stipend_amount_monthly` all `42703` | **Not applied** |
| 019 `student_skills_and_experience` | the user instructed “apply 019”; repo notes still say unapplied | `PGRST205` for both tables | **Not applied — shipped CIRCLE skills/experience adders are failing in production today** |
| 020 `pulse_post_college` | PROPOSED — NOT APPLIED | `pulse_posts.college_id` → `42703` | **Not applied** |
| 021 `profile_moderation_flags` | PROPOSED — NOT APPLIED | `PGRST205` | **Inconclusive** — 021 grants SELECT to `authenticated` only, so invisibility to anon is expected either way |
| 022 `rls_privacy_hardening` | authored here, never run anywhere | not observable anonymously (it changes `authenticated` policies, column grants and triggers) | **Unverified — requires `pg_policies`** |
| Aggregate historical note “001–014 applied, 015–021 not” | — | 015 and 016 are live; 017/018/019/020 are not | **The note is wrong in both directions and must never be used as a planning assumption again** |

**Blocking ordering defect (new, live-derived).** 022 currently references `public.events`, `public.student_skills`, `public.student_experience` and `public.profile_moderation_flags` (lines 49–51 and 119–121). None of those relations exists in the live project. Because 022 is one explicit transaction, applying it today fails with `42P01 relation does not exist` and **rolls back in full** — including the profiles and membership protections that are the whole point. My local PGlite suite cannot see this: it applies 001→022 chronologically, so 017–021 exist by the time 022 runs. This is a concrete example of why a simulated pass is not a deployment test.

## Deliverable 3 — Confirmed findings, with severity and basis

| ID | Finding | Severity | Basis (explicitly labelled) |
|---|---|---|---|
| L-1 | Anonymous role holds **table-level SELECT on `admin_users`**; only a row policy prevents reading the admin membership list | **Medium** | **LIVE-CONFIRMED** (`200`, 0 rows) |
| L-2 | `new_team_invite_code()` is **executable by anon**, proving default function privileges survive `revoke … from public` | **Low** | **LIVE-CONFIRMED** (`200`) |
| L-3 | Roster `user_id`s and `captain_user_id` are publicly listable, enabling correlation with opted-in profiles | **Low — accepted design** | **LIVE-CONFIRMED** (`206`, 2 rows) + 002 SQL |
| L-4 | `competition_teams` exposes **0 rows to anon while committed 002 declares `using (true)`**, and at least one team must exist (2 memberships reference it) | **Medium (investigate)** — live is stricter than the repository, so committed SQL is not a faithful baseline | **LIVE-CONFIRMED behaviour**; cause unexplained without `pg_policies` |
| F-01 | Any `authenticated` user reads private profiles plus `gender` (`002:44-47` `using (true)` still the only authenticated SELECT policy; 007 narrowed anon only) | **High — status UNKNOWN live** | **REPOSITORY-CONFIRMED + SIMULATED** (`PRE_REMEDIATION` reproduces; `AFTER_REMEDIATION` blocks). **Not observed live** — needs a session token |
| F-02 | `authenticated` self-insert into any team, and `team_id` UPDATE redirect, unlock teammate phone numbers and roster RPCs | **High — status UNKNOWN live** | **REPOSITORY-CONFIRMED + SIMULATED.** Writes were never attempted against production |
| F-03 | Captain can rewrite `invite_code`, `competition_id`, `id` (`with check (true)` at `002:114-118`) | **Medium — unverified live** | Repository + simulated |
| F-04/F-05 | Default-privilege bootstrap; connection/notification identity rewriting | **Medium — L-1/L-2 are its live-confirmed symptoms** | Live for the privilege pattern; simulated for the specific rewrites |
| L-6 | Production features call non-existent relations (019 adders, 017 Events, 018 detail fields, 020 PULSE college) | **Medium functional; security-relevant only through the 022 ordering defect** | **LIVE-CONFIRMED** |
| L-7 | 022 cannot be applied as written, and does not satisfy approved rules 2 and 3 | **Blocker** | **REPOSITORY-CONFIRMED** by inspection + live table inventory |
| L-8 | Private profiles and `gender` invisible to anon; phone table, invite codes, CV bucket all correctly unreachable | Informational — **controls working** | **LIVE-CONFIRMED** |
| — | No secret, token or key material transmitted or recorded by these probes | — | Self-evident from the method |

## Deliverable 4 — Approved avatar and private-name rules

| Rule | Verdict | Detail |
|---|---|---|
| 1. Avatars remain publicly accessible | **Satisfied live; preserved by 022** | `student-avatars` answers `NoSuchKey` (public delivery on). 022 touches no bucket and no storage policy, so applying it cannot break rule 1 — provided nobody also “helpfully” closes the bucket. Residual: an avatar URL stays fetchable after a profile turns private, which rule 1 explicitly accepts |
| 2. Private owners’ **names** visible to valid connected students | **NOT satisfied — 022 actively contradicts it** | 022’s policy is `user_id = auth.uid() or is_public = true or public.is_admin()`: there is **no accepted-connection branch**. Under it a connected peer’s row vanishes and the UI prints “No longer on CIRCLE” ([src/lib/connections.ts:108](file:///E:/dsh-repo/src/lib/connections.ts#L108)). Note this is a **reversal of an earlier decision**, when the user chose to keep private peers unresolvable; the newly approved rules supersede it, so 022 must change |
| 3. All other private details hidden from connected students | **NOT satisfiable by 022 as written** | 022 narrows rows, never the `profiles` **column privileges**: `002:63` still grants `authenticated` table-wide SELECT, so `gender`, `id`, `created_at`, `updated_at` remain readable on every row a reader can see. Adding a connection branch without narrowing columns would breach rule 3 exactly as F-01 does today |
| 4. No manufactured or redirected team membership granting private data | **Covered by 022 — simulated only** | 022 restricts INSERT to the captain’s own initial row, revokes broad membership UPDATE down to `role`, derives `role` from `captain_user_id`, and validates captain transfer. PGlite confirms self-insert, `team_id`/`user_id`/`id`/`joined_at` rewrites and code disclosure are denied while invite-code join, captain approval, capacity, deadline and one-team guards still pass. **Never tested against the live project** |

Architecture note for the 022 revision (rule 2 + rule 3 together, which a row policy alone cannot express): keep `profiles` visible only to owner/public/admin, then add a **name-only path** for accepted pairs — either a definer function `get_connected_peer_names()` returning `(user_id, full_name)` with its own `student_connections` check, or a `profiles` SELECT policy with the connection branch **plus** a narrowed column grant (`revoke select on public.profiles from authenticated; grant select (user_id, full_name, … only what public rows legitimately need)`). Both halves are required: column privileges are what make “name yes, everything else no” enforceable.

> **2026-11-10 outcome for the rows above.** The rules table and L-6/L-7 record the state of the
> *then-draft* 022 and are kept as written. 022 was discarded; the note above was implemented as
> the first alternative — `get_connected_peer_names()` with **no parameters**, so no caller can
> point it at another student’s relationship, plus `revoke select on public.profiles from
> authenticated` and a ten-column `grant select`, with `get_own_profile()` as the owner’s path to
> `gender`, `id` and the timestamps. Rules 2-4 and L-7 are therefore closed *as design* (023, 024,
> 027; 73/73 in `security-phase2-check.mjs`, 278/278 in `security-db-check.mjs`) and remain open
> *as state*: no database has received any of it, and the L-4 divergence will make 024’s
> preflight abort until live SQL is reconciled. See `SECURITY_PHASE2_DESIGN.md`.

## Deliverable 5 — Safe, ordered staging remediation plan

Read-only steps first; nothing below is authorized against production, and every change step runs on a clone.

1. **Baseline the truth (read-only).** Run Q1–Q12 in Deliverable 6 on production via the SQL editor or a read-only login; archive the output. Do not proceed on inferred state. Resolve L-4 (`competition_teams` 0 anon rows vs committed `using (true)`) before retiring or replacing any policy — if live SQL differs from the repo, the file is not the baseline.
2. **Record the ledger honestly.** Bring `_supabase_migrations.schema_migrations` (Q10) in line with reality: mark 015/016 applied, keep 017–021 pending. Correct 015’s stale “NOT APPLIED” header in the repository in the same change.
3. **Clone to staging** (Supabase branch, or a restore into a scratch project). Take a restore point before any apply.
4. **Apply the missing additive migrations in order on staging:** 017 → 018 → 019 → 020 → 021. Verify each: `student_skills_one_per_name` is a **unique index** (the corrected 019 form), `events`/`pulse_posts.college_id`/opportunity detail columns exist, and **test 021’s real defect** — `created_by uuid not null references auth.users on delete set null` fails the moment a moderator account is deleted; use a synthetic account, never a real one.
5. **Fix the live functional breaks** (L-6) at the same time, since they share root cause: the CIRCLE adders and Events page currently fail against production.
6. **Revise 022 before it can ever be applied** — **done 2026-11-10.** 022 is discarded; `supabase/security-review/023`-`028` carry each point of it: (a) the relations-agnostic half became 027, guarded by `to_regclass` instead of split into `022a`/`022b`, and a second simulated instance proves it runs against a 016-shaped schema; (b) rule 2 and rule 3 are 023’s parameterless name-only definer function **plus** narrowed `authenticated` column grants, not a wider row policy; (c) `is_admin()` keeps anon EXECUTE and `new_team_invite_code()` is revoked explicitly `from anon` in 025 §2; (d) 025 §1 revokes `admin_users` by naming `anon` and re-grants `select` to `authenticated`; (e) 025 §3 loops over every public relation present at run time rather than enumerating 24. Design and evidence: `SECURITY_PHASE2_DESIGN.md`.
7. **Re-run both local suites against the revised files** — **done 2026-11-10.** `node scripts/security-db-check.mjs` now applies 023-027 in place of 022 (278/278, phases renamed `PRE_/AFTER_/RERUN_REMEDIATION`), and `node scripts/security-phase2-check.mjs` (new, 73/73) holds the rule-2/rule-3 scenarios: accepted peer sees the name and only the name, pending and unconnected peers see nothing, the owner sees everything. `npm run security:check` stays 47/47. Every protection added in this pass has a failing-before assertion in `BASELINE` or `PRE_REMEDIATION`, as required.
8. **Apply 023 → 024 → 025 → 026 → 028 to staging**, with `000_read_only_preflight.sql` first, confirming each statement executed (no `42P01`), then re-run Q1–Q5 and compare `pg_policies` against the committed SQL; any divergence is a finding. 027 runs last and again after 017/019/021 are applied.
9. **Behavioural pairs on staging with two synthetic accounts only** — never real student records: private peer invisible except name; other columns invisible; self-insert into another team denied; `team_id` rewrite denied; invite-code join succeeds; captain approval succeeds; capacity, deadline and one-team guards fire; captain transfer leaves `role` consistent; roster and phone access still require membership; anon public pages unchanged; avatar still publicly deliverable.
10. **Load check before production:** confirm the connection-scoped `profiles` read does not multiply round trips in CIRCLE (directory, previews, launcher, admin panel all call `getStudentDirectory`), and note that `getPeerProfiles` deliberately keeps orphaned relationships with a null profile, so rule 2’s name path must not assume a row always resolves.
11. **Production window only after steps 1–10 are green**, with the same queries re-run immediately after and the synthetic-account pairs repeated. Rollback is per-block and reversible, but **rolling back reopens F-01/F-02**, so rollback is an incident state to resolve the same day, not a resting configuration.
12. Also still open and not solvable in SQL: AUTH-03 (raw provider errors rendered by the public review form), account enumeration at the GoTrue layer, storage MIME/size limits (dashboard), and production response-header verification.

## Deliverable 6 — Exact queries and probes used

Read-only catalog queries for the operator (SQL editor or a read-only role):

```sql
-- Q1 effective policies on privacy-critical tables
select c.relname, p.polname, p.polcmd, r.rolname as for_role,
       pg_get_expr(p.polqual, p.polrelid) as using_expr,
       pg_get_expr(p.polwithcheck, p.polrelid) as with_check_expr
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  left join lateral unnest(p.polroles) pr(roleid) on true
  join pg_roles r on r.oid = pr.roleid
 where c.relname in ('profiles','profile_contacts','competition_teams','competition_team_members',
                     'competition_team_join_requests','student_connections','student_notifications',
                     'admin_users','student_skills','student_experience','student_records','events',
                     'profile_moderation_flags','general_applications','opportunities')
 order by c.relname, p.polcmd, p.polname;

-- Q2 permissive-OR trap: every SELECT policy per table, flagging permissive-all
select c.relname, count(*) filter (where p.polcmd = 'r') as select_policies,
       bool_or(p.polqual is null) as any_permissive_all
  from pg_class c left join pg_policy p on p.polrelid = c.oid
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
 where c.relkind = 'r' group by c.relname order by 2 desc;

-- Q3 table privileges for the API roles (expect admin_users SELECT for anon — L-1)
select grantor, grantee, table_name, privilege_type
  from information_schema.role_table_grants
 where table_schema = 'public' and grantee in ('anon','authenticated','service_role')
 order by table_name, grantee, privilege_type;

-- Q4 column privileges (the gap between F-01 and rule 3)
select table_name, grantee, column_name, privilege_type
  from information_schema.column_privileges
 where table_schema = 'public' and table_name in ('profiles','student_skills','student_connections',
        'student_notifications','competition_teams','competition_team_members')
 order by table_name, grantee, column_name;

-- Q5 RLS enabled and FORCED (FORCE matters for table owners)
select relname, relrowsecurity, relforcerowsecurity
  from pg_class where relnamespace = 'public'::regnamespace and relkind in ('r','p') order by relname;

-- Q6 functions: context, search_path, owner, execute grants (expect anon execute on
--    is_admin [needed] and new_team_invite_code [L-2])
select p.proname, pg_get_function_arguments(p.oid) as args,
       case p.prosecdef when true then 'DEFINER' else 'INVOKER' end as ctx,
       p.proconfig, u.rolname as owner,
       has_function_privilege('anon', p.oid, 'execute') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'execute') as auth_execute
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
  join pg_roles u on u.oid = p.proowner order by p.proname;

-- Q7 triggers protecting membership/role invariants (must exist before 022 replaces them)
select tgrelid::regclass as tbl, tgname, tgfoid::regprocedure as fn
  from pg_trigger where not tgisinternal
    and tgrelid::regclass::text like 'public.%' order by 1,2;

-- Q8 views and their security settings (audit item 3: confirm none rather than assume)
select c.relname, c.relkind, c.relrowsecurity, pg_get_viewdef(c.oid, true) as definition
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind in ('v','m') order by 1;

-- Q9 schema-level CREATE and sequence usage (can a role create objects or consume sequences?)
select nspname, pg_get_acl(oid) from pg_namespace where nspname in ('public','storage','auth');
select sequence_catalog, sequence_name, privilege_type, grantee
  from information_schema.sequence_usage where object_schema = 'public'
 union all
 select null, c.relname, 'USAGE', r.rolname
   from pg_class c join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
   join lateral aclexplode(c.relacl) a on true join pg_roles r on r.oid = a.grantee
  where c.relkind = 'S' order by 2;

-- Q10 migration ledger
select * from public._supabase_migrations.schema_migrations order by version;

-- Q11 storage configuration (audit item 6: public flag plus MIME/size limits)
select id, name, public, file_size_limit, allowed_mime_types from storage.buckets order by id;
select policyname, permissive, roles::text, cmd, qual, with_check
  from pg_policies where schemaname = 'storage' order by tablename, policyname;

-- Q12 live-behaviour pairs, SYNTHETIC accounts only (run on staging, not production data)
-- as B: select count(*) from public.profiles where user_id = '<synthetic-A>';        -- rule 2 expects 1, rule 3 expects no other columns
-- as B: insert into public.competition_team_members(team_id,user_id,role) values ('<synthetic-team>','<B>','member');  -- expect 42501
-- as B: update public.competition_team_members set team_id='<other>' where id='<own>';                                -- expect 42501
```

Anonymous read-only probes executed this session (41 requests, reproducible with `node node_modules/.cache/security-audit/live-probes.mjs`; the key is read from `.replit` and never printed):

```text
GET /rest/v1/<table>?select=id                          with Prefer:count=exact, Range 0-0   → 19 tables
GET /rest/v1/profiles?select=is_public&is_public=eq.true|eq.false|<none>                    → 4 | 0 | 4
GET /rest/v1/profiles?select=<gender|id|created_at|updated_at|user_id|full_name|headline|
                             instagram_handle|avatar_url|college_id>, GET ?select=*         → 401 for the first four and *
GET /rest/v1/profile_contacts?select=phone_number                                           → 401
GET /rest/v1/competition_teams?select=invite_code                                           → 401
GET /rest/v1/competition_team_members?select=user_id                                        → 206, 2 rows
GET /rest/v1/admin_users?select=user_id                                                     → 200, 0 rows   (L-1)
GET /storage/v1/object/public/<bucket>/00000000-…-0000/probe.png  for 6 buckets             → NoSuchKey ×5, NoSuchBucket (general-applications)
GET /storage/v1/object/list/student-avatars                                                 → NoSuchBucket (no listing achieved)
POST /rest/v1/rpc/is_admin {}  / rpc/new_team_invite_code {}  / rpc/get_javlin_level {nil}   → 200 | 200 (L-2) | 200 zero
```

## Conclusion

**LIVE DATABASE ACCESS UNAVAILABLE — MANUAL VERIFICATION REQUIRED.**

Anonymous access paths, storage delivery, migration exposure and two privilege-bootstrap symptoms were verified against the live project and are recorded above as confirmed. The requested inspection of `pg_policies`, table/schema/sequence/column grants, views, `SECURITY DEFINER` functions, triggers, storage policy rows and the migration ledger needs a SQL session that no publishable key can substitute for. Until Q1–Q12 are run, **F-01 and F-02 stay “High, status unknown live” and cannot be called either present or fixed.**

Separately, and independent of access: **as of 2026-11-03 the repository was not ready for staging testing as written** — migration 022 referenced relations that do not exist live, so it would have aborted as a single transaction, and it did not implement approved rules 2 and 3. **That blocker is closed on 2026-11-10:** 022 is discarded, 023-028 replace it, 027 is existence-guarded, and both local suites were re-run against the new files (Deliverable 5 steps 6-8). The remaining blocker is still this one — no SQL session — so F-01/F-02 stay “High, status unknown live”, 024’s preflight is expected to abort on the live `competition_teams` divergence (L-4) until that is reconciled, and nothing in this repository is evidence about production.
