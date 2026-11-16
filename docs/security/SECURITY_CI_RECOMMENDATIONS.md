# JAVLIN CI and pipeline security recommendations

Nothing here was added to a pipeline. The repository tracks no `.github/workflows`, which only proves that this checkout contains none — external CI, Cloudflare build settings or Supabase branch integration may exist and were not inspectable. Do not read this file as a claim that no CI runs.

## Priority order

| # | Recommendation | Why it matters for this codebase | Effort / risk |
|---|---|---|---|
| C-1 | Typecheck and build on every pull request | `npm run build` is `tsc -b && vite build`, so CI catches the class of defect that made migration 019 unparseable and would have caught the broken 010 cast | Trivial; no security risk |
| C-2 | `npm run security:check` on every pull request | The 47 URL, auth-copy, render-site and build-config invariants fail loudly if a fixed sink regresses | Trivial |
| C-3 | `npm audit --audit-level=high` plus lockfile diff review | Advisories here live in the dev toolchain (Vite/esbuild). A dev-only advisory still matters: the same lockfile decides what ships, and GHSA-67mh-4wv8-2f99 lets any page a developer visits read the dev server | Low; expect noise on transitive dev packages |
| C-4 | Dependency review bot for major-version bumps | The correct fix for the current advisory set was `vite@6.4.5`, not npm’s suggested `vite@8.3.5`; blind major upgrades break `@vitejs/plugin-react` peer ranges | Low |
| C-5 | Migrations applied in a disposable database inside CI | `node scripts/security-db-check.mjs` runs in-process via PGlite with no server; a real PostgreSQL 15+ service job lets the same assertions run on Supabase-shaped SQL, including `pgcrypto` | Medium; the useful investment, because policy bugs are invisible to build/typecheck |
| C-6 | Assert deployment response headers | Fetch the preview URL and require CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. A preview deployment is the only place `_headers` is genuinely proven | Medium; needs a Cloudflare token in CI, which is a secret-management decision for the owner |
| C-7 | Secret scanning with a real scanner on full history | The audit used heuristics over 861 reachable blobs and found nothing credential-shaped; that is not equivalent to Gitleaks/TruffleHog with entropy detection over all refs, tags and dangling objects | Low; read-only, no repo setting change required |
| C-8 | SBOM generation and pinned actions | `npm ci` plus an attested build with `actions/checkout`/`setup-node` pinned to commit SHAs reduces pipeline takeover risk; a supply-chain compromise here ships directly into a client that holds the publishable key | Low |
| C-9 | Non-breaking `npm ci --ignore-scripts` policy check | esbuild needs a postinstall binary, so blanket `--ignore-scripts` breaks the build; instead allowlist the packages that genuinely require lifecycle scripts | Medium; can fail builds if done blindly |
| C-10 | Migrations reviewed as a cumulative set | Every policy in this schema is permissive-OR. A reviewer looking at one `create policy` cannot see that an older `using (true)` still grants the row. Require the PR diff to include a `pg_policies` before/after snapshot from the CI database job | Process, not tooling |

## Suggested workflow skeleton (for the owner to adopt, not applied)

```yaml
# .github/workflows/ci.yml — proposal only
name: ci
on: [pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<commit-sha>
      - uses: actions/setup-node@<commit-sha>
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run security:check
      - run: npm run build
      - run: npm audit --audit-level=high
      - run: node scripts/security-db-check.mjs
```

Add the header-assertion job only once a preview URL and a scoped, secret-store-hosted Cloudflare token exist. Never place a `service_role` key or a real project URL in a workflow log or an ordinary repository variable: repository variables are visible to anyone the repository is visible to, and this repository is public.

## Explicitly not recommended

- **Do not** claim a header is active because it appears in `public/_headers`; assert it against a response.
- **Do not** add a rate limiter, CSP report endpoint or auth check written in React and count it as a control.
- **Do not** force `npm audit fix --force` to reach a clean audit; the resolution in this audit came from a reviewed, compatible version range.
- **Do not** enable a third-party scanner that transmits student data without a privacy review.
- **Do not** auto-apply migrations from a merge event. Applying schema changes to the live project stays a human, authorized action.
