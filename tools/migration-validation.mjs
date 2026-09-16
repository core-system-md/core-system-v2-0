#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');
const MIGRATION_BACKUP_DIR = path.join(ROOT, 'supabase', 'migrations.ci-backup');
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

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: process.env,
    stdio: ['pipe', 'inherit', 'inherit'],
    ...options,
  });
  if (result.error) throw new Error(`${command} ${args.join(' ')} failed to start: ${result.error.message}`);
  if ((result.status ?? 1) !== 0) throw new Error(`${command} ${args.join(' ')} exited non-zero.`);
};

const moveMigrations = () => {
  if (fs.existsSync(MIGRATION_BACKUP_DIR)) fs.rmSync(MIGRATION_BACKUP_DIR, { recursive: true, force: true });
  fs.renameSync(MIGRATIONS_DIR, MIGRATION_BACKUP_DIR);
};

const restoreMigrations = () => {
  if (fs.existsSync(MIGRATIONS_DIR)) fs.rmSync(MIGRATIONS_DIR, { recursive: true, force: true });
  if (fs.existsSync(MIGRATION_BACKUP_DIR)) fs.renameSync(MIGRATION_BACKUP_DIR, MIGRATIONS_DIR);
};

try {
  // Reset against an empty migration directory so the database can be recreated
  // without executing migration 012 before the auth schema grant exists.
  moveMigrations();
  try {
    run('supabase', ['db', 'reset', '--local'], { input: 'y\n' });
  } finally {
    restoreMigrations();
  }

  // The reset recreates the database and removes the auth schema privilege that
  // is required by migration 012. Restore that isolated-test prerequisite now,
  // before replaying the repository migration chain from a clean database.
  const dbContainer = spawnSync('docker', ['ps', '--filter', 'name=supabase_db_', '--format', '{{.Names}}'], {
    cwd: ROOT,
    env: process.env,
    encoding: 'utf8',
  });
  if (dbContainer.error) throw new Error(`Docker discovery failed: ${dbContainer.error.message}`);
  if ((dbContainer.status ?? 1) !== 0) throw new Error('Docker database container discovery failed.');
  const containerName = dbContainer.stdout.trim().split('\n').find(Boolean);
  if (!containerName) throw new Error('NOT VERIFIED: Supabase database container was not found after reset.');

  run('docker', ['exec', containerName, 'psql', '-U', 'supabase_admin', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', 'GRANT USAGE, CREATE ON SCHEMA auth TO postgres;']);
  run('supabase', ['migration', 'up', '--local']);

  console.log('[migration] Replay validation PASS — all repository migrations applied successfully to the isolated local database.');
} finally {
  restoreMigrations();
}
