#!/usr/bin/env node

import fs from 'node:fs';

const requiredFiles = [
  'src/router.tsx',
  'src/features/doctor/DoctorLayout.tsx',
  'src/features/doctor/DoctorTodayPatients.tsx',
  'src/features/doctor/DoctorSessionView.tsx',
  'src/components/doctor/DecisionCard.tsx',
  'src/features/doctor/ClinicalNotes.tsx',
  'src/core/realtime/useSessionChannel.ts',
  'src/core/permissions/permissionMatrix.ts',
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`[integration-validation] missing required file: ${file}`);
}

const router = fs.readFileSync('src/router.tsx', 'utf8');
const doctorLayout = fs.readFileSync('src/features/doctor/DoctorLayout.tsx', 'utf8');
const today = fs.readFileSync('src/features/doctor/DoctorTodayPatients.tsx', 'utf8');
const session = fs.readFileSync('src/features/doctor/DoctorSessionView.tsx', 'utf8');
const decision = fs.readFileSync('src/components/doctor/DecisionCard.tsx', 'utf8');
const notes = fs.readFileSync('src/features/doctor/ClinicalNotes.tsx', 'utf8');
const realtime = fs.readFileSync('src/core/realtime/useSessionChannel.ts', 'utf8');
const permissions = fs.readFileSync('src/core/permissions/permissionMatrix.ts', 'utf8');

const contracts = [
  ['doctor route wiring', /path: '\/doctor'/.test(router) && /DoctorLayout/.test(router) && /DoctorTodayPatients/.test(router)],
  ['doctor patients route wiring', /path: 'patients'/.test(router) && /DoctorPatientsPage/.test(router)],
  ['doctor session route wiring', /path: 'session:\/\/?:sessionId|path: 'session:\/:sessionId'/.test(router) || /path: 'session\/:sessionId'/.test(router)],
  ['doctor layout outlet', /<Outlet \/>/.test(doctorLayout)],
  ['doctor queue realtime', /useSessionChannel\(/.test(today) && /useSessionChannel\(/.test(session)],
  ['doctor session decision card', /DecisionCard/.test(session) && /PermissionGuard required="edit_sessions"/.test(session)],
  ['doctor clinical notes guarded', /ClinicalNotes/.test(session) && /PermissionGuard required="edit_sessions"/.test(session)],
  ['decision card permission guard', /PermissionGuard required="edit_sessions"/.test(decision)],
  ['realtime tenant filter', /tenant_id=eq\./.test(realtime)],
  ['doctor permissions', /doctor:\s*\[/.test(permissions) && /'view_sessions'/.test(permissions) && /'edit_sessions'/.test(permissions)],
  ['rtl clinical notes', /dir="rtl"/.test(notes)],
];

for (const [label, ok] of contracts) {
  if (!ok) throw new Error(`[integration-validation] FAILED — ${label}`);
  console.log(`[integration-validation] PASS — ${label}`);
}

console.log('[integration-validation] PASS — cross-module doctor wiring validation completed.');
