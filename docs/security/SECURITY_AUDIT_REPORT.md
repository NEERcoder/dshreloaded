# JAVLIN — repository security audit

| | |
|---|---|
| Assessment | **HIGH-RISK ISSUES REMAIN** |
| Repository | `github.com/NEERcoder/dshreloaded` (public), branch `main` |
| Baseline audited | `175c93b` — unchanged throughout; HEAD still `175c93b` |
| Workspace | `E:\dsh-repo` (verified: branch, HEAD, remote, clean tree apart from this audit's edits) |
| Audit dates | 2026-10-28 to 2026-10-29 |
| Companion documents | [SECURITY_FINDINGS.md](file:///E:/dsh-repo/docs/security/SECURITY_FINDINGS.md), [SECURITY_THREAT_MODEL.md](file:///E:/dsh-repo/docs/security/SECURITY_THREAT_MODEL.md), [SECURITY_CONTROL_MATRIX.md](file:///E:/dsh-repo/docs/security/SECURITY_CONTROL_MATRIX.md), [SECURITY_REMEDIATION_LOG.md](file:///E:/dsh-repo/docs/security/SECURITY_REMEDIATION_LOG.md), [SECURITY_OPERATIONS_RUNBOOK.md](file:///E:/dsh-repo/docs/security/SECURITY_OPERATIONS_RUNBOOK.md), [SECURITY_CI_RECOMMENDATIONS.md](file:///E:/dsh-repo/docs/security/SECURITY_CI_RECOMMENDATIONS.md) |

**Why not a milder label.** Two High findings (F-01 private-profile disclosure, F-02 unauthorized team membership and teammate phone access) are remediated only as *authored SQL* plus a client-side query change. No database has received them, so in the intended environment they remain live. An earlier draft of this report used the label “SECURITY IMPROVEMENTS COMPLETED — VERIFICATION INCOMPLETE” and counted ten fixed findings; both were inaccurate and are corrected here (see §7).

---

## 1. What was actually examined, and what was not

**Read or executed:** all 22 SQL migrations (`supabase/migrations/001`–`022`) in chronological order — as they existed at this assessment; 022 has since been discarded and the reviewed remediation lives in `supabase/security-review/023`–`028`, and the harness now reads 21 migrations plus that set — the full `src/lib/dataAccess.ts`, every `src/pages` route reachable from `src/App.tsx:84-129`, shared components that render remote data, `src/lib/urlSafety.ts`, `src/lib/connections.ts`, `src/lib/authErrors.ts`, `src/lib/supabase.ts`, `index.html`, `vite.config.ts`, `package.json`, `package-lock.json`, `.replit`, `.gitignore`, `public/_redirects`, the built `dist/` output, and 861 reachable git blobs.

**Tools that ran:** Node v24.20.0, npm 11.19.0, `tsc` 5.9.3, Vite 5.4.21 (installed) **and** Vite 6.4.5 (isolated, for compatibility proof), git, Chromium via the in-app browser, PGlite 0.3.14 (in-process PostgreSQL 17.5 emulation).

**Not available, and therefore not clean results — inconclusive:**

- **No SQL session.** No `.env` exists in this checkout, so `isSupabaseConfigured` is false and the local app serves `src/lib/localProvider.ts` fixtures; there is no `psql`, no Supabase CLI and no database credential. **On 2026-11-03 a read-only live verification pass was added** ([LIVE_DB_VERIFICATION.md](file:///E:/dsh-repo/docs/security/LIVE_DB_VERIFICATION.md)): 41 anonymous PostgREST/Storage/RPC reads against the real project using only the publishable key, with `Range: 0-0` and no row body ever requested or printed. That settled the **anonymous** role, storage delivery and which migrations are live. It **cannot** observe the `authenticated` role, where F-01 and F-02 actually sit.
- **Live policy state partly resolved, still not readable.** Migrations 002 and 003 document that they were applied out of band and reconstructed afterwards; 013 records the browser calling an RPC before any committed file defined it. The historical note “001–014 applied, 015–021 not applied” is now known to be **wrong in both directions**: live probes show 015 and 016 *are* applied, while 017, 018, 019 and 020 are **not** (and 021 is inconclusive). `pg_policies`, grants, views, function ownership and the migration ledger still require a SQL session.
- **No production HTTP observation.** No request was sent to the deployed origin. Header findings describe what the repository configures.
- **No dashboard access.** Supabase Auth settings (signup method, email confirmation, rate limits), Storage bucket `public`/MIME/size flags, function ownership, and Cloudflare transform rules, caching and TLS settings are all invisible from the repo.
- **No dedicated scanners.** No Gitleaks/TruffleHog/OSV-Scanner, no DAST (ZAP/nuclei), no SAST. Secret detection was a Node heuristic over reachable objects, not a full-history scan including dangling objects — which a determined reviewer should re-run with a real tool.
- **No signed-in flows.** Authenticated and admin paths were reviewed as source, never exercised.
- **Repository has no `.github/workflows`.** That proves this checkout tracks none; it does not prove no external CI or security scanning runs.
- Two delegated verification agents and several web lookups failed on a credit limit or a 403. The database work they were to verify was re-done directly here instead; nothing in this report rests on a failed agent’s summary.

## 2. Security architecture in one page

Client-rendered React SPA, no trusted application server, static hosting, direct browser-to-Supabase calls using a publishable key. Consequences that drive every finding:

1. **PostgreSQL RLS and grants are the only authorization boundary.** A client-side guard, a query projection or a disabled control is an affordance, never a control: anyone can take the key from the bundle and speak PostgREST directly.
2. **RLS is permissive-OR.** A later “narrowing” migration does not retire an earlier `using (true)`; both policies stand and the broad one wins. This single shape produced the two High findings.
3. **Row policies do not filter columns.** `select=*` returns every column the role holds table-wide privilege on — which is why `gender` and phone numbers needed separate treatment (011 moved phone out of `profiles` for exactly this reason).
4. **SECURITY DEFINER functions bypass RLS** and must re-check the caller themselves; `get_team_member_profiles` and the 013 join/approval RPCs do.
5. **Front-end rate limiting would be decorative.** Throttling belongs to GoTrue/edge configuration.

Credit where due, verified in source: all 25 tables enable RLS; every one of the 20 `SECURITY DEFINER` functions pins `search_path`; there is no dynamic SQL; business rules that policies cannot express sit in locking triggers; write paths were progressively funnelled through definer RPCs; per-column grants are used on `student_connections.status` and `student_notifications.read_at`.

## 3. Findings

26 deduplicated findings: **3 High, 13 Medium, 6 Low, 4 Informational.** None is rated Critical — the two High issues disclose personal data and teammate phone numbers to anyone able to create an account, with no demonstrated privilege escalation, credential theft or code execution. Full evidence, citations and status per finding are in [SECURITY_FINDINGS.md](file:///E:/dsh-repo/docs/security/SECURITY_FINDINGS.md); control-by-control coverage is in [SECURITY_CONTROL_MATRIX.md](file:///E:/dsh-repo/docs/security/SECURITY_CONTROL_MATRIX.md).

| ID | Finding | Severity | Status |
|---|---|---|---|
| F-01 | `using (true)` on `profiles` makes “private” profiles and `gender` readable by any account; directory had no `is_public` filter | High | Client filter fixed; policy **authored, not applied** |
| F-02 | Membership INSERT self-join and `team_id` UPDATE both unlock teammates’ phone numbers and roster RPCs | High | **Authored, not applied** |
| INF-02 | Nine advisories in `vite@5.4.21` / `esbuild@0.21.5`, including high-severity GHSA-587h-7wmj-h5pm | High | Manifest+lock pinned to `vite@6.4.5`; **local install pending** |
| F-03 | `with check (true)` lets a captain rewrite `invite_code`, `competition_id`, `id` | Medium | Authored, not applied |
| F-04 | Default privilege bootstrap leaves TRUNCATE/REFERENCES/TRIGGER **and table-level SELECT** with API roles (RLS- and trigger-bypassing) | Medium | Authored, not applied. **Live-confirmed symptom 2026-11-03: anon holds table SELECT on `admin_users`** (0 rows only because of the row policy) and can execute `new_team_invite_code()` |
| F-05 | Connection/notification identity rewriting despite row policies | Medium | Authored, not applied |
| F-07 | Migration 019 unparseable (`unique (user_id, lower(name))` as a table constraint) | Medium | Fixed in source, verified |
| F-08 | Migration 010 unparseable (`gen_random_uuid()::bytea`) and no `search_path` | Medium | Fixed in 010, verified. The idempotent re-create 022 carried is deliberately not repeated — see F-08 in `SECURITY_FINDINGS.md` for why that re-create rested on an assumption the live ledger contradicts |
| FE-01 | Student-authored `proof_url` rendered as a raw anchor href | Medium | Fixed at render site, unit + DOM verified |
| FE-02 | Raw `youtube_url` into iframe; accepted hosts and CSP `frame-src` disagreed | Medium | Fixed with canonical embeds, browser verified |
| FE-03 | `saveVideo` persisted unsanitised input | Medium | Fixed on write |
| AUTH-01 | `og:url` copied `window.location.href`, persisting recovery tokens from `/reset-password` into the DOM | Medium | Fixed, DOM verified |
| AUTH-03 | `dataAccess.failure()` still surfaces raw provider `error.message`, rendered by the public review form | Medium | Reduced (logging only); **not eliminated** |
| INF-01 | Dev server `host: 0.0.0.0` with `allowedHosts: true` | Medium | Fixed (loopback + explicit host) |
| FE-05 | No `_headers` in the repository | Medium | Candidate authored; **live behaviour unverified** |
| DB-03 | `student-avatars` bucket public; arbitrary remote image URLs | Medium | **Owner decision 2026-11-03: avatars remain public — accepted.** Live probes confirm public delivery is enabled and that no other bucket exposes CVs |
| F-06, F-09 | Membership `role` forgeable; skill `source='verified'` self-attestable | Low | F-06 authored in 024 (not applied); F-09 fixed in the working copy of 019 and re-derived from privileges in 027 (not applied). Both verified locally |
| AUTH-02 | Error copy distinguished “already registered”/“user not found” and echoed raw text | Low | Client copy fixed; **server-side enumeration not addressed** |
| FE-04 | Console calls shipped in production bundle | Low | Fixed via `esbuild.drop` on build |
| F-10 | Roster user IDs and captain IDs publicly listable (002 design) | Low | **Open by design; live-confirmed 2026-11-03** (`206`, 2 membership rows readable as anon) |
| F-11 | 021 `created_by uuid not null … on delete set null` is unsatisfiable | Low | Open. 021’s live presence is **inconclusive** — it grants SELECT only to `authenticated`, so anon invisibility proves nothing |
| SEC-01…04 | Public client key in `.replit`; stale root-level duplicate sources; `localStorage` session persistence; no CI workflow tracked | Informational | Context, not vulnerabilities |

## 4. Remediation delivered in this workspace

Twelve tracked files modified and eleven added, `+305 / −189` across the tracked files. Nothing was committed, pushed, deployed or applied. Detail per change, with reasons and limits, is in [SECURITY_REMEDIATION_LOG.md](file:///E:/dsh-repo/docs/security/SECURITY_REMEDIATION_LOG.md).

Product behaviour was preserved deliberately: profiles were not all made private, public opportunities and student connections were not disabled, the avatar bucket was not silently closed, and no blanket dependency upgrade was performed. Two things had to be *added* rather than subtracted to keep the app working: a captain-role derivation trigger (022) so team creation and captain transfer still function under the narrowed membership policy, and an owner-only profile read path (F-01) so the dashboard keeps `gender` while the directory does not request it.

## 5. Verification evidence

```
npm run typecheck                        → pass (tsc 5.9.3)
node scripts/security-check.mjs          → 47 checks passed
  …also run under --no-experimental-strip-types → 47 passed (proves Node 20 compatibility)
node scripts/security-db-check.mjs       → 278 passed, 0 failed, 21 migrations applied, 023-027 applied and re-applied, 4 shims declared
node scripts/security-phase2-check.mjs   → 73 passed, 0 failed (added 2026-11-10): BASELINE 17, PRIVACY 12, TEAM 19, PRIVILEGES 12, PENDING 5, VERIFY + VERIFY-AGAIN + ORDER 8
npm audit                                → 0 vulnerabilities (committed manifest + lockfile)
npm audit --omit=dev                     → 0 vulnerabilities
vite build (isolated 6.4.5)              → pass, 30.14 s, 201 modules
vite build (installed 5.4.21)            → pass, earlier in this audit
git diff --check                         → clean (one pre-existing LF→CRLF notice on 019)
```

The synthetic PostgreSQL suite is the load-bearing evidence. It reproduces F-01…F-05 as *failures of the committed policy set* (`PRE_REMEDIATION`, 10/10), then proves 023-027 close them while keeping legitimate flows intact (`AFTER_REMEDIATION` + `RERUN_REMEDIATION`, 263 checks): owner/public/admin reads, owner edits, new-team creation with a database-minted `^DSH-[A-Z2-9]{5}$` code, invite-code join and captain approval through the real 013 RPCs, capacity/deadline/one-team guards, captain transfer in the exact order the client performs it, non-member transfer rejection with rollback, connection accept/cancel with the real notification triggers, notification read-marking, roster/phone gating, anon listings and anon `is_admin()` policy dependencies (which is precisely why the earlier draft’s `revoke … from anon` on `is_admin()` was wrong and is not in the final file). The second suite, `security-phase2-check.mjs`, asserts the same SQL against the owner’s five approved rules and adds the scenario the first suite could not express — a connected peer reading a private owner’s name and nothing else — plus an `ORDER` phase that applies 023-027 to a schema built to today’s live shape (001-016 only) to prove 027 is order-independent.

Browser verification of the client fixes, against the patched dev server:

- A synthetic five-record Mark list containing `javascript:` (plain, mixed-case, tab-split) and `data:` proof URLs plus one valid HTTPS URL rendered **one** anchor — the HTTPS one. External origins on the page: Google Fonts only.
- `/reset-password?code=AUDIT_QUERY#access_token=AUDIT_FRAGMENT&refresh_token=AUDIT_REFRESH`: `og:url` and canonical contained neither marker; page rendered its normal form; no horizontal overflow.
- `/explore`: featured iframe `src` was `https://www.youtube.com/embed/<id>`; every anchor free of executable schemes; app served through a local stub that applies `public/_headers` returned CSP, `X-Frame-Options: DENY`, `nosniff`, with **zero console errors or CSP violations**.
- Built output: no `.map` files, no `console.error` from the data layer, no `sb_secret_` or long-JWT shapes in any bundle.

**What these do not prove.** The PGlite fixture is not the live project: its role/default-privilege bootstrap and `auth.uid()` emulator are documented assumptions, single-connection and without concurrent-race coverage. The browser checks prove the client no longer emits the vulnerable sink — not that the original payloads achieved code execution (they may not have, given `target="_blank"`, `rel="noreferrer"` and React 18). Neutral auth copy does not prevent account enumeration at the HTTP layer. Local header application is not production header verification.

## 5b. Live verification added 2026-11-03 (read-only, anonymous)

Full record, method and operator queries: [LIVE_DB_VERIFICATION.md](file:///E:/dsh-repo/docs/security/LIVE_DB_VERIFICATION.md). No SQL session existed (no `.env`, no `psql`, no Supabase CLI), so 41 anonymous PostgREST/Storage/RPC reads with `Range: 0-0` and no row bodies were used; this observes the `anon` role only, **not** the `authenticated` role where F-01/F-02 sit.

- **Confirmed working live:** anon reads 0 private profiles and 4 public ones; `gender`, `id`, `created_at`, `updated_at` and `select=*` on `profiles` are `42501` for anon; phone table, invite codes, connections, notifications and registrations are all `42501`; the CV bucket is not publicly deliverable; `get_javlin_level` still enforces its own visibility rule; anon `is_admin()` executes and returns false, which live policies depend on.
- **Confirmed live defects:** the anonymous role holds **table-level SELECT on `admin_users`** (0 rows visible only because of the row policy), and can **execute `new_team_invite_code()`** — direct evidence that `revoke … from public` does not remove Supabase’s explicit default `anon` grants, which is F-04’s mechanism rather than a fixture assumption.
- **Migration state corrected against the repository:** 015 and 016 **are** applied (015’s own “NOT APPLIED” header is wrong), while **017, 018, 019 and 020 are not applied**, so the CIRCLE skills/experience adders, the Events page, opportunity detail columns and PULSE college references fail against production today. 021 is inconclusive and 022 is unobservable anonymously.
- **New blocker on 022.** Lines 49–51 and 119–121 reference `public.events`, `public.student_skills`, `public.student_experience` and `public.profile_moderation_flags`, which do not exist live. Because 022 is one explicit transaction, applying it as written fails with `42P01` and **rolls back completely**, including the F-01/F-02 protections. The PGlite suite cannot see this: it applies 001→022 chronologically, so those relations exist there. Simulated green is not deployable green.
- **Owner-approved privacy rules now contradict 022.** Rules (2) “connected students may see a private owner’s name” and (3) “all other private details stay hidden from connected students” are **not implemented**: 022 has no connection branch (a connected peer renders as “No longer on CIRCLE”, `src/lib/connections.ts:108`) and it narrows rows without narrowing `profiles` **column grants**, so `002:63` still gives `authenticated` table-wide SELECT. Satisfying both rules needs a name-only path plus a narrowed column grant; a wider row policy alone would breach rule 3.

## 6. Residual risk and operator next actions

Residual risk is **HIGH until 023 and 024 are applied to a real database and verified**, because F-01 and F-02 depend on them. Ordered next actions, all requiring authorization that this audit does not have:

1. Run the SQL catalog queries (Q1–Q12 in [LIVE_DB_VERIFICATION.md](file:///E:/dsh-repo/docs/security/LIVE_DB_VERIFICATION.md), also in [SECURITY_OPERATIONS_RUNBOOK.md](file:///E:/dsh-repo/docs/security/SECURITY_OPERATIONS_RUNBOOK.md) §2) to read `pg_policies`, grants, views, functions, triggers, storage config and the migration ledger. Anonymous probes have taken the guesswork out of the *shape*; only a SQL session settles the `authenticated` policies — and one anonymous divergence (`competition_teams` returns 0 rows as anon although committed 002 says `using (true)`, while 2 memberships prove a team exists) shows the live SQL is **not** identical to the repository.
2. ~~Revise 022 before any apply attempt.~~ **Done 2026-11-10.** 022 is discarded and replaced by `supabase/security-review/023`-`028`, which address every point in that blocker: 027 is existence-guarded so it runs before or after 017/019/021, 023 adds the name-only path **and** narrows `profiles` column grants, 025 revokes `admin_users` by naming `anon`, and 025 §3 enumerates every public table rather than a list. See [SECURITY_PHASE2_DESIGN.md](file:///E:/dsh-repo/docs/security/SECURITY_PHASE2_DESIGN.md).
3. Apply 023 → 024 → 025 → 026 → 028 on staging in that order, with `000_read_only_preflight.sql` before and after and the diff archived — the order in §7 of that design document. The pending additive migrations **017 → 018 → 019 → 020 → 021** can go before or after, which is the property 027 exists to provide; they also repair the features failing in production today. Then re-run both local suites and the synthetic-account behavioural pairs. Review the corrected 010 and confirm no environment already ran a different version.
4. Run `npm ci` so `node_modules` matches the pinned `vite@6.4.5`. Locally this is blocked by `EBUSY` on `@esbuild/win32-x64/esbuild.exe`, held by an unrelated dev-server process that was left running.
5. Deploy, then assert the response headers on the real origin; decide HSTS duration/preload only after every subdomain serves HTTPS.
6. Set bucket `file_size_limit` and `allowed_mime_types` in the Supabase dashboard. Avatar visibility itself is now decided — **public stays** — so no storage policy change is wanted there; the remaining gap is upload constraints, which migrations cannot express.
7. Connection visibility is decided and now implemented in SQL: **connected students may see the peer’s name and nothing else.** 023 does it with a parameterless `security definer` name path plus narrowed `profiles` column grants, not by widening the row policy; the client’s existing null-peer handling at [src/lib/connections.ts:108](file:///E:/dsh-repo/src/lib/connections.ts#L108) stays as the fallback for a peer whose row is legitimately invisible.
8. Confirm whether signup requires email confirmation; re-test enumeration at the HTTP layer after any change.
9. Re-run secret detection with a purpose-built scanner over full history, and adopt [SECURITY_CI_RECOMMENDATIONS.md](file:///E:/dsh-repo/docs/security/SECURITY_CI_RECOMMENDATIONS.md) C-1…C-10.

## 7. Corrections to this report’s first draft

Recorded because the draft itself was a defect risk: it would have got an operator to apply a broken migration and to believe flaws were closed that were not.

- Claimed “10 findings fixed / 26 findings (1 Critical, 2 High, 7 Medium, 9 Low, 7 Info)”. Counts were not derived from a deduplicated register. Correct: 26 findings, 3 High, 13 Medium, 6 Low, 4 Informational; 8 fixed locally, 9 authored-but-unapplied, 9 open or unverified.
- Asserted migrations 001–014 applied and DB flaws “currently live”. Neither was verified. Now stated as unknown.
- Described FE-01 as proven token theft / account takeover. No browser exploit was demonstrated; the sink was removed.
- Described the auth copy change as preventing account enumeration. It is client copy only.
- Said “Checks that failed: None”. Several checks failed during the work (unapplyable 010 and 019, an `EBUSY` install, two agent failures, failed web lookups) and `npm audit` was nonzero at the baseline. All are recorded above.
- Recommended “apply 022” while 022 still broke team creation, granted `gender` back to every reader, revoked anon `is_admin()` execute that anon policies depend on (`001:229`, `001:242`), and used an invalid `uuid::bytea` cast copied from 010. That draft is replaced.
- Claimed the invite-code alphabet was 31 characters with a modulo-32 index bug. Measured in PostgreSQL: the alphabet is 32 characters; the real 010 defects were the illegal cast and the missing `search_path`. Retracted.
- Stated three production dependencies. The declared *direct* production set is three; the resolved production tree is larger.
- Presented `public/_headers` as protection. It is a candidate file; nothing about the deployed origin was observed.
- Also verified and kept: the credential scan found nothing credential-shaped in 861 reachable blobs; the `.replit` publishable key is public by design and is not counted as a vulnerability.

## 8. Assessment

**HIGH-RISK ISSUES REMAIN.** Client-side sinks, metadata leakage, dev-server exposure, production console shipping, two unapplyable migrations and the advisory chain are remediated and locally verified; the two High database findings are fixed only as reviewed, locally-tested SQL that no database has received, and one High dependency finding is pinned but not yet installed. The 2026-11-03 read-only live pass (§5b) confirmed the anonymous controls are working, confirmed that the privilege bootstrap is real rather than theoretical (`admin_users` table SELECT and `new_team_invite_code()` execute as anon), corrected the assumed migration history, and surfaced two things that made the then-current SQL undeployable: 022 referenced relations that do not exist live so it would abort as one transaction, and it did not implement the owner’s newly approved name-only visibility for connected students. **Both are addressed in the 2026-11-10 redesign**: 022 is discarded, `supabase/security-review/023`-`028` replace it, 027 is existence-guarded and proven to run against a 016-shaped schema in a second simulated instance, and 023 supplies the name-only path with the column-privilege narrowing rules 2 and 3 require. That redesign is still SQL that no database has received. No part of this audit certifies the application as secure, compliant, penetration-tested or ASVS-conformant; the `authenticated` policy set, grants, views, function ownership, storage configuration and the migration ledger are still unread, and that remains the largest single unknown.
