# JAVLIN Phase 2 — privacy and privilege SQL design, and its verification

Status: **DESIGNED, VERIFIED LOCALLY, NOT APPLIED ANYWHERE.** The label from
`SECURITY_AUDIT_REPORT.md` still holds — **HIGH-RISK ISSUES REMAIN LIVE**, because F-01 and
F-02 are closed only by files that no database has executed.

**Amended 2026-11-10 by Phase 2.1.** The profiles half is now two files, because the additive and
restrictive halves cannot ship at the same moment: `023` creates the definer paths and `029`
removes the broad access. The client side is wired (owner reads, post-write re-reads, peer names),
which the first draft of this design assumed without proving. The operator's read-only script was
itself found to contain three queries that error on any real project. Read
`PHASE_2_REMEDIATION_PLAN.md` for the sequence, `STAGING_TEST_PLAN.md` for the tests, and
`PHASE_2_1_COMPLETION_REPORT.md` for what moved.

Baseline: workspace `E:\dsh-repo`, branch `main`, HEAD `175c93b`, everything uncommitted.
This pass connected to no live project, ran no migration against Supabase, deployed nothing,
and touched no real student row. Every scenario used synthetic identities.

## 1. Why the numbering starts at 023

The live ledger contains versions 015 and 016 (established by the read-only pass recorded in
`LIVE_DB_VERIFICATION.md` §2). The repository's own headers claim those are unapplied, so a new
file numbered 017+ would collide with applied history. `022_rls_privacy_hardening.sql` was
authored during the first audit, applied nowhere, and is now **discarded** — see §5. Files in
`supabase/security-review/` are deliberately *not* in `supabase/migrations/`: nothing here
should be picked up by an automated apply before an approved window.

| File | Role | Findings / rules |
|---|---|---|
| `000_read_only_preflight.sql` | read-only probe, run first, archive output (P1-P12) | preconditions for everything below |
| `023_profile_privacy_name_only.sql` | **Phase A, additive**: the two definer paths only | rules 2 and 5, the enabling half of F-01 |
| `024_team_membership_integrity.sql` | membership and team identity, with an expression-comparing preflight | F-02, F-03, F-06, rule 4 |
| `025_anon_privilege_corrections.sql` | privilege mechanism, `admin_users`, generator, definer-RPC revoke loop, defaults | L-1, L-2, F-04 |
| `026_connection_and_notification_immutability.sql` | accumulated grants on the two tables | F-05 |
| `027_pending_table_corrections.sql` | existence-guarded corrections for 017/019/021 tables | F-09, F-11 (documented, not decided) |
| `028_read_only_verification.sql` | read-only effective-state checks V1-V10 | everything above |
| `029_profile_privacy_enforcement.sql` | **Phase C, restrictive**: the profiles policy and column privileges | F-01, rules 3 and 5 |

## 2. Approved rules, and what actually enforces them

The five privacy rules came from the product owner and are authoritative. The load-bearing
decision in every case is the same: **a projection in `src/lib/dataAccess.ts` is not a
boundary.** Column privileges and row policies are.

| Rule | Enforcement | Why this and not something simpler |
|---|---|---|
| 1. Avatars stay public | Nothing in 023-027 or 029 touches `storage.buckets`, object policies or `avatar_url`; `avatar_url` stays in 029's granted columns | V7 and the `rule 1` assertions in both harnesses prove the four object policies and `public = true` survived. Accepted consequence: an avatar URL stays fetchable after a profile turns private |
| 2. An accepted connection may read the private owner's **name** | `get_connected_peer_names()` — `security definer`, **zero parameters**, returns `(user_id, full_name)` and nothing else; created by 023, consumed by `getConnectedPeerNames()` in `src/lib/dataAccess.ts` | A `profiles` SELECT policy with a connection branch would hand over the whole row. The function re-checks `student_connections` itself; no parameter means no caller can point it at somebody else's relationship. **Client wiring is part of this rule**: an unwired rule 2 is a rule that is not delivered |
| 3. Every other private detail stays hidden | 029: `revoke select on public.profiles from authenticated` plus `grant select (10 discovery columns)`; `gender`, `id`, `created_at`, `updated_at` become unreachable for every non-owner | This is the half that closes F-01. A row policy alone leaves `select=gender&is_public=eq.true` working, because privileges are checked before rows are filtered |
| 4. No manufactured or redirected team membership | INSERT policy restricted to "your own row, into a team you captain"; `revoke update` then `grant update (role)` on members; `grant update (name, status, captain_user_id)` on teams; `derive_membership_role`, `guard_team_captain_identity`, `reassign_membership_roles` triggers | RLS cannot express "the value must not change" — the owner branch is satisfied either way. Column privileges are the only enforcement, which is why 002's table-wide UPDATE had to go, not just its policy |
| 5. The owner keeps their own fields; admins keep admin rights | `get_own_profile()` for the owner's full row (023 creates it, the client calls it, 029 refuses to run until it exists); `is_admin()` branch retained in the row policy; `authenticated` keeps SELECT on `admin_users` for its own mapping row | Removing the broad read without an owner path breaks the dashboard: `select=*` on one's own row becomes a privilege error, and the gender field then silently blocks the save at `DashboardPage.tsx:242` |

Rule 1 and rule 2 pull in opposite directions and the design resolves that by splitting the
paths: name through a function, image through a public bucket, everything else through nothing.

## 3. Privilege mechanism (025) and the one thing that must not be revoked

L-1 (`anon` holds table SELECT on `admin_users`) and L-2 (`anon` can execute
`new_team_invite_code()`) are one mechanism: Supabase's bootstrap installs `ALTER DEFAULT
PRIVILEGES ... grant all ... to anon, authenticated, service_role`, and a later
`revoke all on ... from public` removes only the pseudo-role PUBLIC's privileges, leaving the
explicit grant recorded for `anon`. So **every revoke in 025 names `anon` and `authenticated`
explicitly**, and section 4 fixes the source with `alter default privileges ... revoke all on
tables from anon, authenticated`.

Two deliberate keeps, each of which an earlier draft got wrong:

- `anon` **keeps** EXECUTE on `is_admin()`. `001:229` and `001:242` install anon-visible
  policies that call it, and PostgREST evaluates those expressions as `anon`. Revoking it
  breaks public listings. The first 022 draft did exactly this.
- `authenticated` **keeps** EXECUTE on `new_team_invite_code()`. It is
  `competition_teams.invite_code`'s column DEFAULT, so the inserting role evaluates it (010:46-47).

`TRUNCATE`, `REFERENCES` and `TRIGGER` are revoked table-by-table over whatever exists at run
time rather than from a hard-coded list, because the repository's list is not a description of
production. TRUNCATE matters most: it bypasses RLS and row triggers.

Two things this pass measured and had to correct in its own design:

- **§2b exists because nine more L-2 cases were found, not one.** Making 028 V6 a real gate
  instead of a `RAISE NOTICE` immediately reported that anon could execute nine more SECURITY
  DEFINER functions (`join_competition_team_by_code`, `approve_team_join_request`,
  `register_for_competition_solo`, `submit_competition_team_registration`,
  `withdraw_competition_registration`, `my_competition_registration`,
  `competition_registration_records` and the two 013 guard functions). None disclosed data — each
  checks `auth.uid()` internally — but "the function's own code is the boundary" is precisely the
  claim L-1 and L-2 disproved. §2b revokes anon EXECUTE on every definer function except five with
  a written reason.
- **Default privileges cannot fix that for future functions.** Measured two ways: emptying the
  function default ACL leaves the next function's `proacl` NULL, i.e. the system default, which
  grants EXECUTE to PUBLIC; leaving a default ACL that names other roles puts an explicit
  `=X/grantor` PUBLIC entry on the next function anyway. anon inherits PUBLIC privileges, so
  `has_function_privilege('anon', ...)` is true either way. The control that works is the explicit
  revoke in the creating migration (025 §2b for what exists) plus 028 V6 gating the catalog
  (for whatever gets created next). 025 §4's prose now says this instead of implying the revoke
  finished the job, and the harness asserts the measurement.

## 4. Order independence (027) and why it is a separate file

The live project has 001-016 applied and 017-021 not applied. The discarded 022 revoked
privileges on `events`, `student_skills`, `student_experience` and `profile_moderation_flags`
inside one explicit transaction — applied today it fails `42P01 relation does not exist` and
rolls back the profile and membership protections too. A local suite that applies 001→022
chronologically cannot see this, which is how it was missed the first time.

027 therefore guards every statement with `to_regclass`, and `security-phase2-check.mjs` proves
both halves on a second in-memory instance built to the live shape: applied while those
relations are absent it succeeds and reports skips; applied after 017/019/021 it narrows them
and also re-converges deliberately injected grant drift.

F-11 (`profile_moderation_flags.created_by uuid not null ... on delete set null`) is **not
decided here**. It is a records-retention question, and deleting a moderator's auth user will
fail today. 027 states option A (drop NOT NULL, keep the FK — flags survive, actor becomes
unknowable, which is the truthful state) and option B (ON DELETE RESTRICT — the trail survives,
the deletion fails, needs a reassignment process that does not exist). Until the owner chooses,
028's V9 reports the conflict as still open.

## 5. What changed between the first audit and this design

- The 022 profiles policy had no connection branch at all, so it *contradicted* approved rule 2:
  a connected peer's row vanished and the UI printed "No longer on CIRCLE". It also narrowed
  rows only, leaving `gender` reachable, so rule 3 was unsatisfiable by it.
- 022's team triggers were drafted `SECURITY DEFINER`. 024 uses invoker rights for the two that
  need no elevation, and definer only for `reassign_membership_roles`, where invoker rights
  provably leave a team with zero captains mid-transfer.
- 022's privilege list was a static enumeration of 24 tables. 025 loops over what exists and
  025 §4 stops new tables from inheriting the hole.
- Two corrections came from re-running the *other* harness against these files, not from the
  design pass itself: 026 now revokes `insert, delete` on `student_notifications` from
  `authenticated` (006:140 names only `anon`, so the bootstrap grant survived; RLS turned the
  writes into silent no-ops instead of `42501`), and 027 §2 now narrows
  `student_experience` INSERT as well as UPDATE (019:180 let a client supply its own `id`).

**Added by Phase 2.1, after the independent review found the design correct but not deployable:**

- 023 is split: `023` creates the definer paths and removes nothing; `029` removes the broad access
  and refuses to run until 023's functions exist. The first version of this document told the
  operator to ship the client before 023, which is the wrong direction (§7).
- The client is wired to both RPCs. Until then rule 2 was not delivered in the product and rule 5
  was one privilege error away from a broken dashboard — `select=*` on one's own row returns
  `42501`, as the live record already shows for anon.
- 024's preflight compares policy names, commands, roles, permissive flags and expressions rather
  than counting policies, and refuses any permissive policy it cannot name.
- 025 gains §2b (revoke anon EXECUTE on every definer function except a five-entry allowlist with
  written reasons) and §4's prose now states what its SQL actually does, including the measured fact
  that default privileges cannot remove the PUBLIC EXECUTE grant from future functions.
- 028 V6 became a gate instead of a NOTICE, and V10 reports armed default privileges and API-role
  CREATE on `public`.
- Every rollback block is machine-readable (`--$ ` lines) and is executed by
  `security-phase2-check.mjs` in its ROLLOUT phase. 023/024/026/027/029/030–033 reverse and
  re-converge fully; **025 is partial** — its static §1/§2/§4 halves restore, its dynamic §2b/§3
  catalog loops do not, and the suite asserts that gap explicitly rather than claiming a full restore
  (see SECURITY_MIGRATION_GUIDE.md → "025 is the exception").
- `000` was found to contain three queries that error on any real project — the ledger's
  three-part name, P2's `unnest(...) r` alias (`42703`), and P3's uncast `polcmd` (`42725`). It is
  now executed by the harness, which is the only reason those were found rather than met by an
  operator mid-window.

## 6. Verification record

Three local suites, all green at the time of writing. None of them is evidence about production.

| Command | Result | What it covers |
|---|---|---|
| `node scripts/security-db-check.mjs` | **279 passed, 0 failed** | product-behaviour suite. Applies 001-021, reproduces F-01…F-05 and the L-2 privilege class (`PRE_REMEDIATION`, 11), applies 023-027 and 029, re-runs the full flow suite (`AFTER_REMEDIATION` 131, `RERUN_REMEDIATION` 132), asserts the ACL/policy/**trigger** snapshot converges identically on re-apply, and that no migration or proposal file changed mid-run |
| `node scripts/security-phase2-check.mjs` | **90 passed, 0 failed** | approved-rule suite: BASELINE 17, PRIVACY 12, TEAM 19, PRIVILEGES 12, PENDING 5, NEGATIVE 5, then `028` raising nothing (VERIFY, VERIFY-AGAIN), ORDER 8 (the 016-shaped second instance, **including executing `000_read_only_preflight.sql` itself**), ROLLOUT 10 (the expand-and-contract sequence with every rollback block extracted and run) |
| `npm run security:check` | **53 passed** | static/client invariants, now including the R-1 client half: the owner RPC is called, its fallback is gated on a missing function only, writes no longer project the whole row, `mapProfile` tolerates an omitted column, and DIRECTORY_COLUMNS is verified to be a subset of the columns 029 grants |
| `npm run typecheck`, `npm run build` | pass | the client edits compile and bundle |

Engine: PGlite 0.3.14 (PostgreSQL 17.5), pinned by the audit cache, network disabled by
overriding `fetch`. Seven documented shims in the phase-2 harness, four in the DB harness:
`auth.users`/`auth.uid()` emulator, role emulator, minimal `storage.buckets`/`objects` with
`foldername()` (bucket row now carries `file_size_limit`/`allowed_mime_types` columns so 000 P9
runs, values null), `ALTER DEFAULT PRIVILEGES` bootstrap **assumed** rather than measured,
`create extension pgcrypto` omitted, and the second instance's 016-shaped schema.

What these suites cannot see, and therefore what is still not certified:

- PostgREST, GoTrue and Storage-over-HTTP. **Partly settled now by the live record**: the 2026-11-03
  pass shows anon receiving `401/42501` for `select=*` and for ungranted columns on `profiles`, so
  a column-restricted reader errors rather than silently returning fewer columns — which is why the
  owner read had to move to the RPC instead of being left on `select("*")`.
- The real production ACLs. If live `competition_teams` policy text differs from committed 002 —
  which the read-only pass already found once (L-4) — 024's preflight aborts by design, and now
  aborts on expression mismatch as well as on count.
- Concurrent races, row counts, and any pre-existing malicious membership that would need
  cleanup rather than a new restriction.
- Real student data. The behaviour suite seeds nine synthetic users and the rule suite eight,
  all with `example.invalid` addresses and `+1 202 555 01xx` numbers.

## 7. Apply order — and why "ship the client first" was the wrong instruction

The first-draft next-actions list said to deploy the client build before 023, by analogy with
004's invite-code RPC. **That is inverted, and the analogy was the problem.** 004 *removed* a
read the old client still performed, so a client-first order was right there. 023 only *adds*
functions, so applying it first is harmless; 029 is the file that removes anything, and it is the
one that needs the client already running. Applying 029 first breaks the owner's own profile read
loudly (`42501` on `select=*`), which the 2026-11-03 live record already demonstrates for anon, and
which S8.2 stages deliberately to prove.

The sequence is therefore expand → deploy → contract, in three phases, each with its own gate:

1. **Phase A** — `000`, then `023 → 024 → 025 → 026 → 027`, then `028`. Nothing is removed, so the
   client running today is unaffected. F-01 is **still open at the end of Phase A**: that is the
   point, not an oversight.
2. **Phase B** — deploy the client that calls `get_own_profile()` and `get_connected_peer_names()`,
   and verify S1 against a Phase A database where both the broad read and the RPCs work.
3. **Phase C** — `029`, then `028`, then re-run `000` and diff the two outputs, then the S3-S6 HTTP
   probes. 027 runs again after 017/019/021 eventually apply, in either order.

023, 024, 025, 026, 027 and 029 each carry a ROLLBACK block, and `security-phase2-check.mjs`
extracts the `--$ ` lines from each file and **executes** them, then re-applies and compares the
ACL/policy/trigger snapshot. **025's block is partial**: it restores the static §1/§2/§4 halves but
not the dynamic §2b/§3 catalog loops, and the ROLLOUT test asserts that gap explicitly instead of
claiming a full snapshot restore for 025. Rolling back 029 reinstates F-01; rolling back 024 reinstates
F-02/F-03/F-06; rolling back 023 while 029 stands removes the owner's only full-row path. Treat
rollback as an incident, not a resting state. `028` is read-only and `000` changes nothing, so
neither needs one.

## 8. Open decisions for the owner

1. **F-11** — option A or B in 027 §4, before anyone deletes an admin auth user. Both options, a
   third shape that avoids the trade-off, and the security/retention implications of each are in
   `PHASE_2_FINAL_HUMAN_REVIEW.md` §5. Nothing here decides it: 027 §4 applies neither, and 028 V9
   keeps reporting the conflict as open.
2. **F-10** — public roster identity stays listable by design (002 exposes roster IDs, counts and
   captain IDs). 023-027 and 029 keep that. Correlating a public roster ID with a public profile
   remains possible; closing it is a product decision, not a privilege fix.
3. **Sequencing against features** — 017-021 are unapplied, so production features already call
   relations that do not exist (L-6). Applying 023-026 and 029 does not fix that and 027 does not
   make it worse; but the owner should decide whether the privacy files or the feature migrations
   land first, because the answer changes what `000` reports next time.
4. **Whether 027 stays a review file** — once 017/019/021 are applied and `028` V9 reports no
   skips, 027's useful half is the drift-convergence property, which argues for promoting it to a
   real migration and keeping 023-026 and 029 there too. That is a process decision this pass did
   not make.
5. **`authenticated` EXECUTE on functions created in the future** (new in 2.1) — currently retained,
   and 025 §4 records the measured reason: revoking the default does not remove the PUBLIC EXECUTE
   grant that both API roles inherit, so the revoke would be theatre while 028 V6 gates the actual
   exposure. If PUBLIC execute on functions is ever removed project-wide, this decision must be
   taken again with a full RPC inventory — it can break every signed-in flow.
6. **Whether S8.2's deliberate breakage is demonstrated at all** — applying 029 against the old
   client build proves why Phase B must precede Phase C, but it means breaking a staging profile
   page on purpose. It belongs on a scratch copy, and the owner should say if it is not to be done.
