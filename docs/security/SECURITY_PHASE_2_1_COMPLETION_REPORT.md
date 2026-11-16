# JAVLIN — Phase 2.1 Complete Security Remediation — Completion Report

Date: 2026-11-14
Repository: `E:\dsh-repo` @ `175c93b` (authoritative clone; all changes uncommitted)
Scope: the attached spec *"JAVLIN — COMPLETE SUPABASE SECURITY REMEDIATION (PHASE 2.1)"*, sections 1–11.

## Final status

**READY FOR STAGING REVIEW**

This status means: the end-to-end remediation is implemented locally, the database / RPC / frontend /
trigger / test layers all agree on one authorization model, and the work is ready to be applied and
behaviourally verified on a staging clone. It is **not** a claim that production is secure. No migration
in `supabase/security-review/` has been applied to any database; no production or staging write was
performed; nothing was committed, pushed or deployed (spec §1 rules 10–12).

Why this status and not the other two:

- Not **NOT READY FOR STAGING**: every finding A–G is addressed by an authored, idempotent,
  precondition-guarded migration; the frontend is aligned; typecheck, production build and all three
  automated suites pass.
- Not **BLOCKED BY MISSING EVIDENCE**: the missing live SQL session did not prevent a *safe
  implementation*. Each restrictive migration carries a fail-closed preflight that aborts rather than
  half-applies if the live schema diverges (notably L-4). The implementation is complete and safe by
  construction; the missing evidence is exactly what the staging review gate exists to gather.

The remaining work is the staging gate itself, and it has hard preconditions (see "Remaining blockers").

## What was implemented

One authorization model, enforced in the database and mirrored in the client:

| Layer | Change |
|---|---|
| Profiles | authenticated SELECT narrowed to 10 discovery columns; `gender`/`id`/timestamps owner-only via `get_own_profile()`; accepted connections get name-only via parameterless `get_connected_peer_names()` (023 additive, 029 restrictive). Anon grants/policies unchanged — anonymous profile writes stay blocked by RLS, not by a privilege revoke. |
| Team membership | self-insert limited to a captain's own initial row; `team_id`/`user_id`/`id`/`joined_at` immutable (column grant down to `role`); `role` derived from `captain_user_id`; captain transfer validated and label-reassigned; identity columns on teams and join requests locked (024). |
| Contacts | **captain-only phone**: the teammate read policy is replaced by a captain policy and the definer roster RPC returns `phone_number` only to the captain; ordinary members and former members get null (030). |
| Registrations | authenticated SELECT narrowed to six non-sensitive columns; `roster_snapshot`/`participant_user_id`/`updated_at` become admin-only through the existing definer RPC (031). |
| Join requests | INSERT forced pending; UPDATE policy forbids `approved` (approval is RPC-only); identity columns immutable; approval + membership remain atomic in `approve_team_join_request` (032). |
| Concurrency | the membership guard takes a transaction-scoped advisory lock keyed on `user_id:competition_id`, serializing same-user/same-competition joins so capacity and one-team rules cannot be raced (033). |
| Privileges | default-privilege mechanism corrected; every revoke names `anon`/`authenticated` explicitly; `admin_users` SELECT removed from anon; definer EXECUTE reduced to an allowlist; `is_admin()` anon EXECUTE preserved (025, 026, 027). |
| Frontend | roster phone gated to the captain in the UI; all "teammates can see your phone" copy corrected to captain-only; private-profile notice corrected; registration/profile projections verified against the new grants. |

## Files modified this pass (frontend + tests)

- `src/pages/TeamPage.tsx` — `MemberRow` renders `member.phone` only when the viewer is the captain
  (`isCaptain && member.phone`); comment rewritten to state the database is the enforcement.
- `src/lib/dataAccess.ts` — three comments corrected (`mapProfile` phone provenance,
  `CompetitionTeamMemberRecord.phone`, `fetchTeamProfiles`); no behavioural change. Verified
  `getMyCompetitionRegistrations` projects only 031-granted columns and `DIRECTORY_COLUMNS` is a subset
  of the 029 grant; admin registrations use the admin-gated `competition_registration_records` RPC.
- `src/pages/DashboardPage.tsx` — phone helper copy (2 sites) → captain-only.
- `src/pages/SignupPage.tsx` — phone comment + visible helper copy → captain-only.
- `src/pages/PrivacyPolicyPage.tsx` — "When we share information" phone clause → captain-only.
- `src/pages/StudentProfilePage.tsx` — private-profile notice no longer claims team membership grants
  profile visibility; states accepted connections see name only.
- `scripts/security-check.mjs` — +6 source invariants (captain-gated UI phone, 030 RPC phone gate, 031
  projection subset, RPC-only approval, 032 policy forbids `approved`, 033 advisory lock).
- `scripts/security-db-check.mjs` — three teammate-phone expectations flipped to captain-only with a
  captain-positive assertion (member reads 0, captain reads member phone via table and RPC).

The wider uncommitted diff also contains the earlier Phase 1 / Phase 2 / Phase 2.1 work (urlSafety,
authErrors, PageShell metadata, StudentCard/ExplorePage URL validation, vite host/build hardening,
`public/_headers`, migrations 010/019 corrections, and the 023 RPC client integration). Those were
reviewed and remain part of the same uncommitted remediation set.

## Migrations created (all in `supabase/security-review/`, applied nowhere)

New this pass: `030_contact_captain_only.sql`, `031_registration_privacy.sql`,
`032_join_request_integrity.sql`, `033_membership_concurrency.sql`.

Full set: `000_read_only_preflight.sql` (read-only), `023`–`027`, `028_read_only_verification.sql`
(read-only), `029`–`033`. `022_rls_privacy_hardening.sql` was discarded earlier (L-7: it referenced
relations absent live and contradicted approved rules 2–3). Each restrictive file is idempotent, opens
with a fail-closed preflight, asserts convergence after applying, and carries machine-readable `--$ `
rollback lines.

## Tests executed (all green)

| Suite | Command | Result |
|---|---|---|
| Source invariants | `node scripts/security-check.mjs` | **59 / 59** |
| Approved-rule + rollout + order-independence (PGlite) | `node scripts/security-phase2-check.mjs` | **107 / 107** |
| Product-behaviour regression (PGlite) | `node scripts/security-db-check.mjs` | **281 / 281** |

388 behavioural assertions + 59 source invariants. Every new protection has a failing-before assertion
in `BASELINE` / `PRE_REMEDIATION`. The phase2 suite walks expand-and-contract on a third in-memory
instance and proves complete rollback + re-apply convergence for 023, 024, 026, 027, 029 and 030–033.
**025's rollback is partial by design**: its dynamic §2b (definer EXECUTE) and §3 (table/sequence) loops
are catalog-dependent and not statically invertible, so the suite asserts that partial behaviour honestly
instead of claiming a full restore. See the 025 non-reversibility note in
[SECURITY_MIGRATION_GUIDE.md](file:///E:/dsh-repo/docs/security/SECURITY_MIGRATION_GUIDE.md). Details and
limitations: [SECURITY_TEST_REPORT.md](file:///E:/dsh-repo/docs/security/SECURITY_TEST_REPORT.md).

## Build and typecheck

`npm run build` (`tsc -b && vite build`): **pass**. 205 modules transformed; `dist/` emitted. The only
warning is the pre-existing >500 kB chunk advisory, unrelated to this work. `tsc -b` reported no errors.

## Remaining blockers (the staging gate)

1. **No live SQL session.** F-01 (private profile + gender readable by any authenticated user) and F-02
   (fabricated/redirected membership unlocking phone/roster) are repository-confirmed and simulated, but
   their live status is still unknown. They cannot be called fixed until verified on a clone.
2. **L-4 live policy drift.** The live `competition_teams` SELECT policy is stricter than committed 002
   (`using (true)`). 024's preflight is designed to **abort** until this is reconciled from `pg_policies`.
   This is a precondition, not a defect in the migration.
3. **017–021 unapplied live** (015/016 are live despite stale headers; 021 inconclusive). The
   security-review set assumes the 001–016 live shape; 027 is existence-guarded for the rest. The missing
   additive migrations and the L-6 functional breaks should be resolved on staging first.
4. **Staging API-level verification still required.** PGlite is not PostgREST/GoTrue/Storage/JWT. The
   two-account plan ([SECURITY_TWO_ACCOUNT_TEST_PLAN.md](file:///E:/dsh-repo/docs/security/SECURITY_TWO_ACCOUNT_TEST_PLAN.md))
   must be run on a staging clone with synthetic accounts only.

## Compliance with operating rules

No production connection or write; no migration executed against any live/staging database; no
credential rotation, deploy, push or DNS change; no commit (rule 12). All tests use synthetic fixtures
(reserved 555 phone numbers, synthetic UUIDs). No secret material recorded. Local simulation is
explicitly not presented as proof of live behaviour.