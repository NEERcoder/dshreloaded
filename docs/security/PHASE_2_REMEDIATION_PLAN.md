# JAVLIN Phase 2 — remediation plan (executable, post-2.1)

Status **PLANNED, LOCALLY VERIFIED, NOTHING APPLIED**. No database outside a local in-memory
PostgreSQL has received any statement in this directory. This file is the operator's sequence;
`SECURITY_PHASE2_DESIGN.md` holds the reasoning, `STAGING_TEST_PLAN.md` holds the tests, and
`PHASE_2_1_COMPLETION_REPORT.md` holds what changed and what is still unknown.

## 1. The artifact set

| File | Half | What it does | Safe to apply before the client ships? |
|---|---|---|---|
| `000_read_only_preflight.sql` | evidence | P1-P12, read-only; P10a/P10b ledger, P11 `pg_default_acl`, P11b schema CREATE, P12 role probes | yes — it changes nothing |
| `023_profile_privacy_name_only.sql` | **A (additive)** | creates `get_own_profile()` and `get_connected_peer_names()`, grants EXECUTE to `authenticated`, revokes from `public`/`anon`. Removes nothing | **yes** |
| `024_team_membership_integrity.sql` | A | membership INSERT policy, column-scoped UPDATE grants, three guard/derive triggers, expression-comparing preflight | yes — no client path writes those columns |
| `025_anon_privilege_corrections.sql` | A | `admin_users` privileges, generator EXECUTE, §2b definer-RPC revoke loop, TRUNCATE/REFERENCES/TRIGGER over every existing table, default-privilege fix | yes |
| `026_connection_and_notification_immutability.sql` | A | collapses accumulated UPDATE grants; revokes unused INSERT/DELETE on notifications | yes |
| `027_pending_table_corrections.sql` | A | existence-guarded skills/experience narrowing + late-table hardening; documents F-11 without deciding it | yes |
| `029_profile_privacy_enforcement.sql` | **C (restrictive)** | drops the permissive-all profiles policy, installs the owner/public/admin policy, narrows profiles SELECT/INSERT/UPDATE to the ten columns | **NO — requires the Phase B client** |
| `028_read_only_verification.sql` | evidence | V1-V10, read-only, every section raises on an unsafe state | after each phase |

Why 022 was discarded and why numbering skips 028 for the enforcement half are in
`SECURITY_PHASE2_DESIGN.md` §1 and §5; the live ledger already contains 015 and 016, and 029 is
the next free version after 028.

## 2. Phase A — expand

Run against a clone/branch of production, never against production first:

1. `000` → **archive the output**. Two gates decide everything downstream:
   - **P2/P3**: is live `competition_teams`' UPDATE policy the committed one
     (`using (auth.uid() = captain_user_id)` / `with check (true)`) and is live
     `competition_team_members`' DELETE policy the committed one? 024 §0 compares names,
     commands, roles, permissive flags AND expressions, and aborts on anything it cannot name.
   - **P10a/P10b**: which migrations are actually recorded. This is the query that used to fail
     `0A000`; ABSENT is a legitimate answer but must be stated, not inferred.
2. `begin; set local role anon; select count(*) from public.competition_teams; rollback;` (P12)
   and the same for `profile_contacts`, `student_connections`, `admin_users`. This separates
   engine RLS from PostgREST behaviour and is the only way to close L-4.
3. Apply **023 → 024 → 025 → 026 → 027** in that order, each as its own batch. 024 and 023 abort
   on their own preflight if step 1 found drift — that abort is the designed outcome, not a
   failure to route around.
4. `028`. It must raise nothing. If V6 or V10 fires, the live catalog contains a function or a
   default ACL that this repository does not describe: stop and reconcile.
5. Re-run `000`. The **diff between the two outputs is the evidence**; 028 passing alone is not.

Expected state after Phase A: every private field F-01 exposes is still reachable by
`authenticated` — deliberately. Phase A buys the *paths*, not the *restriction*. Nothing about
the running application changes, and the old client keeps working because nothing was removed.

## 3. Phase B — deploy the client

Ship the build that contains:

- `getCurrentUserProfile()` calling `rpc("get_own_profile")`, with the pre-029 table read as a
  fallback used **only** when the function does not exist. That fallback is what makes Phase B
  safe in either order; it is asserted by `npm run security:check`.
- `createProfile`/`updateProfile` writing without a returning projection, then re-reading through
  the same owner path.
- `getConnectedPeerNames()` → `rpc("get_connected_peer_names")`, feeding `assembleConnections`
  and the private-profile notice. It degrades to an empty map when 023 is absent.
- `mapProfile` tolerating an omitted column instead of producing `"undefined"`.
- DIRECTORY_COLUMNS unchanged: the ten columns 029 grants, and never `gender`, `id`,
  `created_at` or `updated_at`.

Verify with two synthetic accounts (see `STAGING_TEST_PLAN.md`, S1 and S2) **before** Phase C, so
the owner read and the peer-name read are proven against a database where both the broad read and
the RPC work.

## 4. Phase C — contract

1. `029_profile_privacy_enforcement.sql`. Its §0 refuses to run if 023's functions are absent or
   not executable, and refuses to run against a profiles SELECT policy set it cannot name, so
   applying it out of order aborts rather than half-applying.
2. `028`. V1/V2 now assert the restricted state; V6 gates definer functions and anon reachability;
   V10 gates armed default privileges and API-role CREATE on `public`.
3. Re-run `000` and diff.
4. `STAGING_TEST_PLAN.md` S3-S9, including the HTTP probes no SQL harness can make.
5. `027` again after 017/019/021 are eventually applied, and `028` again after that.

## 5. Rollback

Each of 023, 024, 025, 026, 027 and 029 carries a ROLLBACK block whose `--$ ` lines are extracted
and **executed** by `security-phase2-check.mjs` (phase ROLLOUT), followed by a re-apply and a
convergence comparison. That is the only reason to trust them as procedures rather than prose.

- Rolling back **029** reopens F-01 exactly as it was. It does not restore 023's functions, and it
  should not: they grant no access beyond the caller's own row.
- Rolling back **024** reopens F-02/F-03/F-06 and must remove all three triggers, their functions
  and the EXECUTE grant on `reassign_membership_roles()`, which it now does.
- Rolling back **023 while 029 stands** removes the owner's only full-row path. The harness proves
  that state explicitly; if 023 must go, roll 029 back first.
- Rolling back **026** now also restores `insert, delete` on `student_notifications`.

## 6. What this plan cannot decide

- **F-11** — options A/B (and the third shape, immutable actor history) in
  `SECURITY_PHASE2_DESIGN.md` §8 and `PHASE_2_FINAL_HUMAN_REVIEW.md` §5. Until it is decided: do
  not delete a moderator's auth user on a project where 021 is applied.
- **L-4** — the live `competition_teams` divergence. Unresolved as of this pass because it needs a
  SQL session. Phase C stays blocked until step 1 of Phase A is archived and reconciled.
- Whether 023-029 get promoted into `supabase/migrations/`. They are review files until an
  approved window; promotion is a process decision for the owner.
- `authenticated` EXECUTE on future functions: retained deliberately, with the measured reason in
  025 §4. If PUBLIC execute is ever removed project-wide, that decision must be revisited with a
  full RPC inventory first.
