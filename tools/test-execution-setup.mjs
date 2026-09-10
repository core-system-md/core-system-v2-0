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
    integration_tests: false,
    api_tests: false,
    playwright: fs.existsSync(path.join(cwd, 'playwright.config.mjs')) || fs.existsSync(path.join(cwd, 'playwright.config.ts')),
    migration_validation: fs.existsSync(path.join(cwd, 'supabase/migrations')),
    database_validation: fs.existsSync(path.join(cwd, 'supabase')),
  };

  const unknowns = [];
  if (impact.crossModule && !available.integration_tests) unknowns.push('No dedicated integration-test runner discovered; integration scope remains NOT VERIFIED.');
  if (negative.length && !impact.testFiles.some((f) => /security|auth|permission|negative/i.test(f))) unknowns.push('No dedicated negative/security E2E suite discovered for the candidate.');
  if (impact.databaseImpact && !available.database_validation) unknowns.push('No repository database validation tooling discovered.');
  if (e2eRequired && !available.playwright) unknowns.push('No Playwright configuration discovered.');
  if (impact.deploymentImpact) unknowns.push('Production/deployment validation is separate and requires explicit authorization.');

  return {
    contract_version: '1.0', generated_at: new Date().toISOString(),
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
function writeFixture(cwd, file, content) { const target = path.join(cwd, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, content, 'utf8'); }
function commit(cwd, message) { git(['add','--','.'], cwd); git(['commit','-m',message], cwd); return git(['rev-parse','HEAD'], cwd); }

export function analyzeRepository(base, candidate, cwd = ROOT) { const impact = analyzeFiles(base, candidate, cwd); return buildPlan(base, candidate, impact, cwd); }

export function selfTest() {
  const cwd = tempRepo();
  try {
    writeFixture(cwd, 'src/core/permissions/permissionMatrix.ts', "export type UserRole = 'admin' | 'operator';\nexport const permissionMatrix = { admin: [], operator: [] };\n");
    writeFixture(cwd, 'src/router.tsx', "const routes = [{path:'/admin'},{path:'/operator'}];\n");
    writeFixture(cwd, 'package.json', '{"scripts":{"build":"true","lint":"true","test":"node -e \\\"\\\""}}');
    const base = commit(cwd, 'baseline');

    writeFixture(cwd, 'README.md', '# docs\n');
    writeFixture(cwd, '.github/workflows/test.yml', 'name: test\n');
    writeFixture(cwd, 'tools/example.mjs', "const text = 'PermissionGuard super_admin security';\n");
    writeFixture(cwd, 'package.json', '{"scripts":{"build":"true","lint":"true","test":"node -e \\\"\\\"","test:contract":"node tools/test-execution-setup.mjs --self-test"}}');
    const contract = commit(cwd, 'docs: install contract');
    const contractPlan = analyzeRepository(base, contract, cwd);
    if (contractPlan.regression_level !== 'R0') throw new Error(`contract installation expected R0, got ${contractPlan.regression_level}`);
    if (contractPlan.required_e2e.length || contractPlan.required_negative_tests.length || contractPlan.affected_roles.length) throw new Error('contract installation incorrectly selected application E2E/security/roles');

    writeFixture(cwd, 'src/features/admin/Panel.tsx', 'export const Panel = () => null;\n');
    const source = commit(cwd, 'feat: add admin panel');
    const sourcePlan = analyzeRepository(contract, source, cwd);
    if (sourcePlan.regression_level !== 'R2') throw new Error(`source classification expected R2, got ${sourcePlan.regression_level}`);
    if (!sourcePlan.required_e2e.includes('playwright-real-world-workflow')) throw new Error('source expected E2E');

    writeFixture(cwd, 'supabase/migrations/001_test.sql', 'alter table example add column value text;\n');
    const db = commit(cwd, 'db: add migration');
    const dbPlan = analyzeRepository(source, db, cwd);
    if (dbPlan.regression_level !== 'R3' || !dbPlan.database_impact) throw new Error('database classification failed');

    writeFixture(cwd, 'src/core/permissions/permissionMatrix.ts', "export type UserRole = 'admin' | 'operator';\nexport const permissionMatrix = { admin: [], operator: [] };\nexport const guard = 'PermissionGuard';\n");
    const sec = commit(cwd, 'security: adjust permissions');
    const secPlan = analyzeRepository(db, sec, cwd);
    if (secPlan.regression_level !== 'R3' || !secPlan.required_negative_tests.length) throw new Error('security classification failed');

    writeFixture(cwd, 'src/features/reception/A.tsx', 'export const A = () => null;\n');
    writeFixture(cwd, 'src/features/doctor/B.tsx', 'export const B = () => null;\n');
    const cross = commit(cwd, 'feat: cross-module workflow');
    const crossPlan = analyzeRepository(sec, cross, cwd);
    if (crossPlan.regression_level !== 'R3' || crossPlan.affected_domains.length < 2) throw new Error('cross-module classification failed');
    return { status: 'PASS', scenarios: ['contract-installation-R0','documentation','source-code','database','security-role','cross-module'] };
  } finally { fs.rmSync(cwd, { recursive: true, force: true }); }
}

function main() {
  const args = parseArgs(process.argv);
  if (args.selfTest) { console.log(JSON.stringify(selfTest(), null, 2)); return; }
  const candidate = args.candidate || process.env.GITHUB_SHA || git(['rev-parse','HEAD']);
  const base = args.base || (process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'HEAD^');
  const plan = analyzeRepository(base, candidate, ROOT);
  validatePlan(plan);
  fs.writeFileSync(args.output, JSON.stringify(plan, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ plan, validation: { plan_valid: true } }, null, 2));
}

try { main(); } catch (error) { console.error(`[test-execution-setup] ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; }
