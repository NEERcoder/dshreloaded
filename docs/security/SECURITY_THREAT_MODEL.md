# JAVLIN security threat model

Assessment date: 2026-10-28. Baseline: `175c93b`, local uncommitted audit changes. This model records source observations, not deployed configuration. It was formalized during re-review, after the first local fixes; the requested pre-change documentation gate was not fully met.

## Assets and data classification

| Asset | Intended access | Consequence of misuse |
|---|---|---|
| Published colleges, opportunities, events, videos and news | Public read; administrators write | Defacement, malicious destinations, misleading listings |
| Student discovery profiles and public records | Opt-in public projection; owner edits; moderation reads | Unwanted discovery, personal-data disclosure |
| Gender, private profile fields and account details | Owner/authorized reporting, not general discovery | Sensitive attribute disclosure |
| Phone numbers | Owner and legitimate teammates per migration 011 | Unwanted contact, social engineering |
| Connection requests, preferences, notifications | Participants or owner | Private relationship disclosure, forged activity |
| Team invitations, membership, registration and snapshots | Code holders, approved applicants, captain and authorized administrators | Unauthorized roster access, competition manipulation |
| CV uploads and applications | Applicant submission; administrators read/manage | Personal-data disclosure and storage abuse |
| Auth credentials and access/refresh tokens | Auth service and account holder | Session compromise |
| Admin membership and service credentials | Trusted operators only | Platform-wide unauthorized actions |
| Build artifacts and deployment permissions | Maintainers and hosting service | Malicious client code or unsafe configuration |

## Actors

Anonymous visitor; ordinary authenticated student; profile owner; connected student; team member; captain; administrator; malicious content contributor; malicious website visited by a developer; compromised dependency or maintainer account. A logged-in user is not trusted merely because signup/email verification succeeded.

## Data flows and boundaries

```text
Repository + dependency registry -> local/hosted build -> static CDN -> browser
Browser -> Supabase Auth -> JWT/session stored by the SPA SDK
Browser + public client key + optional JWT -> PostgREST -> grants + RLS + constraints
Browser -> RPC -> execute grants + caller checks + transaction/trigger rules
Browser -> Storage API -> bucket policy + object RLS + MIME/size controls
Browser -> public storage/external images, links, Google Fonts, YouTube
Trusted operator -> DB/hosting/auth configuration (outside this local audit)
```

The browser is attacker-controlled. React checks, query projections and disabled controls are not authorization. Database grants, cumulative RLS policies, function ownership/execute grants, RPC checks and storage controls jointly enforce the boundary. A SECURITY DEFINER function needs its own caller checks; a fixed search path is necessary but not sufficient. Public object delivery can bypass object SELECT policies.

## Abuse cases and control expectations

| Scenario | Required control | Finding/control reference |
|---|---|---|
| Ordinary account enumerates opted-out profiles or gender | Row visibility plus owner-only sensitive projection | F-01; fix authored in 023, not applied |
| Student inserts or moves membership into another team | Authorized join RPC and immutable membership identity | F-02; authored in 024, not applied |
| Captain rewrites competition/invite/roster identity | Narrow grants and validated business transitions | F-03; proposed grants, residual transition review |
| Content embeds a dangerous URL | Parsed scheme allowlist at actual render sink | FE-01, FE-02, FE-03 |
| Recovery URL copied into metadata | Never copy query/hash credentials into metadata | AUTH-01 |
| Backend diagnostic echoed to account page | Fixed public error messages, redacted diagnostics | AUTH-02, AUTH-03, FE-04 |
| Public avatar remains accessible after opting out | Explicit public-asset semantics or separately designed private delivery | DB-03 |
| Anonymous upload consumes storage | Trusted quota/rate limits, MIME/size enforcement | DB-03; operator verification |
| Malicious origin reads developer resources | Patched tooling, restricted host/bind, no secrets in client tree | INF-01, INF-02 |
| Default ACL weakens intended column restrictions | Revoke broad privileges before narrow grants; test actual ACLs | F-04, F-05 |
| Attacker self-asserts a verified skill | Server-enforced attestation authority | F-09 |

## Design constraints and open decisions

- Preserve public discovery for opted-in students, ordinary connections and approved team flows.
- Do not silently grant connected students access to every field of a private profile. Full-profile visibility and the minimal identity needed for request/connection lists need separate treatment.
- Existing connection lists retain unresolved peers (`assembleConnections` returns `peer: null`), label them Student, and keep relationship actions available. **This bullet originally defended the opposite decision** — that private peers stay unresolvable — and the owner's approved rule 2 supersedes it: an accepted connection may now see the peer's **name**, and nothing else. 023 implements that with a parameterless definer name path plus a ten-column `grant select` on `profiles`, deliberately **not** with a connected-user branch in the row policy, which would have handed over whole private rows and breached rule 3. Gender therefore no longer "needs a separate owner-only projection design" — `get_own_profile()` is that design, and `028` V2 asserts the columns are unreachable any other way. Roster details stay behind the existing membership-gated RPC. The `peer: null` fallback stays in the client because a cancelled or blocked relationship legitimately has no resolvable row.
- Public avatars are explicitly modeled as public in migration 007. Making the bucket private requires a delivery/UX migration, not only a SELECT-policy edit.
- Captain transfer and team creation are currently multi-request operations. Atomicity, cross-team concurrency and deadline rules require further tests; their existence is not evidence that every transaction invariant holds.
- No decision on public registration throttling, retention, backup guarantees, MFA enforcement or live cookie/session settings is inferred from the frontend.

## Verification assumptions

Live migration history, effective roles/ACLs, storage settings, Auth settings, production response headers, backups and external CI are not established by repository inspection. Local PostgreSQL tests, when available, use synthetic fixtures and emulated Supabase schemas; they do not certify deployed Supabase behavior. No real student records are used.

See `SECURITY_FINDINGS.md` for findings and `SECURITY_OPERATIONS_RUNBOOK.md` for authorized verification steps.
