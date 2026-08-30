---
name: Supabase connector access
description: Runtime-specific guidance for using the attached Supabase integration from Replit Agent.
---

When the Supabase connection is attached in a conversation, the named `connectorFetch` helper may not be present in the code-execution runtime. The supported fallback is the attached connector's authenticated `proxyFetch` obtained through `listConnections("supabase")` inside a `"use impure"` function.

**Why:** The connection can be healthy and usable even when the conversation-specific helper is unavailable; attempting to reconnect is unnecessary.

**How to apply:** Use `proxyFetch` for PostgREST reads and writes when the integration status is `added`. Keep credentials inside the connector sandbox and never expose them to application code or chat.