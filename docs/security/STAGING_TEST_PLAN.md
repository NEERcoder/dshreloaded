# JAVLIN — staging test plan (Phase 2 / 2.1)

Two evidence classes appear throughout and must never be conflated:

| Class | How obtained | What it can prove | What it cannot |
|---|---|---|---|
| **PGlite** | `node scripts/security-db-check.mjs` (279), `node scripts/security-phase2-check.mjs` (90) — in-memory PostgreSQL 17.5, synthetic fixtures, network disabled by overriding `fetch` | row policies, column and table privileges, definer context, trigger behaviour, convergence, rollback, the rollout ordering | PostgREST's own projection filtering, GoTrue, Storage over HTTP, real ACL state, concurrent races, anything about production |
| **Supabase HTTP** | curl or browser against a **staging clone**, two synthetic accounts, publishable key only | what an actual client receives: status codes, column filtering, RPC availability, avatar delivery | anything about roles that no token can hold |
| **Supabase SQL** | the SQL editor on the clone | `pg_policies`, grants, `pg_default_acl`, ledger, trigger definitions | production state unless run on production read-only |

Rule for the whole plan: **no real student records**. Accounts are created on the clone only, with
`@example.invalid` addresses. Nothing here is authorized against production.

## S1 — Phase B pre-contract: the new client against a Phase A database

Owner and peer paths must work while broad access still exists, which is what makes Phase B
order-independent.

| # | Action | Expected | Class |
|---|---|---|---|
| S1.1 | A signs in, opens `/dashboard` | profile form shows A's saved gender and headline; no error banner | HTTP |
| S1.2 | `GET /rest/v1/rpc/get_own_profile` with A's token | 200, array of one row, **all columns** | HTTP |
| S1.3 | Same without a token (anon) | 401/42501 — not "empty array" | HTTP |
| S1.4 | A saves an edit | write succeeds; the re-read returns the stored values, including gender | HTTP |
| S1.5 | `GET /rest/v1/rpc/get_connected_peer_names` with B's token, B↔A accepted | 200, exactly `{user_id, full_name}` per row | HTTP |
| S1.6 | Same with a pending request only | 200, `[]` | HTTP |
| S1.7 | `GET /rest/v1/profiles?select=user_id,full_name,headline,colleges(name)` | unchanged public rows | HTTP |

## S2 — Phase C gates before applying 029

Do not continue if any of these is unresolved; 029 is the file that removes access.

| # | Check | Expected | Class |
|---|---|---|---|
| S2.1 | `000` archived after Phase A, P2/P3 | profiles SELECT policies all name-recognised; teams/membership UPDATE and DELETE expressions match committed 002 | SQL |
| S2.2 | `000` P12: `begin; set local role anon; select count(*) from public.competition_teams; rollback;` | records the L-4 answer as a number, before any grant change | SQL |
| S2.3 | `000` P10a/P10b | ledger stated as PRESENT with rows, or ABSENT — never inferred from `PGRST205` | SQL |
| S2.4 | S1.1-S1.7 green on staging | the client build is live and the two RPCs work | HTTP |
| S2.5 | `000` P11b | no anon/authenticated CREATE on `public` (028 V10 depends on this being read, not assumed) | SQL |

## S3 — Rule 1: avatars stay public (must survive everything)

| # | Action | Expected | Class |
|---|---|---|---|
| S3.1 | A sets `is_public = false` | profile disappears from `GET /rest/v1/profiles?select=...` | HTTP |
| S3.2 | `GET` A's existing `student-avatars` public object URL | **still 200** — the accepted consequence of rule 1, checked over HTTP because no SQL check can see it | HTTP |
| S3.3 | `select public from storage.buckets where id='student-avatars'` | true | SQL |
| S3.4 | object policies mentioning `student-avatars` | 4 (upload, replace, delete, read) — `028` V7 | SQL |

## S4 — Rules 2 and 3: the name-only path

| # | Action (as B) | Expected | Class |
|---|---|---|---|
| S4.1 | `rpc/get_connected_peer_names` with A private and accepted | A's name only; response has two keys | HTTP |
| S4.2 | `GET /rest/v1/profiles?select=full_name&user_id=eq.<A>` | **0 rows** — the row is invisible, which is why the name comes from the function | HTTP |
| S4.3 | `GET /rest/v1/profiles?select=gender,college_id,course,headline&user_id=eq.<A>` | 401/42501, not 200-with-nulls | HTTP |
| S4.4 | `GET /rest/v1/profiles?select=*` | 401/42501 (live precedent: this is exactly what anon already receives, `LIVE_DB_VERIFICATION.md` Deliverable 1) | HTTP |
| S4.5 | `GET /rest/v1/profile_contacts?select=phone_number&user_id=eq.<A>` | 401 — a connection is not a team membership | HTTP |
| S4.6 | A cancels the connection, then S4.1 | name disappears from B's list immediately | HTTP |
| S4.7 | Connections page as B | A's real name shown with "Private profile — you share a name, nothing more."; NOT "No longer on CIRCLE" | HTTP/browser |
| S4.8 | `/circle/<A>` as B | private-profile notice names A; college/course/record all absent | browser |
| S4.9 | `/circle/<C>` where C has no profile row at all | orphan handling preserved: the row is still listed and removable | browser |

## S5 — Rule 4: team integrity

| # | Action | Expected | Class |
|---|---|---|---|
| S5.1 | B self-inserts into A's team | 401/42501 | HTTP |
| S5.2 | B `update competition_team_members set team_id=...` | 42501 (privilege, not policy) | HTTP |
| S5.3 | Member (not captain) `update competition_teams set captain_user_id=<self>` | 0 rows affected, captaincy unchanged | HTTP |
| S5.4 | Member `delete from competition_teams` | 0 rows | HTTP |
| S5.5 | Captain `update competition_teams set invite_code='X'` / `competition_id=...` | 42501 | HTTP |
| S5.6 | Member `update competition_team_members set role='captain'` | statement succeeds, stored value stays `member`; exactly one captain | HTTP |
| S5.7 | Full happy path: create → invite by code → join → request → approve → transfer → leave | all succeed; code matches `^DSH-[A-Z2-9]{5}$`; one captain after transfer | HTTP/browser |
| S5.8 | Transfer to a non-member | rejected, roster unchanged (no partial write) | HTTP |
| S5.9 | Capacity, deadline and one-team-per-competition guards | still raise, unchanged | HTTP |
| S5.10 | Teammate phone visible after code join only for that team | `profile_contacts` readable for that roster, not others | HTTP |

## S6 — Privileges and defaults

| # | Check | Expected | Class |
|---|---|---|---|
| S6.1 | `000` P4 after 025 | `anon` holds no TRUNCATE/REFERENCES/TRIGGER anywhere; `admin_users` not reachable by anon | SQL |
| S6.2 | `GET /rest/v1/admin_users` as anon | 401/42501 now, not 200-with-0-rows (the L-1 close) | HTTP |
| S6.3 | `POST /rest/v1/rpc/new_team_invite_code` as anon | 401/42501 (L-2 close) | HTTP |
| S6.4 | `POST /rest/v1/rpc/join_competition_team_by_code` as anon | 401/42501 — **changed**: previously 200 then "must be signed in". Any client depending on the old shape must be checked | HTTP |
| S6.5 | `POST /rest/v1/rpc/is_admin` as anon | still 200 false — public listings depend on it | HTTP |
| S6.6 | `000` P11 + `028` V10 | no creating role arms default TABLE privileges for anon/authenticated; functions/sequences reported as retained | SQL |
| S6.7 | `028` V6 | every definer function pinned; anon reaches only the allowlisted five | SQL |

## S7 — Owner and admin retention (rule 5)

| # | Check | Expected | Class |
|---|---|---|---|
| S7.1 | Owner reads own profile including gender/timestamps | works through the RPC | HTTP |
| S7.2 | Owner toggles public/private, sets avatar, headline, Instagram | all still succeed | HTTP/browser |
| S7.3 | Admin sign-in and one moderation mutation | succeed; `authenticated` SELECT on `admin_users` preserved | HTTP |
| S7.4 | Admin reads a private profile | visible for moderation | HTTP |
| S7.5 | Skills/experience adders, MARK records, PULSE, CIRCLE directory | unchanged after 027 | browser |
| S7.6 | A degraded owner read (drop the RPC, keep 029) | the dashboard shows a load error, **not** a blank gender that then blocks saving with "Please select a gender" | browser, deliberately staged on the clone |

## S8 — Rollout and rollback on a scratch copy

| # | Action | Expected | Class |
|---|---|---|---|
| S8.1 | Apply 029 on a copy where 023 was never applied | aborts in §0, nothing changed | SQL |
| S8.2 | Apply 029 with the OLD client build deployed | owner profile read errors `42501` — proves why Phase B must precede Phase C | HTTP |
| S8.3 | Apply 029 with the NEW client build | everything in S1 still green, plus S4 | HTTP |
| S8.4 | Execute 029's `--$ ` rollback, then re-apply | broad read returns, then closes again; ACL/policy snapshot identical to before | SQL |
| S8.5 | Execute 024's `--$ ` rollback | all three triggers gone, self-insert succeeds again; re-apply reconverges trigger definitions | SQL |
| S8.6 | Run both local suites after any file edit | 279 and 90, exit 0 | PGlite |

## S9 — Known-unknowns to record, not to test

GoTrue email confirmation and HTTP-level enumeration; response headers on the real origin
(`public/_headers` is a candidate file — fetch it, do not assume); bucket `file_size_limit` and
`allowed_mime_types` (dashboard config); real-user concurrency and race behaviour; any
pre-existing membership rows that the new policy will now reject (cleanup decision, not a
restriction decision); `service_role` key handling outside the browser.

## Reporting

For each row: the request or statement used verbatim, the observed status/SQLSTATE, and the class
(`PGlite` / `Supabase HTTP` / `Supabase SQL`). A row that was not run is reported as **not run** —
never as passing. Copy the completed table into the window record alongside the two `000` dumps;
the `000` before/after diff is the evidence that anything changed at all.
