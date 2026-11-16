# JAVLIN — Two-Account Staging Test Plan (Phase 2.1)

Date: 2026-11-14 · **Staging clone only. Synthetic accounts only. Never real student records.**

This plan verifies the authorization model end-to-end through the real API (PostgREST/GoTrue/Storage),
which the local PGlite suites cannot do. Run it after the migration guide's Phase C and 028 verification.

## Accounts and fixtures

- **Student A** — synthetic account. Creates **Team A** in a published competition with team formation
  enabled and a future deadline; is its captain. Sets a synthetic phone (reserved 555 number, e.g.
  `+1 202 555 0101`) and a private profile (`is_public = false`) with a non-empty gender.
- **Student B** — separate synthetic account. Not a member of Team A. No accepted connection to A initially.
- **Admin** — a synthetic account whose `admin_users` mapping exists (for the admin-only checks).
- Record A's `user_id`, Team A's `id`, and the competition `id`. Use a SQL session or the dashboard for
  setup; do not use production data.

Each step lists the action and the **expected** result. A step "fails closed" if the database returns
`42501` (permission denied / RLS) or `P0001` (guard exception) or zero affected rows.

## 1. Unauthorized membership and identity (Student B)

| # | Action (as B) | Expected |
|---|---|---|
| 1.1 | `insert into competition_team_members(team_id,user_id,role) values (TeamA, B, 'member')` | **Denied** (42501). B cannot self-assign. |
| 1.2 | Join Team A by code first (legitimate, step 4), then `update competition_team_members set role='captain' where user_id=B` | Row stays `member` (role derived from captain_user_id). |
| 1.3 | `update competition_team_members set team_id=<other team> where user_id=B` | **Denied** (column not writable). |
| 1.4 | `update competition_team_members set user_id=<other> where user_id=B` | **Denied**. |
| 1.5 | `delete from competition_team_members where user_id=A` | **0 rows** (B cannot remove A). |
| 1.6 | `update competition_teams set captain_user_id=B where id=TeamA` | **0 rows / denied** (B is not captain). |

## 2. Captain-only phone (the product rule)

| # | Action | Expected |
|---|---|---|
| 2.1 | As B (after joining Team A as a member): `select phone_number from profile_contacts where user_id=A` | **0 rows.** Ordinary member cannot read the captain's phone. |
| 2.2 | As B: `select * from get_team_member_profiles(TeamA, array[A])` | Name/college/course/Instagram returned; **phone_number null**. |
| 2.3 | As A (captain): `select phone_number from profile_contacts where user_id=B` (B has set a phone) | **1 row** — captain reads a current member's phone. |
| 2.4 | As A: `get_team_member_profiles(TeamA, array[B])` | **phone_number returned**. |
| 2.5 | As B after leaving Team A: repeat 2.1/2.2 | **0 rows / null** — former member loses access. |
| 2.6 | As an unrelated student C: repeat 2.1 | **0 rows**. |
| 2.7 | As B: read A's phone via the UI team roster | Phone not rendered for B; rendered for A. |

## 3. Private profile and registration privacy (Student B)

| # | Action (as B) | Expected |
|---|---|---|
| 3.1 | `select * from profiles where user_id=A` (A is private, no connection) | **0 rows.** |
| 3.2 | `select gender from profiles where user_id=A` | **Denied / 0 rows.** |
| 3.3 | Accept a connection A↔B, then `select full_name, gender, college_id from profiles where user_id=A` | **0 rows** from the table; `get_connected_peer_names()` returns **A's name only**. |
| 3.4 | As B: `select roster_snapshot, participant_user_id from competition_registrations where team_id=TeamA` | **Denied** (columns not granted). |
| 3.5 | As B (member): `select id, competition_id, registration_type, team_id, status, registered_at from competition_registrations where team_id=TeamA` | Allowed (six-column projection). |
| 3.6 | As B: `select * from competition_registration_records(competition)` | **Denied / error** (admin-only RPC). |
| 3.7 | As Admin: same RPC | Returns records incl. roster snapshot. |

## 4. Legitimate joining workflow

| # | Action | Expected |
|---|---|---|
| 4.1 | As B: `select join_competition_team_by_code('<Team A code>')` | Returns Team A id; B becomes `member`. |
| 4.2 | As B: create a join request to a second team; as that team's captain: `approve_team_join_request(req)` | Membership inserted **and** status `approved` in one transaction. |
| 4.3 | As B: `insert into competition_team_join_requests(team_id,user_id,status) values (TeamA,B,'approved')` | **Denied** (pending-only). |
| 4.4 | As B: `update competition_team_join_requests set status='approved' where user_id=B` | **0 rows / denied** (no self-approval; UPDATE forbids approved). |
| 4.5 | As B: `approve_team_join_request(<own request>)` | **P0001** "Only the team captain…". |
| 4.6 | Duplicate membership / second team in same competition / over-capacity / past-deadline joins | **P0001** guards fire (one-team, capacity, deadline). |
| 4.7 | As A (captain): transfer captaincy to B (a current member) | Succeeds; both role labels update consistently; B can now read member phones, A cannot. |
| 4.8 | As A: reject a pending request | Status `rejected`; no membership created. |

## 5. Public surfaces and admin preserved

| # | Action | Expected |
|---|---|---|
| 5.1 | As anon: read a public profile (`is_public=true`) discovery fields | Works; `gender`/`id`/timestamps denied. |
| 5.2 | As anon: fetch A's avatar URL from the public bucket | Works (avatars stay public). |
| 5.3 | As anon: `select * from admin_users` | **Denied** (anon SELECT removed). |
| 5.4 | As anon: `rpc/new_team_invite_code` | **Denied** (EXECUTE revoked). |
| 5.5 | As anon: `rpc/is_admin` | Returns false (preserved for public policies). |
| 5.6 | As B: `get_team_invite_code(TeamA)` while a member | Returns code; as non-member returns null. |
| 5.7 | Onboarding: new synthetic user creates/edits own profile incl. gender | Works; timestamps DB-generated; user_id/id not client-writable. |
| 5.8 | Notifications: connection request/accept triggers | Recipient/requester notified; actor identity not forgeable. |

## 6. Concurrency (optional, requires two parallel sessions)

- As B and a second synthetic account, attempt simultaneous joins that would exceed capacity or violate
  one-team-per-competition. Expected: the advisory lock serializes them; exactly the authorized number of
  memberships succeed; guards fire for the rest. (PGlite proves lock acquisition; this proves the race.)

## Pass criteria

All unauthorized operations fail closed; all legitimate flows succeed; captain-only phone holds for
current members and revokes for former members; private connected peers reveal name only; public discovery
and avatars work; admin registration access intact; no existing workflow regresses. Record every result
with the SQLSTATE/row count. **Do not use real student accounts or data.**