# JAVLIN security operations runbook

For the person who can see the Supabase project and the Cloudflare account. Nothing in this file was executed against production during the audit; the workspace had no `.env`, no credentials and no live database access.

## 1. Environment and configuration inventory

| Area | Where it lives | What to confirm |
|---|---|---|
| Client configuration | `src/lib/supabase.ts`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Only publishable/anon material reaches the bundle |
| Server-side secrets | Supabase project settings / hosting secret store | `service_role` and `service` keys are never in the client build, never in `package.json`, never logged |
| Static hosting | Cloudflare Pages project (inferred from `.replit` hints; not verified from a dashboard) | Build command, output dir, env var secrecy flags, transform rules, TLS settings |
| Database | Supabase PostgreSQL | Migration history vs committed SQL, roles, ACLs, `pg_policies` |
| Auth | Supabase GoTrue | Signup method, email confirmation, rate limits, captcha, session lifetime, allowed redirect URLs |
| Storage | Supabase buckets | `public` flag, MIME allowlist, size limit per bucket |

Secret-handling rule for this project: read names and locations, never paste values into chat, tickets, screenshots, commits or these documents. If a value has appeared anywhere it was not meant to, rotate it through the dashboard — rotation is an owner action and was not performed here.

## 2. First actions before trusting any claim in this audit

Take a backup/PITR point you can restore from first if the project settings offer one; do not assume it exists.

```sql
-- 2.1 Which migrations are actually recorded?
select version, name, inserted_at
  from public._supabase_migrations.schema_migrations   -- if this table exists
 order by version;

-- 2.2 Effective row policies, per table, command and role.
select tablename, policyname, cmd, roles, qual, with_check
  from pg_policies
 where schemaname = 'public'
 order by tablename, cmd, policyname;

-- 2.3 Effective table privileges for the API roles.
select table_name, grantee, privilege_type
  from information_schema.role_table_grants
 where table_schema = 'public' and grantee in ('anon','authenticated','service_role')
 order by table_name, grantee, privilege_type;

-- 2.4 Column privileges (where permissive-OR row policies can be defeated).
select table_name, grantee, column_name, privilege_type
  from information_schema.column_privileges
 where table_schema = 'public'
   and table_name in ('profiles','student_connections','student_notifications',
                      'competition_teams','competition_team_members',
                      'competition_team_join_requests','student_skills')
 order by table_name, grantee, column_name;

-- 2.5 Function security context, search path and execute grants.
select p.proname,
       pg_catalog.pg_get_function_arguments(p.oid) as args,
       case p.prosecdef when true then 'DEFINER' else 'INVOKER' end as security,
       p.proconfig,
       pg_catalog.array_to_string(pg_catalog.aclexplode(p.proacl).grantee::regrole::text, ',') as grantees
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
 order by p.proname;

-- 2.6 Which tables have RLS enabled but not forced?
select relname, relrowsecurity, relforcerowsecurity
  from pg_class join pg_namespace n on n.oid = relnamespace
 where n.nspname = 'public' and relkind = 'r'
 order by relname;
```

Compare 2.1–2.6 against the committed SQL. Migrations `002` and `003` state they were applied out of band and reconstructed afterwards, and `013` documents the browser calling an RPC before any committed file defined it, so **the live schema may be a superset of the repository**. Any divergence is a finding, not a rounding error.

Also confirm the bucket configuration in the dashboard (or `storage.buckets`): `public`, `file_size_limit`, `allowed_mime_types` for `student-avatars`, `general-applications`, `pulse-media`, `homepage-animations`, and the three admin media buckets from `002`.

## 3. Applying the database remediation

Order of work, never directly on production first:

1. Create or use a staging project. Take a restore point / backup of it.
2. Run `supabase/security-review/000_read_only_preflight.sql` and **archive the output**. Establish which of `015`–`021` are pending; historical notes claim 001–014 applied and 015–021 not, and the live ledger turned out to be wrong in both directions (015/016 *are* applied, 017–021 are not). **Verify with 000**, do not assume.
3. Apply `010` (invite-code generator fix) and `019` (unique-index fix, skill `source` write set) if the ledger says the environment ran a different version. The old claim that 022 guarded 010 idempotently is withdrawn — an unparseable migration cannot have been applied, so a ledger entry for it means out-of-band SQL (L-4 class), which is a reconciliation task rather than something a later file can paper over.
4. Review and apply `supabase/security-review/` in this order: **023 → 024 → 025 → 026 → 028**. Read each first; 023 changes who can read `profiles`, 024 changes who can write team membership and what a team row's identity columns accept, and 025 removes privileges from roles that inherited them from the project bootstrap. Expect 024 to **abort on its preflight** if live `competition_teams` policies differ from committed 002 — the live project already diverges once (L-4), and aborting is the designed behaviour, not a failure to work around.
5. Then `027_pending_table_corrections.sql`. It is existence-guarded, so it is correct before *or* after 017/019/021; re-run it after those feature migrations land.
6. Run `supabase/security-review/028_read_only_verification.sql`, then re-run `000` and **diff the two outputs**. The comparison is the evidence; 028 passing on its own is not, because it verifies grants and policies, not PostgREST, GoTrue or Storage-over-HTTP.
7. Re-run `node scripts/security-db-check.mjs` (278) and `node scripts/security-phase2-check.mjs` (73) after any change to these files, and `npm run security:check` (47) for the client half. To assert against production-shaped data, use a staging copy with synthetic accounts — never test authorization with real student records.

Behavioural checks that must hold after applying, with two throwaway accounts and synthetic data only:

- Account A sets its profile private; account B’s `select ... from profiles where user_id = A` returns zero rows, while B can still see CIRCLE’s public rows and its own row.
- **Connected pair, the rule-2 path:** A and B hold an *accepted* connection. `POST /rest/v1/rpc/get_connected_peer_names {}` as B returns exactly `{user_id, full_name}` for A. `select=*`, `select=gender`, `select=id,created_at` on A’s row as B all fail (401/42501), and A’s `profile_contacts` phone stays unreachable — a connection is not a team membership. If A cancels, the name disappears from B’s list immediately, and B’s UI falls back to its null-peer rendering.
- Pending or one-way requests grant nothing: `get_connected_peer_names()` returns `[]` for the requester who has only a pending row.
- B’s direct `insert into competition_team_members (team_id, user_id, role) values (<A’s team>, B, ‘member’)` is rejected; joining with A’s invite code through `join_competition_team_by_code` succeeds; `approve_team_join_request` still works for A as captain.
- Team creation from the app still produces a team **and** a captain membership row, and the invite code matches `^DSH-[A-Z2-9]{5}$`.
- Captain transfer updates `competition_teams.captain_user_id` and both membership `role` values in one operation; transferring to a non-member fails and leaves the roster untouched. Rewriting `invite_code` or `competition_id` is rejected at the privilege layer.
- Connections: recipient accepts, requester cannot self-accept, either party can end it, and the notification triggers still fire once.
- Avatar delivery (rule 1): a public student’s `student-avatars` URL still returns 200 over HTTP **after** that student sets `is_public = false`. This is the accepted consequence of rule 1, and no SQL check can see it — it must be fetched.
- Admin: sign-in, one moderation mutation, and the full MARK/records read path behave as before; 023 keeps `is_admin()` visibility and 025 keeps `authenticated` SELECT on `admin_users`.

If any of these fail, stop and roll the transaction back rather than patching around it. Each of 023–027 carries its own ROLLBACK block, but rolling back 023 reopens F-01 and rolling back 024 reopens F-02/F-03, so rollback is a temporary incident state, not a fallback configuration.

## 4. Deployment and hosting verification

The repository now contains `public/_headers`. That file only proves what Cloudflare Pages **should** send once deployed and only if no transform rule overrides it.

```bash
curl -sSI https://<your-origin>/ | sed -n '1,40p'
curl -sSI https://<your-origin>/explore | grep -i '^content-security-policy'
```

Assert each of: CSP directives present and parseable, `X-Frame-Options`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Strict-Transport-Security`. Then in browser devtools confirm no CSP violation on the homepage, CIRCLE, EXPLORE (YouTube embed frame), the dashboard, and an avatar crop upload preview. Keep HSTS at the short candidate value until every host and subdomain on the zone serves HTTPS, then raise the duration and consider preload.

Check that no source maps ship: the build has no `.map` output today; a dashboard setting can still enable them.

Also decide the `_headers` story for Supabase’s own origins. Headers on the app origin do not govern `*.supabase.co` object responses, so avatar/content-type hardening belongs in the Storage configuration, not in this file.

## 5. Auth configuration review (not inferable from code)

- Signup method, email confirmation on or off, allowed redirect URLs, session lifetime, rate limits and captcha. The audit’s account-enumeration finding **cannot** be closed from the client: only GoTrue configuration decides whether a duplicate signup is distinguishable at the HTTP level.
- Confirm no custom Auth hook or Edge Function silently widens access.
- Confirm which roles can reach each PostgREST endpoint from the API settings, not from React guards.

## 6. Incident response

1. Contain at the boundary that is authoritative — RLS/grants, storage policies, hosting rules, credential rotation — not by editing React components.
2. Preserve evidence: `pg_policies`, `role_table_grants`, `column_privileges`, auth logs, storage access logs, the deploy ID.
3. Rotate anything that may have leaked; treat `service_role` keys as leaked if they ever reached a browser bundle or log.
4. Re-verify after each change with the queries above and with `scripts/security-check.mjs`.
5. Do not delete or bulk-edit student records to “clean up” an exposure without an owner decision on retention and legal basis.

## 7. Recovery

Backup/PITR availability, retention, restore timing and rehearsal are all Supabase-plan facts this audit could not see. Until an operator inspects them, no RPO/RTO is claimed here. Rehearse a restore on a scratch project before trusting it, and record the outcome in this runbook.

## 8. Recurring checks

- `npm run typecheck`, `npm run build`, `npm run security:check` on every change.
- `npm audit` plus lockfile review on every dependency change; Vite advisories are dev-server issues, so patch them rather than accepting “production unaffected”.
- `node scripts/security-db-check.mjs` after any policy, grant, trigger or RPC change (requires the documented PGlite scratch install).
- `pg_policies` / grants diff against the committed SQL after every migration apply.
- Re-read this runbook’s open items; several are environment questions that no code review can answer.
