# JAVLIN — Security Migration Guide (Phase 2.1)

Date: 2026-11-14 · Applies to `supabase/security-review/` · **Nothing here has been applied to any database.**

These migrations are local-only proposals. This guide is for a controlled **staging clone**. Do not run
any of it against production without the approval checklist at the bottom. Spec §1 rules 10–12 forbid
production writes, deployment and pushes from this work.

## Files and roles

| File | Kind | Purpose |
|---|---|---|
| `000_read_only_preflight.sql` | read-only | Catalog baseline (policies, ACLs, triggers, definer inventory). Run first; archive output. |
| `023_profile_privacy_name_only.sql` | **Phase A (additive)** | Creates `get_own_profile()` / `get_connected_peer_names()`, grants discovery projection. Removes nothing. |
| `024_team_membership_integrity.sql` | Phase C | Membership INSERT/UPDATE lockdown, role derivation, captain-transfer guard + label reassignment, team/join-request identity columns. |
| `025_anon_privilege_corrections.sql` | Phase C | Default-privilege mechanism; `admin_users` anon SELECT removed; definer EXECUTE allowlist; TRUNCATE/REFERENCES/TRIGGER revoked. |
| `026_connection_and_notification_immutability.sql` | Phase C | Connection/notification identity columns immutable. |
| `027_pending_table_corrections.sql` | Phase C | Remaining pending-table grants; existence-guarded (`to_regclass`) so it runs on a 016-shaped schema. |
| `028_read_only_verification.sql` | read-only | Verifies definer search_path/EXECUTE and trigger bindings/enabled status. Run after Phase C. |
| `029_profile_privacy_enforcement.sql` | Phase C | Revokes authenticated table-wide SELECT (regrants 10 discovery columns) and narrows authenticated INSERT/UPDATE to owner-writable columns. Changes **no anon grant or policy** — anonymous profile writes stay blocked by RLS, not by a revoke. **Requires 023 first.** |
| `030_contact_captain_only.sql` | Phase C | Captain-only phone policy + roster RPC phone gate. Requires 011 + 024. |
| `031_registration_privacy.sql` | Phase C | Registration SELECT narrowed to six columns. Requires 013. |
| `032_join_request_integrity.sql` | Phase C | Pending-only INSERT; UPDATE forbids `approved`; `update(status)` grant. Requires 003 + 013. |
| `033_membership_concurrency.sql` | Phase C | Advisory-lock membership guard (create-or-replace preserves trigger binding). Requires 013. |

`022_rls_privacy_hardening.sql` is **discarded** (L-7). Do not apply it.

## Ordering and dependencies

```
000 (read-only baseline)
└─ Phase A: 023                         ← additive; safe with the OLD client still deployed
   └─ Phase B: deploy the aligned frontend
      └─ Phase C: 024 → 025 → 026 → 027 → 029 → 030 → 031 → 032 → 033
         └─ Phase D: 028 (read-only verification) + two-account staging tests
```

Hard dependencies enforced by each file's preflight:
- 029 aborts unless 023's RPCs exist (the rollout guard).
- 027 must follow 025 (default-privilege fix it relies on).
- 030 follows 024 (captaincy must be trustworthy before phone is keyed to it).
- 031/032/033 follow 013 (they reference its tables/RPCs/trigger).
- 033's `create or replace` keeps the guard trigger's OID; it does not drop/recreate the trigger.

The local suites apply exactly this order. `security-phase2-check.mjs` additionally proves 027 against a
late-apply (016-shaped) ordering on a second instance, and walks the whole expand-and-contract sequence on
a third instance including every rollback and re-apply.

## Preconditions (verify on the clone before applying)

1. Run `000_read_only_preflight.sql`; archive Q1–Q12 output (see LIVE_DB_VERIFICATION.md Deliverable 6).
2. **Resolve L-4.** The live `competition_teams` SELECT policy is stricter than committed 002. 024's
   preflight inspects each policy's name/command/roles/permissive flag/expression and **aborts** on
   divergence. Reconcile live SQL with the repository (or update the preflight expectations only after
   establishing how the live policy got there) before 024 will apply.
3. Confirm the migration ledger honestly: 001–016 applied (015/016 are live despite stale headers),
   017–020 not applied, 021 inconclusive. Apply the missing additive migrations 017→018→019→020→021 on
   staging first if you want the full schema; 027 is existence-guarded so the security set still runs
   without them, but the L-6 functional breaks remain until they are applied.
4. Take a restore point / snapshot of the clone.
5. Use **synthetic accounts only** for behavioural tests. Never real student records.

## Staging execution

Each file is a single explicit transaction (`begin; … commit;`) with a fail-closed preflight and a
convergence assertion. Apply with the Supabase SQL editor or `psql` on the clone, one file at a time, in
the order above. After each:
- Confirm it committed (no `42P01`/`42501`/preflight `ABORT`). A preflight abort rolls the whole file back
  and changes nothing — that is the intended safe failure, not a partial apply.
- Re-run the relevant Q1–Q5 catalog queries and compare against the committed SQL.

After Phase C, run `028_read_only_verification.sql` and the two-account plan
([SECURITY_TWO_ACCOUNT_TEST_PLAN.md](file:///E:/dsh-repo/docs/security/SECURITY_TWO_ACCOUNT_TEST_PLAN.md)).

## Rollback

Every restrictive file carries machine-readable rollback lines prefixed `--$ `. The harness extracts and
executes them; an operator can do the same. Rollback is per-file. **Most files are fully reversible; 025 is
the exception — its rollback is PARTIAL and not fully reversible** (see "025 is the exception" below).
**Rolling back reopens the corresponding finding** (e.g. rolling back 029/023 reopens F-01; 024 reopens
F-02; 030 reopens teammate phone exposure). Treat rollback as an incident state to resolve the same day, not
a resting configuration.

Ordering rule proven by the rollout suite: **do not roll back 023 while 029 stands** — 029 narrows the
column grant that the owner's old table read depended on, so removing the additive RPCs first locks the
owner out. Roll back in reverse dependency order (033→…→029→…→024→023). Each file's rollback block restores
the prior policy/grant/function body; re-applying reconverges (proven for 023, 024, 026, 027, 029, 030–033).

### 025 is the exception — partial rollback, not fully reversible

025 mixes **static** privilege edits (exact, known inverses) with **dynamic catalog loops** (no portable
static inverse). Its `--$ ` block restores only the static halves. The rollout suite proves this honestly:
the test named *"025 rollback is PARTIAL by design"* applies the block, asserts §1/§2/§4 are restored AND
§2b/§3 are **not**, then re-applies 025 and asserts every restriction returns. **Do not treat a green 025
rollback test as a complete restore.**

Inventory of every privilege change in 025:

| § | Change | Pre-025 state | Post-025 state | Exact inverse | In `--$ ` block? | Reconstructable? |
|---|---|---|---|---|---|---|
| §1 | `admin_users`: revoke ALL from public/anon/authenticated; grant SELECT to authenticated | anon=ALL, auth=ALL (bootstrap; 001 grants nothing explicitly) | anon=none, auth=SELECT | grant ALL to anon, authenticated | **Yes** | **Yes** — static; known from 001 + bootstrap |
| §2 | `new_team_invite_code()`: revoke ALL from public/anon; grant EXECUTE to authenticated | anon=EXECUTE (bootstrap), PUBLIC=none (010:43 already revoked), auth=EXECUTE | anon=none, auth=EXECUTE | grant EXECUTE to **anon only** (not PUBLIC) | **Yes** | **Yes** — 010 removed PUBLIC pre-025, so re-granting PUBLIC would over-restore |
| §2b | loop: revoke ALL from public/anon on each non-allowlisted SECURITY DEFINER function anon can execute | anon=EXECUTE per function (bootstrap); PUBLIC-EXECUTE varies by creating migration | anon=none, PUBLIC=none per affected function | per-function grant EXECUTE to anon **+** restore PUBLIC only where it pre-existed | **No** | **No** — affected set is read from `pg_proc` at run time; per-function PUBLIC history is not statically known |
| §3 tables | loop: revoke TRUNCATE/REFERENCES/TRIGGER from public/anon/authenticated on every public table | anon/auth hold those (bootstrap) | none of those | per-table grant them back to anon, authenticated | **No** | **No** — object set depends on which migrations are applied (016-shaped live vs full 021) |
| §3 sequences | loop: revoke ALL from public/anon on every public sequence | anon=ALL (bootstrap) | anon=none | per-sequence grant ALL to anon | **No** | **No** — catalog-dependent object set |
| §4 | default privileges: revoke ALL on tables from anon/authenticated; on sequences from anon; on functions from anon | bootstrap default ALL to anon/authenticated/service_role | anon loses all three; authenticated loses tables only | grant ALL on tables to anon/authenticated; on sequences/functions to anon (authenticated grants are no-ops) | **Yes** | **Yes** — bootstrap default is known |

**Why no grants are invented for §2b/§3.** The dynamic loops were written precisely because a static object
list is wrong on one of the two live shapes. Re-granting broadly would over-restore (e.g. handing PUBLIC
EXECUTE back to functions whose creating migration never granted it) and would not match the *actual*
previous state. The bootstrap pre-state is also a harness **assumption**, not a measurement of live ACLs.

**Manual restoration procedure (if §2b/§3 must be undone).** Before applying 025, capture the pre-state with
`000_read_only_preflight.sql`: **P4** (table grants), **P6** (function EXECUTE/context/owner), **P8**
(sequence ACLs), **P11** (default privileges per creating role). To reverse §2b/§3, replay the recorded
grants for *exactly* those objects from that snapshot. Without the snapshot, do not guess. **Prefer a
controlled forward-fix over a rollback** — rolling back 025 reopens L-1, L-2 and F-04 while leaving §2b/§3
hardened, which is a mixed state, not the original.

## Production approval checklist (all must be green)

- [ ] 000 baseline archived; L-4 reconciled from `pg_policies`; ledger corrected.
- [ ] 017–021 applied on staging; L-6 functional breaks fixed and verified.
- [ ] Phase A (023) applied; aligned frontend deployed and verified against it.
- [ ] Phase C applied in order; every preflight passed; 028 verification clean.
- [ ] Two-account staging plan passed with synthetic accounts (all unauthorized ops fail; all legitimate
      flows work; captain-only phone confirmed; name-only private peers confirmed; avatars public).
- [ ] API-level checks done as anon / authenticated / service_role through PostgREST (not only SQL).
- [ ] No regression in auth, Circle, team formation, registration, notifications, admin, onboarding.
- [ ] Rollback rehearsed on the clone; restore point taken immediately before the production window.
- [ ] Change authorized in writing; production window scheduled; same queries re-run immediately after.
- [ ] Non-SQL items tracked separately: GoTrue enumeration, storage MIME/size limits, response headers, AUTH-03.

**Do not claim production is secure because local tests pass.** PGlite is not PostgREST/GoTrue/Storage/JWT.