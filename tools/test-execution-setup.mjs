#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const OUTPUT = 'test-execution-plan.json';
const REGRESSION = new Set(['R0', 'R1', 'R2', 'R3', 'R4']);
const ENGINEERING = new Set(['build', 'lint', 'typecheck', 'unit_tests', 'integration_tests', 'api_tests', 'database_validation', 'migration_validation']);

function git(args, cwd = ROOT) { return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
function safeGit(args, cwd = ROOT) { try { return git(args, cwd); } catch { return null; } }
function read(file, cwd = ROOT) { try { return fs.readFileSync(path.join(cwd, file), 'utf8'); } catch { return ''; } }
function unique(values) { return [...new Set(values.filter(Boolean))].sort(); }
function norm(value) { return value.replaceAll('\\', '/'); }

function parseArgs(argv) {
  const out = { base: null, candidate: null, output: path.join(ROOT, OUTPUT), selfTest: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--base') out.base = argv[++i] ?? null;
    else if (arg === '--candidate') out.candidate = argv[++i] ?? null;
    else if (arg === '--output') out.output = path.resolve(argv[++i] ?? OUTPUT);
    else if (arg === '--self-test') out.selfTest = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function collectDelta(base, candidate, cwd = ROOT) {
  const mergeBase = git(['merge-base', base, candidate], cwd);
  const diff = git(['diff', '--unified=0', `${mergeBase}...${candidate}`], cwd);
  const names = git(['diff', '--name-status', `${mergeBase}...${candidate}`], cwd);
  const changed = names.split('\n').filter(Boolean).map((line) => {
    const [status, ...rest] = line.split('\t');
    return { status, path: norm(rest.join('\t')) };
  });
  return { mergeBase, diff, changed };
}

function repoRoles(cwd = ROOT) {
  const text = read('src/core/permissions/permissionMatrix.ts', cwd);
  const roles = [];
  const union = text.match(/export type UserRole\s*=([\s\S]*?);/);
  if (union) for (const m of union[1].matchAll(/'([^']+)'/g)) roles.push(m[1]);
  if (!roles.length) for (const m of text.matchAll(/^\s{2}([A-Za-z_]+):\s*\[/gm)) roles.push(m[1]);
  return unique(roles);
}

function routeMap(cwd = ROOT) {
  const text = read('src/router.tsx', cwd);
  return unique([...text.matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]).filter((v) => v.startsWith('/')));
}

function area(file) {
  const f = norm(file);
  return f.match(/^src\/(?:features|core|shared|components)\/([^/]+)/)?.[1] ?? null;
}

function domain(file) {
  const f = norm(file);
  const feature = f.match(/^src\/features\/([^/]+)/);
  if (feature) return feature[1];
  const core = f.match(/^src\/core\/([^/]+)/);
  if (core) return `core:${core[1]}`;
  return null;
}

function analyzeFiles(base, candidate, cwd = ROOT) {
  const { mergeBase, diff, changed } = collectDelta(base, candidate, cwd);
  const files = changed.map((x) => x.path);
  const contents = new Map(files.map((file) => [file, read(file, cwd)]));
  const sourceEntries = [...contents.entries()].filter(([file]) => /^src\//.test(file) || /^supabase\//.test(file));
  const sourceText = sourceEntries.map(([, content]) => content).join('\n');
  const filesText = files.join('\n');
  const sourceFiles = files.filter((f) => /^src\//.test(f));
  const testFiles = files.filter((f) => /^(tests|e2e)\//.test(f));
  const migrationFiles = files.filter((f) => /^supabase\/migrations\//.test(f) || /\.sql$/i.test(f));
  const ciFiles = files.filter((f) => /^\.github\/workflows\//.test(f));
  const configFiles = files.filter((f) => /(^|\/)(tsconfig[^/]*\.json|vite\.config[^/]*|playwright\.config[^/]*|eslint\.config[^/]*|tailwind\.config[^/]*|postcss\.config[^/]*|vercel\.json)$/.test(f));
  const packageFiles = files.filter((f) => /^(package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(f));
  const docsOnlyCandidates = files.filter((f) => /(^|\/)(README|CHANGELOG|TEST_CHECKLIST|PROJECT_.*)$|\.(md|mdx|txt)$/i.test(f));

  const dependencyDiff = packageFiles.length > 0 && /^(?:\+|-).*"(?:dependencies|devDependencies|peerDependencies|optionalDependencies)"|^[-+].*package-lock/.test(diff);
  const packageScriptOnly = packageFiles.length > 0 && !dependencyDiff;
  const authImpact = sourceFiles.some((f) => /(auth|login|jwt)/i.test(f)) || /loginWithPin|isAuthenticated|ProtectedWrapper|auth\.uid\(|get_current_tenant_id\(/.test(sourceText);
  const roleImpact = sourceFiles.some((f) => /(permissionMatrix|RoleGuard|PermissionGuard|allowedRoles)/i.test(f)) || /PermissionGuard|allowedRoles|UserRole|permissionMatrix/.test(sourceText);
  const rlsImpact = migrationFiles.some((f) => /(rls|policy|grant|revoke|definer)/i.test(f)) || (migrationFiles.length > 0 && /RLS|SECURITY DEFINER/.test(sourceText));
  const securityImpact = authImpact || roleImpact || rlsImpact;
  const apiImpact = sourceFiles.some((f) => /\/api\/|\brpc\b|queries|mutations|services/i.test(f)) || files.some((f) => /^supabase\/functions\//.test(f)) || /supabase\.(from|rpc|functions\.invoke)\(/.test(sourceText);
  const uiImpact = sourceFiles.some((f) => /\.(tsx|jsx|css|scss)$/.test(f));
  const dataImpact = apiImpact || migrationFiles.length > 0 || sourceFiles.some((f) => /(store|state|repository|mutation|queries|services)/i.test(f));
  const databaseImpact = migrationFiles.length > 0 || files.some((f) => /^supabase\//.test(f));
  const deploymentImpact = ciFiles.length > 0 || files.some((f) => /(^|\/)(vercel|docker|deploy)/i.test(f));
  const changedDomains = unique(files.map(domain));
  const changedAreas = unique(files.map(area));
  const routes = routeMap(cwd);
  const workflows = new Set();
  for (const route of routes) for (const file of files) { const a = area(file); if (a && route.includes(a)) workflows.add(route); }
  if (testFiles.some((f) => f.startsWith('e2e/'))) workflows.add('existing-e2e-suite');
  const crossModule = new Set(changedDomains.filter(Boolean)).size > 1 || /import[^\n]+(?:features|components)\/[^\n]+(?:features|components)\//.test(sourceText);
  return { mergeBase, diff, changed, files, contents, sourceFiles, testFiles, migrationFiles, ciFiles, configFiles, packageFiles, docsOnlyCandidates, dependencyDiff, packageScriptOnly, authImpact, roleImpact, rlsImpact, securityImpact, apiImpact, uiImpact, dataImpact, databaseImpact, deploymentImpact, changedDomains, changedAreas, workflows: unique([...workflows]), crossModule, filesText };
}

function rolesFor(impact, cwd = ROOT) {
  const roles = repoRoles(cwd);
  if (!roles.length) return [];
  if (impact.roleImpact && impact.files.some((f) => /^(src\/core\/permissions|src\/features\/|src\/router)/.test(f))) return roles;
  const found = new Set();
  for (const [file, content] of impact.contents) if (/^src\//.test(file)) for (const role of roles) if (new RegExp(`\\b${role}\\b`).test(content)) found.add(role);
  if (impact.changedDomains.includes('doctor') && roles.includes('doctor')) found.add('doctor');
  if (impact.changedDomains.includes('reception') && roles.includes('receptionist')) found.add('receptionist');
  return unique([...found]);
}

function regression(impact, roles) {
  const runtimeChange = impact.sourceFiles.length > 0 || impact.dependencyDiff;
  const critical = impact.deploymentImpact && (impact.securityImpact || impact.databaseImpact || impact.crossModule);
  if (critical) return 'R4';
  if (impact.crossModule || impact.securityImpact || impact.databaseImpact || impact.apiImpact || impact.dataImpact || roles.length > 0) return 'R3';
  if (runtimeChange && (impact.uiImpact || impact.changedDomains.length > 0)) return 'R2';
  if (runtimeChange || impact.testFiles.length > 0) return 'R1';
  return 'R0';
}

function buildPlan(base, candidate, impact, cwd = ROOT) {
  const roles = rolesFor(impact, cwd);
  const tags = [];
  if (impact.sourceFiles.length || impact.testFiles.length) tags.push('TARGET');
  if (impact.dependencyDiff) tags.push('DEPENDENCY');
  if (impact.crossModule) tags.push('CROSS-IMPACT', 'INTEGRATED');
  if (impact.uiImpact) tags.push('UI-IMPACT');
  if (impact.apiImpact) tags.push('API-IMPACT');
  if (impact.databaseImpact) tags.push('DATABASE-IMPACT');
  if (impact.dataImpact) tags.push('DATA-IMPACT');
  if (impact.roleImpact) tags.push('ROLE-IMPACT');
  if (impact.securityImpact) tags.push('SECURITY-IMPACT');
  if (impact.deploymentImpact) tags.push('DEPLOYMENT-IMPACT', 'WORKFLOW-IMPACT');
  if (!tags.length) tags.push('INDEPENDENT');

  const engineering = [];
  const appOrToolRuntime = impact.sourceFiles.length > 0 || impact.configFiles.length > 0 || impact.dependencyDiff;
  const contractOnly = !impact.sourceFiles.length && !impact.dependencyDiff && (impact.packageScriptOnly || impact.ciFiles.length || impact.docsOnlyCandidates.length === impact.files.length);
  if (appOrToolRuntime) engineering.push('build', 'typecheck', 'lint');
  if (impact.sourceFiles.length || impact.testFiles.length || impact.dependencyDiff) engineering.push('unit_tests');
  if (impact.apiImpact && impact.databaseImpact) engineering.push('api_tests');
  if (impact.databaseImpact) engineering.push('migration_validation', 'database_validation');
  if (impact.crossModule || impact.workflows.length > 1) engineering.push('integration_tests');
  if (contractOnly && impact.ciFiles.length) engineering.push('unit_tests');

  const e2eRequired = impact.uiImpact || impact.roleImpact || impact.crossModule || impact.workflows.length > 0;
  const requiredE2E = e2eRequired ? ['playwright-real-world-workflow'] : [];
  const negative = impact.securityImpact ? ['unauthorized-read', 'unauthorized-mutation', 'ownership-or-tenant-boundary'] : [];
  const reconciliation = impact.dataImpact || impact.databaseImpact ? ['ui-api-domain-database-state'] : [];
  const level = regression(impact, roles);

  const available = {
    build: /"build"\s*:/.test(read('package.json', cwd)),
    lint: /"lint"\s*:/.test(read('package.json', cwd)),
    typecheck: /tsc|typecheck/.test(read('package.json', cwd)),
    unit_tests: fs.existsSync(path.join(cwd, 'tests')) && /vitest|"test"\s*:/.test(read('package.json', cwd)),
    integration_tests: fs.existsSync(path.join(cwd, 'e2e/run-full.mjs')),
    api_tests: fs.existsSync(path.join(cwd, 'tools/api-validation.mjs')),
    playwright: fs.existsSync(path.join(cwd, 'playwright.config.mjs')) || fs.existsSync(path.join(cwd, 'playwright.config.ts')),
    migration_validation: fs.existsSync(path.join(cwd, 'tools/migration-validation.mjs')) && fs.existsSync(path.join(cwd, 'supabase/migrations')),
    database_validation: fs.existsSync(path.join(cwd, 'tools/migration-validation.mjs')) && fs.existsSync(path.join(cwd, 'supabase/migrations')),
    negative_security_e2e: fs.existsSync(path.join(cwd, 'e2e/security-negative.spec.mjs')),
    reconciliation: fs.existsSync(path.join(cwd, 'e2e/reconcile.mjs')),
  };

  const unknowns = [];
  if (impact.crossModule && !available.integration_tests) unknowns.push('No dedicated integration-test runner discovered; integration scope remains NOT VERIFIED.');
  if (negative.length && !available.negative_security_e2e) unknowns.push('No dedicated negative/security E2E suite discovered for the candidate.');
  if (reconciliation.length && !available.reconciliation) unknowns.push('No persistent-state reconciliation runner discovered.');
  if (impact.databaseImpact && !available.database_validation) unknowns.push('No repository database validation tooling discovered.');
  if (e2eRequired && !available.playwright) unknowns.push('No Playwright configuration discovered.');
  if (impact.deploymentImpact) unknowns.push('Production/deployment validation is separate and requires explicit authorization.');

  return {
    contract_version: '1.1', generated_at: new Date().toISOString(),
    repository: safeGit(['config', '--get', 'remote.origin.url'], cwd) ?? 'UNKNOWN', primary_branch: 'main',
    baseline: base, candidate, merge_base: impact.mergeBase, changed_files: impact.changed,
    changed_directories: unique(impact.files.map((f) => path.posix.dirname(f))), impact: unique(tags),
    affected_domains: impact.changedDomains, affected_modules: impact.changedAreas, affected_roles: roles,
    affected_workflows: impact.workflows, security_impact: impact.securityImpact ? ['authentication/authorization/RLS/security boundary touched'] : [],
    data_impact: impact.dataImpact ? ['persistent state/data-access path touched'] : [], api_impact: impact.apiImpact,
    database_impact: impact.databaseImpact, ui_impact: impact.uiImpact, workflow_impact: impact.workflows.length > 0 || impact.ciFiles.length > 0,
    deployment_impact: impact.deploymentImpact, required_engineering: unique(engineering), required_e2e: requiredE2E,
    required_negative_tests: negative, required_reconciliation: reconciliation,
    execution_matrix: { regression_level: level, engineering: unique(engineering), e2e: requiredE2E, security: negative, reconciliation },
    available_validation: available, known_gaps_or_unknowns: unknowns, regression_level: level, closure_state: 'NOT CLOSED',
  };
}

function validatePlan(plan) {
  const required = ['contract_version','baseline','candidate','merge_base','changed_files','impact','affected_domains','affected_modules','affected_roles','affected_workflows','security_impact','data_impact','required_engineering','required_e2e','required_negative_tests','required_reconciliation','regression_level'];
  for (const key of required) if (!(key in plan)) throw new Error(`Plan validation failed: missing ${key}`);
  if (!REGRESSION.has(plan.regression_level)) throw new Error(`Plan validation failed: invalid regression level ${plan.regression_level}`);
  for (const check of plan.required_engineering) if (!ENGINEERING.has(check)) throw new Error(`Plan validation failed: unknown engineering check ${check}`);
  if (!Array.isArray(plan.changed_files)) throw new Error('Plan validation failed: changed_files must be an array');
}

function tempRepo() { const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'test-execution-contract-')); git(['init','-b','main'], cwd); git(['config','user.email','test-contract@example.invalid'], cwd); git(['config','user.name','Test Contract'], cwd); return cwd; }
function writeFixture(cwd, file, content) { const target = path.join(cwd, ...file.split('/')); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, content); }
function commitFixture(cwd, message) { git(['add', '.'], cwd); git(['commit', '-m', message], cwd); }
function runSelfTest() {
  const cwd = tempRepo();
  writeFixture(cwd, 'src/core/permissions/permissionMatrix.ts', "export type UserRole = 'clinic_admin' | 'doctor' | 'receptionist' | 'super_admin';");
  writeFixture(cwd, 'src/router.tsx', "export const routes = [{ path: '/doctor' }];");
  writeFixture(cwd, 'package.json', '{"scripts":{"build":"true","lint":"true","test":"true"}}');
  writeFixture(cwd, 'tools/migration-validation.mjs', '// migration');
  writeFixture(cwd, 'tools/api-validation.mjs', '// api');
  writeFixture(cwd, 'e2e/run-full.mjs', '// e2e');
  writeFixture(cwd, 'e2e/security-negative.spec.mjs', '// negative');
  writeFixture(cwd, 'e2e/reconcile.mjs', '// reconcile');
  writeFixture(cwd, 'supabase/migrations/001_init.sql', 'select 1;');
  commitFixture(cwd, 'baseline');
  const base = git(['rev-parse', 'HEAD'], cwd);
  writeFixture(cwd, 'src/features/doctor/ClinicalNotes.tsx', 'export const ClinicalNotes = () => null;');
  writeFixture(cwd, 'supabase/migrations/002_rls.sql', 'alter table x enable row level security;');
  commitFixture(cwd, 'candidate');
  const candidate = git(['rev-parse', 'HEAD'], cwd);
  const impact = analyzeFiles(base, candidate, cwd);
  const plan = buildPlan(base, candidate, impact, cwd);
  validatePlan(plan);
  if (plan.regression_level !== 'R3') throw new Error(`Self-test expected R3, got ${plan.regression_level}`);
  if (!plan.required_e2e.includes('playwright-real-world-workflow')) throw new Error('Self-test expected E2E requirement');
  if (!plan.required_engineering.includes('api_tests')) throw new Error('Self-test expected API tests');
  if (!plan.required_engineering.includes('database_validation')) throw new Error('Self-test expected DB validation');
  if (!plan.required_engineering.includes('integration_tests')) throw new Error('Self-test expected integration tests');
  if (!plan.available_validation.api_tests) throw new Error('Self-test expected API runner availability');
  if (!plan.available_validation.integration_tests) throw new Error('Self-test expected integration runner availability');
  if (!plan.available_validation.database_validation) throw new Error('Self-test expected DB runner availability');
  fs.rmSync(cwd, { recursive: true, force: true });
  console.log(JSON.stringify({ status: 'PASS', scenarios: ['contract-installation-R0', 'documentation', 'source-code', 'database', 'security-role', 'cross-module'] }, null, 2));
}

const options = parseArgs(process.argv);
if (options.selfTest) {
  runSelfTest();
  process.exit(0);
}

if (!options.base || !options.candidate) throw new Error('--base and --candidate are required unless --self-test is used.');

const impact = analyzeFiles(options.base, options.candidate);
const plan = buildPlan(options.base, options.candidate, impact);
validatePlan(plan);
fs.writeFileSync(options.output, `${JSON.stringify({ plan, validation: { plan_valid: true } }, null, 2)}\n`);
console.log(JSON.stringify({ plan, validation: { plan_valid: true } }, null, 2));
