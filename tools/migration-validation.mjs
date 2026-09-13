#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');
const MIGRATIONS_BACKUP_DIR = path.join(ROOT, 'supabase', 'migrations.ci-validation-backup');
const apply = process.argv.includes('--apply');

if (!fs.existsSync(MIGRATIONS_DIR)) throw new Error('NOT VERIFIED: supabase/migrations directory is missing.');

const files = fs.readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith('.sql')).sort((a, b) => a.localeCompare(b));
if (!files.length) throw new Error('NOT VERIFIED: no migration files discovered.');

const versions = files.map((file) => {
  const match = file.match(/^(\d+)[_-]/);
  if (!match) throw new Error(`Migration naming failure: ${file} must start with a numeric version and '_' or '-'.`);
  return { file, version: Number(match[1]) };
});
const seen = new Set();
for (const item of versions) {
  if (seen.has(item.version)) throw new Error(`Migration version collision: ${item.version} (${item.file}).`);
  seen.add(item.version);
}

const staticIssues = [];
for (const { file } of versions) {
  const text = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
  if (/auth\.role\(\)/i.test(text)) staticIssues.push(`${file}: deprecated auth.role() usage`);
  if (/create\s+view/i.test(text) && !/security_invoker/i.test(text)) console.warn(`[migration] REVIEW: ${file}: view without explicit security_invoker=true; verify intentionally protected view`);
}
if (staticIssues.length) throw new Error(`Migration static validation failed:\n${staticIssues.join('\n')}`);

console.log(`[migration] Static validation PASS — ${files.length} migration files, versions unique and naming valid.`);
if (!apply) process.exit(0);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: process.env,
    input: options.input,
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  if (result.error) throw new Error(`${command} failure: ${result.error.message}`);
  if ((result.status ?? 1) !== 0) throw new Error(`${options.failureMessage ?? `${command} exited non-zero.`}`);
}

function withMigrationDirectoryHidden(action) {
  fs.renameSync(MIGRATIONS_DIR, MIGRATIONS_BACKUP_DIR);
  try {
    return action();
  } finally {
    if (fs.existsSync(MIGRATIONS_BACKUP_DIR) && !fs.existsSync(MIGRATIONS_DIR)) {
      fs.renameSync(MIGRATIONS_BACKUP_DIR, MIGRATIONS_DIR);
    }
  }
}

// Supabase's local `db reset` reapplies migrations internally. That path cannot
// preserve the auth-schema grant required by the repository's early RLS helpers.
// Recreate the local database with migrations temporarily hidden, restore the
// migration directory, then apply the full chain through the normal CLI path.
withMigrationDirectoryHidden(() => {
  console.log('[migration] Recreating clean local database without replaying migrations.');
  run('supabase', ['db', 'reset', '--local', '--no-seed'], {
    input: 'y\n',
    failureMessage: 'Migration replay preparation failed: supabase db reset --local --no-seed exited non-zero.',
  });
});

const dbContainerResult = spawnSync('docker', ['ps', '--filter', 'name=supabase_db_', '--format', '{{.Names}}'], {
  cwd: ROOT,
  env: process.env,
  encoding: 'utf8',
});
if (dbContainerResult.error) throw new Error(`Docker failure: ${dbContainerResult.error.message}`);
const dbContainer = String(dbContainerResult.stdout ?? '').trim().split('\n')[0];
if (!dbContainer) throw new Error('NOT VERIFIED: isolated Supabase database container was not found after reset.');

run('docker', [
  'exec',
  dbContainer,
  'psql',
  '-U',
  'supabase_admin',
  '-d',
  'postgres',
  '-v',
  'ON_ERROR_STOP=1',
  '-c',
  'GRANT USAGE, CREATE ON SCHEMA auth TO postgres; GRANT USAGE, CREATE ON SCHEMA auth TO supabase_admin;',
], {
  failureMessage: 'Migration replay preparation failed: could not restore auth-schema privileges for the migration runner.',
});

run('supabase', ['migration', 'up', '--local'], {
  failureMessage: 'Migration replay failed: supabase migration up --local exited non-zero.',
});

console.log('[migration] Replay validation PASS — all repository migrations applied successfully to the isolated local database.');
