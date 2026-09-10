#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');
const apply = process.argv.includes('--apply');

if (!fs.existsSync(MIGRATIONS_DIR)) throw new Error('NOT VERIFIED: supabase/migrations directory is missing.');

const files = fs.readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith('.sql')).sort((a, b) => a.localeCompare(b));
if (!files.length) throw new Error('NOT VERIFIED: no migration files discovered.');

const versions = files.map((file) => {
  const match = file.match(/^(\d+)[_-]/);
  if (!match) throw new Error(`Migration naming failure: ${file} must start with a numeric version and '_' or '-'.`);
  return { file, version: Number(match[1]) };
});

const versionGroups = new Map();
for (const item of versions) {
  const group = versionGroups.get(item.version) ?? [];
  group.push(item.file);
  versionGroups.set(item.version, group);
}

const duplicateVersions = [...versionGroups.entries()].filter(([, group]) => group.length > 1);
for (const [version, group] of duplicateVersions) {
  console.warn(`[migration] REVIEW: numeric prefix ${version} is shared by ${group.join(', ')}. Historical duplicate prefixes are retained; deterministic filename ordering is used for replay.`);
}

const staticIssues = [];
for (const { file } of versions) {
  const text = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
  if (/auth\.role\(\)/i.test(text)) staticIssues.push(`${file}: deprecated auth.role() usage`);
  if (/create\s+view/i.test(text) && !/security_invoker/i.test(text)) console.warn(`[migration] REVIEW: ${file}: view without explicit security_invoker=true; verify intentionally protected view`);
}
if (staticIssues.length) throw new Error(`Migration static validation failed:\n${staticIssues.join('\n')}`);

console.log(`[migration] Static validation PASS — ${files.length} migration files, naming valid${duplicateVersions.length ? `; ${duplicateVersions.length} historical duplicate numeric prefixes reviewed` : ''}.`);
if (!apply) process.exit(0);

const result = spawnSync('supabase', ['db', 'reset', '--local'], {
  cwd: ROOT,
  env: process.env,
  input: 'y\n',
  stdio: ['pipe', 'inherit', 'inherit'],
});
if (result.error) throw new Error(`Supabase CLI failure: ${result.error.message}`);
if ((result.status ?? 1) !== 0) throw new Error('Migration replay failed: supabase db reset --local exited non-zero.');
console.log('[migration] Replay validation PASS — all repository migrations applied successfully to the isolated local database.');
