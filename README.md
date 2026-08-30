# DU Science Hub

Student-powered Delhi University platform for exploring colleges, sharing approved student experiences, joining the team, and finding science opportunities.

## Local development

```bash
npm install
npm run dev
```

## Supabase backend foundation

The project includes an additive, version-controlled migration at:

`supabase/migrations/001_platform_schema.sql`

The connected Supabase project was inspected before the migration was written. No application tables, rows, or prior Supabase migrations were present, and the migration inserts no content.

To enable the browser data layer:

1. Copy `.env.example` to `.env.local`.
2. Add the Supabase project URL and publishable anon key.
3. Apply the migration through the Supabase SQL editor or your normal migration runner.
4. Create an authenticated Supabase user and add that user’s ID to `admin_users` with the `admin` role.

Only publishable Supabase configuration belongs in the browser. Never add a service-role key to `VITE_*` variables, source code, or the repository.

The application intentionally shows coming-soon states when official college, mentor, video, team, or opportunity records have not been connected. No fictional records are seeded.

## Checks

```bash
npm run typecheck
npm run build
```
