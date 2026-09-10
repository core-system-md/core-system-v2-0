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

// Historical migrations sharing a numeric version do not encode dependency order.
// P74 must run before Migration 044 because the function definition references
// the soft-delete column introduced by P74.
const REPLAY_ORDER = new Map([
  ['044', ['044_p74_governance_deleted_at_columns.sql', '044_fix_update_session_status_authorization.sql']],
]);

const consolidated = [];
for (const [version, names] of groups) {
  if (names.length < 2) continue;

  const ordered = REPLAY_ORDER.has(version)
    ? REPLAY_ORDER.get(version).filter((name) => names.includes(name))
    : [...names];

  for (const name of names) {
    if (!ordered.includes(name)) ordered.push(name);
  }

  const primary = ordered[0];
  const primaryPath = path.join(MIGRATIONS, primary);
  const existing = fs.readFileSync(primaryPath, 'utf8').replace(/\s+$/, '');
  const sections = [existing];

  for (const duplicate of ordered.slice(1)) {
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
  consolidated.push({ version, primary, merged: ordered.slice(1) });
}

function appendOnce(fileName, marker, sqlBlock) {
  const filePath = path.join(MIGRATIONS, fileName);
  if (!fs.existsSync(filePath)) return false;
  let sql = fs.readFileSync(filePath, 'utf8').replace(/\s+$/, '');
  if (sql.includes(marker)) return false;
  sql += `\n\n${marker}\n${sqlBlock.trim()}\n`;
  fs.writeFileSync(filePath, `${sql}\n`, 'utf8');
  return true;
}

// Replay-only compatibility bridge: the early clinic_users migration predates
// the canonical PIN/identity/soft-delete fields used by later historical migrations.
const usersBridge = appendOnce(
  '002_tenants_users.sql',
  '-- CORE SYSTEM local replay compatibility: canonical clinic_users fields',
  `ALTER TABLE public.clinic_users
  ADD COLUMN IF NOT EXISTS full_name_ar TEXT,
  ADD COLUMN IF NOT EXISTS employee_code TEXT,
  ADD COLUMN IF NOT EXISTS pin_code TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS specialization TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;`,
);

// Replay-only bridge for the canonical patient soft-delete fields used by active
// admin/reception read models and E2E reconciliation.
const patientBridge = appendOnce(
  '004_patients.sql',
  '-- CORE SYSTEM local replay compatibility: canonical patient soft-delete fields',
  `ALTER TABLE public.clinic_patients
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.patient_longitudinal_profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;`,
);

// Replay-only bridge for the canonical reception/scheduling soft-delete fields.
const schedulingBridge = appendOnce(
  '005_scheduling.sql',
  '-- CORE SYSTEM local replay compatibility: canonical scheduling soft-delete fields',
  `ALTER TABLE public.clinic_inquiries
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.master_agenda_events
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;`,
);

// Replay-only bridge for the canonical financial soft-delete boundary introduced
// outside the original base migration.
const invoiceBridge = appendOnce(
  '007_financial.sql',
  '-- CORE SYSTEM local replay compatibility: canonical invoice soft-delete field',
  `ALTER TABLE public.clinic_invoices
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;`,
);

// Replay-only compatibility bridge: the base session table predates canonical
// queue/lock aliases, score/insurance fields, soft-delete, and later status values.
const sessionsBase = path.join(MIGRATIONS, '006_sessions.sql');
let sessionBridge = false;
if (fs.existsSync(sessionsBase)) {
  const marker = '-- CORE SYSTEM local replay compatibility: canonical clinic_visit_sessions fields';
  let sql = fs.readFileSync(sessionsBase, 'utf8').replace(/\s+$/, '');
  if (!sql.includes(marker)) {
    sql += `\n\n${marker}\nALTER TABLE public.clinic_visit_sessions\n  ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES public.clinic_users(id),\n  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.clinic_rooms(id),\n  ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ,\n  ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMPTZ,\n  ADD COLUMN IF NOT EXISTS session_ended_at TIMESTAMPTZ,\n  ADD COLUMN IF NOT EXISTS waiting_time_minutes INTEGER,\n  ADD COLUMN IF NOT EXISTS session_duration_minutes INTEGER,\n  ADD COLUMN IF NOT EXISTS lock_holder_id UUID REFERENCES public.clinic_users(id),\n  ADD COLUMN IF NOT EXISTS lock_timestamp TIMESTAMPTZ,\n  ADD COLUMN IF NOT EXISTS core_score_display NUMERIC,\n  ADD COLUMN IF NOT EXISTS is_insured BOOLEAN NOT NULL DEFAULT FALSE,\n  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;\n\nUPDATE public.clinic_visit_sessions\nSET doctor_id = primary_doctor_id\nWHERE doctor_id IS NULL AND primary_doctor_id IS NOT NULL;\n\nUPDATE public.clinic_visit_sessions\nSET room_id = assigned_room_id\nWHERE room_id IS NULL AND assigned_room_id IS NOT NULL;\n\nUPDATE public.clinic_visit_sessions\nSET arrived_at = actual_check_in\nWHERE arrived_at IS NULL AND actual_check_in IS NOT NULL;\n\nUPDATE public.clinic_visit_sessions\nSET session_started_at = actual_start\nWHERE session_started_at IS NULL AND actual_start IS NOT NULL;\n\nALTER TABLE public.clinic_visit_sessions DROP CONSTRAINT IF EXISTS clinic_visit_sessions_status_check;\nALTER TABLE public.clinic_visit_sessions\n  ADD CONSTRAINT clinic_visit_sessions_status_check CHECK (session_status IN (\n    'pending', 'checked_in', 'waiting', 'in_progress', 'in_consultation',\n    'pending_close', 'completed', 'closed', 'cancelled', 'no_show',\n    'abandoned', 'rescheduled', 'System_Closed_Timeout'\n  ));\n`;
    fs.writeFileSync(sessionsBase, `${sql}\n`, 'utf8');
    sessionBridge = true;
  }
}

const report = {
  mode: 'local-replay-only',
  purpose: 'Consolidate historical duplicate numeric migration prefixes and bridge legacy base-schema gaps for an isolated Supabase replay without changing repository migration history.',
  consolidated,
  compatibility_bridges: [
    ...(usersBridge ? ['002_tenants_users.sql: clinic_users canonical PIN/identity/soft-delete columns'] : []),
    ...(patientBridge ? ['004_patients.sql: patient soft-delete columns'] : []),
    ...(schedulingBridge ? ['005_scheduling.sql: inquiry/agenda soft-delete columns'] : []),
    ...(sessionBridge ? ['006_sessions.sql: clinic_visit_sessions canonical queue/lock/score/soft-delete fields and status values'] : []),
    ...(invoiceBridge ? ['007_financial.sql: clinic_invoices soft-delete column'] : []),
  ],
};
fs.writeFileSync(path.join(ROOT, '.migration-replay-map.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(JSON.stringify(report, null, 2));
