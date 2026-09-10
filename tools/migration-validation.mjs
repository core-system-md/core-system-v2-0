#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');
const apply = process.argv.includes('--apply');

if (!fs.existsSync(MIGRATIONS_DIR)) throw new Error('NOT VERIFIED: supabase/migrations directory is missing.');

const files = fs.readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith('.sql'))
  .sort((a, b) => a.localeCompare(b));
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

const duplicateWords = new Map();
const staticIssues = [];
for (const { file } of versions) {
  const text = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
  if (/auth\.role\(\)/i.test(text)) staticIssues.push(`${file}: deprecated auth.role() usage`);
  if (/create\s+view/i.test(text) && /security_invoker/i.test(text) === false) duplicateWords.set(file, 'view without explicit security_invoker=true; verify intentionally protected view');
}
if (staticIssues.length) throw new Error(`Migration static validation failed:\n${staticIssues.join('\n')}`);
for (const [file, warning] of duplicateWords) console.warn(`[migration] REVIEW: ${file}: ${warning}`);

console.log(`[migration] Static validation PASS — ${files.length} migration files, versions unique and naming valid.`);

if (!apply) process.exit(0);

function run(args) {
  const result = spawnSync('supabase', args, { cwd: ROOT, stdio: 'inherit', env: process.env });
  if (result.error) throw new Error(`Supabase CLI failure: ${result.error.message}`);
  if ((result.status ?? 1) !== 0) throw new Error(`Migration execution failed: supabase ${args.join(' ')}`);
}

run(['db', 'reset', '--local']);
console.log('[migration] Replay validation PASS — all repository migrations applied successfully to the isolated local database.');
