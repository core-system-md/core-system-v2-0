#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MIGRATIONS = path.join(ROOT, 'supabase', 'migrations');
const MARKER = '-- CORE SYSTEM local replay consolidation';

if (process.env.CI !== 'true' && process.argv[2] !== '--apply-local-replay') {
  throw new Error('Refusing to rewrite migration files outside CI. Use CI=true or --apply-local-replay explicitly.');
}

if (!fs.existsSync(MIGRATIONS)) throw new Error(`Migration directory not found: ${MIGRATIONS}`);

const files = fs.readdirSync(MIGRATIONS)
  .filter((name) => name.endsWith('.sql'))
  .sort((a, b) => a.localeCompare(b));

const groups = new Map();
for (const name of files) {
  const match = name.match(/^(\d+)_/);
  if (!match) continue;
  const version = match[1];
  if (!groups.has(version)) groups.set(version, []);
  groups.get(version).push(name);
}

const consolidated = [];
for (const [version, names] of groups) {
  if (names.length < 2) continue;

  const primary = names[0];
  const primaryPath = path.join(MIGRATIONS, primary);
  const existing = fs.readFileSync(primaryPath, 'utf8').replace(/\s+$/, '');
  const sections = [existing];

  for (const duplicate of names.slice(1)) {
    const duplicatePath = path.join(MIGRATIONS, duplicate);
    const sql = fs.readFileSync(duplicatePath, 'utf8').replace(/^\s+|\s+$/g, '');
    sections.push([
      `${MARKER}: merged duplicate version ${version}`,
      `-- Original migration file: ${duplicate}`,
      sql,
    ].join('\n'));
    fs.unlinkSync(duplicatePath);
  }

  fs.writeFileSync(primaryPath, `${sections.join('\n\n')}\n`, 'utf8');
  consolidated.push({ version, primary, merged: names.slice(1) });
}

const report = {
  mode: 'local-replay-only',
  purpose: 'Consolidate historical duplicate numeric migration prefixes for an isolated Supabase replay without changing repository migration history.',
  consolidated,
};
fs.writeFileSync(path.join(ROOT, '.migration-replay-map.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(JSON.stringify(report, null, 2));
