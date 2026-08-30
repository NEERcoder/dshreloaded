---
name: Supabase connector access
description: Runtime-specific guidance for using the attached Supabase integration from Replit Agent.
---

When the Supabase connection is attached in a conversation, the named `connectorFetch` helper may not be present in the code-execution runtime. The supported fallback is the attached connector's authenticated `proxyFetch` obtained through `listConnections("supabase")` inside a `"use impure"` function. The attached Supabase integration is REST-only; it can inspect or mutate exposed rows and storage resources, but it cannot execute DDL for tables, triggers, indexes, RLS policies, or migration scripts.

**Why:** The connection can be healthy and usable even when the conversation-specific helper is unavailable; attempting to reconnect is unnecessary. REST writes cannot safely substitute for a transactional schema migration.

**How to apply:** Use `proxyFetch` for PostgREST reads and writes when the integration status is `added`. For schema changes, use a SQL-capable Supabase migration runner or the Supabase SQL editor instead of guessing at RPC endpoints. Keep credentials inside the connector sandbox and never expose them to application code or chat.