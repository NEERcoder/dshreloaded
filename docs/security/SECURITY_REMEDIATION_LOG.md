# JAVLIN security remediation log

Workspace `E:\dsh-repo`, branch `main`, baseline commit `175c93b`. Everything below is **uncommitted**. No commit, push, deployment, credential action or database migration execution occurred. Pre-existing untracked `public/brand/javlin-logo-lockup.jpeg` was left untouched.

## Test tooling added

### `scripts/security-check.mjs` (new) — 47 checks, all passing
Behavioural: imports the real `src/lib/urlSafety.ts` and `src/lib/authErrors.ts` through TypeScript’s own `transpileModule` (no regex “transpilation”, no Node-version dependency — verified with and without `--no-experimental-strip-types`), then runs 14 URL payloads, 6 canonical-YouTube cases, 4 invalid-YouTube cases and 5 auth-copy cases. Invariant checks then assert the render sites, write path, metadata, directory query, build config, dev-server bind and candidate header directives stay fixed. The script prints that it certifies neither live auth, RLS, storage nor hosting.

### `scripts/security-db-check.mjs` (new) — 278 checks, 0 failures
In-memory PGlite 0.3.14 (PostgreSQL 17.5 emulation), installed under `node_modules/.cache/security-audit` with `--ignore-scripts`. Network access is disabled by overriding `fetch`. It applies migrations 001-021 chronologically, loads synthetic fixtures only (nine fake users, reserved `+1 202 555 0101` style numbers, `example.invalid` addresses), runs each scenario inside a rolled-back transaction, and applies the remediation set `supabase/security-review/023`-`027` between the two suites.

| Phase | Passed | Failed | What it proves |
|---|---:|---:|---|
| BOOTSTRAP | 1 | 0 | Auth/storage/role emulators behave as documented |
| MIGRATION_REPRO | 3 | 0 | Original 010 (42846) and original 019 (42601) fail; corrected 019 applies; current 010 applies |
| PRE_REMEDIATION | 10 | 0 | F-01…F-05 defects reproduced against the committed policy set |
| AFTER_REMEDIATION | 131 | 0 | 023-027 close them and preserve legitimate flows |
| RERUN_REMEDIATION | 132 | 0 | 023-027 re-applied and the whole suite re-run; effective ACL/policy snapshot converges identically |
| SOURCE_INTEGRITY | 1 | 0 | No migration or proposal file changed during the run; every proposal still carries its `PROPOSED — NOT APPLIED` header |

Four reported shims: `auth.users`/`auth.uid()` emulator, Supabase role emulator, minimal `storage` schema with `foldername()`, and omission of `create extension pgcrypto` (PGlite provides core `gen_random_uuid()`). The generator cast and modulo are **not** shimmed — 010 was repaired in source, and the suite additionally proves the alphabet is 32 characters, so the earlier “modulo 32 can pick an empty position” concern was wrong and is retracted.

Flow coverage after 023-027 includes: owner/public/admin profile reads and owner edits, new-team creation with a database-minted code, invite-code join and captain approval through the real 013 RPCs, one-team-per-competition, capacity and deadline guards, captain transfer ordering as the client performs it, non-member transfer rejection with rollback, connection request/accept/cancel with the real notification triggers, notification read marking, guarded roster and phone access, anon public listings, and anon `is_admin()` policy dependencies.

## Application source changes

| File | Change | Finding |
|---|---|---|
| `src/components/circle/StudentCard.tsx:247` | Proof link sanitised at render; unusable links omit the anchor instead of becoming `#` | FE-01 |
| `src/pages/ExplorePage.tsx:21,231,267` | Featured iframe uses `getYouTubeEmbedUrl`; supporting links use `sanitizeExternalUrl` and drop `target` when the URL is unusable | FE-02 |
| `src/lib/urlSafety.ts:87` | Video id extraction accepts `watch`/`shorts`/`embed`/`live`/`youtu.be`, validates an 11-character id, rejects host-suffix tricks; new canonical `getYouTubeEmbedUrl` | FE-02 |
| `src/lib/dataAccess.ts:726` | `saveVideo` persists a normalised optional URL | FE-03 |
| `src/lib/dataAccess.ts:2117` | Directory requests only `is_public = true` rows, college names embedded once; four caller sites checked | F-01 (client half) |
| `src/lib/dataAccess.ts:208` vicinity | Console-only diagnostics no longer interpolate raw provider error objects | AUTH-03 |
| `src/components/PageShell.tsx:68` | `og:url` is `origin + pathname` | AUTH-01 |
| `src/lib/authErrors.ts` | Fixed fallback, no raw echo, no account-existence distinction, duplicate-signup copy no longer claims an email was sent, no console logging | AUTH-02 |
| `src/pages/AdminPage.tsx:197` | Admin sign-in routes through the translator | AUTH-02 |

The three `getStudentDirectory` consumers are the public directory, the homepage CIRCLE preview/launcher (24 rows), and the admin CIRCLE panel, which labels its count “profiles publicly listed” — so narrowing to public rows also makes that count correct. The dashboard still reads the owner’s own profile, which 023 keeps permitted through `get_own_profile()` rather than through a widened row policy.

## Configuration changes

| File | Change | Reason / limit |
|---|---|---|
| `vite.config.ts` | Loopback bind, `allowedHosts: ["localhost"]`, `esbuild.drop` gated on `command === "build"` | INF-01, DP-1. Removes the two hosting-suffix wildcards; container/Replit preview needs an explicit opt-in. Host validation is not network isolation |
| `public/_headers` (new) | Candidate header set, HSTS reduced to `max-age=86400`, no dashboard claims | FE-05. Local stub only; never fetched from production |
| `package.json` / `package-lock.json` | `vite` exact `6.4.5`, `security:check` script | INF-02. `npm audit` now reports 0; local `node_modules` still holds 5.4.21 because another session locks `esbuild.exe` (`npm install` fails EBUSY); `npm ci` resolves it |
| `supabase/migrations/010_...sql` | `get_byte(uuid_send(gen_random_uuid()), 0) % 32`, `set search_path = pg_catalog` | F-08. Was unparseable; 022 re-creates the body for any environment that already applied it |
| `supabase/migrations/019_...sql` | Unique **index** instead of an invalid table constraint; owner write set excludes `source` | F-07, F-09. Unapplied everywhere, so editing in place is safe |
| `supabase/migrations/022_rls_privacy_hardening.sql` | **discarded 2026-11-10, not applied anywhere** | 48 statements covering F-01…F-06 and F-08. Two independent reasons: it revoked privileges on relations the live project does not have (`events`, `student_skills`, `student_experience`, `profile_moderation_flags`), so inside its single explicit transaction it aborts `42P01` and rolls back the profile protections too; and its profiles policy had no accepted-connection branch, which contradicts approved rule 2 while leaving rule 3 unenforceable because it never narrowed `profiles` column privileges. Superseded by `supabase/security-review/023`-`028` |

## Phase 2 — remediation redesign (2026-11-10)

Design, evidence and staging order are recorded in `SECURITY_PHASE2_DESIGN.md`. Summary of what
this pass changed relative to the first one:

| Deliverable | State | Evidence |
|---|---|---|
| `supabase/security-review/000_read_only_preflight.sql` | unchanged, read-only | run before and after any apply window |
| `023_profile_privacy_name_only.sql` | authored, **not applied** | rule 2 name path + rule 3 column privileges; F-01 closed in `PRIVACY` (12) |
| `024_team_membership_integrity.sql` | authored, **not applied** | F-02/F-03/F-06; `TEAM` (19) including all eleven flows |
| `025_anon_privilege_corrections.sql` | authored, **not applied** | L-1/L-2/F-04; `PRIVILEGES` (12) |
| `026_connection_and_notification_immutability.sql` | authored, **not applied** | F-05, plus the notification INSERT/DELETE revoke found by re-running `security-db-check.mjs` against these files |
| `027_pending_table_corrections.sql` | authored, **not applied** | F-09 + `student_experience` write surface, existence-guarded; `PENDING` (5) and `ORDER` (6) |
| `028_read_only_verification.sql` | authored, read-only | V1-V9, executed by the harness without raising (`VERIFY`, `VERIFY-AGAIN`, and again in `ORDER`) |
| `scripts/security-phase2-check.mjs` (new) | **73 passed, 0 failed** | BASELINE 17 / PRIVACY 12 / TEAM 19 / PRIVILEGES 12 / PENDING 5 / VERIFY 1 / VERIFY-AGAIN 1 / ORDER 6 |
| `scripts/security-db-check.mjs` (re-pointed) | **278 passed, 0 failed** | now applies 023-027 instead of the discarded 022; phases renamed `PRE_/AFTER_/RERUN_REMEDIATION` |

Two defects in this pass's own design were caught by the *other* harness rather than by the one
they were written for, which is the reason both are kept: `security-db-check.mjs` failed
`notification direct DELETE denied` (026 had relied on RLS instead of revoking the bootstrap
privilege), and its `student_experience` INSERT expectation exposed that 027 narrowed UPDATE but
left a client free to supply its own row `id`. Both are fixed in the SQL, not by relaxing the
tests.

Nothing here is applied. F-01 and F-02 remain live until an approved window runs 023 and 024
against staging, and no live claim in this section comes from a local simulation.

## Process corrections made during re-review

- The first draft report claimed “10 fixed / 26 findings”, called F-01 Critical, said migrations 001–014 were definitely live, treated client-copy changes as ending account enumeration, and said no check failed. All of those claims were wrong or unsupported and are corrected here and in `SECURITY_AUDIT_REPORT.md`.
- The first 022 draft broke team creation (the client inserts the captain row itself), granted `gender` back to every reader, and revoked anon `is_admin()` execute while anon policies depended on it. The current version addresses each, and the harness proves the flows.
- Two delegated review agents produced partly inflated claims (missing `WITH CHECK` as an automatic flaw, arbitrary severity for a public bucket, “no headers ⇒ production has none”). Each was independently re-checked before use; several were rejected.
- Two delegated follow-up agents and two `WebSearch`/`WebFetch` calls failed on a credit limit or a 403. Those gaps are recorded in the report rather than presented as clean results.

## Commands run

`npm run typecheck` (pass), `npm run build` (pass with locally installed Vite 5.4.21; pass again using an isolated Vite 6.4.5 build: 201 modules, no `.map`), `npm run security:check` (47/47), `node scripts/security-db-check.mjs` (278/0, against 023-027), `node scripts/security-phase2-check.mjs` (73/0, added 2026-11-10), `npm audit` (0), `npm audit --omit=dev` (0), `git diff --check` (clean apart from one pre-existing LF/CRLF warning on `019`), targeted Grep/Read across `src`, `supabase/migrations`, config, `dist`, and a bounded credential scan of 861 reachable git blobs.
