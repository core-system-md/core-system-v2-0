import { randomInt } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

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

function createRealBcrypt2bHash() {
  // Runtime-only synthetic PIN. Neither the PIN nor returned hash is logged.
  const syntheticPin = String(randomInt(0, 100_000_000)).padStart(8, '0');
  const python = [
    'import bcrypt, sys',
    'pin = sys.stdin.buffer.read()',
    'print(bcrypt.hashpw(pin, bcrypt.gensalt(rounds=12, prefix=b"2b")).decode("ascii"))',
  ].join('\n');
  const result = spawnSync('python3', ['-c', python], {
    input: syntheticPin,
    encoding: 'utf8',
    maxBuffer: 4096,
  });
  if (result.error || result.status !== 0) {
    throw new Error('Python bcrypt is required for the $2b$ rejection phase; hash output suppressed.');
  }
  const hash = String(result.stdout ?? '').trim();
  if (!/^\$2b\$12\$[./A-Za-z0-9]{53}$/.test(hash)) {
    throw new Error('The runtime bcrypt producer did not return a valid $2b$ hash; output suppressed.');
  }
  return { syntheticPin, hash };
}

let tempDir;
try {
  const version = psql(['--version']);
  if (version.error || version.status !== 0) {
    throw new Error('psql is required; database output suppressed.');
  }

  const serverVersion = psql(['-A', '-t', '-c', 'SHOW server_version_num;']);
  if (serverVersion.error || serverVersion.status !== 0) {
    throw new Error('Could not read PostgreSQL server version; database output suppressed.');
  }
  const versionNum = Number(String(serverVersion.stdout ?? '').trim());
  const major = Math.floor(versionNum / 10_000);
  const expectedMajor = process.env.EXPECTED_PG_MAJOR;
  if (!Number.isInteger(major) || (expectedMajor && major !== Number(expectedMajor))) {
    throw new Error('PostgreSQL major-version assertion failed; database output suppressed.');
  }
  console.log('[rotation-rehearsal] INFO: PostgreSQL major version ' + major + '.');

  const emptyDatabase = queryBoolean(
    "SELECT (to_regclass('public.master_tenants') IS NULL " +
      "AND to_regclass('public.clinic_users') IS NULL " +
      "AND to_regclass('public.pin_sessions') IS NULL " +
      "AND to_regclass('public.rotation_rehearsal_state') IS NULL);",
    'empty-database safety check',
  );
  if (!emptyDatabase) {
    throw new Error('REFUSED: rehearsal requires an empty disposable database.');
  }
  console.log('[rotation-rehearsal] PASS: local target is empty before fixture setup.');

  runFile(resolve(fixtureDir, 'schema-fixture.sql'), 'minimal schema fixture');
  console.log('[rotation-rehearsal] PASS: minimal schema and pgcrypto bcrypt generation/verification fixture.');

  runFile(resolve(fixtureDir, 'login-behavior.sql'), 'correct/wrong PIN behavioral check');
  console.log('[rotation-rehearsal] PASS: pgcrypto $2a$ hash accepts the correct synthetic PIN and rejects the wrong PIN in both login stubs.');

  // Generate a true $2b$ hash at runtime. Only the hash is inserted into a private
  // temporary SQL file; neither it nor its synthetic PIN is printed.
  tempDir = await mkdtemp(resolve(tmpdir(), 'mdcore-rotation-rehearsal-'));
  const { syntheticPin, hash: runtimeHash } = createRealBcrypt2bHash();
  const normalizedHash = '$2a  let rejectBcrypt2bSql = await readFile(resolve(fixtureDir, 'reject-bcrypt-2b.sql'), 'utf8');
  rejectBcrypt2bSql = rejectBcrypt2bSql.replaceAll(
    '\\ir ./contracts.sql',
    '\\ir ' + resolve(fixtureDir, 'contracts.sql'),
  );
  rejectBcrypt2bSql = rejectBcrypt2bSql.replaceAll(
    '\\ir ../../../supabase/runbooks/prepare_credential_rotation.sql',
    '\\ir ' + resolve(repoRoot, 'supabase/runbooks/prepare_credential_rotation.sql'),
  );
  rejectBcrypt2bSql = rejectBcrypt2bSql.replaceAll(
    '\\ir ../../../supabase/runbooks/apply_credential_rotation.sql',
    '\\ir ' + resolve(repoRoot, 'supabase/runbooks/apply_credential_rotation.sql'),
  );
  if (!rejectBcrypt2bSql.includes('__RUNTIME_BCRYPT_2B_HASH__')) {
    throw new Error('The $2b$ test template placeholder is missing.');
  }
  rejectBcrypt2bSql = rejectBcrypt2bSql.split('__RUNTIME_BCRYPT_2B_HASH__').join(runtimeHash);
  const bcrypt2bFile = resolve(tempDir, 'reject-bcrypt-2b.sql');
  await writeFile(bcrypt2bFile, rejectBcrypt2bSql, { encoding: 'utf8', mode: 0o600 });
  expectFailure(
    bcrypt2bFile,
    'hash is not an accepted $2a$ bcrypt hash',
    'real $2b$ staged-hash rejection',
  );
  assertBooleanFile(resolve(fixtureDir, 'assert-original-state.sql'), '$2b$ rejection rollback');
  console.log('[rotation-rehearsal] PASS: runtime-generated $2b$ hash rejected at preflight; tenant, staff and session state unchanged.');

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
} finally {
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
}
 + runtimeHash.slice(4);
  let normalizedProbeSql = await readFile(resolve(fixtureDir, 'bcrypt-normalized-login.sql'), 'utf8');
  normalizedProbeSql = normalizedProbeSql
    .split('__RUNTIME_SYNTHETIC_PIN__').join(syntheticPin)
    .split('__RUNTIME_BCRYPT_2A_HASH__').join(normalizedHash);
  const normalizedProbeFile = resolve(tempDir, 'bcrypt-normalized-login.sql');
  await writeFile(normalizedProbeFile, normalizedProbeSql, { encoding: 'utf8', mode: 0o600 });
  runFile(normalizedProbeFile, 'normalized external bcrypt behavioural probe');
  console.log('[rotation-rehearsal] PASS: runtime-generated $2b$ hash normalized to $2a$ verifies the correct PIN and rejects the wrong PIN on PostgreSQL major ' + major + '.');
  let rejectBcrypt2bSql = await readFile(resolve(fixtureDir, 'reject-bcrypt-2b.sql'), 'utf8');
  rejectBcrypt2bSql = rejectBcrypt2bSql.replaceAll(
    '\\ir ./contracts.sql',
    '\\ir ' + resolve(fixtureDir, 'contracts.sql'),
  );
  rejectBcrypt2bSql = rejectBcrypt2bSql.replaceAll(
    '\\ir ../../../supabase/runbooks/prepare_credential_rotation.sql',
    '\\ir ' + resolve(repoRoot, 'supabase/runbooks/prepare_credential_rotation.sql'),
  );
  rejectBcrypt2bSql = rejectBcrypt2bSql.replaceAll(
    '\\ir ../../../supabase/runbooks/apply_credential_rotation.sql',
    '\\ir ' + resolve(repoRoot, 'supabase/runbooks/apply_credential_rotation.sql'),
  );
  if (!rejectBcrypt2bSql.includes('__RUNTIME_BCRYPT_2B_HASH__')) {
    throw new Error('The $2b$ test template placeholder is missing.');
  }
  rejectBcrypt2bSql = rejectBcrypt2bSql.replace('__RUNTIME_BCRYPT_2B_HASH__', runtimeHash);
  const bcrypt2bFile = resolve(tempDir, 'reject-bcrypt-2b.sql');
  await writeFile(bcrypt2bFile, rejectBcrypt2bSql, { encoding: 'utf8', mode: 0o600 });
  expectFailure(
    bcrypt2bFile,
    'hash is not an accepted $2a$ bcrypt hash',
    'real $2b$ staged-hash rejection',
  );
  assertBooleanFile(resolve(fixtureDir, 'assert-original-state.sql'), '$2b$ rejection rollback');
  console.log('[rotation-rehearsal] PASS: runtime-generated $2b$ hash rejected at preflight; tenant, staff and session state unchanged.');

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
} finally {
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
}
