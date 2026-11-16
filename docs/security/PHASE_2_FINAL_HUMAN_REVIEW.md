# JAVLIN Phase 2 — final human review of 023-028

Reviewed 2026-11-10, independently of how the files were authored. **Read-only review**: no SQL
file, no application source, no database and no deployment was modified, and nothing was
committed.

Verdict: **NOT READY FOR STAGING** — see §8. One blocker is functional rather than security
(R-1: the client has no path to 023's owner/peer functions), one is an evidence defect (R-2: the
preflight cannot read the migration ledger it depends on), and one is unresolved live drift (R-3).

## 0. Method, and what it can and cannot support

Every file in `supabase/security-review/` was read in full and checked against the migrations it
depends on (002, 004, 005, 006, 007, 011, 013, 019, 021) and against the call sites in
[src/lib/dataAccess.ts](file:///E:/dsh-repo/src/lib/dataAccess.ts) and
[src/pages/DashboardPage.tsx](file:///E:/dsh-repo/src/pages/DashboardPage.tsx). Three classes of
claim are separated throughout:

| Class | Meaning |
|---|---|
| **VERIFIED (SQL text)** | read from a file in this repository |
| **MEASURED (engine)** | observed in a local PGlite/PostgreSQL 17.5 instance, read-only, no project touched |
| **LIVE** | observed against the deployed project. Nothing in this review is in this class; no live session was available |

Two things were MEASURED for this review specifically, because no harness executes `000` and the
suites only execute 023-028:

1. `000` P10 as written → `SQLSTATE 0A000 cross-database references are not implemented:
   "public._supabase_migrations.schema_migrations"`. The corrected two-part form
   `_supabase_migrations.schema_migrations` returns rows. (R-2)
2. `000` P6 → `pg_get_function_sqlbody(oid)` **does exist** and works. My initial suspicion was
   wrong; it is recorded here as tested and cleared, not as a finding.

## 1. SQL review findings

Ordered by consequence. Each is specific enough to act on and none requires weakening a guard.

**R-1 — 023 is correct SQL with no client counterpart, so applying it alone regresses the owner's
own profile and does not deliver rule 2. (Blocker, functional + privacy-outcome)**
`get_own_profile()` and `get_connected_peer_names()` appear in **zero** client RPC calls — the RPC
list in `src/lib/dataAccess.ts` contains `is_admin`, `get_javlin_level(s)`, `get_team_invite_code`,
`get_team_member_profiles`, `join_competition_team_by_code`,
`approve_team_join_request`, `find_team_by_invite_code`, `competition_*`, `my_competition_registration`,
`register_for_competition_solo`, `submit_competition_team_registration`,
`withdraw_competition_registration`, `set_active_homepage_animation` and nothing else. Meanwhile:
- the owner's own read is a table read: `supabase.from("profiles").select("*").eq("user_id", ...)`
  at [src/lib/dataAccess.ts:1973](file:///E:/dsh-repo/src/lib/dataAccess.ts#L1973), and the write
  paths project the whole row back — `.upsert(payload, {onConflict:"user_id"}).select().single()`
  at `:2042` and `.update(payload).select().single()` at `:2186`. All three are owner-only reads,
  so 023's row policy keeps them working; what they can no longer receive is the columns that
  stopped being grantable (`id`, `gender`, `created_at`, `updated_at`) — 023 grants exactly ten.
- `mapProfile` consumes exactly those columns: `id: String(row.id)` (unguarded, so an omitted
  column becomes the literal `"undefined"`), `gender: String(row.gender ?? "")`, `createdAt`,
  `updatedAt` at [src/lib/dataAccess.ts:368-386](file:///E:/dsh-repo/src/lib/dataAccess.ts#L368-L386).
- the consequence is visible: the dashboard seeds its form from `p.gender`
  ([src/pages/DashboardPage.tsx:85](file:///E:/dsh-repo/src/pages/DashboardPage.tsx#L85)), renders
  `profile.gender` at `:697`, and **refuses to save** without it —
  `if (!form.gender) return "Please select a gender."` at
  [src/pages/DashboardPage.tsx:242](file:///E:/dsh-repo/src/pages/DashboardPage.tsx#L242).
- rule 2 is not delivered either: `getStudentProfile`
  ([src/lib/dataAccess.ts:2134](file:///E:/dsh-repo/src/lib/dataAccess.ts#L2134)) still reads the
  `profiles` table, so an accepted peer whose profile is private still resolves to null and the UI
  still prints "No longer on CIRCLE" — the exact symptom that disqualified 022.

Fix, in order: client change first (ship `rpc("get_own_profile")` for the owner read, use the
ten-column projection for the post-write re-read, and route peer-name resolution through
`get_connected_peer_names()`), then the HTTP probe in §6, then the SQL. Note that 023's own header
asserts "the client keeps its null-peer path working rather than pretending a row exists" — that is
about the *row*, and it is still true; it does not cover the missing column reads.

**R-2 — `000` P10 cannot run, so the ledger evidence 027 and the staging plan depend on is
unobtainable as written (evidence defect).** `select * from public._supabase_migrations.schema_migrations`
is a three-part name; PostgreSQL reads the first part as a *database*. MEASURED: 0A000. Corrected:
`select * from _supabase_migrations.schema_migrations order by version;`. Consequence if left as
is: an operator sees an error, records "no ledger table", and §6's prerequisite "017-021 not
applied" rests on the anonymous `PGRST205` inference rather than the ledger — which is exactly the
"do not proceed on inferred state" rule §1 of `LIVE_DB_VERIFICATION.md` sets.

**R-3 — `000` P2 and P4 are scoped to `information_schema.role_table_grants` and `pg_policy`,
which cannot answer the one live question that matters** (why anon gets 0 rows from
`competition_teams` although `002:102-104` declares `using (true)`). P4 lists *grants* but nothing
in `000` shows `relrowsecurity`/`relforcerowsecurity` **per table joined to the policy set** for
`competition_teams` specifically, and no query in `000` or `028` executes as the API role. Add a
statement-level probe (see §5) rather than inferring. §5 explains the hypothesis I tested and
rejected.

**R-4 — 024's ROLLBACK block is incomplete, so the documented incident path does not reach the
state it claims.** It drops `competition_team_members_derive_role` and
`competition_teams_guard_captain` and their two functions, and recreates the 002 INSERT policy,
but it never drops `competition_teams_reassign_roles` or `reassign_membership_roles()`, and leaves
`grant execute on function public.reassign_membership_roles() to authenticated` in place (024 §4b
revokes only `from public, anon`). The block is labelled "That is the pre-fix state." It is not:
after it, captain transfer still rewrites both role labels — i.e. F-06's *symptom* stays partially
closed while F-02/F-03 are reopened, which is the worst combination for an operator reasoning
about incident scope.

**R-5 — 026's ROLLBACK block does not undo 026 §1's third revoke.** After this pass added
`revoke insert, delete on public.student_notifications from public, anon, authenticated`, the
rollback (restoring only the two `grant update` lines) no longer returns to the pre-fix write
surface. Add `grant insert, delete on public.student_notifications to authenticated;`. Same
accuracy problem as R-4, smaller blast radius.

**R-6 — 025 §4 is asymmetric against its own stated intent.** The header says the default-privilege
fix is "scoped to this database's public schema and to the two API roles", but the statements revoke
`on tables from anon, authenticated` while sequences and functions are revoked `from anon` only.
Consequence: a future `create function` still hands `authenticated` EXECUTE through
`pg_default` — the L-2 class (an API role able to execute a definer RPC that was meant to be
unreachable) stays open for `authenticated` on objects nobody has written yet. It may well be
deliberate (the client's own RPCs must keep working with zero explicit grants), but as written the
file's prose overstates the fix, and a reviewer reading only the header would believe it closed.
Recommend either the prose or the statement be brought into agreement — explicitly, in the file,
not in this review.

**R-7 — 025 §4 has an operator trap that neither harness can see.** `ALTER DEFAULT PRIVILEGES`
applies to objects created by **the role that executes the statement**. In the simulation the owner
installs everything, so it covers every future table. In Supabase, migrations run as `postgres`
from the SQL editor but a dashboard "SQL snippets" run, a CLI migration or a branch promote may run
as a different role — and for those creators the bootstrap grant stays intact. 025 must state that
it has to be executed by the role that will create future objects (and that preflight P8,
`pg_namespace.nspacl`, plus a `pg_default_acl` dump is the confirmation). No `pg_default_acl` query
exists in `000` or `028` today, so the fix's own verification is unmeasured.

**R-8 — 028 V6 reports without gating, against the file's own promise.** 028's header says
"every check raises, so a silent pass is impossible". V6 collects `SECURITY DEFINER` functions with
`proconfig IS NULL` and, when any exist, emits `RAISE NOTICE ... V6 NOTE`. Pre-existing unpinned
definer functions therefore cannot fail the verification — and the audit's own F-08 class is exactly
an unpinned definer `search_path`. Whether that is exploitable depends on whether `anon`/
`authenticated` hold `CREATE` on schema `public` (`000` P8 measures `nspacl`); V6 never looks at it.
The 023-027 functions themselves are safe: every relation and function they reference is
schema-qualified (`public.profiles`, `public.student_connections`, `auth.uid()`), so no name can be
steered today. Two smaller points worth recording rather than acting on: 023 pins
`search_path = public` while 024/026/027 pin `search_path = ''` (the asymmetry is a trap for the
next editor); and 023's `revoke all on function ... from public, anon` leaves `authenticated` out
of the revoke list, which is harmless because the next line grants it explicitly, but it is the one
place the file's style diverges from the mechanism 025 documents.

**R-9 — Trigger convergence is asserted only as existence.** `028` V3 checks that four trigger
*names* exist; the idempotency comparisons in both harnesses (`aclFingerprint` in
`security-db-check.mjs`, `aclSnapshot()`) diff `relacl`, `attacl`, `proacl`, `proconfig` and policy
expressions — **not** `pg_trigger`. So a re-apply that re-bound a trigger to a different function,
or flipped `before`→`after`, or dropped a column list from `UPDATE OF`, would pass convergence and
still pass V3. 024 §6 does count its own two team triggers by name, which is the same weakness.
Cheap fix: include `tgtype`, `tgname` and `tgrelid` in the convergence snapshot, and `tgfoid` so the
binding is covered.

**R-10 — 027's `position` columns: tested fine, and a note for live.** `insert (user_id, name,
is_public, position)` matches `createStudentSkill` (`user_id`, `name`, `is_public`) with `position`
relying on its `default 0`, and `student_experience`'s grant list covers
`user_id, role, organization, period, location, is_public` exactly as `createStudentExperience`
writes them ([src/lib/dataAccess.ts:3060](file:///E:/dsh-repo/src/lib/dataAccess.ts#L3060)) — so
027 narrows nothing the client needs. `position` is a function name in PostgreSQL but non-reserved
as a column, and it parsed and applied in the simulation, so this is confirmation rather than a
finding.

### What the SQL review found *correct*

Transaction boundaries: every DDL file is `begin;` … `commit;` with assertions placed **after** the
statements they govern, so a failed assertion rolls the file back atomically rather than leaving a
half-applied grant set. 028 is a DO-block-only file with no transaction wrapper and nothing to
roll back — correct for a read-only artifact, and it means it can be run inside a `begin; … rollback;`
probe, which the phase-2 harness does.

Dependencies are accurate as far as the repository can show them: 023 → 001/002/005/007/011/014,
024 → 002/003/004/011/013 (it does **not** modify `guard_competition_team_membership`, which it
depends on), 025 → 001/002/010/013, 026 → 005/006, 027 → 025 + 017/019/021 guarded. No statement in
023-026 references a relation created by 017-021, which is what makes the 022 failure mode
impossible here — confirmed by reading every statement, not only by the 016-shaped test.

Idempotency holds where it was checkable: `create or replace`, `drop trigger if exists`,
`drop policy if exists` before each replacement, revoke-then-grant (so accumulated grants converge),
and re-runnable convergence assertions. 024 §0's policy counts stay exactly 1 across two applies,
so its preflight does not reject its own output.

Privileges, not React, decide what leaves the database — 023's `grant select` list is byte-for-byte
the ten columns `DIRECTORY_COLUMNS` requests ([src/lib/dataAccess.ts:2099](file:///E:/dsh-repo/src/lib/dataAccess.ts#L2099)),
and `instagram_handle`/`headline` reach readers through the earlier narrow grants at `011:48` and
`014:45`, which 023's superset absorbs. `002:63`'s table-wide `grant select, insert, update on
public.profiles to authenticated` is the statement 023 collapses.

Two write-surface revokes are safe because the client never uses them, verified by search rather
than assumption: no INSERT/UPDATE/DELETE on `admin_users` anywhere in `src/` (the one reference is
a read at [src/lib/dataAccess.ts:2269](file:///E:/dsh-repo/src/lib/dataAccess.ts#L2269)), and no
notification insert or delete (only `update({read_at})` at `:2601` and `:2618`). `002:57-61`'s
profiles UPDATE policy is owner-bound in **both** USING and WITH CHECK, so no cross-row write was
ever possible regardless of the grant, and `005:84-102` binds the connection INSERT and accept paths
to `auth.uid()` — including `auth.uid() <> recipient_user_id`, which is what makes self-acceptance
fail. `service_role` is untouched by all five files.

## 2. Privacy verification (approved rules 1-5)

| Rule | Enforcement, verified in SQL | Local evidence | Live |
|---|---|---|---|
| 1 Avatars stay public | Nothing in 023-027 touches `storage.buckets`, object policies or `avatar_url`; `avatar_url` stays in 023's granted columns | `028` V7 (≥4 object policies + `public = true`), db-check "rule 1 avatar bucket … untouched", phase-2 "rule 1 public projection and avatar column still readable" | public delivery confirmed 2026-11-03 (`NoSuchKey` on a nonexistent object); **post-apply HTTP fetch not performed** |
| 2 Accepted connections see the name only | `get_connected_peer_names()`: `security definer`, **no arguments**, self-scoped on `auth.uid()`, `status='accepted'`, returns `(user_id, full_name)` | phase-2 "rule 2 accepted non-teammate connection reads the private peer name" (asserts the key set is exactly two columns), "rule 2 revoked connection stops yielding the name" | **not delivered in the product** (R-1); SQL never applied |
| 3 Nothing else reaches that connection | Row policy has no connection branch **and** `revoke select on public.profiles from authenticated` + ten-column grant | phase-2 "cannot read the private row itself", "cannot read gender", "a connection is not a teammate: phone stays hidden", `028` V1/V2 | unverified live |
| 4 No manufactured or redirected membership | 024: INSERT only own row into a team you captain; `grant update (role)` only; derive/guard/reassign triggers; team identity columns ungrantable | phase-2 TEAM 19 (self-insert, `team_id`/`user_id`/`id`/`joined_at` rewrites, forged label, invite-code and competition re-parent all denied) | unverified live |
| 5 Owner keeps their fields; admins keep access | `get_own_profile()` returns the owner's full row; `is_admin()` branch retained; `authenticated` keeps SELECT on `admin_users` | phase-2 "rule 5 owner reads their own private row including gender", "rule 5 admin retains moderation visibility", db-check "rule 5 admin still reads their own mapping row" | **the owner half has no client caller** (R-1) |

Rule 2 and rule 3 are satisfied by the *same* file and the split is the right one: the peer's row
stays invisible, so the name arrives through a function and nothing else can.

## 3. Team integrity verification

| Attempt | Mechanism after 024 | Result locally | Note |
|---|---|---|---|
| Insert an arbitrary membership | new INSERT policy (`user_id = auth.uid()` **and** you captain that team) | denied 42501 | pre-fix: succeeded, then unlocked a teammate phone (reproduced in BASELINE) |
| Add another student directly | same policy | denied | the captain path is the 013 approval RPC, unchanged |
| Reassign `team_id` | `grant update (role)` only | denied | pre-fix succeeded; RLS could not express this, privileges can |
| Reassign `user_id` | same, plus 002's UPDATE policy | denied | pre-fix, policy blocked it while the **privilege** still allowed the attempt — defence in depth, not the boundary |
| Modify protected `role` | `derive_membership_role` BEFORE trigger overwrites the stored value from `captain_user_id` | write succeeds, stored value stays `member` | label is integrity, not authority: approval RPC and team actions still reject a self-declared captain |
| Manipulate invite codes | `competition_teams` UPDATE restricted to `name, status, captain_user_id`; reads stay hidden by 004 | denied | 004 hid the *read* only, so the pre-fix **write landed invisibly** — the dangerous shape |
| Bypass captain approval | 013 `approve_team_join_request` untouched; join-request UPDATE restricted to `status` | non-captain approval raises `P0001`; capacity, deadline and one-team guards still fire | `024` §6 asserts DELETE and INSERT on members survived, which is exactly what leaving/creating needs |
| Reach private teammate info | membership required for both `profile_contacts` (011) and `get_team_member_profiles` | phone count 0 and roster 0 rows without membership | join via code unlocks **only** that roster (tested) |

## 4. Migration 024's blocker, precisely

**What fails.** `024` §0 counts policies before touching any: it requires exactly **1** DELETE
policy on `competition_team_members` (the one `002:182-191` creates) and exactly **1** UPDATE policy
(`polcmd = 'w'`) on `competition_teams` (the one `002:114-118` creates). A mismatch raises with the
names and commands it found and aborts the transaction, so 024 never drops a policy it cannot
identify. 023 §3 is the same pattern for `profiles` (SELECT count 1-3, plus a hard refusal if any
permissive-all SELECT policy for `authenticated`/`public` is present but unnamed).

**What live evidence is missing.** Nothing in the anonymous pass can settle this — `pg_policies`
rows, role-to-policy mapping and column ACLs need a SQL session. Required, in this order: `000` P2
(the full `polname`/`polcmd`/`polroles`/`polqual`/`polwithcheck` text for `profiles`,
`competition_teams`, `competition_team_members`, `competition_team_join_requests`,
`student_connections`, `student_notifications`, `admin_users`, `profile_contacts`), P3 (the same
counts 023/024 assert), P4/P5 (grants including column ACLs), P7 (which triggers actually exist,
including `guard_competition_team_membership`), plus **the corrected P10** for the ledger. Until
those are archived, 024's abort-or-pass is unknown, not predicted.

**Which policy definition must be inspected.** `public.competition_teams`' UPDATE policy. Committed
002 gives one (`"Captains can update their teams"`, `using (auth.uid() = captain_user_id)` with
`with check (true)`). The open question is whether live has that one, a modified copy, or an extra
out-of-band policy — because 024 §4 *replaces the grant underneath whichever policies exist*, and a
second permissive UPDATE policy would keep rows writable that 024 is meant to close. Second:
`competition_team_members`' DELETE policy, for the same reason (024 §1's INSERT replacement assumes
it knows the surrounding set).

**A hypothesis I tested and rejected, recorded so nobody re-spends effort on it.** The live
anomaly (anon reads **0 rows** from `competition_teams` while `002:102-104` says `using (true)`, with
2 memberships proving a team exists) could be explained by `004:29-30`, which revokes table-level
SELECT and re-grants only `id, competition_id, name, captain_user_id, status, created_at,
updated_at`. It is not the explanation: the probe selected `id, name, status, captain_user_id`, all
inside that list, and in PostgreSQL a column grant restricts which columns may be **read**, never
which rows are **visible** — row visibility is RLS's job alone. So the divergence is still open,
and it is a policy/role question, not a privilege one.

**How to reconcile safely, without weakening the preflight.**
1. Dump the live policy text (`000` P2/P3) and diff it against the committed 002/003/004/013
   statements. Three outcomes, each with a different fix.
2. *Extra policy present*: identify its origin from the ledger, then remove or narrow it in its own
   reviewed statement — do not let 024's `drop policy if exists` hit it by name-guessing.
3. *Same count, different expression* (e.g. live UPDATE policy has `with check (true)` but a
   narrower USING): 024 §0 **will pass** because it only counts, so the count is not sufficient
   evidence. Add the expression to the preflight's expectation (compare
   `pg_get_expr(polqual)`/`polwithcheck` text), or record the accepted live form in a comment and
   assert it. Counting is the floor, not the check.
4. *Fewer policies, or renamed*: 024 aborts correctly. Reconcile the committed file to describe the
   live object, or bring live to committed, then re-run.
5. Isolate engine RLS from PostgREST before changing anything: as `postgres`, run
   `begin; set local role anon; select count(*) from public.competition_teams; rollback;`. A nonzero
   count there with zero rows over HTTP places the cause in the API layer (role mapping, an
   out-of-band revoke on the `anon` **role** rather than its grants, or a plan-cache issue), not in
   RLS. This is the step that turns the L-4 mystery into one of two answers.
6. Only then apply 024. If instead the preflight is relaxed to a `NOTICE` "to make it pass", the
   file loses the property that justifies its existence: it is the only guard that stops Phase 2
   from rewriting grants underneath a policy set nobody has read.

## 5. F-11 — the owner decision (explained, not made)

`027` §4 and §8 of `SECURITY_PHASE2_DESIGN.md` apply **neither** option; 027 changes no column, no
constraint and no policy here. Current committed shape from `021`:
`created_by uuid not null references auth.users (id) on delete set null`.

| | Option A — `alter column created_by drop not null` (FK kept) | Option B — FK changed to `on delete restrict` |
|---|---|---|
| Mechanism | the actor column becomes nullable; `SET NULL` fires as 021 wrote it | deletion of a referenced auth user is refused |
| Audit trail | flags survive, `created_by` becomes NULL: the fact that a flag exists is preserved, the identity of who raised it is destroyed | trail fully preserved |
| Admin deletion | works immediately | fails until every flag is reassigned — and no reassignment process or screen exists |
| Security implication | weak **accountability**, not access: moderation flags are admin-write-only (`021:92` grants SELECT/INSERT/UPDATE to `authenticated` and never DELETE), so neither option lets an API role rewrite history. A NULL actor means a disputed flag cannot be attributed, which matters if moderation decisions are ever appealed | the same, plus a denial-of-service on offboarding: admin accounts accumulate because they cannot be deleted, and dormant credentials with moderation rights stay alive |
| Retention implication | satisfies erasure/deletion requests for a departed admin while keeping the record; `resolved_by` is already nullable, so the table becomes internally consistent | cannot delete a user who ever moderated, i.e. the personal-data deletion path is blocked by an audit column |
| Silent risk | attribution loss is invisible: a NULL is indistinguishable from "raised before attribution existed" unless the timestamp is read alongside | the failure is loud (deletion errors), which is easier to operate but easier to "fix" destructively by someone force-deleting rows |
| Consistent with existing design | yes — the audit file already treats actor identity as best-effort (`resolved_by` nullable) | no — it makes one column stricter than its sibling |

Not selecting either. The technically strong position, which needs the owner's records policy to
evaluate: both options trade something away, and the trade may be avoidable — keeping `created_by`
NOT NULL while writing the moderator identity into an immutable history (a `created_by_email` or
`actor_display` captured at flag time, or a separate moderation log) preserves both attribution and
deletability. That is a schema change beyond Phase 2's scope and is **not** implemented anywhere.
Until a decision is recorded, the operational rule is: **do not delete a moderator's auth user**
while 021 is applied with the current definition.

## 6. Test-coverage review (278 / 73 / 47)

Counts reproduce exactly, from clean runs, all exit 0: `security-db-check.mjs` 278 passed 0 failed
(BOOTSTRAP 1, MIGRATION_REPRO 3, PRE_REMEDIATION 10, AFTER_REMEDIATION 131, RERUN_REMEDIATION 132,
SOURCE_INTEGRITY 1), `security-phase2-check.mjs` 73 passed 0 failed (BASELINE 17, PRIVACY 12, TEAM
19, PRIVILEGES 12, PENDING 5, VERIFY 1, VERIFY-AGAIN 1, ORDER 6), `security:check` 47 passed.

The suites are genuine, not decoration: every security assertion has a paired *before* failure, the
role switch is itself verified (`as()` asserts `current_user` **and** `auth.uid()` after each
`SET LOCAL ROLE`), tests run in rolled-back transactions with the JWT claim checked cleared,
`fetch` is overridden to fail so a hidden network call cannot silently produce a green run,
privilege assertions are expressed as behaviour *and* as catalog state, and each file asserts its
own convergence. The phase-2 BASELINE phase is the discipline that the first audit lacked.

Where they can mislead, and why:

1. **The 47 are not privacy tests.** `security-check.mjs` asserts behaviour for
   `urlSafety`/`authErrors` (real TypeScript transpile-and-import, 29 payload cases) and then
   greps source for invariant regexes — e.g. `assert.match(source, /sanitizeExternalUrl\(record\.proofUrl\)/)`
   and `assert.match(data.slice(...), /\.eq\("is_public", true\)/)`. Those pass if the literal is
   present and reachable-looking, whether or not the code path executes, and they cannot see
   coverage, argument order, or a later refactor that strands the call. None of the 47 touches rule
   2, rule 3 or F-01. Reporting them in a privacy context overstates them; they are client-hygiene
   invariants, which is what their own footer says.
2. **`select=*` column filtering is asserted, never observed.** The suites prove PostgreSQL
   denies `select gender from public.profiles`; PostgREST may instead return a 403, omit the
   column, or 404 the projection, and a `select=*` request may quietly drop ungranted columns
   rather than error. That is the difference between "denied" and "silently blank", and R-1's
   `String(row.id)` consequence depends on which. Only the two-account HTTP probe settles it.
3. **No `service_role` coverage** in the privacy paths (documented, but it is the role most able to
   bypass everything, and it is the key the browser never holds — worth stating rather than
   implying).
4. **No concurrency or race tests** — captain transfer racing a join, a double-accept, or
   `approve_team_join_request` called twice concurrently. `024` §4b exists *because* of an
   intermediate state, which is a hint that this class is where the next finding will come from.
5. **Trigger bindings are outside the convergence diff** (R-9), so "re-apply converges" means
   grants and policies, not the trigger set.
6. **`028`'s V6 NOTE can pass a bad state** (R-8), and V7's `>= 4` is a floor rather than an exact
   match, which is right for policies but means a *replaced* policy that still mentions
   `student-avatars` would satisfy it.
7. **024's §0 counts, it does not compare expressions** (R-3/§4 step 3): a live UPDATE policy with
   the right count and a different `USING` clause passes the preflight and then gets a narrower
   grant underneath it.
8. **The simulation's role bootstrap is an assumption, not a measurement** — the shims say so
   plainly: default `ALL` privileges to `anon`/`authenticated`/`service_role` reproduce L-1/L-2's
   mechanism, and if live was provisioned differently, several of these revokes target privileges
   that may not exist there (harmless) while some that do exist may not be modelled.
9. **Untested live behaviour, all still open:** HTTP-level privacy probes A-G at the end of `028`;
   the client migration R-1 requires; `000` actually running (R-2); avatar delivery over HTTP
   **after** 023; GoTrue email-confirmation/enumeration; response headers on the real origin;
   `file_size_limit`/`allowed_mime_types`; whether live policy text matches committed 002/003/004.

Missing negative tests worth adding before staging (each currently unasserted):
`authenticated` executing a **future** definer RPC created after 025 §4 (R-6's open flank);
`anon` calling `get_connected_peer_names()` **with a session claim set** (the fixture only tests
anon without a sub); a non-captain `update competition_teams set captain_user_id` where they are a
*member* but not the captain (002's USING should deny — asserted for outsiders, not for members);
a member attempting `delete from competition_teams`; and 023's column grant against a
`select count(*)`/aggregate on an ungranted column, which exercises a different PostgREST path.

## 7. Exact staging prerequisites

A prerequisite list, not a re-run of the design doc's apply order. Anything unmet is a stop.

1. A SQL session on a **clone/branch** of production with a restore point. No production apply.
2. `000` P10 corrected (R-2) and its output **archived**, including P2, P3, P4, P5, P7, P8, P9, P10.
   P10 is what converts "017-021 are unapplied" from an anonymous `PGRST205` inference into a fact.
3. `begin; set local role anon; select count(*) from public.competition_teams; rollback;` and the
   same as `authenticated` (§4 step 5). Record the numbers before editing any grant.
4. The diff between that live policy text and committed 002/003/004/013, resolved — not merely
   noted. If 024 §0's counts disagree with live, Phase 2 stops until it is understood.
5. **Client work for R-1 complete**, or the apply is deferred: owner reads and post-write re-reads
   through `get_own_profile()`; peer-name resolution through `get_connected_peer_names()`; the
   directory and public-page projections confirmed against 023's ten columns; `mapProfile`'s
   `String(row.id)` guarded so an omitted column cannot become `"undefined"`; and the gender
   validation at `DashboardPage.tsx:242` revisited so a blank read cannot block a save.
6. Ship the client build **before** 023 (the same ordering rule `004`'s header states for its own
   RPC), so no window exists where the SQL denies a read the UI still expects.
7. Two synthetic accounts, no real student data, with the `028` A-G HTTP probes ready to run.
8. Both DB suites re-run against any edited file (73 and 278), plus `security:check` 47, before the
   window — and the run must postdate the last SQL edit, not precede it.
9. A decision recorded for F-11 (§5) and an explicit instruction not to delete a moderator auth
   user while it is undecided.
10. `npm ci` on the operator machine so `vite@6.4.5` matches the lockfile (the local tree is still
   5.4.21, locked by another session's dev server). Not a staging blocker for SQL, but it gates the
   client build in step 5.

## 8. Recommended order, and status

1. R-1 client work (nothing else can be validated on staging until the owner/peer paths exist).
2. Fix `000` P10 (R-2) → run preflight → archive → resolve the live policy diff (§4), including
   making 024 §0 compare expressions, not only counts (R-3).
3. Correct the two rollback blocks (R-4, R-5) so the incident path is truthful; they are comments,
   so this is cheap and it is the text an operator will actually execute.
4. Settle the R-6/R-7 prose-and-scope question on 025 §4, and add a `pg_default_acl` check to `028`
   or `000` so the default-privilege fix is verifiable instead of assumed.
5. Apply 023 → 024 → 025 → 026 → 028 → 027 (last, and again after 017/019/021), then `028`, then
   re-run `000` and diff, then the HTTP probes.
6. Add `pg_trigger` to the convergence snapshots (R-9) and give V6 a gate or split it into a
   separate advisory file (R-8).

**Final status: NOT READY FOR STAGING.** Not because the design is wrong — the privilege/policy
split, the parameterless name path, the order-independence guard, the assertion-before-drop
discipline and the before/after evidence are all sound, and this review found no path by which an
unauthorized reader gets private data *if* 023-027 are applied. It is not ready because 023's
owner-side contract is unmet in the client (R-1: a real regression to the owner's own profile and
rule 2 still undelivered), because the preflight artifact that the whole plan depends on cannot
answer its one critical question (R-2), and because the live policy divergence is still unresolved
and unmeasurable with the queries as written (R-3).

Nothing in this review was executed against the live project; every live claim is inherited from the
2026-11-03 pass in `LIVE_DB_VERIFICATION.md` and remains unverified.

---

## Addendum — resolution status after Phase 2.1 (same day)

This review's findings were worked through in a follow-up pass. The text above is left as written,
because it is an independent artifact; this section records what happened to each claim, including
the two places where this review was itself wrong.

| Finding | Status | What resolved it |
|---|---|---|
| R-1 client integration | **resolved** | `getCurrentUserProfile()` calls `rpc("get_own_profile")` with the table read retained only as a documented missing-function fallback; `createProfile`/`updateProfile` no longer project the whole row and re-read authoritatively; `getConnectedPeerNames()` feeds `assembleConnections` (new `peerName`) and the private-profile notice; `mapProfile` no longer yields `"undefined"`; a privilege-filtered owner read is reported as a load error rather than a blank gender. Locked by six new `security:check` invariants, one of which compares DIRECTORY_COLUMNS against 029's grant list |
| R-2 ledger query | **resolved, and two more found** | P10a/P10b split, with an honest ABSENT branch. Running `000` in the harness then surfaced P2 (`unnest(...) r` aliasing → `42703`) and P3 (`polcmd` uncast → `42725`, "operator is not unique: text || \"char\""). `000` is now executed by `security-phase2-check.mjs`, so all three are regression-protected |
| R-3 expression verification | **resolved** | 024 §0 now compares name, command, roles, permissive flag and both expressions for every policy on the two team tables, refuses any unnamed policy, refuses a RESTRICTIVE policy, refuses more than one policy per command, checks for 013's guard trigger, and recognises its own output so a re-apply still passes. Fail-closed behaviour preserved; nothing was relaxed |
| R-4 024 rollback | **resolved** | all three triggers, all three functions, the EXECUTE grant, the 002 INSERT policy and the three table-wide grants are restored, and the block is executed by the harness — which verifies the three triggers are actually gone and that F-02 really reopens before re-applying |
| R-5 026 rollback | **resolved** | restores `insert, delete` on `student_notifications`; also converted to executable `--$ ` lines, as were 023, 024, 025, 027 and 029 |
| R-6 default-privilege scope | **resolved by a correction, not by the fix this review expected** | the decision (retain `authenticated` function defaults) is now stated with reasons and an exit condition. Measured: revoking function defaults cannot remove PUBLIC EXECUTE, so both the defacl-NULL path and the explicit `=X/grantor` path leave anon able to execute a new function. The real control is the new 025 §2b explicit revoke plus 028 V6's gate; the harness asserts the measurement rather than the hope |
| R-7 operator trap | **resolved** | 025 §4 states that default privileges bind to the executing role; `000` gains P11 (`pg_default_acl` per creating role) and P11b (schema CREATE); 028 V10 raises when a creating role still arms default **table** privileges for an API role, and when an API role holds CREATE on `public` |
| R-8 V6 as a gate | **resolved** | V6 now raises on any unpinned definer function and on any definer function reachable by anon outside a five-entry allowlist with written reasons, and confirms both 023 functions exist, are definer, are pinned and are not anon-reachable. Making it a gate is what **found nine real L-2-class cases** the NOTICE had been passing — the strongest argument in this set for notices not being proof |
| R-9 trigger convergence | **partly resolved; the review overstated it** | the phase-2 harness's `aclFingerprint` now includes `tgname`, `tgrelid`, `tgfoid`, `tgtype`, `tgenabled` and `tgargs`. But `security-db-check.mjs`'s `aclSnapshot` **already** included `pg_get_triggerdef(t.oid)`, which encodes timing, events, column list and bound function — so R-9 applied to one harness, not both, and this review should have checked which. Corrected here rather than left as a claim |
| R-10 `position` columns | unchanged — confirmation, not a finding | |
| §6 item 2 "is `select=*` filtering silent or an error?" | **answered from existing evidence** | the 2026-11-03 live record already shows anon receiving `401/42501` for `select=*` and for ungranted columns on `profiles`. So the failure mode is a loud privilege error, not silent omission. That is what made R-1 a blocker rather than a cosmetic gap, and it is why the client now refuses to treat a filtered owner read as an empty field |
| §6 "the 47 are not privacy tests" | **aggravated, then addressed** | the count is now 53, and the six additions are exactly the client/SQL consistency invariants that were missing — including a cross-file check that every requested directory column is granted by 029. They are still source-regex checks, not behavioural ones; that limit is restated in `STAGING_TEST_PLAN.md` |
| §7 item 6 "ship the client before 023" | **withdrawn — it was the wrong direction** | 023 is additive, so applying it first is harmless; 029 is the file that removes access, so it is 029 that must follow the client. `SECURITY_PHASE2_DESIGN.md` §7 explains the inverted 004 analogy, and S8.2 stages the breakage deliberately to prove the ordering |

**Suites after 2.1:** `security-db-check.mjs` 279/0, `security-phase2-check.mjs` 90/0 (adding
NEGATIVE 5, ROLLOUT 10 and an ORDER phase that now also runs `000`), `security:check` 53/0,
`typecheck` pass, `build` pass.

**Status after 2.1: unchanged in kind, narrowed in scope.** Phase A is ready for staging review.
Phase C remains **blocked by missing evidence**: L-4's live policy text is still unread, and 024's
preflight is designed to abort rather than proceed without it. The blocking reason is now precisely
one item — `000` P2/P3 and P12 executed and archived on a SQL session — instead of the three it was
when this review was written.
