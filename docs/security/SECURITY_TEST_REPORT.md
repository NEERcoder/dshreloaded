# JAVLIN — Security Test Report (Phase 2.1)

Date: 2026-11-14 · Repository `E:\dsh-repo` @ `175c93b` · All tests local, synthetic fixtures only.

Three suites, all green. **388 behavioural assertions + 59 source invariants.** No production or staging
database was touched. PGlite results are explicitly **not** proof of live PostgREST behaviour.

## Results summary

| Suite | Command | Result |
|---|---|---|
| Source invariants | `node scripts/security-check.mjs` (`npm run security:check`) | **59 passed / 0 failed** |
| Approved-rule + order + rollout (PGlite) | `node scripts/security-phase2-check.mjs` | **107 passed / 0 failed** |
| Product-behaviour regression (PGlite) | `node scripts/security-db-check.mjs` | **281 passed / 0 failed** |

Build/typecheck: `npm run build` (`tsc -b && vite build`) **pass**, 205 modules, no TS errors.

## security-phase2-check.mjs — 107/107

| Phase | Count | Covers |
|---|---|---|
| BASELINE | 17 | Failing-before reproduction of the privacy/privilege defects. |
| PRIVACY | 12 | Owner full / unconnected nothing / accepted-connection name-only; gender & phone hidden from peers; anon blocked; fabricated caller IDs rejected. |
| TEAM | 19 | Self-insert denied, identity rewrites denied, role derivation, captain transfer, invite/approval RPCs, capacity/deadline/one-team guards. |
| PRIVILEGES | 13 | anon profile writes RLS-denied (write privilege retained, not revoked), admin_users SELECT removed from anon, definer EXECUTE allowlist, is_admin preserved. |
| PENDING | 5 | Pending-table corrections, existence-guarded. |
| NEGATIVE | 5 | Additional negative authorization cases. |
| COMPLETE | 15 | **New 030–033 behaviour** (below). |
| VERIFY / VERIFY-AGAIN | 1 + 1 | 028 read-only verification against the applied set, twice. |
| ORDER | 8 | 027 runs against a late-apply (016-shaped) ordering on a second instance. |
| ROLLOUT | 11 | Expand-and-contract on a third instance: 023 alone, client paths, Phase C, each rollback + re-apply, plus 025's **partial** rollback proven explicitly (§1/§2/§4 restore; §2b/§3 do not). |

COMPLETE (the four new migrations) asserts:
- **030**: former member, unrelated student and anon read no phone; captain reads member phone.
- **031**: member sees the six-column projection; non-member sees nothing; solo read works; admin RPC intact.
- **032**: pre-approved INSERT denied; direct `status='approved'` UPDATE denied; reject works; self-update 0 rows; approval atomic with membership.
- **033**: advisory lock present in `pg_locks` during a join; trigger binding preserved/enabled.
- A rollback → re-apply block proves 030–033 restore and reconverge.

## security-db-check.mjs — 281/281

| Phase | Count | Covers |
|---|---|---|
| BOOTSTRAP | 1 | Synthetic auth/roles/storage/default-privilege fixture. |
| MIGRATION_REPRO | 3 | Defects reproduced on the migrated baseline. |
| PRE_REMEDIATION | 11 | Vulnerabilities reproduced (private profile readable, self-insert bootstraps phone/roster/invite, team_id redirect, identity rewrites, anon definer EXECUTE). |
| AFTER_REMEDIATION | 132 | Full product-behaviour suite with 023–033 applied. |
| RERUN_REMEDIATION | 133 | The entire post-migration suite re-run after a second apply (idempotence). |
| SOURCE_INTEGRITY | 1 | All migration source hashes unchanged during the audit. |

Captain-only phone (030) is asserted from both sides: ordinary members (code-join, approved, existing)
read **0** phone rows and RPC phone null while still reading the roster (names); the captain reads a
member's phone via both `profile_contacts` and `get_team_member_profiles`. The PRE_REMEDIATION teammate-phone
positives are retained as failing-before evidence of the old behaviour.

## security-check.mjs — 59/59

Source invariants (not browser/DB authorization tests): URL sanitization, YouTube embed host/ID validation,
auth-error translation (no raw diagnostics), proof/video render validation, directory public-row filter,
023 RPC client integration, profile-write non-projection, directory projection ⊆ 029 grant, and **six new
030–033 invariants**: captain-gated UI phone, 030 RPC phone gate, registration projection ⊆ 031 grant,
RPC-only approval (no `update({status:"approved"})`), 032 policy forbids `approved`, 033 advisory lock.
Plus CSP/security headers and vite host/build hardening.

## Negative authorization tests (representative)

- anon: INSERT/UPDATE/DELETE on profiles are **RLS-denied**, not privilege-denied — no anon write policy
  exists, while the bootstrap write privilege is retained (INSERT raises `42501` row-level policy; UPDATE/DELETE
  match 0 rows). Cannot read phone/roster RPC; cannot read admin_users;
  cannot EXECUTE sensitive definer RPCs (is_admin and public-listing helpers excepted); cannot TRUNCATE.
- authenticated outsider: cannot read private profiles/gender; cannot self-insert into a team; cannot
  rewrite team_id/user_id/role/id/joined_at; cannot rewrite invite_code/competition_id; cannot read
  teammate phone; cannot read registration roster_snapshot; cannot self-approve a join request.
- member: cannot read another member's phone (table or RPC); cannot promote self to captain.
- accepted connection: reads name only — not gender/college/course/phone.
- former member: loses team-based phone access.

## Known limitations

- **Single-connection PGlite.** Concurrency is proven by advisory-lock acquisition in `pg_locks`, not by a
  true multi-connection race. No JWT gateway, GoTrue, PostgREST or Storage HTTP emulation.
- **Bootstrap is a fixture, not a measurement** of live Supabase ACLs/default privileges. The local
  `competition_teams` policy is more permissive than live (L-4), so simulated exposure is a lower bound.
- No live ACL/policy drift detection, no pre-existing malicious-membership cleanup assessment.
- Source invariants are string/structure checks, not behavioural proof.
- Only explicit synthetic fixtures were tested; no real student data, no production service-role key.

## Staging tests still required

- Run the two-account plan through PostgREST as anon/authenticated/service_role
  ([SECURITY_TWO_ACCOUNT_TEST_PLAN.md](file:///E:/dsh-repo/docs/security/SECURITY_TWO_ACCOUNT_TEST_PLAN.md)).
- Verify F-01/F-02 live status with a session token (currently unknown).
- Reconcile L-4 and confirm 024's preflight passes on the real schema.
- Confirm storage MIME/size limits, response headers, GoTrue enumeration behaviour (non-SQL items).
- Load-check CIRCLE/roster/registration reads for N+1 after the column narrowing.