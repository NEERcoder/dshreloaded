# JAVLIN security findings register

Baseline `175c93b`, workspace `E:\dsh-repo`, uncommitted audit changes. Dates: assessment
2026-10-28, re-review 2026-10-29, live verification 2026-11-03, remediation redesign 2026-11-10.
The remediation files referenced below as 023-028 live in `supabase/security-review/`, are
**authored and locally verified but applied nowhere**, and are described in
`SECURITY_PHASE2_DESIGN.md`. `022_rls_privacy_hardening.sql` was discarded; where this register
still says "022", that is the historical first-pass claim.

Status vocabulary: **Fixed locally** = change present in this working copy and covered by a local test. **Authored, not applied** = SQL/migration exists; no database received it. **Open** = not addressed. **Unverified** = live environment not inspected.

## Severity summary

| Severity | Count | Fixed locally | Authored, not applied | Open / unverified |
|---|---:|---:|---:|---:|
| High | 3 | 1 | 2 | 0 |
| Medium | 13 | 5 | 5 | 3 |
| Low | 6 | 2 | 2 | 2 |
| Informational | 4 | 0 | 0 | 4 |
| **Total** | **26** | **8** | **9** | **9** |

No finding is rated Critical: the two highest-impact issues expose personal data and team contact numbers to anyone who can create an account, with no privilege escalation, credential theft or code execution demonstrated.

## Database and authorization

### F-01 Private student profiles readable by any authenticated user — High — reproduced locally, fix not applied
`supabase/migrations/002_phase2_teams_and_storage.sql:44-47` creates the authenticated `select ... using (true)` policy on `profiles`; migration 007 added the `is_public` policy at `007:41-44`, which is the anon-facing one. RLS policies are permissive-OR, so the 002 clause wins. Client directory had no `is_public` filter.
Impact: name, college, course, year, headline, Instagram handle and avatar of opted-out students, plus `gender`, reachable by any account. Signup is self-service.
Evidence: `scripts/security-db-check.mjs` `[PRE_REMEDIATION]` reproduces it in synthetic PostgreSQL; `[AFTER_REMEDIATION]` proves the replacement policy denies an outsider, allows owner, public rows and admin, and keeps owner edits working. `scripts/security-phase2-check.mjs` adds the approved-rule scenarios: an accepted peer sees the name and only the name, a pending or absent relationship sees nothing, the owner still sees everything. Fix: 023 — one row policy plus **column privileges**, because a row policy alone leaves `select=gender&is_public=eq.true` working. **Live status unverified — nothing applied.**

### F-02 Team membership can be taken without invitation — High — reproduced locally, fix not applied
`002:150-151` allowed `with check (auth.uid() = user_id or <is captain>)`: any authenticated user could INSERT their own row into any team, and 002's membership UPDATE policy also allowed rewriting `team_id`, moving an existing membership between teams. Membership then satisfies 011's teammate phone policy and `get_team_member_profiles`.
Evidence: `[PRE_REMEDIATION]` reproduces both the self-insert and the `team_id` rewrite, each followed by synthetic phone/roster visibility. 024 restricts INSERT to the captain's own initial row, revokes broad UPDATE down to `role`, and verified `join_competition_team_by_code`, `approve_team_join_request`, capacity and deadline guards still work. **Live status unverified.**

### F-03 Captains can rewrite invite codes and competition identity — Medium — reproduced locally, fix not applied
`002:114` uses `with check (true)` on team UPDATE with table-wide update privilege, so `invite_code`, `competition_id` and `id` are writable.
Evidence: `[PRE_REMEDIATION]` shows `invite_code` rewrite succeeding; `[AFTER_REMEDIATION]` denies `invite_code`, `competition_id`, `id` while name/status/captain transfer keep working. Fix: 024 column-level UPDATE grants, `guard_team_captain_identity` refusing captaincy for a non-member, and `reassign_membership_roles` moving the labels in the same statement.
Note from the live pass: 004 revoked the *read* of `invite_code` but never the write, so the pre-fix rewrite succeeded while PostgREST could not display the forged value — the defect was invisible to the client and real in the database.

### F-04 Default privilege bootstrap leaves TRUNCATE/REFERENCES/TRIGGER with API roles — Medium — reproduced under an explicit fixture assumption
001 contains no grants, so under the Supabase-style default-privilege fixture every public table starts with ALL to anon/authenticated, and migrations only ever add grants. TRUNCATE bypasses RLS and row triggers.
Evidence: `[PRE_REMEDIATION]` demonstrates anon/authenticated `truncate public.admin_users` succeeding under that fixture. 025 revokes TRUNCATE/REFERENCES/TRIGGER by looping over **every relation present at run time** rather than a hard-coded list, then fixes the source with `alter default privileges`; 027 §3 repeats the revocation for the 017/019/021 tables that do not exist live yet. The test now passes for anon and authenticated.
Caveat: **the fixture assumption is not a measurement of live ACLs**; the runbook makes the live check the first operator step.

### F-05 Connection and notification identity rewriting — Medium — reproduced locally, fix not applied
005/006 wrote row policies but left table-wide UPDATE, so a recipient could rewrite `requester_user_id`/`recipient_user_id` or an actor field. `[PRE_REMEDIATION]` reproduces both; 026 restricts the writes to `status` and `read_at`, and additionally revokes `insert, delete` on `student_notifications` from `authenticated` — 006:140 revokes `from anon` only, so that privilege came straight from the bootstrap and RLS was the only thing making it a no-op.

### F-06 Membership role label forgeable — Low (integrity, not authority) — authored in 024, verified locally, not applied
`competition_team_members.role` was caller-supplied, so a member could store `role='captain'`. The harness confirms captain authority never follows the label (team actions and approval RPC still reject). 024 derives `role` from `competition_teams.captain_user_id` in a BEFORE trigger, and an AFTER trigger rewrites the two affected labels when captaincy moves; delete/rejoin via code still preserves the canonical captain row.
The AFTER trigger is the one place in this design that needs `security definer`: in the instant after `captain_user_id` changes, the old captain no longer satisfies 002's UPDATE policy on the new captain's row, so an invoker-rights rewrite updates zero rows and leaves the team with no captain. 024 takes no parameters, touches one column and pins `search_path`.

### F-07 Migration 019 fails to parse — Medium — fixed and verified locally
`constraint student_skills_one_per_name unique (user_id, lower(name))` is invalid in a table constraint. Harness reproduces SQLSTATE 42601 against the committed file; the rewritten `create unique index ... (user_id, lower(name))` applies and enforces case-insensitive uniqueness. 019 is unapplied in every environment, so the edit is safe.

### F-08 Migration 010 fails to parse and lacks a fixed search path — Medium — fixed and verified locally
`gen_random_uuid()::bytea` is an illegal cast (SQLSTATE 42846, reproduced) and `new_team_invite_code()` had no `set search_path`. Fixed in 010 to `get_byte(uuid_send(gen_random_uuid()), 0)` with `search_path = pg_catalog`. Verified: generated codes match `^DSH-[A-Z2-9]{5}$` and remain volatile.
Correction to the first pass: 022 re-created the same body idempotently for environments that had already applied 010, and that re-create is **not** carried into 023-027 — deliberately. The HEAD version of 010 cannot parse, so any environment whose ledger records it as applied installed something else (the same out-of-band drift class as L-4). `000_read_only_preflight.sql` is the way to find out; 025 only fixes the function's EXECUTE boundaries.

### F-09 Students can self-attest `verified` skills — Low — fixed in the working copy of 019, hardened by 027 (not applied)
`source` was owner-writable although only an attester should set `verified`. The owner write set now excludes it; the harness confirms an owner can add a skill but cannot insert or update `source`. 027 §1 re-derives the same column set from the privilege layer, so the property survives a re-run of the pre-fix grant state — and 027 §2 extends it to `student_experience`, whose 019:180 table-wide INSERT let a client supply its own row `id`.

### F-10 Public roster identity remains listable — Low / by design, unresolved — open
002 exposes membership rows and `captain_user_id` publicly (used for team listings and counts). 023-027 deliberately do not change it. Consequence: roster user IDs are public and can be correlated with opted-in profiles. Names and phone numbers stay gated (verified). Product decision, recorded as residual risk.

### F-11 Migration 021 `created_by uuid not null ... on delete set null` — Low — open, options stated in 027 §4
A NOT NULL column cannot be set null, so deleting a moderator account fails at runtime (SQLSTATE 23502, reproduced in both harnesses). 021 is unapplied; the DDL itself parses, so the conflict surfaces only when an admin auth user is actually deleted. 027 §4 states option A (drop NOT NULL, keep the FK — flags survive, actor becomes unknowable) and option B (ON DELETE RESTRICT — the trail survives, the deletion needs a reassignment process that does not exist) and applies **neither**, because this is a records-retention decision. `028` V9 keeps reporting it open until the owner chooses.

## Client, transport and dependency

### FE-01 Stored `javascript:` URL in student-authored proof links — Medium — fixed locally, unit and DOM verified
`StudentCard.tsx` rendered `href={record.proofUrl}` from a column the student can PATCH directly. Now sanitized at the render site; the proof link is omitted when unusable. `node scripts/security-check.mjs` exercises 14 payloads; a real Chromium mount of `StudentRecordList` with five records rendered exactly one link (the valid HTTPS one). Actual browser execution was not demonstrated — the fix removes the sink, it does not prove exploitability.

### FE-02 Non-canonical YouTube URLs placed in iframes, CSP/host allowlist mismatch — Medium — fixed locally, browser verified
The featured video put `sanitizeYouTubeUrl(...)` straight into an iframe `src`, accepting `m.youtube.com`, `youtu.be` and watch URLs that the candidate CSP `frame-src` would block, and previously allowed arbitrary same-scheme URLs. Added `getYouTubeEmbedUrl()` which emits only `https://www.youtube.com/embed/<11-char-id>`; supporting-story links use `sanitizeExternalUrl` and drop `target` when unusable. Verified in Chromium on the patched Vite dev server: iframe src `https://www.youtube.com/embed/dQw4w9WgXcQ`, all page links free of executable schemes, zero console CSP violations with the candidate headers served.

### FE-03 Video writes stored unsanitized input — Medium — fixed locally
`saveVideo` now persists `optionalUrl(input.youtubeUrl)` (read path validated separately). Covered by an invariant test; admin write flow not exercised live.

### AUTH-01 `og:url` copied the full href, including password-recovery credentials — Medium — fixed locally, DOM verified
`PageShell.tsx` used `window.location.href`. Recovery links put tokens in the query/fragment, and the meta tag survives SPA cleanup. Now `origin + pathname`, matching the canonical link. Verified by loading `/reset-password?code=AUDIT_QUERY#access_token=AUDIT_FRAGMENT` and asserting `og:url` and canonical contain neither marker.

### AUTH-02 Auth error strings distinguished account existence and echoed raw provider text — Low (client copy) / server-side enumeration unverified
`authErrors.ts` returned provider messages verbatim on unknown errors and had distinct wording for “already registered” and “user not found”. The fallback is now a fixed generic string with no raw diagnostics, wrong-password and no-such-user share one message, and duplicate-signup copy no longer claims an email was sent. **This does not prevent account enumeration**: GoTrue's HTTP responses are reachable directly with the public key, and the Supabase email-confirmation setting was never inspected. Signup page success/error UI paths were not reconciled, so users may still see an error where a success screen appears.

### AUTH-03 Raw backend diagnostics rendered on public pages — Medium — reduced, not eliminated
`dataAccess.failure()` still surfaces `error.message` (`dataAccess.ts:208`), and the public review form renders it (`ExplorePage.tsx:352`, `:479`), so PostgREST constraint or column text can reach the page even though nine `console.error` argument drops now log context-free lines. Production builds also drop `console.*`. Full fix requires a message allowlist at the data layer — deliberately not done here because it changes visible behaviour across every write path.

### INF-01 Dev server bound to all interfaces with the Host check disabled — Medium — fixed locally
`vite.config.ts` had `host: "0.0.0.0"` and `allowedHosts: true`, the configuration GHSA-67mh-4wv8-2f99 abuses. Now `host: "127.0.0.1"` with `allowedHosts: ["localhost"]`, so the sandbox/Replit flows that needed a wildcard need an explicit opt-in. Host validation is a same-origin read mitigation, not network isolation.

### INF-02 Vite/esbuild advisory chain — High (dev-tool exposure) — remediated in manifest and lockfile, local install pending
`npm audit` reported nine advisories across `vite@5.4.21` / `esbuild@0.21.5`, including the high-severity Windows `launch-editor` existence-check bypass (GHSA-587h-7wmj-h5pm). npm’s suggested `vite@8.3.5` was rejected: **Vite 6.4.4 is the minimum patched release and 6.4.5 keeps `@vitejs/plugin-react@4.7.0`** (peer range `^4 || ^5 || ^6 || ^7`), Node `^18 || ^20 || >=22`, and esbuild `^0.25.0`. Manifest and `package-lock.json` now pin `vite@6.4.5`, and `npm audit` returns **0 vulnerabilities**.
Verified with 6.4.5: full `vite build` succeeds (201 modules) and the app served from it passed every browser check above.
Not finished: the local `node_modules` still contains 5.4.21 because a separate dev-server session holds `@esbuild/win32-x64/esbuild.exe`; `npm install` fails with EBUSY. A fresh `npm ci` installs the patched tree.

### FE-04 Production console stripping — Low — fixed locally
Builds drop `console` and `debugger`; `npm run build` output contains no `console.error` from `dataAccess`.

### FE-05 Security headers absent from the repository — Medium — candidate authored, deployment unverified
Only `public/_redirects` existed. Added `public/_headers` with `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, short-live HSTS and a CSP built from the dependencies actually used (self scripts, inline styles for Tailwind/React style attributes, Google Fonts, Supabase REST/Realtime, YouTube embed frames, `frame-ancestors 'none'`). Served locally through a stub that reads the file: headers arrive, app renders, no CSP violation. **This is not evidence about the live site** — Cloudflare Pages or dashboard transform rules may already add or override headers, and nothing was fetched from production. HSTS is limited to `max-age=86400` pending confirmation that every subdomain serves HTTPS; without preload it does not close the first-visit window.

### DB-03 Avatar bucket is public and remote image URLs are unvalidated — Medium — unverified, config-only remediation
`student-avatars` is created public and any signed-in user may read any object; `avatar_url` is stored as submitted. Restricting the policy would break public profile pictures and known URLs, so this needs a storage-side decision: keep public, or move to signed URLs. Bucket-level `file_size_limit`/`allowed_mime_types` are dashboard settings that cannot be inspected from here. Not changed.

### SEC-01 Public client key in tracked configuration — Informational
`.replit` and the built bundle carry the Supabase publishable/anon key, which is public by design; no secret-shaped value was found in 861 reachable git objects, 289 worktree files or the dist output (heuristic scan, not a purpose-built scanner). `.env.example` lists `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The real boundary remains RLS and grants — see F-01/F-02.

### SEC-02 Legacy duplicated source at repository root — Informational
Root-level copies of `dataAccess.ts` and components are not referenced by the SPA entry path. Not a vulnerability; deleting them is a code-hygiene change outside this audit’s authorization.

### SEC-03 Client-side session persistence — Informational, by design
Supabase-js stores tokens in `localStorage`, standard for a key-exchange-less SPA. No XSS sink was proven exploitable, and FE-01/FE-02/FE-05 reduce stored-URL risk. Recorded as an accepted architecture property.

### SEC-04 No CI workflow in the checkout — Informational
`.github/workflows` is absent, which proves only that this repository tracks none. External CI, Cloudflare builds or Supabase branch settings were not inspected and may run security checks. See `SECURITY_CI_RECOMMENDATIONS.md`.
