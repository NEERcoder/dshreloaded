#!/usr/bin/env node
/**
 * PHASE 2 REMEDIATION VERIFICATION — local simulation only. No live database, no
 * deployment, nothing committed.
 *
 * Builds an in-memory PostgreSQL (PGlite) carrying the Supabase role/grant
 * bootstrap the live project is known to use, applies migrations 001-021, proves
 * every targeted defect exists (BASELINE), applies
 * supabase/security-review/023-027, then proves each defect is closed AND each
 * authorized workflow still works. Finally re-applies 023-027 to check
 * idempotent convergence and runs 028_read_only_verification.sql, which raises
 * if effective state is wrong.
 *
 * A second, separate instance models today's LIVE schema (001-016 only) and
 * proves 027 is order-independent: the relations it touches may be absent, and
 * the protections 023-026 install must survive anyway. That is the defect that
 * made the discarded 022 unappliable.
 *
 *   node E:/dsh-repo/scripts/security-phase2-check.mjs
 *
 * Exit 1 on any unmet expectation. A pass here is evidence about the SQL, not
 * about production: see docs/security/LIVE_DB_VERIFICATION.md §0 and §8.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { PGlite } from '../node_modules/.cache/security-audit/node_modules/@electric-sql/pglite/dist/index.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const migrationDir = join(root, 'supabase', 'migrations');
const reviewDir = join(root, 'supabase', 'security-review');
const PROPOSALS = ['023_profile_privacy_name_only.sql', '024_team_membership_integrity.sql',
  '025_anon_privilege_corrections.sql', '026_connection_and_notification_immutability.sql',
  '027_pending_table_corrections.sql', '029_profile_privacy_enforcement.sql',
  '030_contact_captain_only.sql', '031_registration_privacy.sql',
  '032_join_request_integrity.sql', '033_membership_concurrency.sql'];
// The two halves of the profile change, for the ROLLOUT phase: 023 adds the RPCs
// and must break nothing; 029 removes the broad access and must be gated on it.
const PHASE_A = ['023_profile_privacy_name_only.sql'];
const PHASE_C = ['029_profile_privacy_enforcement.sql'];
const VERIFY = '028_read_only_verification.sql';

const migrations = readdirSync(migrationDir).filter((f) => /^0(0[1-9]|1\d|2[01])_.*\.sql$/.test(f)).sort();
assert.equal(migrations.length, 21, 'expected migrations 001-021 in supabase/migrations');
assert.equal(migrations[0].slice(0, 3), '001');
assert.equal(migrations.at(-1).slice(0, 3), '021');
// 027 exists because the live schema stops at 016; ORDER replays exactly that.
const ORDER_MIGRATIONS = migrations.filter((f) => Number(f.slice(0, 3)) <= 16);
const LATE_MIGRATIONS = migrations.filter((f) => Number(f.slice(0, 3)) >= 17);
assert.equal(ORDER_MIGRATIONS.length, 16, 'expected the live-schema replay to stop at 016');
assert.equal(LATE_MIGRATIONS.length, 5, 'expected 017-021 to be the late half');
for (const f of [...PROPOSALS, VERIFY]) assert.ok(readFileSync(join(reviewDir, f), 'utf8').length > 0, `${f} must exist and be non-empty`);

globalThis.fetch = async () => { throw new Error('network is forbidden in this harness'); };
const db = new PGlite();
const results = [];
const shims = [];
let phase = 'BOOTSTRAP';
let fatal = null;

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const u = (n) => `'${id(n)}'`;
const query = (sql, params) => db.query(sql, params);
const scalar = async (sql, params) => { const { rows } = await query(sql, params); assert.equal(rows.length, 1, 'expected exactly one row for a scalar read'); return Object.values(rows[0])[0]; };
// Third argument may be bind parameters (array) or an assertion label (string).
const third = (x) => (Array.isArray(x) ? { params: x } : { label: String(x ?? '') });
const eq = async (sql, expected, opt) => {
  const { params, label } = third(opt);
  const actual = await scalar(sql, params);
  assert.equal(actual, expected, `${label || 'unexpected scalar'} [expected ${String(expected)}, got ${String(actual)}]`);
};
const rowCount = async (sql, expected, opt) => {
  const { params, label } = third(opt);
  assert.equal((await query(sql, params)).rows.length, expected, label || 'unexpected number of visible rows');
};

async function as(role, user = null) {
  await db.exec('reset role');
  await query("select set_config('request.jwt.claim.sub', $1, true)", [user === null ? '' : id(user)]);
  await db.exec(`set local role ${role}`);
  const s = (await query('select current_user as role, auth.uid()::text as uid')).rows[0];
  assert.equal(s.role, role, 'role switch failed');
  assert.equal(s.uid, user === null ? null : id(user), 'auth.uid() emulation failed');
}
async function owner() { await db.exec('reset role'); }
async function expectError(sql, code, pattern, label) {
  await db.exec('savepoint probe');
  let caught;
  try { await db.exec(sql); } catch (e) { caught = e; }
  finally { await db.exec('rollback to savepoint probe; release savepoint probe'); }
  assert.ok(caught, `${label}: expected SQLSTATE ${code}, but the statement succeeded`);
  assert.equal(caught.code, code, `${label}: wrong SQLSTATE (${caught.message})`);
  if (pattern) assert.match(caught.message, pattern, `${label}: wrong message`);
}
const denied = (sql, label) => expectError(sql, '42501', null, label);

async function test(name, body) {
  await db.exec('begin');
  try {
    await body();
    results.push({ phase, name, ok: true });
    console.log(`PASS [${phase}] ${name}`);
  } catch (e) {
    results.push({ phase, name, ok: false });
    console.error(`FAIL [${phase}] ${name}: ${e.code || e.name}: ${String(e.message).split('\n')[0]}`);
  } finally {
    await db.exec('rollback; reset role');
    await eq("select nullif(current_setting('request.jwt.claim.sub', true), '') is null", true);
  }
}
async function act(name, user, body) { await test(name, async () => { await as('authenticated', user); await body(); }); }
function noteShim(message) { shims.push(message); console.log(`SHIM: ${message}`); }

const teamA = u(80), teamB = u(81), teamFull = u(82), teamPast = u(83), teamDup = u(84), teamNew = u(85);
const oppOpen = u(70), oppRoom = u(71), oppPast = u(72), oppSmall = u(73);
const alicePhone = `select count(*)::int from public.profile_contacts where user_id=${u(1)}`;

const BOOTSTRAP_SQL = `
    create role anon nologin nobypassrls;
    create role authenticated nologin nobypassrls;
    create role service_role nologin bypassrls;
    create schema auth;
    create schema storage;
    revoke create on schema public from public;
    grant usage on schema public, auth, storage to anon, authenticated, service_role;
    create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    create table storage.buckets(id text primary key, name text, public boolean not null default false,
                                 file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text not null, owner uuid, metadata jsonb);
    create function storage.foldername(name text) returns text[] language sql immutable as $$
      select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1)-1];
    $$;
    alter table storage.buckets enable row level security;
    alter table storage.objects enable row level security;
    grant all on all tables in schema storage to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;`;

async function bootstrap() {
  noteShim('auth.users(id uuid primary key, email text) plus auth.uid() reading request.jwt.claim.sub emulates Supabase Auth. GoTrue, JWT signature validation, PostgREST and its column filtering are NOT emulated: SQL privileges are asserted instead.');
  noteShim('anon/authenticated NOBYPASSRLS, service_role BYPASSRLS; the local owner installs migrations, exactly as the Supabase SQL editor runs them as postgres.');
  noteShim('ALTER DEFAULT PRIVILEGES granting ALL on future public tables/sequences/functions to anon and authenticated reproduces the bootstrap that produced live findings L-1 and L-2. This is a documented assumption, not a measurement of production ACLs.');
  noteShim('storage.buckets/objects and storage.foldername() are minimal stand-ins for the storage schema. The bucket row carries the real file_size_limit and allowed_mime_types COLUMNS so that 000 P9 executes, but their VALUES are null: dashboard configuration, object bytes, CDN delivery and Storage HTTP are not simulated.');
  await db.exec(BOOTSTRAP_SQL);
  console.log(`ENGINE ${await scalar('select version()')}`);
}

// The only edit any applied file ever receives, shared by both instances.
function migrationSql(file) {
  const original = readFileSync(join(migrationDir, file), 'utf8');
  if (!/create extension if not exists "pgcrypto"/i.test(original)) return { sql: original, shimmed: false };
  return {
    sql: original.replace(/create extension if not exists "pgcrypto"\s*;?/i,
      '-- SHIM: pgcrypto extension creation omitted; the engine provides core gen_random_uuid().'),
    shimmed: true,
  };
}

async function applyMigrations() {
  phase = 'MIGRATIONS';
  for (const file of migrations) {
    const { sql, shimmed } = migrationSql(file);
    await db.exec(`begin; ${sql} commit;`);
    if (shimmed) noteShim(`${file}: only CREATE EXTENSION pgcrypto removed; no other statement changed.`);
    console.log(`APPLY ${file}`);
  }
}

// Synthetic fixtures only: no real student record is ever loaded, and the same
// statements seed the main instance and the rollout instance.
const SEED_SQL = `begin;
    insert into auth.users(id,email)
      select ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
             'synthetic-' || n || '@example.invalid' from generate_series(1, 8) n;
    insert into public.colleges(id,name,slug) values ('${id(90)}','Synthetic College','synthetic-college');
    insert into public.profiles(user_id,full_name,college_id,course,year_of_study,graduation_year,gender,is_public,headline)
      values (${u(1)},'Private Alice',${u(90)},'Synthetic course',3,2029,'female',false,'private headline'),
             (${u(2)},'Private Ben',${u(90)},'Synthetic course',2,2030,'male',false,null),
             (${u(3)},'Public Cara',${u(90)},'Synthetic course',4,2028,'other',true,'public headline'),
             (${u(4)},'Private Dana',${u(90)},'Synthetic course',1,2031,'female',false,null),
             (${u(5)},'Admin Eve',${u(90)},'Synthetic course',5,2027,'male',true,null);
    insert into public.admin_users(user_id) values (${u(5)});
    insert into public.profile_contacts(user_id,phone_number) values
      (${u(1)},'+1 202 555 0101'),(${u(4)},'+1 202 555 0104');
    insert into public.opportunities(id,title,organization,category,description,status,team_formation_enabled,min_team_size,max_team_size,deadline_at)
      values (${oppOpen},'Synthetic Cup','Audit fixture','competition','synthetic only','published',true,1,4,now() + interval '30 days'),
             (${oppRoom},'Synthetic Relay','Audit fixture','competition','synthetic only','published',true,1,4,now() + interval '30 days'),
             (${oppPast},'Synthetic Past','Audit fixture','competition','synthetic only','published',true,1,4,now() - interval '1 day'),
             (${oppSmall},'Synthetic Small','Audit fixture','competition','synthetic only','published',true,1,2,now() + interval '30 days');
    insert into public.competition_teams(id,competition_id,name,invite_code,captain_user_id)
      values (${teamA},${oppOpen},'Synthetic team A','CODE-TEAM-A',${u(1)}),
             (${teamB},${oppRoom},'Synthetic team B','CODE-TEAM-B',${u(4)}),
             (${teamFull},${oppSmall},'Synthetic full team','CODE-FULL',${u(7)}),
             (${teamPast},${oppPast},'Synthetic past team','CODE-PAST',${u(5)});
    insert into public.competition_team_members(id,team_id,user_id,role)
      values (${u(60)},${teamA},${u(1)},'captain'),(${u(61)},${teamA},${u(3)},'member'),
             (${u(62)},${teamB},${u(4)},'captain'),
             (${u(63)},${teamFull},${u(7)},'captain'),(${u(64)},${teamFull},${u(8)},'member');
    insert into public.competition_team_join_requests(id,team_id,user_id,status) values (${u(55)},${teamA},${u(2)},'pending');
    insert into public.student_connections(id,requester_user_id,recipient_user_id,status)
      values (${u(40)},${u(1)},${u(3)},'accepted'),(${u(42)},${u(1)},${u(6)},'accepted'),
             (${u(41)},${u(2)},${u(4)},'pending');
    commit;`;

async function seed() {
  phase = 'SEED';
  await db.exec(SEED_SQL);
  // 006's notify_connection_request trigger created the notification for
  // connection 40 while it was inserted as pending; nothing is seeded by hand,
  // which also proves the trigger chain is live before any remediation runs.
  await eq("select count(*)::int from public.student_notifications where connection_id='00000000-0000-4000-8000-000000000040'", 1);
  console.log('SEED 8 synthetic users, 5 profiles, 4 opportunities, 4 teams, 5 memberships, 2 connections. No real student records.');
}

async function baseline() {
  phase = 'BASELINE';
  await act('F-01 any student reads a private profile row', 2, () => rowCount('select * from public.profiles where user_id=' + u(1), 1));
  await act('F-01 any student reads gender and timestamps of private profiles', 2, () => rowCount('select gender, id, created_at, updated_at from public.profiles', 5));
  await act('F-01 select=* on profiles is reachable for a stranger', 6, async () => {
    const { rows } = await query('select * from public.profiles where user_id=' + u(2));
    assert.ok('gender' in rows[0] && 'created_at' in rows[0], 'expected broad columns to be reachable pre-remediation');
  });
  await act('F-02 student inserts themselves into a stranger team and reaches a phone', 2, async () => {
    await db.exec(`insert into public.competition_team_members(team_id,user_id,role) values (${teamA},${u(2)},'member')`);
    await eq(alicePhone, 1, 'self-insertion unlocked a teammate phone number');
  });
  await act('F-02 student re-points their own membership at another team', 6, async () => {
    await owner();
    await db.exec(`insert into public.competition_team_members(id,team_id,user_id,role) values (${u(65)},${teamB},${u(6)},'member')`);
    await as('authenticated', 6);
    await db.exec(`update public.competition_team_members set team_id=${teamA} where id=${u(65)}`);
    await eq(alicePhone, 1, 'team_id rewrite unlocked another team roster');
  });
  await act('F-02 membership user_id rewrite is blocked by policy but team_id is not', 3, async () => {
    await expectError(`update public.competition_team_members set user_id=${u(7)} where team_id=${teamA} and user_id=${u(3)}`,
      '42501', /row-level security/i, '002 UPDATE policy already blocks swapping who the row is about');
  });
  await act('F-03 captain re-parents the team onto another competition (vulnerability reproduced)', 1, async () => {
    await db.exec(`update public.competition_teams set competition_id=${oppRoom} where id=${teamA}`);
    await eq(`select competition_id::text from public.competition_teams where id=${teamA}`, id(71));
  });
  await act('F-03 captain overwrites the team invite code (write lands; only the read is blocked)', 1, async () => {
    const r = await query(`update public.competition_teams set invite_code='CODE-HIJACK' where id=${teamA}`);
    assert.equal(r.affectedRows, 1, 'pre-remediation the captain can rewrite the code');
    await denied('select invite_code from public.competition_teams', '004 hid the column from readers; it did not stop writers');
  });
  await act('F-06 member labels themselves captain', 3, async () => {
    await db.exec(`update public.competition_team_members set role='captain' where team_id=${teamA} and user_id=${u(3)}`);
    await eq(`select count(*)::int from public.competition_team_members where team_id=${teamA} and role='captain'`, 2);
  });
  await act('F-05 recipient rewrites who sent a connection request', 4, async () => {
    await db.exec(`update public.student_connections set requester_user_id=${u(3)},status='accepted' where id=${u(41)}`);
    await eq(`select requester_user_id::text from public.student_connections where id=${u(41)}`, id(3));
  });
  await act('F-05 student rewrites a notification actor', 3, async () => {
    await db.exec(`update public.student_notifications set actor_user_id=${u(2)} where connection_id=${u(40)}`);
    await eq(`select actor_user_id::text from public.student_notifications where connection_id=${u(40)}`, id(2));
  });
  await act('F-09-adjacent owner rewrites an experience row identity and its created_at', 1, async () => {
    // 019:180 grants table-wide UPDATE on student_experience. 019:156's WITH CHECK
    // still stops re-parenting, which is why the rewrite targets id/created_at.
    await owner();
    await db.exec(`insert into public.student_experience(id,user_id,role) values (${u(92)},${u(1)},'Synthetic role')`);
    await as('authenticated', 1);
    await db.exec(`update public.student_experience set id=${u(93)}, created_at=timestamp with time zone '2000-01-01 00:00:00+00' where id=${u(92)}`);
    await eq(`select id::text from public.student_experience where user_id=${u(1)}`, id(93),
      'pre-remediation the row key is owner-writable');
  });
  await act('F-09 re-parenting an experience row is stopped by 019 policy, not by a grant', 1, async () => {
    await owner();
    await db.exec(`insert into public.student_experience(id,user_id,role) values (${u(94)},${u(1)},'Synthetic role')`);
    await as('authenticated', 1);
    await expectError(`update public.student_experience set user_id=${u(2)} where id=${u(94)}`, '42501', /row-level security/i,
      '019:156 WITH CHECK holds, but the privilege to attempt it still exists — 027 removes the privilege too');
  });
  await test('L-1 anon holds table SELECT on admin_users', async () => {
    await as('anon');
    await eq('select count(*)::int from public.admin_users', 0, 'RLS hides the rows today');
    await eq("select has_table_privilege('anon','public.admin_users','SELECT')", true, 'but the privilege exists');
  });
  await test('L-1 anon can TRUNCATE a roster table, bypassing RLS and row triggers', async () => {
    await as('anon');
    await eq("select has_table_privilege('anon','public.competition_team_members','TRUNCATE')", true);
  });
  await test('L-2 anon executes the invite-code generator', async () => {
    await as('anon');
    await eq("select (public.new_team_invite_code() ~ '^DSH-[A-Z2-9]{5}$')::text", 'true');
  });
  await test('F-11 deleting a moderator account is blocked by the flags audit column', async () => {
    await owner();
    await db.exec(`insert into public.profile_moderation_flags(profile_user_id,reason,subject,created_by)
      values (${u(2)},'synthetic reason','profile',${u(5)})`);
    await expectError(`delete from auth.users where id=${u(5)}`, '23502', /null|created_by/i,
      'expected NOT NULL to defeat ON DELETE SET NULL');
  });
}

async function applyProposals(label) {
  phase = label;
  for (const file of PROPOSALS) {
    await db.exec(readFileSync(join(reviewDir, file), 'utf8'));
    console.log(`${label} ${file}`);
  }
}

async function privacyAfter() {
  phase = 'PRIVACY';
  await act('rule 2 accepted non-teammate connection reads the private peer name', 6, async () => {
    const { rows } = await query('select * from public.get_connected_peer_names()');
    assert.deepEqual(rows.map((r) => r.full_name).sort(), ['Private Alice'], 'expected exactly the accepted peer name');
    assert.deepEqual(Object.keys(rows[0]).sort(), ['full_name', 'user_id'], 'the name path must expose two columns only');
  });
  await act('rule 3 accepted connection cannot read the private row itself', 6, () => rowCount('select user_id from public.profiles where user_id=' + u(1), 0));
  await act('rule 3 accepted connection cannot read gender', 6, () => denied('select gender from public.profiles', 'gender must be unreachable'));
  await act('rule 3 a connection is not a teammate: phone stays hidden', 6, async () => {
    await denied('select id, created_at, updated_at from public.profiles', 'private metadata must be unreachable');
    await eq(alicePhone, 0);
  });
  await act('rule 3 pending requester learns nothing', 4, async () => {
    const { rows } = await query('select * from public.get_connected_peer_names()');
    assert.equal(rows.length, 0, 'Ben has only a pending request to Dana; that must not grant anything');
    await rowCount('select user_id from public.profiles where user_id=' + u(2), 0);
  });
  await act('rule 3 unconnected student learns nothing', 8, () => rowCount('select * from public.get_connected_peer_names()', 0));
  await act('rule 2 revoked connection stops yielding the name', 3, async () => {
    await db.exec(`delete from public.student_connections where id=${u(40)}`);
    await rowCount('select * from public.get_connected_peer_names()', 0);
  });
  await test('rule 3 anon gets no private rows and no name path', async () => {
    await as('anon');
    await rowCount('select user_id from public.profiles where is_public=false', 0);
    await denied('select * from public.get_connected_peer_names()', 'anon must not reach the relationship-scoped function');
    await denied('select gender from public.profiles', 'anon never held gender; must stay denied');
  });
  await act('rule 5 owner reads their own private row including gender', 1, async () => {
    const { rows } = await query('select * from public.get_own_profile()');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].gender, 'female');
    assert.ok(rows[0].created_at, 'the owner keeps their own metadata');
    await rowCount(`select full_name, is_public, headline from public.profiles where user_id=${u(1)}`, 1);
  });
  await act('rule 5 owner writes stay allowed, identity columns stay locked', 1, async () => {
    await rowCount(`update public.profiles set headline='edited by owner', is_public=true where user_id=${u(1)} returning user_id`, 1);
    await denied(`update public.profiles set created_at=now() where user_id=${u(1)}`, 'timestamps must not be writable');
    await denied(`update public.profiles set id=${u(9)} where user_id=${u(1)}`, 'primary key must not be writable');
    await rowCount(`update public.profiles set full_name='Somebody else' where user_id=${u(2)} returning user_id`, 0);
  });
  await act('rule 5 admin retains moderation visibility', 5, () => rowCount('select user_id, full_name from public.profiles where is_public=false', 3));
  await act('rule 1 public projection and avatar column still readable', 2, () =>
    rowCount('select user_id, full_name, college_id, course, year_of_study, graduation_year, is_public, avatar_url, instagram_handle, headline from public.profiles where is_public=true', 2));
}

async function teamAfter() {
  phase = 'TEAM';
  await act('rule 4 stranger cannot insert themselves into a team', 6, () =>
    denied(`insert into public.competition_team_members(team_id,user_id,role) values (${teamA},${u(6)},'member')`, 'non-captain self-insert'));
  await act('rule 4 captain cannot add another student directly', 1, () =>
    denied(`insert into public.competition_team_members(team_id,user_id,role) values (${teamA},${u(7)},'member')`, 'insert for another user'));
  await act('rule 4 membership team_id is immutable', 3, () =>
    denied(`update public.competition_team_members set team_id=${teamB} where team_id=${teamA} and user_id=${u(3)}`, 'team_id rewrite'));
  await act('rule 4 membership user_id is immutable', 3, () =>
    denied(`update public.competition_team_members set user_id=${u(7)} where team_id=${teamA} and user_id=${u(3)}`, 'user_id rewrite'));
  await act('rule 4 membership id and joined_at are immutable', 3, async () => {
    await denied(`update public.competition_team_members set id=${u(99)} where team_id=${teamA} and user_id=${u(3)}`, 'id rewrite');
    await denied(`update public.competition_team_members set joined_at=now() where team_id=${teamA} and user_id=${u(3)}`, 'joined_at rewrite');
  });
  await act('rule 4 invite code and competition identity are not writable', 1, async () => {
    await denied(`update public.competition_teams set invite_code='CODE-HIJACK' where id=${teamA}`, 'invite_code rewrite');
    await denied(`update public.competition_teams set competition_id=${oppRoom} where id=${teamA}`, 'competition_id rewrite');
  });
  await act('rule 4 a forged captain label is derived back to member', 3, async () => {
    await db.exec(`update public.competition_team_members set role='captain' where team_id=${teamA} and user_id=${u(3)}`);
    await eq(`select role from public.competition_team_members where team_id=${teamA} and user_id=${u(3)}`, 'member');
    await eq(`select count(*)::int from public.competition_team_members where team_id=${teamA} and role='captain'`, 1);
  });
  await act('rule 4 phone and roster stay unreachable without membership', 6, async () => {
    await eq(alicePhone, 0);
    await rowCount(`select user_id from public.get_team_member_profiles(${teamA}, array[${u(1)}]::uuid[])`, 0);
  });
  await act('workflow captain creates a team, own membership row and a code', 7, async () => {
    const { rows } = await query(`insert into public.competition_teams(competition_id,name,captain_user_id)
      values (${oppRoom},'Synthetic created team',${u(7)}) returning id`);
    const created = rows[0].id;
    await query(`insert into public.competition_team_members(team_id,user_id,role) values ($1,$2,'captain')`, [created, id(7)]);
    await eq(`select role from public.competition_team_members where team_id=$1 and user_id=$2`, 'captain', [created, id(7)]);
    await eq('select public.get_team_invite_code($1) ~ $2', true, [created, '^DSH-[A-Z2-9]{5}$']);
  });
  await act('workflow invite-code join succeeds and unlocks only that roster', 6, async () => {
    await eq('select public.join_competition_team_by_code($1)::text', id(81), ['CODE-TEAM-B']);
    await rowCount(`select user_id from public.get_team_member_profiles(${teamB}, array[${u(4)}]::uuid[])`, 1);
    await eq(alicePhone, 0, 'joining team B must not unlock team A');
  });
  await act('workflow captain approval inserts the requester', 1, async () => {
    await eq('select public.approve_team_join_request($1)', true, [id(55)]);
    await eq(`select count(*)::int from public.competition_team_members where team_id=${teamA} and user_id=${u(2)}`, 1);
  });
  await act('workflow captain-only phone: members cannot read, the captain can', 1, async () => {
    // Each test runs and rolls back in its own transaction, so the approval that
    // creates the membership has to happen here rather than in an earlier test.
    await eq('select public.approve_team_join_request($1)', true, [id(55)]);
    // The newly approved member (user 2) stores their own number as the owner.
    await as('authenticated', 2);
    await db.exec(`insert into public.profile_contacts(user_id,phone_number) values (${u(2)},'+1 202 555 0102')`);
    // An ordinary teammate (user 3) must NOT read another member's number.
    await as('authenticated', 3);
    await eq(`select count(*)::int from public.profile_contacts where user_id=${u(2)}`, 0, 'a teammate must not read another member phone');
    // The member must NOT read the captain's number either (030 closes 011's policy).
    await as('authenticated', 2);
    await eq(alicePhone, 0, 'a member must not read the captain phone');
    // The captain (user 1) reads a CURRENT member's number, by policy and by RPC.
    await as('authenticated', 1);
    await eq(`select count(*)::int from public.profile_contacts where user_id=${u(2)}`, 1, 'the captain reads a current member phone');
    await eq(`select phone_number from public.get_team_member_profiles(${teamA}, array[${u(2)}]::uuid[])`, '+1 202 555 0102');
    // The same RPC returns NULL phone to a non-captain member, but still the name.
    await as('authenticated', 3);
    await eq(`select phone_number from public.get_team_member_profiles(${teamA}, array[${u(2)}]::uuid[])`, null, 'member RPC phone is null');
    await eq(`select full_name from public.get_team_member_profiles(${teamA}, array[${u(2)}]::uuid[])`, 'Private Ben', 'roster names still load for members');
  });
  await act('workflow non-captain approval is refused', 3, () =>
    expectError(`select public.approve_team_join_request(${u(55)})`, 'P0001', /captain/i, 'approval by a member'));
  await test('rule 4 capacity limit still holds', async () => {
    await as('authenticated', 6);
    await expectError("select public.join_competition_team_by_code('CODE-FULL')", 'P0001', /full/i, 'capacity limit');
  });
  await test('rule 4 deadline lock still holds', async () => {
    await as('authenticated', 8);
    await expectError("select public.join_competition_team_by_code('CODE-PAST')", 'P0001', /deadline|passed/i, 'deadline lock');
  });
  await act('rule 4 one-team-per-competition still holds', 3, async () => {
    await owner();
    await db.exec(`insert into public.competition_teams(id,competition_id,name,invite_code,captain_user_id)
      values (${teamDup},${oppOpen},'Synthetic duplicate','CODE-DUP',${u(5)})`);
    await as('authenticated', 3);
    await expectError("select public.join_competition_team_by_code('CODE-DUP')", 'P0001', /already on a team/i, 'one-team rule');
  });
  await act('workflow captain transfer moves authority and exactly one label', 4, async () => {
    await as('authenticated', 6);
    await eq('select public.join_competition_team_by_code($1)::text', id(81), ['CODE-TEAM-B']);
    await as('authenticated', 4);
    await db.exec(`update public.competition_teams set captain_user_id=${u(6)} where id=${teamB}`);
    await eq(`select captain_user_id::text from public.competition_teams where id=${teamB}`, id(6));
    await eq(`select count(*)::int from public.competition_team_members where team_id=${teamB} and role='captain'`, 1);
    await eq(`select role from public.competition_team_members where team_id=${teamB} and user_id=${u(4)}`, 'member');
    await as('authenticated', 6);
    await rowCount(`update public.competition_teams set name='Synthetic renamed' where id=${teamB} returning id`, 1);
  });
  await act('rule 4 captaincy cannot be handed to a non-member', 4, () =>
    expectError(`update public.competition_teams set captain_user_id=${u(7)} where id=${teamB}`, 'P0001', /already be a team member/i, 'non-member captaincy'));
  await act('workflow member leaves and captain removes a member', 1, async () => {
    await owner();
    await db.exec(`insert into public.competition_team_members(id,team_id,user_id,role) values (${u(70)},${teamA},${u(7)},'member')`);
    await as('authenticated', 7);
    await rowCount(`delete from public.competition_team_members where team_id=${teamA} and user_id=${u(7)} returning id`, 1);
    await owner();
    await db.exec(`insert into public.competition_team_members(id,team_id,user_id,role) values (${u(71)},${teamA},${u(8)},'member')`);
    await as('authenticated', 1);
    await rowCount(`delete from public.competition_team_members where team_id=${teamA} and user_id=${u(8)} returning id`, 1);
  });
}

async function completeRemediationAfter() {
  phase = 'COMPLETE';
  const file = (f) => readFileSync(join(reviewDir, f), 'utf8');

  // ---- 030 captain-only contacts -----------------------------------------
  await act('030 a former member loses captain-granted contact access', 1, async () => {
    await owner();
    await db.exec(`insert into public.profile_contacts(user_id,phone_number) values (${u(3)},'+1 202 555 0103')`);
    await as('authenticated', 1); // captain of teamA, user3 is a current member
    await eq(`select count(*)::int from public.profile_contacts where user_id=${u(3)}`, 1, 'captain reads a current member');
    await db.exec(`delete from public.competition_team_members where team_id=${teamA} and user_id=${u(3)}`);
    await eq(`select count(*)::int from public.profile_contacts where user_id=${u(3)}`, 0, 'former member must lose contact access');
  });
  await act('030 an unrelated student reads no phone', 6, () => eq(alicePhone, 0));
  await test('030 anon cannot read contacts or execute the roster RPC', async () => {
    await as('anon');
    await denied('select phone_number from public.profile_contacts', 'anon contact read');
    await denied(`select * from public.get_team_member_profiles(${teamA}, array[${u(1)}]::uuid[])`, 'anon roster RPC');
  });

  // ---- 031 registration privacy ------------------------------------------
  await act('031 a team member reads the client projection but not the snapshot', 3, async () => {
    await owner();
    await db.exec(`insert into public.competition_registrations(competition_id,registration_type,participant_user_id,team_id,roster_snapshot)
      values (${oppOpen},'team',${u(1)},${teamA},'[{"user_id":"${id(1)}","full_name":"Public Alice","role":"captain"}]'::jsonb)`);
    await as('authenticated', 3);
    await denied(`select roster_snapshot from public.competition_registrations where team_id=${teamA}`, 'roster_snapshot must be admin-only');
    await denied(`select participant_user_id from public.competition_registrations where team_id=${teamA}`, 'participant_user_id must be admin-only');
    await rowCount(`select id, competition_id, registration_type, team_id, status, registered_at from public.competition_registrations where team_id=${teamA}`, 1, 'the client projection still works for a member');
  });
  await act('031 a non-member reads no team registration', 6, async () => {
    await owner();
    await db.exec(`insert into public.competition_registrations(competition_id,registration_type,participant_user_id,team_id,roster_snapshot)
      values (${oppOpen},'team',${u(1)},${teamA},'[]'::jsonb)`);
    await as('authenticated', 6);
    await rowCount(`select id from public.competition_registrations where team_id=${teamA}`, 0);
  });
  await act('031 a solo participant reads their own registration', 6, async () => {
    await owner();
    await db.exec(`insert into public.competition_registrations(competition_id,registration_type,participant_user_id,roster_snapshot)
      values (${oppOpen},'solo',${u(6)},'[]'::jsonb)`);
    await as('authenticated', 6);
    await rowCount(`select id, registration_type, status from public.competition_registrations where registration_type='solo'`, 1);
  });
  await test('031 the admin RPC still returns the roster; a non-admin is refused', async () => {
    await owner();
    await db.exec(`insert into public.competition_registrations(competition_id,registration_type,participant_user_id,team_id,roster_snapshot)
      values (${oppOpen},'team',${u(1)},${teamA},'[{"user_id":"${id(1)}","full_name":"Public Alice","role":"captain"}]'::jsonb)`);
    await as('authenticated', 5); // admin
    await rowCount(`select * from public.competition_registration_records(${oppOpen})`, 1, 'admin export intact');
    await as('authenticated', 3); // non-admin
    await expectError(`select * from public.competition_registration_records(${oppOpen})`, 'P0001', /administrator/i, 'admin-only registration records');
  });

  // ---- 032 join-request integrity ----------------------------------------
  await act('032 an applicant cannot insert a pre-approved request', 2, () =>
    denied(`insert into public.competition_team_join_requests(team_id,user_id,status) values (${teamA},${u(2)},'approved')`, 'pre-approved insert'));
  await act('032 a captain cannot approve by direct UPDATE (RPC-only)', 1, () =>
    denied(`update public.competition_team_join_requests set status='approved' where id=${u(55)}`, 'direct approval must be blocked'));
  await act('032 a captain can still reject by direct UPDATE', 1, async () => {
    await rowCount(`update public.competition_team_join_requests set status='rejected' where id=${u(55)} returning id`, 1);
  });
  await act('032 an applicant cannot change their own status', 2, () =>
    rowCount(`update public.competition_team_join_requests set status='rejected' where id=${u(55)} returning id`, 0, 'captain-only USING'));
  await act('032 approval via the RPC is atomic: membership + approved', 1, async () => {
    await eq('select public.approve_team_join_request($1)', true, [id(55)]);
    await eq(`select count(*)::int from public.competition_team_members where team_id=${teamA} and user_id=${u(2)}`, 1, 'membership inserted');
    await eq(`select status from public.competition_team_join_requests where id=${u(55)}`, 'approved');
  });

  // ---- 033 concurrency ----------------------------------------------------
  await test('033 the guard takes a cross-team advisory lock on INSERT', async () => {
    await owner();
    await db.exec(`insert into public.competition_team_members(team_id,user_id,role) values (${teamA},${u(6)},'member')`);
    await eq(`select count(*)::int from pg_locks where locktype='advisory'`, 1, 'the transaction holds the advisory lock');
  });
  await test('033 the guard body carries the lock and the trigger is bound and enabled', async () => {
    await eq(`select position('pg_advisory_xact_lock' in pg_get_functiondef('public.guard_competition_team_membership()'::regprocedure)) > 0`, true);
    await eq(`select count(*)::int from pg_trigger t join pg_class c on c.oid=t.tgrelid
      where c.relname='competition_team_members' and t.tgname='competition_team_members_guard'
        and t.tgfoid='public.guard_competition_team_membership()'::regprocedure and t.tgenabled <> 'D'`, 1);
  });

  // ---- rollback -> re-apply for all four ---------------------------------
  // Proposal files carry their own begin/commit, so this block manages
  // transactions explicitly (like rolloutCheck) instead of using test().
  {
    const name = '030-033 rollback reopens each exposure, then re-apply reconverges';
    const probe = async (user, body) => { await db.exec('begin'); await as('authenticated', user); await body(); await db.exec('rollback'); await owner(); };
    try {
      await owner();
      await db.exec(rollbackSql(file('030_contact_captain_only.sql')));
      await probe(3, () => eq(alicePhone, 1, 'rolling back 030 reopens finding C'));
      await db.exec(file('030_contact_captain_only.sql'));
      await probe(3, () => eq(alicePhone, 0, '030 reconverged'));

      await db.exec(rollbackSql(file('031_registration_privacy.sql')));
      await eq(`select has_column_privilege('authenticated','public.competition_registrations','roster_snapshot','SELECT')`, true, 'rolling back 031 reopens finding D');
      await db.exec(file('031_registration_privacy.sql'));
      await eq(`select has_column_privilege('authenticated','public.competition_registrations','roster_snapshot','SELECT')`, false, '031 reconverged');

      await db.exec(rollbackSql(file('032_join_request_integrity.sql')));
      await probe(1, () => rowCount(`update public.competition_team_join_requests set status='approved' where id=${u(55)} returning id`, 1, 'rolling back 032 reopens direct approval'));
      await db.exec(file('032_join_request_integrity.sql'));
      await probe(1, () => denied(`update public.competition_team_join_requests set status='approved' where id=${u(55)}`, '032 reconverged'));

      await db.exec(rollbackSql(file('033_membership_concurrency.sql')));
      await eq(`select position('pg_advisory_xact_lock' in pg_get_functiondef('public.guard_competition_team_membership()'::regprocedure)) > 0`, false, 'rolling back 033 removes the lock');
      await db.exec(file('033_membership_concurrency.sql'));
      await eq(`select position('pg_advisory_xact_lock' in pg_get_functiondef('public.guard_competition_team_membership()'::regprocedure)) > 0`, true, '033 reconverged');

      results.push({ phase, name, ok: true });
      console.log(`PASS [${phase}] ${name}`);
    } catch (e) {
      results.push({ phase, name, ok: false });
      console.error(`FAIL [${phase}] ${name}: ${e.code || e.name}: ${String(e.message).split('\n')[0]}`);
      try { await db.exec('rollback; reset role'); } catch { /* no open transaction */ }
    }
  }
}

async function privilegeAfter() {
  phase = 'PRIVILEGES';
  await test('L-1 anon holds no privilege on admin_users', async () => {
    await as('anon');
    await denied('select user_id from public.admin_users', 'admin_users select must be gone');
    for (const p of ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'])
      await eq(`select has_table_privilege('anon','public.admin_users','${p}')`, false);
  });
  await act('rule 5 admin still reads their own mapping row', 5, () => rowCount(`select id, user_id, role from public.admin_users where user_id=${u(5)}`, 1));
  await act('rule 5 non-admin reads no mapping rows', 1, () => rowCount('select user_id from public.admin_users', 0));
  await test('L-2 generator allowed for authenticated, denied for anon', async () => {
    await as('anon');
    await denied('select public.new_team_invite_code()', 'anon execute of the generator');
    await as('authenticated', 1);
    await eq("select (public.new_team_invite_code() ~ '^DSH-[A-Z2-9]{5}$')::text", 'true');
  });
  await test('is_admin() keeps the anon EXECUTE that public policies depend on', async () => {
    await as('anon');
    await eq('select public.is_admin()', false);
    await rowCount('select id from public.colleges', 1);
    await rowCount('select id from public.opportunities where status=$1', 4, ['published']);
  });
  await test('anon profile writes are RLS-denied, not privilege-denied (write privilege retained)', async () => {
    await as('anon');
    // 029 revokes INSERT/UPDATE from authenticated only; 007 narrowed anon SELECT
    // only; 025 leaves ordinary write grants to the policy layer. anon keeps all three.
    for (const priv of ['INSERT', 'UPDATE', 'DELETE'])
      await eq(`select has_table_privilege('anon','public.profiles','${priv}')`, true);
    // No INSERT/UPDATE/DELETE/ALL policy on profiles admits anon — RLS is the boundary.
    await eq(`select count(*)::int from pg_policy p
        join pg_class c on c.oid=p.polrelid
        join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
       where c.relname='profiles' and p.polcmd in ('a','w','d','*')
         and (p.polroles='{}'::oid[] or 0=any(p.polroles)
              or (select oid from pg_roles where rolname='anon')=any(p.polroles))`, 0);
    // INSERT fails specifically on the row-level policy, not on a missing privilege.
    await expectError(`insert into public.profiles(user_id,full_name,college_id,course,year_of_study,graduation_year,gender)
       values (${u(99)},'Synthetic anon',${u(90)},'Synthetic',1,2099,'other')`,
      '42501', /row-level security policy for table "profiles"/, 'anon INSERT must fail on RLS, not a missing privilege');
    // UPDATE/DELETE: privilege present, RLS admits no row → zero rows change.
    await rowCount(`update public.profiles set headline='Synthetic anon' where user_id=${u(3)} returning user_id`, 0);
    await rowCount(`delete from public.profiles where user_id=${u(3)} returning user_id`, 0);
  });
  await test('no API role can TRUNCATE, REFERENCES or TRIGGER any public table', async () => {
    const { rows } = await query(`
      select c.relname, r.rolname
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
        cross join (values ('anon'), ('authenticated')) r(rolname)
       where c.relkind = 'r'
         and (has_table_privilege(r.rolname, c.oid, 'TRUNCATE')
           or has_table_privilege(r.rolname, c.oid, 'REFERENCES')
           or has_table_privilege(r.rolname, c.oid, 'TRIGGER'))`);
    assert.deepEqual(rows, [], 'broad privilege still granted: ' + rows.map((x) => `${x.relname}/${x.rolname}`).join(', '));
  });
  await act('F-05 connection identity stays immutable for the recipient', 4, async () => {
    await denied(`update public.student_connections set requester_user_id=${u(4)} where id=${u(41)}`, 'requester rewrite');
    await rowCount(`update public.student_connections set status='accepted' where id=${u(41)} returning id`, 1);
    await eq(`select status from public.student_connections where id=${u(41)}`, 'accepted');
  });
  await act('F-05 notification actor cannot be forged', 3, () =>
    denied(`update public.student_notifications set actor_user_id=${u(2)} where connection_id=${u(40)}`, 'actor rewrite'));
  await act('notification owner still marks their own row read', 3, async () => {
    await rowCount(`update public.student_notifications set read_at=now() where user_id=${u(3)} returning id`, 1);
    await denied(`update public.student_notifications set type='connection_accepted' where user_id=${u(3)}`, 'type rewrite');
  });
  await act('connection request can still be sent and cancelled', 8, async () => {
    const { rows } = await query(`insert into public.student_connections(requester_user_id,recipient_user_id)
      values (${u(8)},${u(5)}) returning id`);
    assert.equal(rows.length, 1);
    await rowCount(`delete from public.student_connections where id=$1 returning id`, 1, [rows[0].id]);
  });
  await test('rule 1 avatar bucket and its four object policies are untouched', async () => {
    await owner();
    await eq("select public from storage.buckets where id='student-avatars'", true);
    await eq("select count(*)::int from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='storage' and c.relname='objects' and (coalesce(pg_get_expr(p.polqual,p.polrelid),'') || coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'')) like '%student-avatars%'", 4);
  });
  await test('rule 1 authenticated can still read stored objects', async () => {
    await as('authenticated', 1);
    await rowCount("select id from storage.objects where bucket_id='student-avatars'", 0);
    await owner();
    await db.exec(`insert into storage.objects(bucket_id,name,owner) values ('student-avatars','${id(2)}/synthetic.png','${id(2)}')`);
    await as('authenticated', 2);
    await rowCount("select id from storage.objects where bucket_id='student-avatars'", 1);
    await denied(`insert into storage.objects(bucket_id,name,owner) values ('student-avatars','${id(1)}/intruder.png','${id(2)}')`, 'cannot write another student folder');
  });
}

async function pendingAfter() {
  phase = 'PENDING';
  await act('rule 6 skill adder and editor keep working after 027', 1, async () => {
    await rowCount(`insert into public.student_skills(user_id,name,is_public) values (${u(1)},'Synthetic skill',true) returning id`, 1);
    await rowCount(`update public.student_skills set name='Renamed skill', is_public=false where user_id=${u(1)} returning id`, 1);
    await rowCount(`delete from public.student_skills where user_id=${u(1)} returning id`, 1);
  });
  await act('F-09 self-attested endorsement is denied at the privilege layer', 1, async () => {
    await denied(`insert into public.student_skills(user_id,name,is_public,source) values (${u(1)},'Synthetic skill',true,'verified')`,
      'source must not be insertable by the student it describes');
    await owner();
    await db.exec(`insert into public.student_skills(id,user_id,name,source) values (${u(95)},${u(1)},'Synthetic skill','self')`);
    await as('authenticated', 1);
    await denied(`update public.student_skills set source='verified' where id=${u(95)}`,
      'flipping your own skill to verified is a claim the system cannot support');
  });
  await act('rule 6 experience adder and editor keep working after 027', 1, async () => {
    await owner();
    await db.exec(`insert into public.student_experience(id,user_id,role) values (${u(92)},${u(1)},'Synthetic role')`);
    await as('authenticated', 1);
    await rowCount(`insert into public.student_experience(user_id,role,organization,period,location,is_public)
      values (${u(1)},'Synthetic role','Synthetic org','2025','Somewhere',true) returning id`, 1);
    await rowCount(`update public.student_experience set role='Renamed role', is_current=true where user_id=${u(1)} returning id`, 2);
  });
  await act('F-09-adjacent experience id and created_at stop being owner-writable', 1, async () => {
    await owner();
    await db.exec(`insert into public.student_experience(id,user_id,role) values (${u(92)},${u(1)},'Synthetic role')`);
    await as('authenticated', 1);
    await denied(`update public.student_experience set id=${u(96)} where id=${u(92)}`, 'id rewrite, which BASELINE allowed');
    await denied(`update public.student_experience set created_at=timestamp with time zone '2000-01-01 00:00:00+00' where id=${u(92)}`,
      'timestamp rewrite, which BASELINE allowed');
    await denied(`insert into public.student_experience(id,user_id,role) values (${u(97)},${u(1)},'Synthetic role')`,
      '019:180 granted table-wide INSERT, so a client could choose its own row id until 027 narrowed it');
  });
  await test('F-11 audit-column conflict is reported, not silently decided', async () => {
    // 027 section 4 applies nothing while the retention question is open, so the
    // behaviour BASELINE reproduced must still be the behaviour now.
    await owner();
    await db.exec(`insert into public.profile_moderation_flags(profile_user_id,reason,subject,created_by)
      values (${u(2)},'synthetic reason','profile',${u(5)})`);
    await expectError(`delete from auth.users where id=${u(5)}`, '23502', /null|created_by/i,
      '027 must not have changed 021 NOT NULL / ON DELETE SET NULL');
  });
}

async function runVerify(label) {
  phase = label;
  try {
    await db.exec(`begin; ${readFileSync(join(reviewDir, VERIFY), 'utf8')} rollback;`);
    results.push({ phase: label, name: VERIFY + ' raises nothing', ok: true });
    console.log(`PASS [${label}] ${VERIFY} raises nothing`);
  } catch (e) {
    results.push({ phase: label, name: VERIFY + ' raises nothing', ok: false });
    console.error(`FAIL [${label}] ${VERIFY}: ${String(e.message).split('\n').slice(0, 2).join(' / ')}`);
    await db.exec('rollback; reset role');
  }
}

// Today's live schema stops at 016 (LIVE_DB_VERIFICATION.md §2), so the guarded
// half of the proposal set has never been exercised end to end. A second instance
// models exactly that shape and nothing else about production.
async function orderCheck() {
  phase = 'ORDER';
  noteShim('ORDER builds a SECOND in-memory instance whose migrations stop at 016. The schema shape is taken from the live table inventory, not cloned from production; credentials, row counts and PostgREST behaviour are absent here just as they are in the main instance.');
  const d = new PGlite();
  const scal = async (sql) => { const { rows } = await d.query(sql); return Object.values(rows[0])[0]; };
  const check = async (name, body) => {
    try {
      await body();
      results.push({ phase, name, ok: true });
      console.log(`PASS [${phase}] ${name}`);
    } catch (e) {
      results.push({ phase, name, ok: false });
      console.error(`FAIL [${phase}] ${name}: ${e.code || e.name}: ${String(e.message).split('\n')[0]}`);
      try { await d.exec('rollback'); } catch { /* no transaction was open */ }
    }
  };
  const apply = async (files) => {
    for (const file of files) await d.exec(`begin; ${migrationSql(file).sql} commit;`);
  };
  try {
    await d.exec(BOOTSTRAP_SQL);
    await apply(ORDER_MIGRATIONS);
    await check('ORDER replay stops where the live project stops: 017/019/021 relations absent', async () => {
      for (const rel of ['events', 'student_skills', 'student_experience', 'profile_moderation_flags'])
        assert.equal(await scal(`select to_regclass('public.${rel}') is null`), true, `${rel} must be absent for this to model live`);
    });
    // The operator's script has never been executed by anything until now. That
    // is how P10's three-part name survived an entire audit: 000 runs by hand,
    // so no suite ever saw it fail.
    await check('000_read_only_preflight.sql runs clean against the live-shaped schema (read-only, no writes)', async () => {
      const text = readFileSync(join(reviewDir, '000_read_only_preflight.sql'), 'utf8');
      await d.exec(text);
      assert.equal(await scal('select count(*)::int from public.profiles'), 0, 'P1 still readable afterwards');
    });
    await check('000 P10a answers honestly in both ledger states; the three-part name is gone', async () => {
      const probe = "select case when to_regclass('_supabase_migrations.schema_migrations') is not null then 'PRESENT' else 'ABSENT' end";
      assert.equal(await scal(probe), 'ABSENT', 'no ledger exists in this fixture');
      // Only executable lines: 000 documents the old bug in prose, and a naive
      // search over the whole file would match its own explanation.
      const code = readFileSync(join(reviewDir, '000_read_only_preflight.sql'), 'utf8')
        .split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
      assert.ok(!/from\s+public\._supabase_migrations/.test(code),
        'R-2: the three-part ledger reference must not come back — it fails 0A000 on every real project');
      // P10b must skip cleanly here; the check above proves it did not abort.
      await d.exec('create schema _supabase_migrations;');
      await d.exec('create table _supabase_migrations.schema_migrations(version text, name text, statements jsonb);');
      await d.exec("insert into _supabase_migrations.schema_migrations values ('15','user_preferences','[]'::jsonb)");
      assert.equal(await scal(probe), 'PRESENT');
      await d.exec(readFileSync(join(reviewDir, '000_read_only_preflight.sql'), 'utf8'));  // P10b now walks the ledger
      assert.equal(await scal('select count(*)::int from _supabase_migrations.schema_migrations'), 1);
    });
    await check('023-027 applied in order complete against that schema (the discarded 022 aborted here with 42P01)', async () => {
      for (const file of PROPOSALS) await d.exec(readFileSync(join(reviewDir, file), 'utf8'));
    });
    await check('the profiles protections survived the guarded skips', async () => {
      assert.equal(await scal("select has_column_privilege('authenticated','public.profiles','gender','SELECT')"), false,
        'F-01 must be closed even when 027 had nothing to narrow');
      assert.equal(await scal(`select count(*)::int from pg_policy p
        join pg_class c on c.oid = p.polrelid
        join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
        join unnest(p.polroles) r(roleid) on true
        join pg_roles ro on ro.oid = r.roleid
       where c.relname = 'profiles' and p.polcmd = 'r' and ro.rolname = 'authenticated'`), 1);
      assert.equal(await scal("select has_function_privilege('anon','public.get_connected_peer_names()','EXECUTE')"), false);
      assert.equal(await scal("select to_regclass('public.student_skills') is null"), true, '027 must not create the relations it guards');
    });
    await apply(LATE_MIGRATIONS);
    await check('a relation created after 025 gains only what its own migration grants', async () => {
      assert.equal(await scal("select has_table_privilege('anon','public.events','SELECT')"), true, '017:103 grants this explicitly');
      assert.equal(await scal("select has_table_privilege('anon','public.events','TRUNCATE')"), false, 'the F-04 bootstrap hole must not reopen');
      assert.equal(await scal("select has_table_privilege('authenticated','public.student_skills','TRUNCATE')"), false);
    });
    await check('027 applied AFTER the feature migrations narrows them, and repairs injected grant drift', async () => {
      // Fault injection, clearly labelled: this simulates the pre-fix grant state
      // of 019:104-105 that 027 is supposed to converge away.
      await d.exec('grant update on public.student_skills to authenticated');
      assert.equal(await scal("select has_column_privilege('authenticated','public.student_skills','source','UPDATE')"), true,
        'the injected drift must exist before 027 re-runs, or this proves nothing');
      await d.exec(readFileSync(join(reviewDir, '027_pending_table_corrections.sql'), 'utf8'));
      assert.equal(await scal("select has_column_privilege('authenticated','public.student_skills','source','UPDATE')"), false);
      assert.equal(await scal("select has_column_privilege('authenticated','public.student_skills','name','UPDATE')"), true,
        'narrowing must not break the editor');
      assert.equal(await scal("select has_column_privilege('authenticated','public.student_experience','id','INSERT')"), false);
    });
    await check('028 read-only verification passes against the late-apply ordering too', async () => {
      await d.exec(`begin; ${readFileSync(join(reviewDir, VERIFY), 'utf8')} rollback;`);
    });
  } catch (e) {
    results.push({ phase, name: 'ORDER instance reached its end', ok: false });
    console.error(`FATAL [ORDER]: ${e.code || e.name}: ${String(e.message).split('\n')[0]}`);
  } finally {
    await d.close();
  }
}

// Rollback blocks live in the SQL files as comments, which is exactly how they
// rot out of sync with the migration they describe. The `--$ ` prefix marks the
// lines this harness extracts and EXECUTES, so what an operator reads is what
// has been run.
const rollbackSql = (text) => text.split('\n').filter((l) => l.startsWith('--$ '))
  .map((l) => l.slice(4)).join('\n');

async function negativeExtra() {
  phase = 'NEGATIVE';
  await act('rule 3 aggregate over an ungranted profile column is denied, not blanked', 2, async () => {
    // PostgREST builds a different plan for an aggregate over a column than for
    // a projection, so the privilege check needs its own assertion. count(*)
    // over the table itself is the control: it respects the ROW policy, which is
    // why it returns public rows plus the reader's own, not the whole table.
    await denied('select count(gender) from public.profiles', 'aggregate over profiles.gender');
    await denied("select max(created_at) from public.profiles", 'aggregate over profiles.created_at');
    await eq('select count(*)::int from public.profiles', 3,
      'count(*) sees only the rows this reader is allowed (2 public + own)');
  });
  await test('anon holding a JWT subject still reaches nothing on the name path', async () => {
    // The fixture's anon role is normally tested with no claim. A forged or
    // mis-scoped token that sets a sub while the role is anon must not turn the
    // relationship-scoped function into a reader.
    await as('anon', 1);
    await denied('select * from public.get_connected_peer_names()', 'anon with a subject set');
    await denied('select * from public.get_own_profile()', 'anon with a subject set');
    await denied('select gender from public.profiles', 'anon with a subject set');
  });
  await act('rule 4 a plain member cannot change who the captain is', 3, async () => {
    // u3 is a MEMBER of team A, not its captain: 002's USING must exclude the
    // row, so the statement affects nothing. This is the case the harness
    // previously only asserted for complete outsiders.
    await eq(`select captain_user_id::text = '${id(1)}' from public.competition_teams where id=${teamA}`, true);
    await rowCount(`update public.competition_teams set captain_user_id=${u(3)} where id=${teamA} returning id`, 0);
    await eq(`select captain_user_id::text = '${id(1)}' from public.competition_teams where id=${teamA}`, true,
      'captaincy must not have moved');
  });
  await act('rule 4 a member cannot delete the team row at all', 3, async () => {
    await rowCount(`delete from public.competition_teams where id=${teamA} returning id`, 0);
    await eq(`select count(*)::int from public.competition_teams where id=${teamA}`, 1);
  });
  await test('R-6: a future definer function DOES reach anon by engine default, and 028 V6 is the control', async () => {
    // Measured, and it overturns an assumption in 025 §4: after
    //   alter default privileges in schema public revoke all on functions from anon
    // a newly created function is STILL executable by anon, because the
    // function's own ACL carries EXECUTE to the PUBLIC pseudo-role and anon
    // inherits every PUBLIC privilege. Two spellings were tested: proacl NULL
    // (system default, which includes PUBLIC execute) when the defacl entry is
    // emptied, and an explicit `=X/grantor` entry here, where a defacl row for
    // authenticated/service_role still exists. Default privileges cannot close
    // this flank for functions; only an explicit revoke in the creating
    // migration can. What makes the residual acceptable is 028 V6, which refuses
    // verification for any definer function anon can execute that is not on its
    // allowlist. This test proves both halves of that claim.
    await owner();
    await db.exec(`create function public.synthetic_future_rpc() returns int
      language sql security definer set search_path = '' as $$ select 1 $$;`);
    assert.equal(await scalar(`select 0 = any(array(select a.grantee from aclexplode(proacl) a))
      from pg_proc where oid='public.synthetic_future_rpc()'::regprocedure`), true,
      'the new function carries an explicit EXECUTE grant to PUBLIC, which is how anon still reaches it');
    assert.equal(await scalar("select has_function_privilege('anon','public.synthetic_future_rpc()','EXECUTE')"), true,
      'so anon reaches it — the L-2 shape, reproduced for a future object');
    // V6's predicate, run as 028 would run it: this function must fail it.
    assert.equal(await scalar(`select count(*)::int > 0 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
      where p.prosecdef and p.proname not in ('is_admin','get_javlin_level','get_javlin_levels',
        'competition_registered_team_count','competition_discoverable_teams')
        and has_function_privilege('anon', p.oid, 'EXECUTE')`), true,
      '028 V6 must catch exactly this');
    // And the fix that actually works, which 025 §2b applies to existing objects.
    await db.exec('revoke all on function public.synthetic_future_rpc() from public, anon');
    assert.equal(await scalar("select has_function_privilege('anon','public.synthetic_future_rpc()','EXECUTE')"), false,
      'an explicit revoke does close it');
    assert.equal(await scalar("select has_function_privilege('authenticated','public.synthetic_future_rpc()','EXECUTE')"), true,
      'and authenticated keeps RPC access, as 025 §4 documents');
    await db.exec('drop function public.synthetic_future_rpc()');
  });
}

async function rolloutCheck() {
  phase = 'ROLLOUT';
  noteShim('ROLLOUT walks the expand-and-contract sequence on a THIRD in-memory instance: 001-021, then 023 alone (Phase A), then the client-visible paths, then 024-027 and 029 (Phase C), then each rollback block and a re-apply. Nothing here is PostgREST; the point is that the SQL states a client can rely on are proved in order.');
  const d = new PGlite();
  const scal = async (sql) => { const { rows } = await d.query(sql); return Object.values(rows[0])[0]; };
  // Session-scoped role switch with an explicit reset, because these bodies
  // apply whole proposal files (which carry their own begin/commit) and cannot
  // be wrapped in one enclosing transaction the way the main suite's tests can.
  const become = async (role, user = null) => {
    await d.exec('reset role');
    await d.query("select set_config('request.jwt.claim.sub', $1, false)", [user === null ? '' : id(user)]);
    await d.exec(`set role ${role}`);
    const s = (await d.query('select current_user as role, auth.uid()::text as uid')).rows[0];
    assert.equal(s.role, role, 'role switch failed');
    assert.equal(s.uid, user === null ? null : id(user), 'auth.uid() emulation failed');
  };
  const settle = async () => {
    try { await d.exec('reset role'); } catch { /* already reset */ }
    await d.query("select set_config('request.jwt.claim.sub', '', false)");
  };
  const rows = async (sql) => (await d.query(sql)).rows;
  const check = async (name, body) => {
    try {
      await body();
      results.push({ phase, name, ok: true });
      console.log(`PASS [${phase}] ${name}`);
    } catch (e) {
      results.push({ phase, name, ok: false });
      console.error(`FAIL [${phase}] ${name}: ${e.code || e.name}: ${String(e.message).split('\n')[0]}`);
    } finally {
      await settle();
    }
  };
  const proposal = (f) => readFileSync(join(reviewDir, f), 'utf8');
  // Each expectation runs in its own transaction so a denial cannot leave the
  // instance in an aborted state for the next statement.
  const fail = async (sql, code, label) => {
    await d.exec('begin');
    let caught;
    try { await d.exec(sql); } catch (e) { caught = e; }
    finally { await d.exec('rollback'); }
    assert.ok(caught, `${label}: expected ${code}, statement succeeded`);
    assert.equal(caught.code, code, `${label}: wrong SQLSTATE (${caught.message})`);
  };
  const snapshot = () => scal(`select md5(string_agg(x, '||' order by x)) from (
      select c.relname || '@' || p.polname || '#' || coalesce(pg_get_expr(p.polqual,p.polrelid),'') as x
        from pg_policy p join pg_class c on c.oid = p.polrelid
        join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
      union all
      select c.relname || '#' || coalesce(c.relacl::text,'') from pg_class c
        join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public' where c.relkind in ('r','S')
      union all
      select c.relname || '!' || t.tgname || '#' || t.tgfoid::regprocedure::text || '#' || t.tgtype::int::text || '#' || t.tgenabled::text
        from pg_trigger t join pg_class c on c.oid = t.tgrelid
        join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public' where not t.tgisinternal) s`);
  let snapBeforeRollback = null;
  try {
    await d.exec(BOOTSTRAP_SQL);
    for (const file of migrations) await d.exec(`begin; ${migrationSql(file).sql} commit;`);
    await d.exec(SEED_SQL);

    await check('029 refuses to run before 023: the rollout guard fires, not the restriction', async () => {
      await d.exec('begin');
      let caught;
      try { await d.exec(proposal('029_profile_privacy_enforcement.sql')); } catch (e) { caught = e; }
      await d.exec('rollback');
      assert.ok(caught, '029 applied without 023 must abort');
      assert.match(caught.message, /does not exist|023/, '029 must abort naming the additive half');
      assert.equal(await scal("select to_regclass('public.profiles') is not null"), true,
        'the abort rolled the whole file back: profiles untouched');
      assert.equal(await scal("select has_table_privilege('authenticated','public.profiles','SELECT')"), true,
        'and no privilege was narrowed by the aborted attempt');
    });

    await check('Phase A: before 023 the RPCs are absent and the old client read is the only path', async () => {
      assert.equal(await scal("select to_regprocedure('public.get_own_profile()') is null"), true);
      await become('authenticated', 1);
      assert.equal((await rows('select * from public.profiles where user_id = ' + u(1))).length, 1,
        'the pre-023 owner read of the table itself must work, because that is what ships today');
      await d.exec('reset role');
    });

    await check('Phase A applied alone changes nothing for the client that is deployed now', async () => {
      await d.exec(proposal('023_profile_privacy_name_only.sql'));
      assert.equal(await scal("select has_function_privilege('authenticated','public.get_own_profile()','EXECUTE')"), true);
      await become('authenticated', 1);
      assert.equal((await rows('select * from public.profiles where user_id = ' + u(1))).length, 1,
        'broad table read still permitted: the additive half removed nothing');
      await become('authenticated', 2);
      assert.equal((await rows('select gender from public.profiles')).length, 5,
        'F-01 is still OPEN at Phase A, by design — closing it is 029');
      await d.exec('reset role');
    });

    await check('Phase B: the paths the new client calls work under Phase A', async () => {
      await become('authenticated', 1);
      const own = await rows('select * from public.get_own_profile()');
      assert.equal(own.length, 1);
      assert.equal(own[0].gender, 'female', 'the owner keeps gender through the RPC');
      await become('authenticated', 6);
      const names = await rows('select * from public.get_connected_peer_names()');
      assert.deepEqual(names.map((n) => n.full_name).sort(), ['Private Alice']);
      assert.deepEqual(Object.keys(names[0]).sort(), ['full_name', 'user_id'], 'name path exposes two columns only');
      await d.exec('reset role');
    });

    await check('Phase C: 024-027 then 029 close F-01 without breaking the RPC paths', async () => {
      for (const f of ['024_team_membership_integrity.sql', '025_anon_privilege_corrections.sql',
        '026_connection_and_notification_immutability.sql', '027_pending_table_corrections.sql'])
        await d.exec(proposal(f));
      await d.exec(proposal('029_profile_privacy_enforcement.sql'));
      await become('authenticated', 2);
      await fail('select gender from public.profiles', '42501', 'stranger reading gender');
      assert.equal((await rows('select full_name from public.profiles where is_public = true')).length, 2,
        'the directory projection still reads');
      await d.exec('reset role');
      await become('authenticated', 1);
      // The R-1 evidence, stated as a fact of the database: after Phase C the
      // owner CANNOT read their own row from the table with a broad projection.
      await fail('select * from public.profiles where user_id = ' + u(1), '42501',
        'owner select=* must fail after Phase C, which is why the client must call the RPC');
      assert.equal((await rows('select * from public.get_own_profile()')).length, 1,
        'and the RPC is the working path');
      await d.exec('reset role');
      snapBeforeRollback = await snapshot();
    });

    await check('rollback of 023 while 029 stands locks the owner out — the documented ordering rule, proven', async () => {
      await d.exec(rollbackSql(proposal('023_profile_privacy_name_only.sql')));
      await become('authenticated', 1);
      await fail('select * from public.get_own_profile()', '42883', 'the owner path is gone');
      await fail('select * from public.profiles where user_id = ' + u(1), '42501', 'and the table path was already closed');
      await d.exec('reset role');
      await d.exec(proposal('023_profile_privacy_name_only.sql'));
      await become('authenticated', 1);
      assert.equal((await rows('select * from public.get_own_profile()')).length, 1, 're-applying 023 restores it');
      await d.exec('reset role');
    });

    await check('rollback of 029 reopens F-01 exactly as its block says it does, then reconverges', async () => {
      await d.exec(rollbackSql(proposal('029_profile_privacy_enforcement.sql')));
      await become('authenticated', 2);
      assert.equal((await rows('select gender from public.profiles')).length, 5,
        'the rollback must actually restore the vulnerable read, or it is not a rollback');
      await d.exec('reset role');
      await d.exec(proposal('029_profile_privacy_enforcement.sql'));
      await become('authenticated', 2);
      await fail('select gender from public.profiles', '42501', 're-applied 029 closed it again');
      await d.exec('reset role');
    });

    await check('rollback of 024 removes all three triggers and restores the membership hole', async () => {
      await d.exec(rollbackSql(proposal('024_team_membership_integrity.sql')));
      assert.equal(await scal(`select count(*)::int from pg_trigger t
        join pg_class c on c.oid = t.tgrelid
       where c.relname in ('competition_teams','competition_team_members')
         and t.tgname in ('competition_teams_reassign_roles','competition_teams_guard_captain','competition_team_members_derive_role')`), 0,
        'R-4: every trigger 024 created must be gone after its rollback');
      assert.equal(await scal("select to_regprocedure('public.reassign_membership_roles()') is null"), true,
        'and so must its definer function');
      await become('authenticated', 2);
      const inserted = await d.query(`insert into public.competition_team_members(team_id,user_id,role) values (${teamA},${u(2)},'member')`);
      assert.equal(inserted.affectedRows, 1, 'F-02 genuinely reopens');
      // Clean up: leaving the row would make the re-apply check ambiguous
      // between a policy denial and a unique-index collision.
      await d.exec(`delete from public.competition_team_members where team_id=${teamA} and user_id=${u(2)}`);
      await d.exec('reset role');
    });

    await check('re-applying 024 reconverges trigger bindings, policies and grants', async () => {
      await d.exec(proposal('024_team_membership_integrity.sql'));
      assert.equal(await snapshot(), snapBeforeRollback,
        'R-9: trigger timing, command bits, bound function, policies and grants must all converge');
      await become('authenticated', 2);
      await fail(`insert into public.competition_team_members(team_id,user_id,role) values (${teamA},${u(2)},'member')`,
        '42501', 'F-02 closed again');
      await d.exec('reset role');
    });

    await check('rollback and re-apply of 026 and 027 both restore and re-narrow their grants', async () => {
      for (const f of ['026_connection_and_notification_immutability.sql', '027_pending_table_corrections.sql']) {
        assert.ok(rollbackSql(proposal(f)).length > 0, `${f} must carry an executable --$ rollback block`);
        await d.exec(rollbackSql(proposal(f)));
        await d.exec(proposal(f));
      }
      assert.equal(await scal("select has_column_privilege('authenticated','public.student_notifications','actor_user_id','UPDATE')"), false,
        '026 reconverged');
      assert.equal(await scal("select has_column_privilege('authenticated','public.student_experience','id','INSERT')"), false,
        '027 reconverged');
    });

    // 025 is deliberately NOT a complete rollback. Its static halves (§1
    // admin_users, §2 generator, §4 default privileges) have exact known inverses
    // and ARE restored. Its dynamic halves (§2b definer EXECUTE, §3 table/sequence
    // sweeps) iterate the live catalog, so no portable static inverse exists
    // without the 000 preflight snapshot. This test proves the gap behaviourally so
    // the suite can never report a misleading green "complete rollback" for 025.
    // See SECURITY_MIGRATION_GUIDE.md → "025 is the exception".
    await check('025 rollback is PARTIAL by design: restores §1/§2/§4, leaves the §2b/§3 catalog loops restricted', async () => {
      const anonOid = "(select oid from pg_roles where rolname='anon')";
      const defaclAnon = `select exists(select 1 from pg_default_acl d
          join pg_namespace n on n.oid=d.defaclnamespace and n.nspname='public'
          cross join lateral aclexplode(d.defaclacl) a
         where d.defaclobjtype='r' and a.grantee=${anonOid})`;
      const adminSel = "select has_table_privilege('anon','public.admin_users','SELECT')";
      const genExec = "select has_function_privilege('anon','public.new_team_invite_code()','EXECUTE')";
      const joinExec = "select has_function_privilege('anon','public.join_competition_team_by_code(text)','EXECUTE')";
      const colTrunc = "select has_table_privilege('anon','public.colleges','TRUNCATE')";
      // Precondition: after Phase C every 025 restriction is in force.
      assert.equal(await scal(adminSel), false);
      assert.equal(await scal(genExec), false);
      assert.equal(await scal(joinExec), false);
      assert.equal(await scal(colTrunc), false);
      assert.equal(await scal(defaclAnon), false);

      await d.exec(rollbackSql(proposal('025_anon_privilege_corrections.sql')));

      // RESTORED — the static, exactly-invertible halves:
      assert.equal(await scal(adminSel), true, '§1 restored: anon admin_users SELECT returns (L-1 reopens)');
      assert.equal(await scal(genExec), true, '§2 restored: anon generator EXECUTE returns (L-2 reopens)');
      assert.equal(await scal(defaclAnon), true, '§4 restored: anon default table privilege returns (F-04 reopens)');
      // NOT RESTORED — the dynamic, catalog-dependent halves. This is the gap:
      assert.equal(await scal(joinExec), false, '§2b NOT restored: anon definer EXECUTE stays revoked');
      assert.equal(await scal(colTrunc), false, '§3 NOT restored: anon table TRUNCATE stays revoked');

      // Re-applying 025 reconverges: the restored halves are re-revoked, the
      // never-restored halves are idempotent no-ops.
      await d.exec(proposal('025_anon_privilege_corrections.sql'));
      assert.equal(await scal(adminSel), false, '§1 re-revoked');
      assert.equal(await scal(genExec), false, '§2 re-revoked');
      assert.equal(await scal(defaclAnon), false, '§4 re-revoked');
      assert.equal(await scal(joinExec), false, '§2b still revoked');
      assert.equal(await scal(colTrunc), false, '§3 still revoked');
    });
  } catch (e) {
    results.push({ phase, name: 'ROLLOUT instance reached its end', ok: false });
    console.error(`FATAL [ROLLOUT]: ${e.code || e.name}: ${String(e.message).split('\n')[0]}`);
  } finally {
    await d.close();
  }
}

const aclFingerprint = () => scalar(`
  select md5((select string_agg(x, '||' order by x) from (
    select c.relname || '#' || coalesce(c.relacl::text,'') || '#' ||
      coalesce((select string_agg(a.attname || '=' || coalesce(a.attacl::text,''), ',' order by a.attnum)
        from pg_attribute a where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped), '') as x
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r','S')
    union all
    select p.proname || '#' || coalesce(p.proacl::text,'') || '#' || coalesce(p.proconfig::text,'')
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
    union all
    select c.relname || '@' || p.polname || '#' || coalesce(pg_get_expr(p.polqual,p.polrelid),'') ||
      '#' || coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'')
      from pg_policy p join pg_class c on c.oid = p.polrelid
      join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'
    -- R-9: trigger BINDINGS belong in the convergence snapshot. Existence alone
    -- (which 028 V3 checks) cannot see a re-apply that re-pointed a trigger at a
    -- different function, flipped BEFORE to AFTER, dropped the UPDATE OF column
    -- list, or disabled it. tgtype carries timing + command bits; tgfoid is the
    -- bound function; tgenabled is the enable state.
    union all
    select c.relname || '!' || t.tgname || '#' || t.tgfoid::regprocedure::text || '#' ||
      t.tgtype::int::text || '#' || t.tgenabled::text || '#' || coalesce(t.tgargs::text,'')
      from pg_trigger t join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and not t.tgisinternal
  ) t))::text`);

await bootstrap();
await applyMigrations();
await seed();
try {
  await baseline();
  await applyProposals('APPLY');
  await privacyAfter();
  await teamAfter();
  await privilegeAfter();
  await pendingAfter();
  await negativeExtra();
  await completeRemediationAfter();
  await runVerify('VERIFY');
  const fingerprint = await aclFingerprint();
  await applyProposals('REAPPLY');
  phase = 'IDEMPOTENCY';
  await eq('select ($1 = $2)::text', 'true', [await aclFingerprint(), fingerprint], 're-applying 023-027 must converge to identical effective privileges and policies');
  console.log('PASS [IDEMPOTENCY] 023-027 re-applied; effective ACL/policy state unchanged');
  await runVerify('VERIFY-AGAIN');
  await orderCheck();
  await rolloutCheck();
} catch (e) {
  fatal = e;
  console.error(`FATAL [${phase}]: ${e.message}`);
} finally {
  const byPhase = {};
  for (const r of results) { const b = (byPhase[r.phase] ??= { p: 0, f: 0 }); r.ok ? b.p++ : b.f++; }
  for (const [p, c] of Object.entries(byPhase)) console.log(`RESULT ${p}: ${c.p} passed, ${c.f} failed`);
  const failed = results.filter((r) => !r.ok);
  console.log(`TOTAL ${results.length - failed.length} passed, ${failed.length} failed; ${shims.length} documented shims; ${migrations.length} migrations + ${PROPOSALS.length} proposals applied`);
  console.log('LIMITS PGlite simulation with a documented auth/roles/storage/default-privilege bootstrap. No PostgREST, GoTrue, Storage HTTP, JWT validation, live schema, concurrent races, or real student data. Nothing here is evidence about production, and it does not replace staging.');
  if (fatal) console.error(`Harness error: ${fatal.message}`);
  await db.close();
  process.exitCode = fatal || failed.length ? 1 : 0;
}
