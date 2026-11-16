# JAVLIN — Security Audit Remediation Report (Phase 2.1)

Date: 2026-11-14 · Repository `E:\dsh-repo` @ `175c93b` · All changes local and uncommitted.

This report maps every live finding in the spec (§2 A–G) and the prior live-verification findings
(L-1…L-8, F-01…F-05) to its root cause, the fix implemented, and the residual risk. Severity uses the
prior assessment in [LIVE_DB_VERIFICATION.md](file:///E:/dsh-repo/docs/security/LIVE_DB_VERIFICATION.md);
"live status" distinguishes what was observed anonymously from what is only repository-confirmed and
simulated. Nothing here is a claim about production state.

## Authorization model (the single source of truth)

- **Profiles**: public rows expose 10 discovery fields; private rows are owner-full / unconnected-nothing
  / accepted-connection-name-only. `gender`, `id`, `created_at`, `updated_at` are owner-only.
- **Team membership**: a row may be created only by the captain (own initial row) or by the definer
  join/approval RPCs. Identity columns are immutable; `role` is derived from `captain_user_id`.
- **Contacts**: phone is visible to the owner and to the **captain of a team the target currently belongs
  to** — never to ordinary teammates, former members, or strangers.
- **Registrations**: participants see six non-sensitive columns; the roster snapshot and participant
  identity are admin-only via a definer RPC.
- **Join requests**: born pending; only the captain/admin can decide; approval is RPC-only and atomic
  with membership insertion.
- **Privileges**: least privilege at the grant layer; definer EXECUTE reduced to an allowlist; every
  revoke names `anon`/`authenticated` explicitly because Supabase default privileges grant to those
  named roles, not to PUBLIC.

## A. Profiles — High (F-01), live status unknown

**Root cause.** 002 left `using (true)` as the only authenticated SELECT policy and a table-wide SELECT
grant; 007 narrowed anon's SELECT to the public projection. The bootstrap default privileges also left
anon holding table-level INSERT/UPDATE/DELETE on profiles (neither 002 nor 007 revokes those). Result: any
authenticated user could read every private profile including `gender`. anon's write *privileges* existed,
but anon could **not** actually write profiles: RLS is enabled and no anonymous INSERT/UPDATE/DELETE policy
exists, so the row-level boundary already denied every anonymous write. The exposure was the authenticated
read, not an anonymous write.

**Fix.** 023 (additive) creates parameterless `get_own_profile()` and `get_connected_peer_names()`
(definer, caller from `auth.uid()`, no caller-ID parameter) and grants the 10-column discovery projection.
029 (restrictive) `revoke select on profiles from authenticated` then grants exactly the 10 discovery
columns, and narrows authenticated INSERT/UPDATE to the owner-writable columns; `gender`/`id`/timestamps
remain reachable only through `get_own_profile()`. The owner INSERT/UPDATE policies are preserved;
identity/ownership columns are not client-writable.

**Anonymous writes — privilege vs RLS (corrected).** 029 revokes INSERT/UPDATE from `authenticated`,
**not** from `anon`; its own header states it "changes no anon grant or policy." No migration in this set
revokes anon's INSERT/UPDATE/DELETE on profiles. That is a deliberate scope decision: 025 leaves ordinary
write grants to the policy layer ("WRITE ACCESS DELIBERATELY NOT TOUCHED HERE"), and 023/029 leave anon
exactly as 007 set it. Anonymous profile writes are blocked by **RLS** (no anon write policy), not by a
privilege revoke.

**Decision — no anon REVOKE introduced.** RLS already denies every anonymous write, so revoking anon's
INSERT/UPDATE/DELETE on profiles would add no protection while contradicting the reviewed boundary
(023/029 "changes no anon grant or policy"; 025 "WRITE ACCESS DELIBERATELY NOT TOUCHED HERE") and forcing a
new, separately tested inverse into 029's rollback. The smallest safe change is accurate documentation plus
behavioural proof, not a new grant/revoke.

This is now verified behaviourally as `anon` in both `security-db-check.mjs` and
`security-phase2-check.mjs`: the write privilege is asserted still present, INSERT is denied by the
row-level policy, and UPDATE/DELETE affect zero rows because no policy admits any row to anon.

**Frontend.** `getCurrentUserProfile` uses `get_own_profile()` with a missing-function-only fallback;
`getStudentDirectory`/`getStudentProfile` select `DIRECTORY_COLUMNS` (verified subset of the 029 grant);
`mapProfile` tolerates privilege-filtered columns; writes never project the whole row back; Circle shows
an accepted private peer's name via `get_connected_peer_names()`.

**Residual.** F-01 not verified live (needs a session token). Avatar URLs stay fetchable after a profile
turns private — accepted by rule 1.

## B. Team membership — High (F-02), live status unknown

**Root cause.** 002's INSERT policy `auth.uid() = user_id` stood alone, so any account could self-insert
into any team (team IDs are public, L-3). A table-wide UPDATE grant let a member rewrite `team_id` to
redirect into another roster. Both unlocked teammate phone (011) and the roster RPC.

**Fix.** 024 replaces INSERT with "captain's own initial row only", revokes UPDATE down to `role`, derives
`role` from `captain_user_id` (trigger), validates captain transfer (new captain must already be a member)
and reassigns the two affected labels in the same statement (definer, required because the old captain
loses the UPDATE policy on the new captain's row mid-statement). 033 adds a transaction advisory lock so
concurrent joins cannot race capacity / one-team rules. The 013 guard trigger and the join/approval RPCs
are preserved, not replaced.

**Residual.** F-02 not verified live. L-3 (public roster IDs) is accepted design and unchanged. Concurrency
is proven by lock acquisition in `pg_locks`, not by a true multi-connection race (PGlite is single-connection).

## C. Contacts — High (product rule), live status unknown

**Root cause.** 011's teammate policy granted phone to anyone sharing a membership row — unsafe once
membership can be fabricated (F-02), and broader than the product now allows.

**Fix.** 030 replaces the teammate SELECT policy with a captain-only policy and narrows the definer
`get_team_member_profiles` so `phone_number` is returned only when the caller captains the team; names,
college, course and Instagram still go to members. Owner policy and anon revoke are preserved. Former
members lose access automatically because the policy re-checks current membership + captaincy.

**Frontend.** `TeamPage` renders phone only for the captain; copy across Signup/Dashboard/Privacy corrected.

**Residual.** Not verified live. The RPC is definer, so the phone gate is enforced in the function body,
not only the policy — both were changed.

## D. Registrations — Medium

**Root cause.** authenticated held table-wide SELECT including `roster_snapshot` (personal contact data)
and `participant_user_id`; a fabricated membership (F-02) would also widen row access.

**Fix.** 031 revokes table SELECT and grants six columns (`id, competition_id, registration_type, team_id,
status, registered_at`). The row policy is unchanged; `roster_snapshot`/`participant_user_id`/`updated_at`
are reachable only through the admin-gated definer `competition_registration_records()`. With F-02 closed,
row access can no longer be manufactured.

**Frontend.** `getMyCompetitionRegistrations` projects only granted columns (verified); admin panel uses the
definer RPC. Solo and team reads both covered by tests.

**Residual.** Whether every team member needs any roster detail is a product question; the snapshot is now
admin-only by default. Not verified live.

## E. Join requests — Medium

**Root cause.** INSERT checked only `auth.uid() = user_id` (status could be supplied); a table-wide UPDATE
grant let identities be rewritten; approval relied on the client.

**Fix.** 032 forces pending on INSERT (policy + existing trigger), replaces the captain UPDATE policy to add
`status <> 'approved'` to WITH CHECK (so approval cannot be done by direct UPDATE), and re-asserts the
`update (status)` column grant. Approval stays in `approve_team_join_request`, which is definer and inserts
membership + flips status in one transaction. Identity columns are immutable (024 §5). Duplicate requests
are handled by the existing unique constraint and pending-only logic.

**Residual.** Not verified live. Request history/notifications preserved (026 protects notification identity).

## F. Default privileges — Medium (L-1/L-2 live-confirmed)

**Root cause.** Supabase bootstrap `ALTER DEFAULT PRIVILEGES` grants ALL on future public objects to
anon/authenticated/service_role. `revoke … from public` does not remove the explicit named-role grant.
Live symptoms: anon table SELECT on `admin_users` (L-1), anon EXECUTE on `new_team_invite_code()` (L-2).

**Fix.** 025 fixes the mechanism: every revoke names anon/authenticated; `admin_users` SELECT removed from
anon (authenticated keeps it for the client's own-row admin check); definer EXECUTE reduced to an allowlist
(`is_admin`, `competition_discoverable_teams`, `get_javlin_levels` kept for anon because public policies call
them); TRUNCATE/REFERENCES/TRIGGER revoked from API roles. 027 corrects the remaining pending tables and is
existence-guarded (`to_regclass`) so it runs against a 016-shaped schema. `is_admin()` anon EXECUTE is
deliberately preserved.

**Residual.** Future-object behaviour is proven by creating objects as the owner role in simulation, not live.

## G. SECURITY DEFINER & triggers — Medium

**Root cause.** 23 definer functions; some pinned `search_path = public`, two 013 guard trigger functions
had no EXECUTE revoke (implicit PUBLIC).

**Fix / decision.** All definer functions pin `search_path` and use qualified references; none use dynamic
SQL (verified). 025 §2b restricts EXECUTE via the allowlist loop, covering the two guard functions. 028
(read-only) verifies search_path, EXECUTE grants and trigger bindings/enabled status; the phase2 VERIFY
tests run it against the full applied set. 030 re-asserts its RPC's grant/revoke; 033 uses
`create or replace` so the guard trigger's OID/binding is preserved.

**Decision recorded:** the spec prefers `search_path = ''`. The notification functions already use `''`
with fully qualified refs. The remaining functions pin `search_path = public` with qualified `public.*`
references and pinned EXECUTE; converting ~20 functions to `''` would be unnecessary churn the spec
explicitly warns against ("Do not replace these functions unnecessarily"). The risk `search_path = ''`
mitigates (object hijack via a writable schema) is addressed here by pinned EXECUTE + qualified refs +
`revoke create on schema public from public`. This is a documented, deliberate choice, not an omission.

**Residual.** `user_competition_from_team(p_team_id)` named in the spec **does not exist** in the repository;
nothing was designed against it. Trigger bindings verified in simulation only.

## Cross-cutting live findings

| ID | Severity | Disposition |
|---|---|---|
| L-1 anon SELECT on admin_users | Medium | Fixed by 025 §1 (live-confirmed symptom). |
| L-2 anon EXECUTE new_team_invite_code | Low | Fixed by 025 §2 (explicit `from anon`). |
| L-3 public roster IDs | Low (accepted) | Unchanged by design; names/phones gated. |
| L-4 teams SELECT drift | Medium (investigate) | **Open precondition** — 024 preflight aborts until reconciled from pg_policies. |
| L-6 features call absent relations | Medium functional | 017–021 must be applied on staging; 027 existence-guarded. |
| L-7 022 unappliable | Blocker | Closed — 022 discarded, replaced by 023–033. |
| L-8 anon controls working | Informational | Preserved. |

## Remaining risks (summary)

1. F-01/F-02 live status unknown until a staging session verifies them.
2. L-4 drift blocks 024 application until reconciled (fail-closed by design).
3. 017–021 unapplied live; L-6 functional breaks persist until applied.
4. PGlite ≠ PostgREST/GoTrue/Storage/JWT; API-level staging tests still required.
5. Non-SQL items remain open: GoTrue account enumeration, storage MIME/size limits, production response
   headers, raw provider errors on the public review form (AUTH-03).