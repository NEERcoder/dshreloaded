# JAVLIN Phase 2.1 — completion report

Date 2026-11-10. Scope: resolve the blockers found by the independent human review of the Phase 2
remediation SQL, without weakening any security control.

Baseline `E:\dsh-repo` @ `175c93b`, branch `main`. **Nothing was committed, pushed, deployed, or
applied to any database outside a local in-memory PostgreSQL.** No production or staging
connection was opened for writing; no credential was read, rotated or transmitted; every test used
synthetic identities with `example.invalid` addresses.

**Final status: BLOCKED BY MISSING EVIDENCE.** Phase A (`023`-`027`) is READY FOR STAGING REVIEW.
Phase C (`029`) is blocked by exactly one external item — a SQL session on the live project to read
`pg_policies` and run the role-level probes — because 024's and 029's preflights are built to abort
rather than act on unidentified policy. See §8.

## 1. Every finding, resolved or not

| # | Finding | Status | Evidence |
|---|---|---|---|
| R-1 | Client had no path to 023's RPCs; owner read would break and rule 2 was undelivered | **resolved** | `src/lib/dataAccess.ts` owner read + write re-reads + `getConnectedPeerNames()`; `src/lib/connections.ts` `peerName`; two CIRCLE surfaces; 6 new `security:check` invariants; ROLLOUT S1-equivalents in-suite |
| R-2 | `000` P10 ledger query fails `0A000` (three-part name) | **resolved** | P10a availability branch + P10b guarded dump. Running `000` in the harness then exposed two more broken queries in the same file — P2 `42703` alias bug, P3 `42725` uncast `polcmd` — both fixed |
| R-3 | 024's preflight counted policies instead of comparing them | **resolved** | 024 §0 now checks name, command, roles, permissive flag, `USING` and `WITH CHECK` for both team tables, rejects unnamed and RESTRICTIVE policies, rejects duplicate per-command policies, requires 013's guard trigger, and still recognises its own output so a re-apply passes |
| R-4 | 024's rollback left the reassign trigger and function behind | **resolved** | rollback rewritten to drop all three triggers, all three functions, the EXECUTE grant, and to restore the 002 INSERT policy plus three table-wide grants; **executed** by the harness, which asserts the triggers are gone and that F-02 genuinely reopens |
| R-5 | 026's rollback did not restore notification INSERT/DELETE | **resolved** | restored, and converted to executable `--$ ` form |
| R-6 | 025 §4 prose overstates the function/sequence scope | **resolved, differently** | the scope decision is documented with reasons and an exit condition. Measured: revoking function default privileges **cannot** remove PUBLIC EXECUTE, which anon inherits either way. So the fix is not the default revoke — it is 025 §2b's explicit revoke plus 028 V6's gate |
| R-7 | `ALTER DEFAULT PRIVILEGES` binds to the executing role; nothing verified it | **resolved** | 025 §4 states it; `000` P11 dumps `pg_default_acl` per creating role, P11b dumps schema CREATE; 028 V10 raises when a creating role still arms default **table** privileges for an API role, or when an API role holds CREATE on `public` |
| R-8 | 028 V6 reported without gating | **resolved** | V6 now raises on unpinned definer functions and on anon-reachable definers outside a five-entry allowlist with written reasons, and confirms 023's two functions exist/pinned/not-anon. Turning it into a gate **found nine real cases** (the L-2 class generalized) that the NOTICE had been passing |
| R-9 | Trigger bindings outside the convergence diff | **resolved in the phase-2 harness; the review overstated it** | `aclFingerprint` now includes `tgname`, `tgrelid`, `tgfoid`, `tgtype`, `tgenabled`, `tgargs`. `security-db-check.mjs`'s `aclSnapshot` **already** hashed `pg_get_triggerdef()`, which encodes timing, events, column list and bound function — so R-9 applied to one suite, not both |
| R-10 | `position` columns in 027 | unchanged — confirmation, not a finding | grant lists verified against the actual client payloads |
| §7.6 | "ship the client before 023" | **withdrawn — wrong direction** | 023 is additive, so applying it early is harmless; 029 is the restrictive half and must follow the client. §7 of the design doc explains the inverted 004 analogy |
| §6.2 | PostgREST silent-omit vs error unknown | **answered from existing live evidence** | `LIVE_DB_VERIFICATION.md` Deliverable 1: anon already receives `401/42501` for `select=*` and ungranted columns on `profiles`. So a broad owner read after Phase C **errors loudly** — which is what made R-1 a blocker |

No security control was weakened to obtain a green run. Two tests were rewritten because they
encoded the vulnerability rather than the fix: `security-db-check.mjs` asserted anon *could* execute
`join_competition_team_by_code` (the L-2 shape presented as intended behaviour) and asserted
`count(*)` on `profiles` returned 5 rows, which was the pre-remediation exposure. Both now assert
the restricted expectation, each with a paired `PRE_REMEDIATION` baseline reproducing the old
behaviour.

## 2. Files changed in this pass

**Application client**

| File | Change |
|---|---|
| [src/lib/dataAccess.ts](file:///E:/dsh-repo/src/lib/dataAccess.ts) | `isMissingFunctionError()` + `MISSING_FUNCTION_CODES`; `getCurrentUserProfile()` reads through `rpc("get_own_profile")` with a table fallback used **only** when the function is absent, and fails loudly on a privilege-filtered read; `createProfile`/`updateProfile` write without a whole-row returning projection and re-read authoritatively; `mapProfile` tolerates omitted columns; `getConnectedPeerNames()` exported; `getPeerProfiles()` returns a name map fetched only when a peer did not resolve |
| [src/lib/connections.ts](file:///E:/dsh-repo/src/lib/connections.ts) | `ConnectionItem.peerName`; `assembleConnections()` takes an optional name map; orphaned relationships still kept |
| [src/pages/ConnectionsPage.tsx](file:///E:/dsh-repo/src/pages/ConnectionsPage.tsx) | name resolution chain `peer?.fullName ?? peerName ?? "Student"`; private-but-connected copy replaces "No longer on CIRCLE" |
| [src/pages/StudentProfilePage.tsx](file:///E:/dsh-repo/src/pages/StudentProfilePage.tsx) | `peerName` state, fetched only when the profile row is invisible and the viewer is signed in and not self; private-profile notice names the peer |

`src/pages/DashboardPage.tsx` needed **no** change: its existing `profileResult.error → loadError`
branch is what requirement 6 relies on, so a degraded owner read surfaces as a load error rather
than a blank gender that later blocks the save at `DashboardPage.tsx:242`. A genuine
no-profile-row-yet account still gets the blank form and the gender prompt.

**Remediation SQL** — `supabase/security-review/`: `000` (P2, P3, P10a/P10b, P11, P11b, P12),
`023` (rewritten as the additive half, with a two-state consistency guard),
`029_profile_privacy_enforcement.sql` **(new**: the restrictive half, gated on 023),
`024` (expression-comparing preflight; complete rollback), `025` (§2b new; §3/§4 prose corrected
against measurement; executable rollback), `026` (rollback completeness), `027` (rollback
guarded by existence), `028` (V6 gate, V10 new).

**Harnesses** — `scripts/security-check.mjs` (47 → 53), `scripts/security-db-check.mjs`
(029 wired, L-2-class baseline added, definer-RPC test rewritten, 278 → 279),
`scripts/security-phase2-check.mjs` (029 wired; `SEED_SQL` shared; NEGATIVE phase added; ROLLOUT
phase added; ORDER phase now executes `000`; trigger facts in the convergence fingerprint;
storage bucket fixture columns aligned to Supabase; 73 → 90).

**Documentation** — `SECURITY_PHASE2_DESIGN.md` (amended), `PHASE_2_FINAL_HUMAN_REVIEW.md`
(addendum), `PHASE_2_REMEDIATION_PLAN.md` (new), `STAGING_TEST_PLAN.md` (new), this report.

## 3. Client compatibility design

Three properties, each tested rather than asserted in prose:

1. **Client safe on a Phase A database** — the RPCs exist and the broad read also still works, so
   nothing depends on the fallback.
2. **Client safe on a pre-023 database** — `getCurrentUserProfile()` falls back to the table read
   *only* when the error is a missing-function error (`PGRST202`/`42883`/"could not find the
   function"). Any other error propagates. This is what removes the ordering hazard entirely: the
   client can be deployed before, after or between the two migration halves.
3. **Client correct on a Phase C database** — a filtered owner read is detected (`gender`/`id`
   **absent as keys**, not null) and reported as a load error; the peer-name path degrades to an
   empty map, which leaves the connections list correct, just less informative.

Deliberate trade: `createProfile`/`updateProfile` now issue one additional request (the authoritative
re-read) where the mutation previously returned the row. A mutation's returning projection is
constrained by the caller's column privileges, and PostgREST's exact behaviour there was not
measured — so the client no longer depends on it. Saves are rare, reads are not.

## 4. Migration rollout sequence

Full detail and gates in `PHASE_2_REMEDIATION_PLAN.md`; the short form:

- **Phase A** `000` → `023` → `024` → `025` → `026` → `027` → `028`. Additive or client-neutral;
  F-01 remains open at the end of it, which is the point.
- **Phase B** deploy the client, verify S1 against Phase A.
- **Phase C** `029` → `028` → re-run `000` and diff → S3-S6 HTTP probes. `029`'s §0 aborts if
  `023`'s functions are absent, so a mistaken order fails closed instead of bricking the dashboard.
- Rollback: `--$ ` lines per file, executed and re-converged by the suite. Rolling 023 back while
  029 stands is proven (in-suite) to lock the owner out — the documented ordering rule, tested.

## 5. SQL review carried out in this pass

Transaction boundaries: every DDL file is `begin;` … `commit;` with assertions placed after the
statements they govern, so a failed assertion aborts the whole file rather than leaving half-narrowed
privileges. `028`/`000` are read-only. 029's abort-on-missing-023 was verified to leave the
database completely unchanged, not partially applied.

Idempotency: 023's first purity guard was **wrong in a way only a re-apply could reveal** — it
asserted "nothing removed" unconditionally, so after 029 it failed its own legitimate state. It now
encodes an explicit two-state check (state A broad, state B restricted, mixtures abort). 024's
preflight recognises its own INSERT policy name, and 029's recognises the policy it creates, so both
re-apply. Convergence is compared over ACLs, column ACLs, function ACLs and configs, policy
expressions and now trigger bindings.

Grants and privileges: RLS accumulates permissive policies by OR, so a narrowed grant under an
unnamed wide policy is not a fix — hence 024 §0's expression comparison and 029 §0's refusal to
proceed past an unnamed permissive-all SELECT policy. Two engine facts, measured rather than
assumed, changed the design: `pg_get_expr(polqual)` renders `using (true)` as bare `true` (so the
old 023 premise that permissive-all means `polqual IS NULL` was wrong and never matched anything),
and default privileges cannot remove PUBLIC EXECUTE from future functions.

Dependencies: 023 → 001/002/005/007/011/014; 024 → 002/003/004/011/013; 025 → 001/002/010/013;
026 → 005/006; 027 → 025 + 017/019/021 guarded; 029 → 023 (asserted) + the same profile
dependencies. No statement in 023-027 touches relations created by 017-021, which is what makes the
022 failure mode impossible; 027 is the only file that expects them to be absent.

Foreign keys: unchanged in this pass. F-11's `created_by uuid not null … on delete set null`
conflict remains documented and undecided; 027 §4 applies neither option and 028 V9 keeps reporting
it.

## 6. Test results

| Command | Result | Notes |
|---|---|---|
| `node scripts/security-phase2-check.mjs` | **90 passed, 0 failed**, exit 0 | BASELINE 17, PRIVACY 12, TEAM 19, PRIVILEGES 12, PENDING 5, NEGATIVE 5, VERIFY 1, VERIFY-AGAIN 1, ORDER 8, ROLLOUT 10 |
| `node scripts/security-db-check.mjs` | **279 passed, 0 failed**, exit 0 | BOOTSTRAP 1, MIGRATION_REPRO 3, PRE_REMEDIATION 11, AFTER_REMEDIATION 131, RERUN_REMEDIATION 132, SOURCE_INTEGRITY 1; trigger definitions in the convergence snapshot |
| `npm run security:check` | **53 checks passed** | includes the six new client↔SQL invariants |
| `npm run typecheck` | pass | `tsc -b --noEmit` |
| `npm run build` | pass | 18.16s, 201 modules; the pre-existing >500 kB chunk warning is unrelated and predates this pass |

New test classes, all requested in Part 9 and all present: owner RPC; connected-peer name RPC;
unauthorized private-field access; aggregate over an ungranted column; anon **with a JWT subject**
on both definer paths; a member (not captain) attempting `captain_user_id`; a member attempting to
delete a team; a future definer function's grants; trigger-definition convergence; rollback then
re-apply for 023, 024, 026, 027 and 029; missing-RPC compatibility; `000` executed end to end.

**These are PGlite results about SQL.** They are not PostgREST, GoTrue or Storage-over-HTTP
evidence, and nothing here certifies production. The HTTP half is written out, unrun, in
`STAGING_TEST_PLAN.md`.

## 7. Remaining owner decisions

1. **F-11** — option A (drop NOT NULL, keep the FK) or option B (`ON DELETE RESTRICT`), with the
   third shape (capture the actor into immutable history so both attribution and deletion survive)
   described in `PHASE_2_FINAL_HUMAN_REVIEW.md` §5. **Not decided by this pass.** Until decided:
   do not delete a moderator's auth user where 021 is applied.
2. **Retention of `authenticated` default EXECUTE on future functions** — currently retained for the
   measured reason in 025 §4. Revisit only if PUBLIC EXECUTE is removed project-wide, and then with
   a full RPC inventory.
3. **Whether S8.2's deliberate breakage is demonstrated** — proving "029 against the old client
   breaks the owner read" requires breaking a staging profile page on purpose.
4. **Feature migrations vs privacy migrations first** — 017-021 remain unapplied and L-6 features
   remain broken in production either way; the order changes what `000` reports.
5. **Promotion of 023-029 into `supabase/migrations/`** — they are review files until an approved
   window says otherwise.

## 8. Exact prerequisites for staging

Blocking, in order:

1. A SQL session on production (read-only) or a clone: run `000` **in full** and archive P1-P12.
   `000` now executes in the harness, so its own correctness is regression-protected.
2. The L-4 answer as data, not inference: P2/P3 policy text for `competition_teams` and
   `competition_team_members`, plus P12's `begin; set local role anon; select count(*) from
   public.competition_teams; rollback;`. If live policy text is not the committed shape, reconcile
   first — 024 §0 will abort, and that abort is the control, not an obstacle.
3. P10a/P10b ledger output, so "017-021 unapplied" stops being an inference from `PGRST205`.
4. P11/P11b: which creating roles still arm default privileges, and confirmation that no API role
   holds CREATE on `public` (028 V10 gates on both).
5. Phase A applied to a clone, `028` raising nothing, and the second `000` diff archived.
6. The Phase B client build deployed to staging and S1 green — **with `npm ci` first**, since the
   local tree still holds Vite 5.4.21 while the lockfile pins 6.4.5.
7. Two synthetic accounts on staging, never real student records, and `STAGING_TEST_PLAN.md` S2
   green before `029` is applied.
8. Both suites re-run after any edit to 023-029, postdating the last edit, plus `security:check`.
9. A recorded F-11 decision, or an explicit instruction that no admin auth user is deleted meanwhile.

Nothing in this pass was executed against the live project. Every live statement here is either
cited to `LIVE_DB_VERIFICATION.md` (2026-11-03) or marked as not yet observed.
