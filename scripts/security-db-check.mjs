#!/usr/bin/env node
/**
 * Offline, synthetic PostgreSQL regression audit. Run with:
 *   node E:/dsh-repo/scripts/security-db-check.mjs
 * Requires the already-installed PGlite 0.3.14 in the security-audit cache.
 * No server, credentials, network, persisted database, or product SQL edits.
 * Every scenario rolls back; the remediation set (supabase/security-review
 * 023-027) and its entire post-migration suite run twice.
 * Exit 1 means an unmet security expectation, even for a documented residual.
 *
 * Scope split, so the two local harnesses do not silently diverge: this one is
 * the product-behaviour suite (who can read/write which row, and does every
 * authorized flow still work). scripts/security-phase2-check.mjs is the
 * approved-rule suite and the order-independence check against a 016-shaped
 * schema. Both apply the same files.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { PGlite } from '../node_modules/.cache/security-audit/node_modules/@electric-sql/pglite/dist/index.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const migrationDir = join(root, 'supabase', 'migrations');
const reviewDir = join(root, 'supabase', 'security-review');
const digest = (s) => createHash('sha256').update(s).digest('hex');
const files = readdirSync(migrationDir).filter((f) => /^(00[1-9]|01\d|02[01])_.*\.sql$/.test(f)).sort();
assert.equal(files.length, 21, 'Require exactly migrations 001-021; 022 was discarded as unappliable (see LIVE_DB_VERIFICATION.md L-7)');
// The proposal set is ordered: 027 must follow 025, whose default-privilege fix
// it depends on, and each file asserts its own preconditions before changing any
// grant, so an out-of-order run aborts rather than half-applying.
const PROPOSALS = ['023_profile_privacy_name_only.sql', '024_team_membership_integrity.sql',
  '025_anon_privilege_corrections.sql', '026_connection_and_notification_immutability.sql',
  '027_pending_table_corrections.sql', '029_profile_privacy_enforcement.sql',
  '030_contact_captain_only.sql', '031_registration_privacy.sql',
  '032_join_request_integrity.sql', '033_membership_concurrency.sql'];
const migrations = files.map((file, index) => {
  assert.equal(Number(file.slice(0, 3)), index + 1, 'Migration sequence must be complete');
  const sql = readFileSync(join(migrationDir, file), 'utf8');
  return { file, sql, hash: digest(sql) };
});
const original010 = execFileSync('git', ['-C', root, 'show', `HEAD:supabase/migrations/${files[9]}`], { encoding: 'utf8' });
const original019 = execFileSync('git', ['-C', root, 'show', `HEAD:supabase/migrations/${files[18]}`], { encoding: 'utf8' });
const head = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const packagePath = join(root, 'node_modules/.cache/security-audit/node_modules/@electric-sql/pglite/package.json');
assert.equal(JSON.parse(readFileSync(packagePath, 'utf8')).version, '0.3.14');
const protectedTables = [
  'admin_users', 'colleges', 'college_reviews', 'videos', 'mentors', 'team_members',
  'team_roles', 'opportunities', 'general_applications', 'profiles', 'competition_teams',
  'competition_team_members', 'competition_team_join_requests', 'student_connections',
  'student_notifications', 'student_records', 'pulse_posts', 'profile_contacts',
  'homepage_animations', 'competition_registrations', 'user_preferences', 'events',
  'student_skills', 'student_experience', 'profile_moderation_flags',
].sort();
const forbiddenPrivileges = ['TRUNCATE', 'REFERENCES', 'TRIGGER'];
// An accidental future remote dependency must fail, not silently use the network.
globalThis.fetch = async () => { throw new Error('Network is forbidden in this audit'); };
const db = new PGlite();
const results = [];
const applied = [];
const shims = [];
const residuals = new Map();
const observations = new Map();
let phase = 'BOOTSTRAP';
let fatal = false;
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const u = (n) => `'${id(n)}'`;
const target = u(301), other = u(302), competition = u(201), college = u(101);
const phone = '+12025550101'; // Reserved fictional North American 555 number.
const query = (sql, params) => db.query(sql, params);
const scalar = async (sql, params) => {
  const { rows } = await query(sql, params);
  assert.equal(rows.length, 1, 'Expected exactly one scalar row (values omitted)');
  return Object.values(rows[0])[0];
};
const eq = async (sql, expected) => assert.equal(await scalar(sql), expected);
const count = async (sql, expected) => assert.equal((await query(sql)).rows.length, expected, 'Unexpected visible/changed row count');

async function as(role, user = null) {
  assert.ok(['anon', 'authenticated', 'service_role'].includes(role));
  await db.exec('reset role');
  await query("select set_config('request.jwt.claim.sub', $1, true)", [user === null ? '' : id(user)]);
  await db.exec(`set local role ${role}`);
  const state = (await query(`select current_user as role, auth.uid()::text as uid,
    r.rolsuper, r.rolbypassrls from pg_roles r where r.rolname = current_user`)).rows[0];
  assert.equal(state.role, role);
  assert.equal(state.uid, user === null ? null : id(user));
  assert.equal(state.rolsuper, false);
  assert.equal(state.rolbypassrls, role === 'service_role');
}
async function owner() { await db.exec('reset role'); }
async function error(sql, code, pattern) {
  await db.exec('savepoint expected_error');
  let caught;
  try { await db.exec(sql); } catch (e) { caught = e; }
  finally { await db.exec('rollback to savepoint expected_error; release savepoint expected_error'); }
  assert.ok(caught, `Expected SQLSTATE ${code}, but SQL succeeded`);
  assert.equal(caught.code, code, `Unexpected SQLSTATE: ${caught.message}`);
  assert.match(caught.message, pattern);
  return caught;
}
const denied = (sql, table) => error(sql, '42501', new RegExp(`permission denied for (table|function) ${table}|row-level security policy for table "${table}"`));
async function test(name, body, residual = null) {
  await db.exec('begin');
  try {
    await body();
    results.push({ phase, name, ok: true });
    console.log(`PASS [${phase}] ${name}`);
  } catch (e) {
    results.push({ phase, name, ok: false });
    if (residual) residuals.set(name, residual);
    console.error(`FAIL [${phase}] ${name}: ${e.code || e.name}: ${e.message}`);
  } finally {
    await db.exec('rollback; reset role');
    await eq('select current_user = session_user', true);
    await eq("select nullif(current_setting('request.jwt.claim.sub', true), '') is null", true);
  }
}
async function actorTest(name, user, body, residual = null) {
  await test(name, async () => { await as('authenticated', user); await body(); }, residual);
}
function shim(message) { shims.push(message); console.log(`SHIM ${shims.length}: ${message}`); }
async function apply(m, sql = m.sql) {
  try {
    await db.exec('begin'); await db.exec(sql); await db.exec('commit');
  } catch (e) {
    await db.exec('rollback; reset role');
    throw new Error(`Migration ${m.file} failed (${e.code}): ${e.message}`);
  }
  applied.push(m.file);
  console.log(`APPLY ${m.file} source-sha256=${m.hash}${sql === m.sql ? '' : ' TEST-ONLY SHIM'}`);
}
// Each proposal carries its own explicit transaction, so it is executed as
// written — the same way the Supabase SQL editor runs it.
async function applyProposal(file) {
  const sql = readFileSync(join(reviewDir, file), 'utf8');
  try {
    await db.exec(sql);
  } catch (e) {
    await db.exec('rollback; reset role');
    throw new Error(`Proposal ${file} failed (${e.code}): ${e.message}`);
  }
  applied.push(file);
  console.log(`PROPOSE ${file} source-sha256=${digest(sql)}`);
}

async function bootstrap() {
  console.log('LOCAL SYNTHETIC AUDIT ONLY; no live security or deployment claims.');
  console.log(`PGlite 0.3.14; HEAD=${head}; original010-sha256=${digest(original010)}; original019-sha256=${digest(original019)}`);
  console.log('FIXTURE ASSUMPTION: public-schema default ALL table/sequence/function grants to anon, authenticated, service_role, including TRUNCATE/REFERENCES/TRIGGER. No API CREATE on public. PostgreSQL PUBLIC function EXECUTE remains unless migrations revoke it. Defaults are set BEFORE creation, never re-granted after migration revocations. This is not a measurement of live Supabase ACLs.');
  shim('Supabase auth fixture: auth.users(id uuid primary key, email text); auth.uid() reads nullif(request.jwt.claim.sub, empty)::uuid. JWT validation/GoTrue/PostgREST are NOT emulated.');
  shim('Supabase role fixture: anon/authenticated NOLOGIN NOSUPERUSER NOBYPASSRLS; service_role NOLOGIN NOSUPERUSER BYPASSRLS. The local schema owner alone installs migrations/fixtures; tests SET LOCAL ROLE and JWT sub and roll back.');
  shim('Supabase storage fixture: buckets(id,name,public), objects(id,bucket_id,name,owner,metadata), foldername() drops the final slash-delimited component; storage tables have RLS. No Storage HTTP/object bytes are emulated.');
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
  console.log(`ENGINE ${await scalar('select version()')}`);
  await test('auth and storage fixture semantics; core UUID exists', async () => {
    await as('anon');
    await eq('select auth.uid() is null', true);
    await eq("select storage.foldername('one/two/file.png') = array['one','two']", true);
    await eq("select cardinality(storage.foldername('file.png'))", 0);
    await eq('select gen_random_uuid() is not null', true);
    await denied('select id from auth.users', 'users');
  });
}

async function seed() {
  // All fixture identities, text, relationships and contact data are invented.
  await db.exec(`begin;
    insert into auth.users(id,email) select
      ('00000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
      'audit-user-' || n || '@example.invalid' from generate_series(1,9) n;
    insert into public.colleges(id,name,slug) values (${college},'Synthetic Audit College','synthetic-audit');
    insert into public.profiles(user_id,full_name,college_id,course,year_of_study,graduation_year,gender,is_public)
      select id,'Synthetic student ' || right(id::text,1),${college},'Synthetic course',1,2099,'unspecified',id=${u(4)}
      from auth.users where id <> ${u(9)};
    insert into public.admin_users(user_id) values (${u(5)});
    insert into public.profile_contacts(user_id,phone_number) values (${u(1)},'${phone}');
    insert into public.opportunities(id,title,organization,category,description,status,team_formation_enabled,min_team_size,max_team_size,deadline_at)
      values (${competition},'Synthetic competition','Audit fixture','competition','Synthetic only','published',true,1,4,now()+interval '30 days'),
      (${u(202)},'Synthetic alternate competition','Audit fixture','competition','Synthetic only','published',true,1,4,now()+interval '30 days'),
      (${u(203)},'Synthetic draft','Audit fixture','competition','Synthetic only','draft',true,1,4,now()+interval '30 days');
    insert into public.competition_teams(id,competition_id,name,invite_code,captain_user_id)
      values (${target},${competition},'Synthetic target','AUDIT-TARGET',${u(1)}),
      (${other},${u(202)},'Synthetic other','AUDIT-OTHER',${u(2)});
    insert into public.competition_team_members(id,team_id,user_id,role)
      values (${u(401)},${target},${u(1)},'captain'),(${u(403)},${target},${u(3)},'member'),
      (${u(402)},${other},${u(2)},'captain');
    insert into public.competition_team_join_requests(id,team_id,user_id) values (${u(501)},${target},${u(6)});
    insert into public.student_connections(id,requester_user_id,recipient_user_id)
      values (${u(601)},${u(2)},${u(4)});
    insert into public.college_reviews(college_id,name,rating,review,status)
      values (${college},'Synthetic',4,'Synthetic approved review','approved'),(${college},'Synthetic',4,'Synthetic pending review','pending');
    insert into public.videos(title,category,active) values ('Synthetic active','campus_story',true),('Synthetic draft','campus_story',false);
    insert into public.mentors(name,active) values ('Synthetic active',true),('Synthetic draft',false);
    insert into public.team_members(name,active) values ('Synthetic active',true),('Synthetic draft',false);
    insert into public.team_roles(title,slug,is_open) values ('Synthetic active','synthetic-active',true),('Synthetic draft','synthetic-draft',false);
    insert into public.pulse_posts(title,status) values ('Synthetic published','published'),('Synthetic draft','draft');
    insert into public.events(title,organizer,status) values ('Synthetic published','Audit fixture','published'),('Synthetic draft','Audit fixture','draft');
    insert into public.homepage_animations(title,file_path,file_url,enabled,updated_by)
      values ('Synthetic active','audit-active.png','https://example.invalid/a.png',true,${u(5)}),
      ('Synthetic inactive','audit-inactive.png','https://example.invalid/b.png',false,${u(5)});
    insert into public.student_records(user_id,category,title,year,is_public)
      values (${u(1)},'project','Synthetic private owner',2099,true),(${u(4)},'project','Synthetic public',2099,true),(${u(4)},'project','Synthetic hidden record',2099,false);
    insert into public.student_skills(user_id,name,is_public)
      values (${u(1)},'Synthetic private owner',true),(${u(4)},'Synthetic public',true),(${u(4)},'Synthetic hidden skill',false);
    insert into public.student_experience(user_id,role,is_public)
      values (${u(1)},'Synthetic private owner',true),(${u(4)},'Synthetic public',true),(${u(4)},'Synthetic hidden experience',false);
    commit;
  `);
  console.log('FIXTURES loaded: 9 fake auth users, 8 profiles, 3 opportunities, 2 teams, 3 memberships. No table dumps.');
}
const roster = `select user_id from public.get_team_member_profiles(${target},array[${u(1)}]::uuid[])`;
const phoneVisible = `select count(*)::int from public.profile_contacts where user_id=${u(1)} and phone_number='${phone}'`;
const memberInsert = (user, role = 'member') => `insert into public.competition_team_members(team_id,user_id,role) values (${target},${u(user)},'${role}')`;
const connection = `public.student_connections where id=${u(601)}`;
const canonicalRoles = `select bool_and(m.role = case when m.user_id=t.captain_user_id then 'captain' else 'member' end)
  from public.competition_team_members m join public.competition_teams t on t.id=m.team_id where t.id=${target}`;
const teamFingerprint = () => scalar(`select md5(jsonb_build_array(t.captain_user_id,t.name,t.status,t.updated_at,
  (select jsonb_agg(to_jsonb(m) order by m.id) from public.competition_team_members m where m.team_id=t.id))::text)
  from public.competition_teams t where t.id=${target}`);
async function assertCaptain(user) {
  await eq(`select captain_user_id=${u(user)} from public.competition_teams where id=${target}`, true);
  await eq(canonicalRoles, true);
  await eq(`select count(*)::int from public.competition_team_members where team_id=${target}`, 2);
  await eq(`select count(*)::int from public.competition_team_members where team_id=${target} and role='captain' and user_id=${u(user)}`, 1);
}
async function generatorTests() {
  await actorTest('actual generator is volatile, catalog-scoped, and produces five-character codes', 8, async () => {
    await eq(`select provolatile='v' and not prosecdef and proconfig=array['search_path=pg_catalog']
      from pg_proc where oid='public.new_team_invite_code()'::regprocedure`, true);
    await eq(`with sample as materialized (select public.new_team_invite_code() code from generate_series(1,512))
      select bool_and(code ~ '^DSH-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$') and count(distinct code)>1 from sample`, true);
  });
}

async function before() {
  phase = 'PRE_REMEDIATION';
  await actorTest('private profile readable by outsider (vulnerability reproduced)', 2, () => count(`select user_id from public.profiles where user_id=${u(1)}`, 1));
  await actorTest('outsider self-insert bootstraps phone/roster/invite access (vulnerability reproduced)', 2, async () => {
    await db.exec(memberInsert(2));
    await eq(phoneVisible, 1);
    await count(roster, 1);
    await eq(`select public.get_team_invite_code(${target}) is not null`, true);
  });
  await actorTest('outsider UPDATE team_id bootstraps phone/roster access (vulnerability reproduced)', 2, async () => {
    await count(`update public.competition_team_members set team_id=${target} where id=${u(402)} returning id`, 1);
    await eq(phoneVisible, 1);
    await count(roster, 1);
  });
  await actorTest('default broad connection UPDATE defeats column grant (vulnerability reproduced)', 4, async () => {
    await count(`update public.student_connections set requester_user_id=${u(6)},status='accepted' where id=${u(601)} returning id`, 1);
  });
  await actorTest('default broad notification UPDATE permits actor forgery (vulnerability reproduced)', 4, async () => {
    await count(`update public.student_notifications set actor_user_id=${u(6)} where connection_id=${u(601)} returning id`, 1);
  });
  await actorTest('captain can rewrite hidden invite code (vulnerability reproduced)', 1, async () => {
    await count(`update public.competition_teams set invite_code='AUDIT-REWRITTEN' where id=${target} returning id`, 1);
  });
  await actorTest('captain can rewrite join-request identity (vulnerability reproduced)', 1, async () => {
    await count(`update public.competition_team_join_requests set user_id=${u(7)} where id=${u(501)} returning id`, 1);
  });
  await test('L-2 class: anon inherits EXECUTE on every definer RPC (privilege defect reproduced)', async () => {
    // Before 025 §2b these were callable with the publishable key and failed
    // only on their internal auth.uid() check. Reproduced as a privilege fact,
    // not as an exploit claim: no data was disclosed by them in this fixture.
    await as('anon');
    for (const sig of ['public.join_competition_team_by_code(text)', 'public.approve_team_join_request(uuid)',
      'public.register_for_competition_solo(uuid)', 'public.submit_competition_team_registration(uuid)'])
      await eq(`select has_function_privilege(current_user,'${sig}','EXECUTE')`, true, `${sig} reachable by anon pre-remediation`);
    await error("select public.join_competition_team_by_code('AUDIT-TARGET')", 'P0001', /must be signed in/i);
  });
  await actorTest('admin self-bootstrap INSERT already denied by RLS, not an escalation claim', 2, () => denied(`insert into public.admin_users(user_id) values (${u(2)})`, 'admin_users'));
  for (const role of ['anon', 'authenticated']) {
    await test(`${role} default TRUNCATE bypasses admin_users RLS (privilege defect reproduced)`, async () => {
      await as(role, role === 'anon' ? null : 2);
      await eq("select has_table_privilege(current_user,'public.admin_users','TRUNCATE')", true);
      await db.exec('truncate public.admin_users');
      await as('authenticated', 5);
      await eq('select public.is_admin()', false);
    });
  }
}

async function after() {
  await generatorTests();
  await test('024 generator and membership trigger functions keep explicit execution boundaries', async () => {
    for (const role of ['anon', 'authenticated']) {
      await as(role, role === 'anon' ? null : 2);
      await eq(`select has_function_privilege(current_user,'public.new_team_invite_code()','EXECUTE')`, role === 'authenticated');
      for (const name of ['derive_membership_role', 'guard_team_captain_identity'])
        await eq(`select has_function_privilege(current_user,'public.${name}()','EXECUTE')`, false);
      await eq(`select has_function_privilege(current_user,'public.reassign_membership_roles()','EXECUTE')`, role === 'authenticated');
    }
    await owner();
    // reassign is the only definer of the three: right after captain_user_id
    // changes, the old captain no longer satisfies 002's UPDATE policy on the new
    // captain's row, so an invoker-rights rewrite would update nothing silently.
    for (const [name, definer] of [['derive_membership_role', false], ['guard_team_captain_identity', false], ['reassign_membership_roles', true]]) {
      assert.equal(await scalar(`select prosecdef=$2 and proconfig=array['search_path=""'] from pg_proc where oid=$1::regprocedure`,
        [`public.${name}()`, definer]), true, `${name}: wrong security context or unpinned search_path`);
    }
  });
  await actorTest('outsider cannot read private profile', 2, () => count(`select user_id from public.profiles where user_id=${u(1)}`, 0));
  await actorTest('owner can read private profile', 1, () => count(`select user_id from public.profiles where user_id=${u(1)}`, 1));
  await actorTest('authenticated reader can read public profile', 2, () => count(`select user_id from public.profiles where user_id=${u(4)}`, 1));
  await actorTest('admin can read private profile', 5, () => count(`select user_id from public.profiles where user_id=${u(1)}`, 1));
  await test('anon public projection works, private profile and gender do not', async () => {
    await as('anon');
    await count(`select user_id,full_name,headline,instagram_handle from public.profiles where user_id=${u(4)}`, 1);
    await count(`select user_id from public.profiles where user_id=${u(1)}`, 0);
    await denied(`select gender from public.profiles where user_id=${u(4)}`, 'profiles');
  });
  await test('anon profile writes are RLS-denied, not privilege-denied (write privilege retained)', async () => {
    await as('anon');
    // Mechanism, part 1: anon's bootstrap INSERT/UPDATE/DELETE were never revoked.
    // 007 narrowed anon SELECT only; 029 revokes INSERT/UPDATE from authenticated
    // only; 025 leaves ordinary write grants to the policy layer. So all three remain.
    for (const priv of ['INSERT', 'UPDATE', 'DELETE'])
      await eq(`select has_table_privilege('anon','public.profiles','${priv}')`, true);
    // Mechanism, part 2: no INSERT/UPDATE/DELETE/ALL policy on profiles admits anon
    // (empty polroles = every role, 0 = PUBLIC, or anon's own oid). RLS is the boundary.
    await eq(`select count(*)::int from pg_policy p
        join pg_class c on c.oid=p.polrelid
        join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
       where c.relname='profiles' and p.polcmd in ('a','w','d','*')
         and (p.polroles='{}'::oid[] or 0=any(p.polroles)
              or (select oid from pg_roles where rolname='anon')=any(p.polroles))`, 0);
    // INSERT: the privilege is present, so the denial is specifically the row-level
    // policy (42501), not "permission denied for table". Values mirror the proven
    // owner insert below so no constraint can mask the RLS error.
    await error(`insert into public.profiles(user_id,full_name,college_id,course,year_of_study,graduation_year,gender)
       values (${u(90)},'Synthetic anon',${college},'Synthetic',1,2099,'unspecified')`,
      '42501', /row-level security policy for table "profiles"/);
    // UPDATE/DELETE: privilege present (no permission error) but RLS admits no row,
    // so zero rows change. A missing privilege would instead raise 42501 here.
    await count(`update public.profiles set headline='Synthetic anon' where user_id=${u(4)} returning user_id`, 0);
    await count(`delete from public.profiles where user_id=${u(4)} returning user_id`, 0);
  });
  await actorTest('owner edits private profile and toggles visibility', 1, async () => {
    await count(`update public.profiles set headline='Synthetic edited',is_public=true where user_id=${u(1)} returning user_id`, 1);
    await as('authenticated', 2);
    await count(`select user_id from public.profiles where user_id=${u(1)} and headline='Synthetic edited'`, 1);
  });
  for (const user of [2, 5]) await actorTest(`non-owner ${user === 5 ? 'admin' : 'outsider'} cannot edit profile`, user, () => count(`update public.profiles set headline='Synthetic forbidden' where user_id=${u(1)} returning user_id`, 0));
  await actorTest('new owner can create profile', 9, () => count(`insert into public.profiles(user_id,full_name,college_id,course,year_of_study,graduation_year,gender) values (${u(9)},'Synthetic new',${college},'Synthetic',1,2099,'unspecified') returning user_id`, 1));
  await actorTest('outsider cannot insert profile for another identity', 2, () => denied(`insert into public.profiles(user_id,full_name,college_id,course,year_of_study,graduation_year,gender) values (${u(9)},'Synthetic forged',${college},'Synthetic',1,2099,'unspecified')`, 'profiles'));
  for (const table of ['student_records', 'student_skills', 'student_experience']) {
    await test(`${table}: public/profile double gate and admin visibility`, async () => {
      await as('anon'); await count(`select id from public.${table}`, 1);
      await as('authenticated', 2); await count(`select id from public.${table}`, 1);
      await as('authenticated', 1); await count(`select id from public.${table} where user_id=${u(1)}`, 1);
      await as('authenticated', 5); await count(`select id from public.${table}`, 3);
    });
  }
  await actorTest('019 corrected unique expression index rejects case-only duplicate', 4, () => error(`insert into public.student_skills(user_id,name) values (${u(4)},'SYNTHETIC PUBLIC')`, '23505', /student_skills_one_per_name/));
  await actorTest('outsider cannot self-insert member', 2, () => denied(memberInsert(2), 'competition_team_members'));
  await actorTest('outsider cannot self-insert captain', 2, () => denied(memberInsert(2, 'captain'), 'competition_team_members'));
  await actorTest('captain cannot directly insert someone else', 1, () => denied(memberInsert(7), 'competition_team_members'));
  await actorTest('new captain creates team with generated code and initial self captain', 8, async () => {
    const { rows } = await query(`insert into public.competition_teams(competition_id,name,captain_user_id) values (${competition},'Synthetic new team',${u(8)}) returning id`);
    assert.equal(rows.length, 1);
    const team = rows[0].id;
    await query(`insert into public.competition_team_members(team_id,user_id,role) values ($1,${u(8)},'captain')`, [team]);
    assert.equal(await scalar('select public.get_team_invite_code($1) ~ $2', [team, '^DSH-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$']), true);
  });
  await actorTest('membership role label is derived, not caller-supplied', 8, async () => {
    // The canonical captain may write 'member'; the trigger stores the derived
    // 'captain', so the label cannot diverge from captain_user_id.
    await db.exec(`insert into public.competition_teams(id,competition_id,name,captain_user_id) values (${u(303)},${competition},'Synthetic new team',${u(8)})`);
    await count(`insert into public.competition_team_members(team_id,user_id,role) values (${u(303)},${u(8)},'member') returning id`, 1);
    await eq(`select role='captain' from public.competition_team_members where team_id=${u(303)} and user_id=${u(8)}`, true);
  });
  for (const [column, value] of [['team_id', target], ['user_id', u(7)], ['id', u(499)], ['joined_at', 'now()']]) {
    await actorTest(`membership UPDATE ${column} denied`, 2, () => denied(`update public.competition_team_members set ${column}=${value} where id=${u(402)}`, 'competition_team_members'));
  }
  await actorTest('captain transfer follows exact client order; trigger synchronizes before old-captain writes', 1, async () => {
    // dataAccess.transferCompetitionTeamCaptain: same actor for all three writes.
    await eq(`select captain_user_id=${u(1)} from public.competition_teams where id=${target}`, true);
    await count(`update public.competition_teams set captain_user_id=${u(3)} where id=${target} returning id`, 1);
    await assertCaptain(3);
    await count(`update public.competition_team_members set role='member' where team_id=${target} and user_id=${u(1)} returning id`, 1);
    await count(`update public.competition_team_members set role='captain' where team_id=${target} and user_id=${u(3)} returning id`, 0);
    await assertCaptain(3);
    await count(`update public.competition_teams set name='Synthetic forbidden' where id=${target} returning id`, 0);
    await error(`select public.approve_team_join_request(${u(501)})`, 'P0001', /Only the team captain/);
    await as('authenticated', 3);
    await count(`update public.competition_teams set name='Synthetic transferred' where id=${target} returning id`, 1);
  });
  await actorTest('nonmember captain transfer raises P0001; team and roles roll back', 1, async () => {
    const initial = await teamFingerprint();
    await error(`update public.competition_teams set captain_user_id=${u(7)} where id=${target}`, 'P0001', /new captain must already be a team member/);
    assert.equal(await teamFingerprint(), initial, 'Failed transfer changed team or memberships');
    await assertCaptain(1);
  });
  await test('expired-deadline captain transfer raises P0001; team and roles roll back', async () => {
    await db.exec(`update public.opportunities set deadline_at=now()-interval '1 day' where id=${competition}`);
    await as('authenticated', 1);
    const initial = await teamFingerprint();
    await error(`update public.competition_teams set captain_user_id=${u(3)} where id=${target}`, 'P0001', /deadline.*passed/i);
    assert.equal(await teamFingerprint(), initial, 'Expired transfer changed team or memberships');
    await assertCaptain(1);
  });
  await actorTest('captain cannot demote self and cannot promote a member before transfer', 1, async () => {
    await count(`update public.competition_team_members set role='member' where id=${u(401)} returning id`, 1);
    await count(`update public.competition_team_members set role='captain' where id=${u(403)} returning id`, 1);
    await eq(`select role='captain' from public.competition_team_members where id=${u(401)}`, true);
    await eq(`select role='member' from public.competition_team_members where id=${u(403)}`, true);
    await assertCaptain(1);
  });
  await actorTest('captain name/status update works', 1, () => count(`update public.competition_teams set name='Synthetic renamed',status='closed' where id=${target} returning id`, 1));
  await actorTest('outsider team update affects no rows', 2, () => count(`update public.competition_teams set name='Synthetic forbidden' where id=${target} returning id`, 0));
  for (const [column, value] of [['invite_code', "'AUDIT-FORGED'"], ['competition_id', u(202)], ['id', u(399)]]) {
    await actorTest(`team UPDATE ${column} denied`, 1, () => denied(`update public.competition_teams set ${column}=${value} where id=${target}`, 'competition_teams'));
  }
  await actorTest('captain join-request status update works', 1, () => count(`update public.competition_team_join_requests set status='rejected' where id=${u(501)} returning id`, 1));
  for (const [column, value] of [['user_id', u(7)], ['team_id', other], ['id', u(599)]]) {
    await actorTest(`join-request UPDATE ${column} denied`, 1, () => denied(`update public.competition_team_join_requests set ${column}=${value} where id=${u(501)}`, 'competition_team_join_requests'));
  }
  await actorTest('requester cannot self-approve request', 6, () => count(`update public.competition_team_join_requests set status='approved' where id=${u(501)} returning id`, 0));
  await actorTest('valid code join via actual 013 RPC keeps phone captain-only', 2, async () => {
    await eq(`select public.join_competition_team_by_code(' audit-target ')::text`, id(301));
    await count(`select id from public.competition_team_members where team_id=${target} and user_id=${u(2)} and role='member'`, 1);
    await eq(phoneVisible, 0); await count(roster, 1);
  });
  await actorTest('invalid code fails in actual RPC', 7, () => error("select public.join_competition_team_by_code('AUDIT-INVALID')", 'P0001', /Team code not found/));
  await actorTest('request creation and captain approval via actual 013 RPC', 7, async () => {
    const request = await scalar(`insert into public.competition_team_join_requests(team_id,user_id) values (${target},${u(7)}) returning id`);
    await as('authenticated', 1);
    assert.equal(await scalar('select public.approve_team_join_request($1)', [request]), true);
    await as('authenticated', 7);
    await count(`select id from public.competition_team_members where team_id=${target} and user_id=${u(7)} and role='member'`, 1);
    await eq(`select status from public.competition_team_join_requests where id='${request}'`, 'approved');
    await eq(phoneVisible, 0); await count(roster, 1);
  });
  await actorTest('non-captain approval RPC denied', 2, () => error(`select public.approve_team_join_request(${u(501)})`, 'P0001', /Only the team captain/));
  await actorTest('code RPC preserves one-team-per-competition guard', 3, async () => {
    await owner();
    await db.exec(`insert into public.competition_teams(id,competition_id,name,invite_code,captain_user_id) values (${u(303)},${competition},'Synthetic same competition','AUDIT-SAME',${u(8)})`);
    await as('authenticated', 3);
    await error("select public.join_competition_team_by_code('AUDIT-SAME')", 'P0001', /already on a team/);
  });
  for (const [label, update, pattern] of [
    ['capacity', 'max_team_size=2', /This team is full/],
    ['deadline', "deadline_at=now()-interval '1 day'", /deadline.*passed/i],
  ]) {
    await test(`013 invite and approval RPCs retain ${label} guard`, async () => {
      await db.exec(`update public.opportunities set ${update} where id=${competition}`);
      await as('authenticated', 7);
      await error("select public.join_competition_team_by_code('AUDIT-TARGET')", 'P0001', pattern);
      await as('authenticated', 1);
      await error(`select public.approve_team_join_request(${u(501)})`, 'P0001', pattern);
    });
  }
  await actorTest('outsider cannot read phone, guarded roster, or invite', 2, async () => {
    await eq(phoneVisible, 0); await count(roster, 0);
    await eq(`select public.get_team_invite_code(${target}) is null`, true);
  });
  await actorTest('member reads roster but not phone; captain reads member phone', 3, async () => {
    await count(`insert into public.profile_contacts(user_id,phone_number) values (${u(3)},'${phone}') returning user_id`, 1);
    await eq(phoneVisible, 0); await count(roster, 1);
    await eq(`select count(*)::int from public.get_team_member_profiles(${target},array[${u(1)},${u(4)}]::uuid[]) where phone_number='${phone}'`, 0);
    await count(`select user_id from public.get_team_member_profiles(${target},array[${u(4)}]::uuid[])`, 0);
    await count(`select user_id from public.profiles where user_id=${u(1)}`, 0);
    await as('authenticated', 1);
    await eq(`select count(*)::int from public.profile_contacts where user_id=${u(3)} and phone_number='${phone}'`, 1);
    await eq(`select count(*)::int from public.get_team_member_profiles(${target},array[${u(3)}]::uuid[]) where phone_number='${phone}'`, 1);
  });
  await test('anon cannot query phone or guarded roster RPC', async () => {
    await as('anon');
    await denied('select user_id from public.profile_contacts', 'profile_contacts');
    await denied(roster, 'get_team_member_profiles');
  });
  await actorTest('student creates connection request; actual trigger notifies recipient', 7, async () => {
    const request = await scalar(`insert into public.student_connections(requester_user_id,recipient_user_id) values (${u(7)},${u(8)}) returning id`);
    await as('authenticated', 8);
    assert.equal(await scalar('select count(*)::int from public.student_notifications where connection_id=$1 and type=$2', [request, 'connection_request']), 1);
  });
  await actorTest('recipient accepts; real triggers notify requester', 4, async () => {
    await count(`update public.student_connections set status='accepted' where id=${u(601)} returning id`, 1);
    await as('authenticated', 2);
    await count(`select id from public.student_notifications where connection_id=${u(601)} and type='connection_accepted'`, 1);
  });
  await actorTest('connected private peer profile is invisible; relationship stays stored and removable', 4, async () => {
    await count(`update public.student_connections set status='accepted' where id=${u(601)} returning id`, 1);
    await count(`update public.profiles set is_public=false where user_id=${u(4)} returning user_id`, 1);
    await as('authenticated', 2);
    await count(`select user_id,full_name from public.profiles where user_id=${u(4)}`, 0);
    await count(`select id from ${connection} and status='accepted'`, 1);
    // Frontend peer:null rendering is outside this SQL harness.
    await owner();
    await count(`select user_id from public.profiles where user_id=${u(4)} and not is_public`, 1);
    await count(`select id from ${connection} and status='accepted'`, 1);
    await as('authenticated', 2);
    await count(`delete from ${connection} returning id`, 1);
    await owner(); await count(`select id from ${connection}`, 0);
  });
  await actorTest('requester cancels pending connection; notification cascades', 2, async () => {
    await count(`delete from ${connection} returning id`, 1);
    await as('authenticated', 4);
    await count(`select id from public.student_notifications where connection_id=${u(601)}`, 0);
  });
  await actorTest('requester cannot accept their own connection request', 2, () => count(`update public.student_connections set status='accepted' where id=${u(601)} returning id`, 0));
  await actorTest('unrelated student cannot read or delete connection', 7, async () => {
    await count(`select id from ${connection}`, 0); await count(`delete from ${connection} returning id`, 0);
  });
  for (const column of ['requester_user_id', 'recipient_user_id']) await actorTest(`connection ${column} rewrite denied`, 4, () => denied(`update public.student_connections set ${column}=${u(7)},status='accepted' where id=${u(601)}`, 'student_connections'));
  await actorTest('accepted connection cannot be reopened', 4, async () => {
    await db.exec(`update public.student_connections set status='accepted' where id=${u(601)}`);
    await error(`update public.student_connections set status='pending' where id=${u(601)}`, 'P0001', /only move from pending to accepted/);
  });
  await actorTest('notification owner reads and marks read; cannot unread', 4, async () => {
    await count(`select id from public.student_notifications where connection_id=${u(601)}`, 1);
    await count(`update public.student_notifications set read_at=now() where connection_id=${u(601)} returning id`, 1);
    await error(`update public.student_notifications set read_at=null where connection_id=${u(601)}`, 'P0001', /only be marked read once/);
  });
  await actorTest('notification outsider cannot read or mark another inbox', 7, async () => {
    await count(`select id from public.student_notifications where connection_id=${u(601)}`, 0);
    await count(`update public.student_notifications set read_at=now() where connection_id=${u(601)} returning id`, 0);
  });
  for (const [column, value] of [['actor_user_id', u(7)], ['user_id', u(7)], ['type', "'connection_accepted'"], ['connection_id', 'null'], ['created_at', 'now()']]) {
    await actorTest(`notification ${column} rewrite denied`, 4, () => denied(`update public.student_notifications set ${column}=${value} where connection_id=${u(601)}`, 'student_notifications'));
  }
  await actorTest('notification direct INSERT denied', 4, () => denied(`insert into public.student_notifications(user_id,type) values (${u(4)},'connection_request')`, 'student_notifications'));
  await actorTest('notification direct DELETE denied', 4, () => denied(`delete from public.student_notifications where connection_id=${u(601)}`, 'student_notifications'));
  for (const role of ['anon', 'authenticated']) {
    await test(`${role} admin_users bootstrap/write/TRUNCATE privileges removed`, async () => {
      await as(role, role === 'anon' ? null : 2);
      for (const privilege of ['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) await eq(`select has_table_privilege(current_user,'public.admin_users','${privilege}')`, false);
      await denied('truncate public.admin_users', 'admin_users');
      await denied(`insert into public.admin_users(user_id) values (${u(2)})`, 'admin_users');
      await denied(`update public.admin_users set user_id=${u(2)}`, 'admin_users');
      await denied(`delete from public.admin_users`, 'admin_users');
    });
  }
  await test('is_admin remains executable to anon; correct actor decisions', async () => {
    await as('anon');
    await eq("select has_function_privilege(current_user,'public.is_admin()','EXECUTE')", true);
    await eq('select public.is_admin()', false);
    await as('authenticated', 2); await eq('select public.is_admin()', false);
    await as('authenticated', 5); await eq('select public.is_admin()', true);
    await count('select user_id from public.admin_users', 1);
    await denied(`insert into public.admin_users(user_id) values (${u(7)})`, 'admin_users');
  });
  await test('service_role bootstrap remains available only to trusted fixture role', async () => {
    await as('service_role');
    await db.exec(`insert into public.admin_users(user_id) values (${u(7)})`);
    await as('authenticated', 7); await eq('select public.is_admin()', true);
  });
  await test('anon public listings and is_admin policy dependencies still work', async () => {
    await as('anon');
    for (const table of ['colleges','college_reviews','videos','mentors','team_members','team_roles','pulse_posts','events','homepage_animations']) {
      assert.equal(await scalar(`select count(*)::int from public.${table}`), 1, `${table}: wrong public listing count`);
    }
    await eq('select count(*)::int from public.opportunities', 2);
    await count('select id,name,status,captain_user_id from public.competition_teams', 2);
    await denied(`select invite_code from public.competition_teams`, 'competition_teams');
    await eq(`select public.competition_registered_team_count(${competition})`, 0);
    await count(`select id from public.competition_discoverable_teams(${competition})`, 1);
    await eq(`select public.competition_deadline_at(${competition}) > now()`, true);
    await eq(`select public.get_javlin_level(${u(1)})`, 0);
    await count(`select student_id from public.get_javlin_levels(array[${u(1)}]::uuid[])`, 0);
  });
  await actorTest('admin public-content management remains functional', 5, async () => {
    await eq('select count(*)::int from public.opportunities', 3);
    await count(`update public.events set title='Synthetic edited' where status='draft' returning id`, 1);
  });
  await test('definer RPCs are unreachable by anon; the public lookups still are', async () => {
    await as('anon');
    // 025 §2b generalises L-2. Before it, the bootstrap had handed anon EXECUTE
    // on every SECURITY DEFINER function, so these were callable with the public
    // key and failed only because each one checks auth.uid() internally — a code
    // review conclusion, not a privilege boundary.
    for (const sig of ['public.join_competition_team_by_code(text)', 'public.approve_team_join_request(uuid)',
      'public.register_for_competition_solo(uuid)', 'public.submit_competition_team_registration(uuid)',
      'public.withdraw_competition_registration(uuid)', 'public.my_competition_registration(uuid)',
      'public.competition_registration_records(uuid)', 'public.get_team_invite_code(uuid)',
      'public.get_own_profile()', 'public.get_connected_peer_names()'])
      await eq(`select has_function_privilege(current_user,'${sig}','EXECUTE')`, false, `${sig} must not be executable by anon`);
    await denied("select public.join_competition_team_by_code('AUDIT-TARGET')", 'join_competition_team_by_code');
    await denied(`select public.approve_team_join_request(${u(501)})`, 'approve_team_join_request');
    // The narrow allowlist, each entry needed by an anonymous page or an anon
    // row policy: is_admin by 001:229/001:242, the rest by public listings.
    await eq("select has_function_privilege(current_user,'public.is_admin()','EXECUTE')", true);
    await eq("select has_function_privilege(current_user,'public.competition_discoverable_teams(uuid)','EXECUTE')", true);
    await eq("select has_function_privilege(current_user,'public.get_javlin_levels(uuid[])','EXECUTE')", true);
    await count(`select student_id from public.get_javlin_levels(array[${u(1)}]::uuid[])`, 0);
  });
  await actorTest('storage avatar owner path allowed; foreign path denied', 2, async () => {
    await db.exec(`insert into storage.objects(bucket_id,name) values ('student-avatars','${id(2)}/synthetic.png')`);
    await denied(`insert into storage.objects(bucket_id,name) values ('student-avatars','${id(1)}/synthetic.png')`, 'objects');
    await as('anon'); await count("select id from storage.objects where bucket_id='student-avatars'", 1);
  });
  await test('OBSERVATION: 002 public roster IDs remain available, without private names or phones', async () => {
    for (const role of ['anon', 'authenticated']) {
      await as(role, role === 'anon' ? null : 2);
      await count(`select user_id from public.competition_team_members where team_id=${target}`, 2);
      await count(`select captain_user_id from public.competition_teams where id=${target}`, 1);
      await count(`select p.full_name from public.competition_team_members m join public.profiles p on p.user_id=m.user_id where m.team_id=${target}`, 0);
      if (role === 'anon') {
        await denied(roster, 'get_team_member_profiles');
        await denied('select phone_number from public.profile_contacts', 'profile_contacts');
      } else {
        await count(roster, 0);
        await eq(phoneVisible, 0);
      }
    }
    observations.set('Public roster identity privacy NOT resolved', '002 intentionally exposes roster IDs/counts and captain IDs. 023-027 keep this behavior; private names/phones remain gated. Public IDs can still be correlated with public profiles.');
  });
  await actorTest('member role spoof cannot produce a captain label', 3, async () => {
    const initial = await teamFingerprint();
    await count(`update public.competition_team_members set role='captain' where id=${u(403)} returning id`, 1);
    await eq(`select role='member' from public.competition_team_members where id=${u(403)}`, true);
    assert.equal(await teamFingerprint(), initial, 'Role spoof changed team or memberships');
    await assertCaptain(1);
    await count(`update public.competition_teams set name='Synthetic forbidden' where id=${target} returning id`, 0);
    await error(`select public.approve_team_join_request(${u(501)})`, 'P0001', /Only the team captain/);
  }, 'A member must never end up stored as captain; the derived label must match captain_user_id.');
  for (const role of ['anon', 'authenticated']) {
    await test(`${role} cannot TRUNCATE membership roster`, async () => {
      await as(role, role === 'anon' ? null : 2);
      await denied('truncate public.competition_team_members', 'competition_team_members');
      await count(`select id from public.competition_team_members`, 3);
    }, 'A successful API TRUNCATE bypasses RLS and row triggers.');
    for (const table of protectedTables) {
      await test(`${role} ${table}: TRUNCATE/REFERENCES/TRIGGER all denied`, async () => {
        await as(role, role === 'anon' ? null : 2);
        const granted = [];
        for (const privilege of forbiddenPrivileges) {
          if (await scalar('select has_table_privilege(current_user,$1,$2)', [`public.${table}`, privilege])) granted.push(privilege);
        }
        assert.equal(granted.length, 0, `${table}: unexpectedly granted ${granted.join(', ')}`);
        await eq(`select count(*)::int from pg_class c cross join lateral aclexplode(c.relacl) a
          where c.oid='public.${table}'::regclass and a.grantee=0 and a.privilege_type in ('TRUNCATE','REFERENCES','TRIGGER')`, 0);
      });
    }
  }
  // Independent integrity checks remain failures if the actual SQL allows them.
  await actorTest('canonical captain role survives delete and code rejoin', 1, async () => {
    await count(`delete from public.competition_team_members where team_id=${target} and user_id=${u(1)} returning id`, 1);
    await eq(`select public.join_competition_team_by_code('AUDIT-TARGET')::text`, id(301));
    await eq(`select captain_user_id=${u(1)} from public.competition_teams where id=${target}`, true);
    await eq(canonicalRoles, true);
  });
  await actorTest('skill owner cannot self-attest verified source', 4, async () => {
    await denied(`insert into public.student_skills(user_id,name,source) values (${u(4)},'Synthetic self-attestation','verified')`, 'student_skills');
    await denied(`update public.student_skills set source='verified' where user_id=${u(4)} and name='Synthetic public'`, 'student_skills');
    await count(`insert into public.student_skills(user_id,name) values (${u(4)},'Synthetic self skill') returning id`, 1);
  });
}

async function aclSnapshot() {
  const tables = (await query(`select c.relname,c.relacl::text,c.relrowsecurity,c.relforcerowsecurity,
    (select jsonb_agg(jsonb_build_array(a.attname,a.attacl::text) order by a.attnum)
      from pg_attribute a where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped) as columns,
    (select jsonb_agg(jsonb_build_array(p.polname,p.polcmd,p.polroles::text,pg_get_expr(p.polqual,p.polrelid),pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname)
      from pg_policy p where p.polrelid=c.oid) as policies
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=any($1::text[]) order by c.relname`, [protectedTables])).rows;
  const functions = (await query(`select p.oid::regprocedure::text,p.proowner,p.proacl::text,pg_get_functiondef(p.oid)
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by p.oid::regprocedure::text`)).rows;
  const triggers = (await query(`select c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid)
    from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and not t.tgisinternal order by c.relname,t.tgname`)).rows;
  return digest(JSON.stringify({ tables, functions, triggers }));
}
async function dataSnapshot() {
  const counts = {}, fingerprints = {};
  for (const table of protectedTables) {
    const { rows: [row] } = await query(`select count(*)::int as count,
      md5(coalesce(string_agg(to_jsonb(r)::text, E'\\n' order by to_jsonb(r)::text),'')) as fingerprint from public.${table} r`);
    counts[table] = row.count;
    fingerprints[table] = row.fingerprint;
  }
  return { counts, fingerprint: digest(JSON.stringify(fingerprints)) };
}
async function assertDataUnchanged(baseline) {
  const current = await dataSnapshot();
  assert.deepEqual(current.counts, baseline.counts, 'Fixture row counts changed');
  assert.equal(current.fingerprint, baseline.fingerprint, 'Fixture data changed (includes invite codes; no rotation expected)');
}

try {
  await bootstrap();
  phase = 'MIGRATION_REPRO';
  for (const m of migrations.slice(0, 21)) {
    let sql = m.sql;
    if (m.file.startsWith('001')) {
      const extension = /create extension if not exists "pgcrypto";/g;
      assert.equal([...sql.matchAll(extension)].length, 1);
      sql = sql.replace(extension, '-- TEST ONLY: pgcrypto extension setup omitted; core gen_random_uuid exists.');
      shim('001: omit only CREATE EXTENSION pgcrypto; PGlite core gen_random_uuid() retained and tested. No crypto function replacement.');
    }
    if (m.file.startsWith('010')) {
      await test('original HEAD 010 fails uuid::bytea independently', async () => {
        assert.match(original010, /gen_random_uuid\(\)::bytea/);
        await error(original010, '42846', /cannot cast type uuid to bytea/);
        await eq("select to_regprocedure('public.new_team_invite_code()') is null", true);
      });
      await test('current 010 uses UUID bytes and all 32 alphabet characters without a shim', async () => {
        assert.equal(sql, m.sql);
        const alphabet = /'([A-Z2-9]+)'/.exec(sql)?.[1];
        assert.ok(alphabet, 'Cannot locate actual generator alphabet');
        assert.equal(alphabet.length, 32);
        assert.match(sql, /uuid_send\(gen_random_uuid\(\)\)/);
        assert.match(sql, /% 32/);
        assert.match(sql, /set search_path = pg_catalog/);
        assert.equal(await scalar('select substr($1,32,1)', [alphabet]), '9');
        assert.equal(await scalar('select min(length(substr($1,(n % 32)+1,1))) from generate_series(0,255) n', [alphabet]), 1);
        await eq('select min(hits)=8 and max(hits)=8 from (select n%32, count(*) hits from generate_series(0,255) n group by n%32) s', true);
      });
    }
    if (m.file.startsWith('019')) {
      await test('original HEAD 019 unique expression syntax fails in separate transaction', async () => {
        await error(original019, '42601', /syntax error at or near "\("/);
        await eq("select to_regclass('public.student_skills') is null", true);
      });
      assert.match(sql, /create unique index if not exists student_skills_one_per_name/);
    }
    await apply(m, sql);
  }
  await seed();
  await before();
  for (const file of PROPOSALS) await applyProposal(file);
  phase = 'AFTER_REMEDIATION';
  await after();
  const snapshot = await aclSnapshot();
  for (const file of PROPOSALS) await applyProposal(file);
  phase = 'RERUN_REMEDIATION';
  await test('023-027 and 029 rerun converges identical effective ACL/policy definitions', async () => assert.equal(await aclSnapshot(), snapshot));
  await after();
  phase = 'SOURCE_INTEGRITY';
  await test('all migration source hashes unchanged during audit', async () => {
    for (const m of migrations) assert.equal(digest(readFileSync(join(migrationDir, m.file), 'utf8')), m.hash, `${m.file} changed externally during audit; rerun required`);
    for (const file of PROPOSALS) {
      const sql = readFileSync(join(reviewDir, file), 'utf8');
      assert.ok(/-- PROPOSED . NOT APPLIED/.test(sql), `${file} must keep its PROPOSED header until an approved window`);
      assert.ok(!/^alter table/m.test(sql), `${file} must not rewrite committed table shape`);
    }
  });
} catch (e) {
  fatal = true;
  console.error(`FATAL [${phase}]: ${e.code || e.name}: ${e.message}`);
} finally {
  await db.close();
  for (const p of [...new Set(results.map((r) => r.phase))]) {
    const subset = results.filter((r) => r.phase === p);
    console.log(`RESULT ${p}: ${subset.filter((r) => r.ok).length} passed, ${subset.filter((r) => !r.ok).length} failed`);
  }
  for (const [name, explanation] of residuals) console.error(`OUTSTANDING ${name}: ${explanation}`);
  console.log(`TOTAL: ${results.filter((r) => r.ok).length} passed, ${results.filter((r) => !r.ok).length} failed; ${residuals.size} distinct outstanding review findings; ${applied.length} file applications (${new Set(applied).size}/${migrations.length + PROPOSALS.length} distinct); ${shims.length} reported shims; fatal=${fatal}.`);
  console.log('LIMITS: single-connection PGlite, no concurrent race coverage, no JWT gateway/Storage API validation, no live ACL/policy drift or pre-existing malicious membership cleanup assessment. Only explicit synthetic fixtures were tested.');
  process.exitCode = fatal || results.some((r) => !r.ok) ? 1 : 0;
}
