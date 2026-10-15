import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureDir = resolve(repoRoot, 'tests/fixtures/credential-rotation');
const host = process.env.PGHOST ?? '/var/run/postgresql';
const isLocalHost = host.startsWith('/') || ['localhost', '127.0.0.1', '::1'].includes(host);

if (!isLocalHost) {
  console.error('[rotation-rehearsal] REFUSED: only a local socket or loopback PGHOST is allowed.');
  process.exit(2);
}

const dbEnv = {
  ...process.env,
  PGHOST: host,
  PGUSER: process.env.PGUSER ?? 'postgres',
  PGDATABASE: process.env.PGDATABASE ?? 'postgres',
};

function psql(args) {
  return spawnSync('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', ...args], {
    env: dbEnv,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
}

function runFile(file, label) {
  const result = psql(['-f', file]);
  if (result.error || result.status === null) {
    throw new Error(label + ': psql could not be started.');
  }
  if (result.status !== 0) {
    throw new Error(label + ': SQL phase failed (exit ' + result.status + '); database output suppressed.');
  }
}

function expectFailure(file, expectedMarker, label) {
  const result = psql(['-f', file]);
  if (result.error || result.status === null) {
    throw new Error(label + ': psql could not be started.');
  }
  const combined = String(result.stdout ?? '') + '\n' + String(result.stderr ?? '');
  if (result.status === 0 || !combined.includes(expectedMarker)) {
    throw new Error(label + ': expected guard failure was not observed; database output suppressed.');
  }
}

function queryBoolean(sql, label) {
  const result = psql(['-A', '-t', '-c', sql]);
  if (result.error || result.status !== 0) {
    throw new Error(label + ': assertion query failed; database output suppressed.');
  }
  return String(result.stdout ?? '').trim() === 't';
}

function assertBooleanFile(file, label) {
  const result = psql(['-A', '-t', '-f', file]);
  if (result.error || result.status !== 0) {
    throw new Error(label + ': assertion query failed; database output suppressed.');
  }
  if (String(result.stdout ?? '').trim() !== 't') {
    throw new Error(label + ': assertion did not hold; database output suppressed.');
  }
}

try {
  const version = psql(['--version']);
  if (version.error || version.status !== 0) {
    throw new Error('psql is required; database output suppressed.');
  }

  const emptyDatabase = queryBoolean(
    "SELECT (to_regclass('public.master_tenants') IS NULL " +
      "AND to_regclass('public.clinic_users') IS NULL " +
      "AND to_regclass('public.pin_sessions') IS NULL " +
      "AND to_regclass('public.rotation_rehearsal_state') IS NULL)::text;",
    'empty-database safety check',
  );
  if (!emptyDatabase) {
    throw new Error('REFUSED: rehearsal requires an empty disposable database.');
  }
  console.log('[rotation-rehearsal] PASS: local target is empty before fixture setup.');

  runFile(resolve(fixtureDir, 'schema-fixture.sql'), 'minimal schema fixture');
  console.log('[rotation-rehearsal] PASS: minimal schema and pgcrypto bcrypt generation/verification fixture.');

  expectFailure(
    resolve(fixtureDir, 'reject-mixed-hash-plaintext.sql'),
    'FIX-002 is not verified',
    'mixed hash/plaintext contract rejection',
  );
  assertBooleanFile(resolve(fixtureDir, 'assert-original-state.sql'), 'mixed-contract rollback');
  console.log('[rotation-rehearsal] PASS: overload with both hash reference and plaintext comparison is rejected; state unchanged.');

  expectFailure(
    resolve(fixtureDir, 'reject-incomplete-stage.sql'),
    'Staged user count does not match',
    'incomplete staging rejection',
  );
  assertBooleanFile(resolve(fixtureDir, 'assert-original-state.sql'), 'incomplete-stage rollback');
  console.log('[rotation-rehearsal] PASS: incomplete user stage is rejected; state unchanged.');

  expectFailure(
    resolve(fixtureDir, 'reject-postflight-mismatch.sql'),
    'Postflight failed: one or more staged users do not match',
    'postflight mismatch rollback',
  );
  assertBooleanFile(resolve(fixtureDir, 'assert-original-state.sql'), 'postflight mismatch rollback');
  console.log('[rotation-rehearsal] PASS: postflight mismatch rolls back PIN, license and session updates.');

  runFile(resolve(fixtureDir, 'apply-twice.sql'), 'idempotent double apply');
  assertBooleanFile(resolve(fixtureDir, 'assert-final-state.sql'), 'final rotated fixture state');
  console.log('[rotation-rehearsal] PASS: apply executed twice; second-run snapshots unchanged; active tenant sessions soft-revoked.');
  console.log('[rotation-rehearsal] PASS: all assertions completed; no credential values were printed.');
} catch (error) {
  console.error('[rotation-rehearsal] FAILED: ' + (error instanceof Error ? error.message : 'unknown failure'));
  process.exitCode = 1;
}
