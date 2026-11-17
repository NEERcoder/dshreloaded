#!/usr/bin/env node
/**
 * Offline push-notification regression suite. Run with:
 *   node scripts/push-check.mjs
 *
 * Part A boots PGlite 0.3.14 (security-audit cache), applies the real
 * migrations 001-006 + 022, and exercises the push tables' RLS, grants,
 * token-claim upsert, guard trigger, preference gate and delivery ledger
 * with synthetic users only. Every scenario rolls back.
 *
 * Part B bundles supabase/functions/send-push-notification/logic.ts with
 * esbuild and unit-tests the Edge Function's pure decision surface
 * (validation, authorization inputs, dedupe keys, rate limits, payloads).
 *
 * No network, no credentials, no live database, no edits to product SQL or
 * to the existing security suites. Exit 1 on any failed expectation.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { PGlite } from '../node_modules/.cache/security-audit/node_modules/@electric-sql/pglite/dist/index.js';
import { transform } from '../node_modules/esbuild/lib/main.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const migrationDir = join(root, 'supabase', 'migrations');
globalThis.fetch = async () => { throw new Error('Network is forbidden in this audit'); };

const db = new PGlite();
const results = [];
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const u = (n) => `'${id(n)}'`;
const query = (sql, params) => db.query(sql, params);
const scalar = async (sql, params) => {
  const { rows } = await query(sql, params);
  assert.equal(rows.length, 1, 'Expected exactly one scalar row');
  return Object.values(rows[0])[0];
};
const eq = async (sql, expected, params) => assert.equal(await scalar(sql, params), expected);
const count = async (sql, expected, params) =>
  assert.equal((await query(sql, params)).rows.length, expected, 'Unexpected visible/changed row count');

async function as(role, user = null) {
  await db.exec('reset role');
  await query("select set_config('request.jwt.claim.sub', $1, true)", [user === null ? '' : id(user)]);
  await db.exec(`set local role ${role}`);
}
async function error(sql, code, params) {
  await db.exec('savepoint expected_error');
  let caught;
  try { await query(sql, params); } catch (e) { caught = e; }
  finally { await db.exec('rollback to savepoint expected_error; release savepoint expected_error'); }
  assert.ok(caught, `Expected SQLSTATE ${code}, but SQL succeeded`);
  assert.equal(caught.code, code, `Unexpected SQLSTATE: ${caught.message}`);
  return caught;
}
async function test(name, body) {
  await db.exec('begin');
  try {
    await body();
    results.push({ name, ok: true });
    console.log(`PASS ${name}`);
  } catch (e) {
    results.push({ name, ok: false });
    console.error(`FAIL ${name}: ${e.code || e.name}: ${e.message}`);
  } finally {
    await db.exec('rollback; reset role');
  }
}
function check(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`PASS ${name}`);
  } catch (e) {
    results.push({ name, ok: false });
    console.error(`FAIL ${name}: ${e.message}`);
  }
}

const TOKEN_A = 'synthetic-token-aaaaaaaaaaaaaaaaaaaa';
const TOKEN_B = 'synthetic-token-bbbbbbbbbbbbbbbbbbbb';
const TOKEN_C = 'synthetic-token-cccccccccccccccccccc';

async function bootstrap() {
  await db.exec(`
    create role anon nologin nosuperuser nobypassrls;
    create role authenticated nologin nosuperuser nobypassrls;
    create role service_role nologin nosuperuser bypassrls;
    create schema auth;
    create schema storage;
    revoke create on schema public from public;
    grant usage on schema public, auth, storage to anon, authenticated, service_role;
    create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    create table storage.buckets(id text primary key, name text not null, public boolean not null default false);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text not null, owner uuid, metadata jsonb);
    create function storage.foldername(name text) returns text[] language sql immutable as $$
      select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1)-1];
    $$;
    alter table storage.buckets enable row level security;
    alter table storage.objects enable row level security;
    grant all on all tables in schema storage to anon, authenticated, service_role;
    grant all on all tables in schema auth to service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  `);
  const files = [
    '001_platform_schema.sql',
    '002_phase2_teams_and_storage.sql',
    '003_team_join_requests.sql',
    '004_invite_code_security_hardening.sql',
    '005_student_connections.sql',
    '006_notifications.sql',
    '022_push_subscriptions.sql',
  ];
  for (const file of files) {
    let sql = readFileSync(join(migrationDir, file), 'utf8');
    if (file.startsWith('001')) {
      // Same test-only shim as security-db-check.mjs: PGlite has core
      // gen_random_uuid(); only the CREATE EXTENSION line is omitted.
      sql = sql.replace(/create extension if not exists "pgcrypto";/g,
        '-- TEST ONLY: pgcrypto extension setup omitted; core gen_random_uuid exists.');
    }
    await db.exec('begin');
    try { await db.exec(sql); await db.exec('commit'); }
    catch (e) { await db.exec('rollback; reset role'); throw new Error(`Migration ${file} failed (${e.code}): ${e.message}`); }
    console.log(`APPLY ${file}`);
  }
  await db.exec(`
    insert into auth.users(id, email) values
      (${u(1)}, 'push-a@example.invalid'),
      (${u(2)}, 'push-b@example.invalid'),
      (${u(3)}, 'push-c@example.invalid');
  `);
  console.log('FIXTURES: 3 synthetic auth users; no real data.');
}

const insertSub = (user, token) =>
  `insert into public.push_subscriptions(user_id, fcm_token, device_name, device_type) values (${u(user)}, '${token}', 'Synthetic browser', 'desktop')`;
const claimUpsert = (user, token) =>
  `insert into public.push_subscriptions(user_id, fcm_token, device_name, device_type, last_seen_at)
   values (${u(user)}, '${token}', 'Synthetic browser', 'desktop', now())
   on conflict (fcm_token) do update set
     user_id = excluded.user_id, fcm_token = excluded.fcm_token,
     device_name = excluded.device_name, device_type = excluded.device_type,
     last_seen_at = excluded.last_seen_at`;

async function dbTests() {
  await test('owner registers and reads their own token', async () => {
    await as('authenticated', 1);
    await db.exec(insertSub(1, TOKEN_A));
    await count(`select id from public.push_subscriptions where fcm_token='${TOKEN_A}'`, 1);
  });

  await test('insert against another user id is denied by RLS', async () => {
    await as('authenticated', 1);
    await error(insertSub(2, TOKEN_A), '42501');
  });

  await test('cross-user read returns zero rows (tokens never leak)', async () => {
    await as('authenticated', 1);
    await db.exec(insertSub(1, TOKEN_A));
    await as('authenticated', 2);
    await count(`select id from public.push_subscriptions where fcm_token='${TOKEN_A}'`, 0);
    await count('select id from public.push_subscriptions', 0);
  });

  await test('anon holds no privilege on push_subscriptions', async () => {
    await as('authenticated', 1);
    await db.exec(insertSub(1, TOKEN_A));
    await as('anon');
    await error('select id from public.push_subscriptions', '42501');
    await error(insertSub(1, TOKEN_B), '42501');
  });

  await test('owner deletes only their own rows', async () => {
    await as('authenticated', 1);
    await db.exec(insertSub(1, TOKEN_A));
    await as('authenticated', 2);
    await db.exec(insertSub(2, TOKEN_B));
    await query(`delete from public.push_subscriptions where fcm_token='${TOKEN_A}'`);
    await as('authenticated', 1);
    await count(`select id from public.push_subscriptions where fcm_token='${TOKEN_A}'`, 1);
    await query(`delete from public.push_subscriptions where fcm_token='${TOKEN_A}'`);
    await count('select id from public.push_subscriptions', 0);
  });

  await test('account switch claims the browser token via claim_push_token RPC', async () => {
    await as('authenticated', 1);
    await db.exec(insertSub(1, TOKEN_A));
    await as('authenticated', 2);
    const { rows } = await query(`select public.claim_push_token('${TOKEN_A}', 'Synthetic browser', 'desktop') as id`);
    assert.ok(rows[0].id, 'RPC must return the subscription id');
    await eq(`select user_id = ${u(2)} from public.push_subscriptions where fcm_token='${TOKEN_A}'`, true);
    await as('authenticated', 1);
    await count(`select id from public.push_subscriptions where fcm_token='${TOKEN_A}'`, 0);
  });

  await test('claim RPC is definer with empty search_path and caller-derived ownership', async () => {
    await eq(`select prosecdef and proconfig = array['search_path=""']
      from pg_proc where oid = 'public.claim_push_token(text,text,text)'::regprocedure`, true);
    await as('authenticated', 3);
    await query(`select public.claim_push_token('${TOKEN_C}', null, null)`);
    await eq(`select user_id = ${u(3)} from public.push_subscriptions where fcm_token='${TOKEN_C}'`, true);
  });

  await test('claim RPC rejects sessionless callers and malformed tokens', async () => {
    await as('authenticated');
    await error(`select public.claim_push_token('${TOKEN_A}')`, '28000');
    await as('authenticated', 1);
    await error(`select public.claim_push_token('short')`, '22023');
    await error(`select public.claim_push_token(null)`, '22023');
  });

  await test('claim RPC is not executable by anon', async () => {
    await as('anon');
    await error(`select public.claim_push_token('${TOKEN_A}')`, '42501');
  });

  await test('direct cross-account upsert stays denied (owner-only SELECT blocks the conflict path)', async () => {
    await as('authenticated', 1);
    await db.exec(insertSub(1, TOKEN_A));
    await as('authenticated', 2);
    await error(claimUpsert(2, TOKEN_A), '42501');
    await as('authenticated', 1);
    await eq(`select user_id = ${u(1)} from public.push_subscriptions where fcm_token='${TOKEN_A}'`, true);
  });

  await test('guard trigger rejects changing a token value', async () => {
    await as('authenticated', 1);
    await db.exec(insertSub(1, TOKEN_A));
    await error(`update public.push_subscriptions set fcm_token='${TOKEN_B}' where fcm_token='${TOKEN_A}'`, '23514');
    await db.exec(`update public.push_subscriptions set fcm_token='${TOKEN_A}', last_seen_at=now() where fcm_token='${TOKEN_A}'`);
  });

  await test('created_at is not client-writable (column grant)', async () => {
    await as('authenticated', 1);
    await db.exec(insertSub(1, TOKEN_A));
    await error(`update public.push_subscriptions set created_at=now() where fcm_token='${TOKEN_A}'`, '42501');
  });

  await test('one student holds many devices; updated_at trigger fires', async () => {
    await as('authenticated', 1);
    await db.exec(insertSub(1, TOKEN_A));
    await db.exec(insertSub(1, TOKEN_B));
    await count('select id from public.push_subscriptions', 2);
    await db.exec(`update public.push_subscriptions set last_seen_at=now() where fcm_token='${TOKEN_A}'`);
    await eq(`select updated_at >= created_at from public.push_subscriptions where fcm_token='${TOKEN_A}'`, true);
  });

  await test('preferences are owner-only CRUD; anon denied', async () => {
    await as('authenticated', 1);
    await db.exec(`insert into public.notification_preferences(user_id, connections) values (${u(1)}, false)`);
    await eq(`select connections from public.notification_preferences where user_id=${u(1)}`, false);
    await db.exec(`update public.notification_preferences set push_enabled=false where user_id=${u(1)}`);
    await as('authenticated', 2);
    await count('select user_id from public.notification_preferences', 0);
    await error(`insert into public.notification_preferences(user_id) values (${u(1)})`, '42501');
    await db.exec(`insert into public.notification_preferences(user_id) values (${u(2)})`);
    await query(`update public.notification_preferences set push_enabled=false where user_id=${u(1)}`);
    await as('authenticated', 1);
    await eq(`select push_enabled from public.notification_preferences where user_id=${u(1)}`, false);
    await as('anon');
    await error('select user_id from public.notification_preferences', '42501');
  });

  await test('delivery ledger is invisible and unwritable to clients', async () => {
    await as('authenticated', 1);
    await error('select id from public.push_delivery_log', '42501');
    await error(`insert into public.push_delivery_log(delivery_key, fcm_token, status) values ('conn:x', '${TOKEN_A}', 'sent')`, '42501');
    await as('anon');
    await error('select id from public.push_delivery_log', '42501');
  });

  await test('service role writes the ledger; unique pair dedupes; status is checked', async () => {
    await as('service_role');
    await db.exec(`insert into public.push_delivery_log(delivery_key, fcm_token, user_id, initiated_by, status)
      values ('conn:${id(901)}', '${TOKEN_A}', ${u(1)}, ${u(2)}, 'sent')`);
    await error(`insert into public.push_delivery_log(delivery_key, fcm_token, status)
      values ('conn:${id(901)}', '${TOKEN_A}', 'sent')`, '23505');
    await db.exec(`insert into public.push_delivery_log(delivery_key, fcm_token, status)
      values ('conn:${id(901)}', '${TOKEN_B}', 'skipped')`);
    await error(`insert into public.push_delivery_log(delivery_key, fcm_token, status)
      values ('conn:${id(902)}', '${TOKEN_C}', 'bogus')`, '23514');
  });

  await test('account deletion cascades subscriptions, preferences and ledger rows', async () => {
    await as('service_role');
    await db.exec(insertSub(1, TOKEN_A));
    await db.exec(`insert into public.notification_preferences(user_id) values (${u(1)})`);
    await db.exec(`insert into public.push_delivery_log(delivery_key, fcm_token, user_id, initiated_by, status)
      values ('conn:${id(901)}', '${TOKEN_A}', ${u(1)}, ${u(1)}, 'sent')`);
    await db.exec('reset role');
    await db.exec(`delete from auth.users where id=${u(1)}`);
    await count('select id from public.push_subscriptions', 0);
    await count('select user_id from public.notification_preferences', 0);
    await count('select id from public.push_delivery_log', 0);
  });
}

async function logicTests() {
  const source = readFileSync(join(root, 'supabase', 'functions', 'send-push-notification', 'logic.ts'), 'utf8');
  const { code } = await transform(source, { loader: 'ts', format: 'esm' });
  const logic = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const UUID = id(901);

  check('parseRequest accepts the three well-formed kinds', () => {
    assert.equal(logic.parseRequest({ kind: 'connection', connectionId: UUID, event: 'connection_request' }).request.kind, 'connection');
    assert.equal(logic.parseRequest({ kind: 'team', requestId: UUID, event: 'join_decided' }).request.kind, 'team');
    const b = logic.parseRequest({ kind: 'broadcast', broadcastId: UUID, title: 'Hello', body: 'World', route: '/notifications', category: 'announcements' });
    assert.equal(b.request.title, 'Hello');
  });

  check('parseRequest rejects malformed and hostile inputs', () => {
    const bad = [
      null, 'text', 42, {},
      { kind: 'admin' },
      { kind: 'connection', connectionId: 'not-a-uuid', event: 'connection_request' },
      { kind: 'connection', connectionId: UUID, event: 'drop_table' },
      { kind: 'team', requestId: UUID, event: 'approved' },
      { kind: 'broadcast', broadcastId: 'x', title: 't', body: 'b', route: '/notifications', category: 'announcements' },
      { kind: 'broadcast', broadcastId: UUID, title: 'x'.repeat(121), body: 'b', route: '/notifications', category: 'announcements' },
      { kind: 'broadcast', broadcastId: UUID, title: 't', body: 'x'.repeat(301), route: '/notifications', category: 'announcements' },
      { kind: 'broadcast', broadcastId: UUID, title: '', body: 'b', route: '/notifications', category: 'announcements' },
      { kind: 'broadcast', broadcastId: UUID, title: 't', body: 'b', route: '//evil.example', category: 'announcements' },
      { kind: 'broadcast', broadcastId: UUID, title: 't', body: 'b', route: 'https://evil.example', category: 'announcements' },
      { kind: 'broadcast', broadcastId: UUID, title: 't', body: 'b', route: '/notifications', category: 'sms' },
    ];
    for (const input of bad) assert.ok('error' in logic.parseRequest(input), `Expected rejection: ${JSON.stringify(input)}`);
  });

  check('preferences gate: missing row enables; master or category off disables', () => {
    assert.equal(logic.preferencesAllow(null, 'connections'), true);
    assert.equal(logic.preferencesAllow({}, 'teams'), true);
    assert.equal(logic.preferencesAllow({ push_enabled: false }, 'teams'), false);
    assert.equal(logic.preferencesAllow({ connections: false }, 'connections'), false);
    assert.equal(logic.preferencesAllow({ connections: false }, 'teams'), true);
  });

  check('delivery keys are stable and namespaced', () => {
    assert.equal(logic.connectionDeliveryKey(UUID), `conn:${UUID}`);
    assert.equal(logic.teamDeliveryKey(UUID, 'requested'), `team:${UUID}:requested`);
    assert.equal(logic.teamDeliveryKey(UUID, 'approved'), `team:${UUID}:approved`);
    assert.equal(logic.broadcastDeliveryKey(UUID), `bcast:${UUID}`);
  });

  check('stale-token classification matches FCM semantics only', () => {
    assert.equal(logic.isStaleTokenResponse(404, 'UNREGISTERED'), true);
    assert.equal(logic.isStaleTokenResponse(400, 'INVALID_ARGUMENT'), true);
    assert.equal(logic.isStaleTokenResponse(404, 'NOT_FOUND'), false);
    assert.equal(logic.isStaleTokenResponse(401, 'UNAUTHENTICATED'), false);
    assert.equal(logic.isStaleTokenResponse(200, null), false);
  });

  check('rate limits count distinct keys, not rows', () => {
    const sameKeyManyRows = Array(200).fill('conn:x');
    assert.equal(logic.rateLimitVerdict(sameKeyManyRows, 'connection').allowed, true);
    const sixty = Array.from({ length: 60 }, (_, i) => `conn:${i}`);
    assert.equal(logic.rateLimitVerdict(sixty, 'connection').allowed, false);
    const fiveBroadcasts = Array.from({ length: 5 }, (_, i) => `bcast:${i}`);
    assert.equal(logic.rateLimitVerdict(fiveBroadcasts, 'broadcast').allowed, false);
    assert.equal(logic.rateLimitVerdict(fiveBroadcasts, 'connection').allowed, true);
    const fourBroadcasts = fiveBroadcasts.slice(0, 4);
    assert.equal(logic.rateLimitVerdict(fourBroadcasts, 'broadcast').allowed, true);
  });

  check('FCM message is data-only with string fields and no sensitive keys', () => {
    const content = logic.connectionContent('connection_request', 'Synthetic Student');
    const msg = logic.buildFcmMessage(TOKEN_A, content, UUID).message;
    assert.equal(msg.notification, undefined);
    assert.equal(msg.token, TOKEN_A);
    assert.equal(msg.data.notificationId, UUID);
    assert.equal(msg.webpush.headers.Urgency, 'high');
    for (const value of Object.values(msg.data)) assert.equal(typeof value, 'string');
    for (const key of Object.keys(msg.data)) assert.ok(!/phone|email|contact/i.test(key));
    const anonymous = logic.buildFcmMessage(TOKEN_A, content, null).message;
    assert.equal(anonymous.data.notificationId, undefined);
  });

  check('notification copy routes to real pages and never embeds contact data', () => {
    const request = logic.connectionContent('connection_request', null);
    assert.equal(request.route, '/circle/connections');
    assert.equal(request.category, 'connections');
    const accepted = logic.connectionContent('connection_accepted', 'Synthetic Student');
    assert.match(accepted.body, /accepted/);
    const decided = logic.teamContent('approved', 'Synthetic Team', UUID);
    assert.equal(decided.route, `/teams/${UUID}`);
    assert.equal(decided.category, 'teams');
    const declined = logic.teamContent('rejected', null, UUID);
    assert.match(declined.body, /declined/);
  });
}

try {
  await bootstrap();
  await dbTests();
  await logicTests();
} catch (e) {
  console.error(`FATAL: ${e.message}`);
  process.exit(1);
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} push checks passed`);
if (failed.length > 0) {
  console.error('FAILED:', failed.map((f) => f.name).join('; '));
  process.exit(1);
}
console.log('PUSH CHECKS PASSED (offline synthetic audit; no live delivery claims).');