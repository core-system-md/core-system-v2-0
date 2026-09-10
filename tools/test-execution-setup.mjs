#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const REPO_ROOT = process.cwd();
const OUTPUT_NAME = 'test-execution-plan.json';
const VALID_REGRESSION = new Set(['R0', 'R1', 'R2', 'R3', 'R4']);
const ENGINEERING_KEYS = new Set([
  'build',
  'lint',
  'typecheck',
  'unit_tests',
  'integration_tests',
  'api_tests',
  'database_validation',
  'migration_validation',
]);

function runGit(args, cwd = REPO_ROOT) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function tryGit(args, cwd = REPO_ROOT) {
  try {
    return runGit(args, cwd);
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  const args = { base: null, candidate: null, output: path.join(REPO_ROOT, OUTPUT_NAME), selfTest: false, noWrite: false, execute: false };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--base') args.base = argv[++i] ?? null;
    else if (token === '--candidate') args.candidate = argv[++i] ?? null;
    else if (token === '--output') args.output = path.resolve(argv[++i] ?? OUTPUT_NAME);
    else if (token === '--self-test') args.selfTest = true;
    else if (token === '--no-write') args.noWrite = true;
    else if (token === '--execute') args.execute = true;
    else throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function normalizePath(value) {
  return value.replaceAll('\\', '/');
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function collectChangedFiles(base, candidate, cwd = REPO_ROOT) {
  const mergeBase = runGit(['merge-base', base, candidate], cwd);
  const raw = runGit(['diff', '--name-status', `${mergeBase}...${candidate}`], cwd);
  const changed = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [status, ...rest] = line.split('\t');
      return { status, path: normalizePath(rest.join('\t')) };
    });
  return { mergeBase, changed };
}

function findRepoRoles(cwd = REPO_ROOT) {
  const permissionMatrix = readText(path.join(cwd, 'src/core/permissions/permissionMatrix.ts'));
  const roles = [];
  const unionMatch = permissionMatrix.match(/export type UserRole\s*=([\s\S]*?);/);
  if (unionMatch) {
    for (const match of unionMatch[1].matchAll(/'([^']+)'/g)) roles.push(match[1]);
  }
  if (roles.length === 0) {
    for (const match of permissionMatrix.matchAll(/^\s{2}([A-Za-z_]+):\s*\[/gm)) roles.push(match[1]);
  }
  return unique(roles);
}

function findRouteAreas(cwd = REPO_ROOT) {
  const router = readText(path.join(cwd, 'src/router.tsx'));
  const routes = [];
  for (const match of router.matchAll(/path:\s*'([^']+)'/g)) {
    const value = match[1];
    if (value.startsWith('/')) routes.push(value);
  }
  return unique(routes);
}

function domainFromPath(filePath) {
  const normalized = normalizePath(filePath);
  const feature = normalized.match(/^src\/features\/([^/]+)/);
  if (feature) return feature[1];
  const core = normalized.match(/^src\/core\/([^/]+)/);
  if (core) return `core:${core[1]}`;
  const shared = normalized.match(/^src\/shared\/([^/]+)/);
  if (shared) return `shared:${shared[1]}`;
  const component = normalized.match(/^src\/components\/([^/]+)/);
  if (component) return `components:${component[1]}`;
  return null;
}

function areaFromPath(filePath) {
  const normalized = normalizePath(filePath);
  const match = normalized.match(/^src\/(?:features|components|core|shared)\/([^/]+)/);
  return match?.[1] ?? null;
}

function classifyChangedFiles(changed, cwd = REPO_ROOT) {
  const files = changed.map((item) => item.path);
  const contents = new Map(files.map((file) => [file, readText(path.join(cwd, file))]));
  const joined = [...contents.values()].join('\n');
  const sourceFiles = files.filter((file) => /^src\//.test(file));
  const testFiles = files.filter((file) => /^(tests|e2e)\//.test(file));
  const migrationFiles = files.filter((file) => /^supabase\/migrations\//.test(file) || /\.sql$/i.test(file));
  const ciFiles = files.filter((file) => /^\.github\/workflows\//.test(file));
  const configFiles = files.filter((file) => /(^|\/)(package\.json|package-lock\.json|tsconfig[^/]*\.json|vite\.config|playwright\.config|eslint\.config|tailwind\.config|postcss\.config|vercel\.json)(\.|$)/.test(file));
  const docFiles = files.filter((file) => /(^|\/)(docs?\/|README|CHANGELOG|TEST_CHECKLIST|PROJECT_.*\.(md|txt))|\.(md|mdx)$/i.test(file));
  const authImpact = files.some((file) => /(auth|login|jwt|session)/i.test(file)) || /(auth\.|jwt|loginWithPin|isAuthenticated|ProtectedWrapper|RoleGuard|PermissionGuard)/.test(joined);
  const roleImpact = files.some((file) => /(permissionMatrix|RoleGuard|PermissionGuard|allowedRoles|user\.role|role\b)/i.test(file)) || /PermissionGuard|allowedRoles|UserRole|permissionMatrix/.test(joined);
  const securityImpact = authImpact || roleImpact || migrationFiles.some((file) => /(rls|policy|grant|revoke|security|definer)/i.test(file)) || /(RLS|SECURITY DEFINER|auth\.uid\(|get_current_tenant_id\(|tenant_id=|tenant_id =)/i.test(joined);
  const apiImpact = files.some((file) => /supabase\/functions|api|rpc|queries|mutations|services/i.test(file)) || /supabase\.(from|rpc|functions\.invoke)\(/.test(joined);
  const uiImpact = sourceFiles.some((file) => /\.(tsx|jsx|css|scss)$/.test(file));
  const dataImpact = apiImpact || migrationFiles.length > 0 || sourceFiles.some((file) => /(store|state|repository|mutation|queries|services)/i.test(file));
  const databaseImpact = migrationFiles.length > 0 || files.some((file) => /^supabase\//.test(file));
  const deploymentImpact = ciFiles.length > 0 || files.some((file) => /(vercel|docker|deploy)/i.test(file));
  const dependencyImpact = files.some((file) => /^(package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(file));
  const changedAreas = unique(files.map(areaFromPath));
  const changedDomains = unique(files.map(domainFromPath));
  const crossModule = changedDomains.filter((d) => d && !d.startsWith('core:') && !d.startsWith('shared:') && !d.startsWith('components:')).length > 1 || /(features\/[^/]+.*features\/[^/]+|import[^\n]+features\/)/.test(joined);

  return {
    files,
    contents,
    sourceFiles,
    testFiles,
    migrationFiles,
    ciFiles,
    configFiles,
    docFiles,
    authImpact,
    roleImpact,
    securityImpact,
    apiImpact,
    uiImpact,
    dataImpact,
    databaseImpact,
    deploymentImpact,
    dependencyImpact,
    changedAreas,
    changedDomains,
    crossModule,
  };
}

function inferRoles(impact, cwd = REPO_ROOT) {
  const roles = findRepoRoles(cwd);
  if (roles.length === 0) return [];
  if (impact.roleImpact && impact.files.some((file) => /permissionMatrix|auth|router|ProtectedWrapper/i.test(file))) return roles;
  const matched = new Set();
  for (const [file, content] of impact.contents) {
    for (const role of roles) {
      if (new RegExp(`\\b${role}\\b`).test(content)) matched.add(role);
    }
  }
  if (impact.changedDomains.includes('doctor') && roles.includes('doctor')) matched.add('doctor');
  if (impact.changedDomains.includes('reception') && roles.includes('receptionist')) matched.add('receptionist');
  return unique([...matched]);
}

function inferWorkflows(impact, cwd = REPO_ROOT) {
  const routes = findRouteAreas(cwd);
  const workflows = new Set();
  for (const route of routes) {
    for (const file of impact.files) {
      const area = areaFromPath(file);
      if (area && route.includes(area)) workflows.add(route);
    }
  }
  if (impact.testFiles.some((file) => file.startsWith('e2e/'))) {
    workflows.add('existing-e2e-suite');
  }
  return unique([...workflows]);
}

function regressionLevel(impact, roles, workflows) {
  const appChange = impact.sourceFiles.length > 0 || impact.testFiles.length > 0 || impact.dependencyImpact;
  const critical = impact.deploymentImpact && (impact.securityImpact || impact.databaseImpact || impact.crossModule);
  if (critical) return 'R4';
  if (impact.crossModule || impact.securityImpact || impact.roleImpact || impact.databaseImpact || impact.dataImpact || impact.apiImpact) return 'R3';
  if (appChange && (impact.uiImpact || impact.changedDomains.length > 0 || workflows.length > 0 || roles.length > 0)) return 'R2';
  if (appChange) return 'R1';
  return 'R0';
}

function buildPlan({ base, candidate, mergeBase, impact, cwd = REPO_ROOT }) {
  const roles = inferRoles(impact, cwd);
  const workflows = inferWorkflows(impact, cwd);
  const impactTags = [];
  if (impact.sourceFiles.length > 0 || impact.testFiles.length > 0) impactTags.push('TARGET');
  if (impact.dependencyImpact) impactTags.push('DEPENDENCY');
  if (impact.crossModule) impactTags.push('CROSS-IMPACT', 'INTEGRATED');
  if (impact.uiImpact) impactTags.push('UI-IMPACT');
  if (impact.apiImpact) impactTags.push('API-IMPACT');
  if (impact.databaseImpact) impactTags.push('DATABASE-IMPACT');
  if (impact.dataImpact) impactTags.push('DATA-IMPACT');
  if (impact.roleImpact) impactTags.push('ROLE-IMPACT');
  if (impact.securityImpact) impactTags.push('SECURITY-IMPACT');
  if (impact.deploymentImpact) impactTags.push('DEPLOYMENT-IMPACT');
  if (impact.ciFiles.length > 0) impactTags.push('WORKFLOW-IMPACT');
  if (impactTags.length === 0) impactTags.push('INDEPENDENT');

  const engineering = [];
  if (impact.sourceFiles.length > 0 || impact.dependencyImpact || impact.configFiles.length > 0) engineering.push('build', 'typecheck');
  if (impact.sourceFiles.length > 0 || impact.configFiles.length > 0) engineering.push('lint');
  if (impact.sourceFiles.length > 0 || impact.testFiles.length > 0 || impact.dependencyImpact) engineering.push('unit_tests');
  if (impact.apiImpact && impact.databaseImpact) engineering.push('api_tests');
  if (impact.databaseImpact) engineering.push('migration_validation', 'database_validation');

  const integrationRequired = impact.crossModule || workflows.length > 1;
  if (integrationRequired) engineering.push('integration_tests');

  const e2eRequired = impact.uiImpact || impact.roleImpact || impact.crossModule || workflows.length > 0;
  const requiredE2e = e2eRequired ? ['playwright-real-world-workflow'] : [];
  const negative = impact.securityImpact ? ['unauthorized-read', 'unauthorized-mutation', 'ownership-or-tenant-boundary'] : [];
  const reconciliation = impact.dataImpact || impact.databaseImpact ? ['ui-api-domain-database-state'] : [];
  const regression = regressionLevel(impact, roles, workflows);

  const available = {
    build: Boolean(readText(path.join(cwd, 'package.json')).match(/"build"\s*:/)),
    lint: Boolean(readText(path.join(cwd, 'package.json')).match(/"lint"\s*:/)),
    typecheck: Boolean(readText(path.join(cwd, 'package.json')).match(/tsc|typecheck/)),
    unit_tests: Boolean(fs.existsSync(path.join(cwd, 'tests')) && readText(path.join(cwd, 'package.json')).match(/vitest|"test"\s*:/)),
    integration_tests: false,
    api_tests: false,
    playwright: Boolean(fs.existsSync(path.join(cwd, 'playwright.config.mjs')) || fs.existsSync(path.join(cwd, 'playwright.config.ts'))),
    migration_validation: Boolean(fs.existsSync(path.join(cwd, 'supabase/migrations'))),
    database_validation: Boolean(fs.existsSync(path.join(cwd, 'supabase'))),
  };

  const unknowns = [];
  if (integrationRequired && !available.integration_tests) unknowns.push('No dedicated integration-test runner was discovered.');
  if (impact.databaseImpact && !available.database_validation) unknowns.push('Database tooling was not discoverable.');
  if (e2eRequired && !available.playwright) unknowns.push('No Playwright configuration was discovered.');
  if (negative.length > 0 && !impact.testFiles.some((file) => /security|auth|permission|negative/i.test(file))) unknowns.push('No dedicated negative/security E2E suite was discovered for this candidate.');
  if (impact.deploymentImpact) unknowns.push('Deployment readiness is separate from CI and requires an explicitly authorized deployment verification.');

  return {
    contract_version: '1.0',
    generated_at: new Date().toISOString(),
    repository: tryGit(['config', '--get', 'remote.origin.url'], cwd) ?? 'UNKNOWN',
    primary_branch: 'main',
    baseline: base,
    candidate,
    merge_base: mergeBase,
    changed_files: impact.changedFiles ?? impact.files.map((file) => ({ status: 'UNKNOWN', path: file })),
    changed_directories: unique(impact.files.map((file) => path.posix.dirname(file))),
    impact: unique(impactTags),
    affected_domains: impact.changedDomains,
    affected_modules: impact.changedAreas,
    affected_roles: roles,
    affected_workflows: workflows,
    security_impact: impact.securityImpact ? ['authorization/authentication or tenant/security boundary touched'] : [],
    data_impact: impact.dataImpact ? ['persistent state or data-access path touched'] : [],
    api_impact: impact.apiImpact,
    database_impact: impact.databaseImpact,
    ui_impact: impact.uiImpact,
    workflow_impact: impact.ciFiles.length > 0 || workflows.length > 0,
    deployment_impact: impact.deploymentImpact,
    required_engineering: unique(engineering),
    required_e2e: requiredE2e,
    required_negative_tests: negative,
    required_reconciliation: reconciliation,
    execution_matrix: {
      regression_level: regression,
      engineering: unique(engineering),
      e2e: requiredE2e,
      security: negative,
      reconciliation,
    },
    available_validation: available,
    known_gaps_or_unknowns: unknowns,
    regression_level: regression,
    closure_state: 'NOT CLOSED',
  };
}

function validatePlan(plan) {
  const required = [
    'contract_version', 'baseline', 'candidate', 'merge_base', 'changed_files',
    'impact', 'affected_domains', 'affected_modules', 'affected_roles',
    'affected_workflows', 'security_impact', 'data_impact', 'required_engineering',
    'required_e2e', 'required_negative_tests', 'required_reconciliation',
    'regression_level',
  ];
  const missing = required.filter((key) => !(key in plan));
  if (missing.length > 0) throw new Error(`Plan validation failed: missing ${missing.join(', ')}`);
  if (!VALID_REGRESSION.has(plan.regression_level)) throw new Error(`Plan validation failed: invalid regression level ${plan.regression_level}`);
  for (const key of plan.required_engineering) if (!ENGINEERING_KEYS.has(key)) throw new Error(`Plan validation failed: unknown engineering check ${key}`);
  if (!Array.isArray(plan.changed_files)) throw new Error('Plan validation failed: changed_files must be an array');
  return true;
}

function commandForCheck(check) {
  switch (check) {
    case 'build': return ['npm', ['run', 'build']];
    case 'lint': return ['npm', ['run', 'lint']];
    case 'typecheck': return ['npx', ['tsc', '--noEmit']];
    case 'unit_tests': return ['npm', ['test']];
    case 'integration_tests': return null;
    case 'api_tests': return null;
    case 'database_validation': return null;
    case 'migration_validation': return null;
    default: return null;
  }
}

function executeEngineering(plan, cwd = REPO_ROOT) {
  const results = [];
  for (const check of plan.required_engineering) {
    const command = commandForCheck(check);
    if (!command) {
      results.push({ check, status: 'NOT VERIFIED', classification: 'INFRASTRUCTURE GAP' });
      continue;
    }
    try {
      execFileSync(command[0], command[1], { cwd, stdio: 'inherit' });
      results.push({ check, status: 'PASS' });
    } catch (error) {
      results.push({ check, status: 'FAIL', classification: 'TEST/ENGINEERING FAILURE', exit_code: error.status ?? 1 });
      throw Object.assign(new Error(`Engineering validation failed: ${check}`), { results });
    }
  }
  return results;
}

function createTempRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'core-test-contract-'));
  runGit(['init', '-b', 'main'], dir);
  runGit(['config', 'user.email', 'contract-test@example.invalid'], dir);
  runGit(['config', 'user.name', 'Contract Test'], dir);
  return dir;
}

function writeFixture(repo, relativePath, content) {
  const target = path.join(repo, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
}

function commitFixture(repo, message) {
  runGit(['add', '--', '.'], repo);
  runGit(['commit', '-m', message], repo);
  return runGit(['rev-parse', 'HEAD'], repo);
}

export function analyzeRepository({ base, candidate, cwd = REPO_ROOT }) {
  const { mergeBase, changed } = collectChangedFiles(base, candidate, cwd);
  const impact = classifyChangedFiles(changed, cwd);
  impact.changedFiles = changed;
  const plan = buildPlan({ base, candidate, mergeBase, impact, cwd });
  validatePlan(plan);
  return plan;
}

export function runSelfTest() {
  const repo = createTempRepo();
  try {
    writeFixture(repo, 'src/core/permissions/permissionMatrix.ts', "export type UserRole = 'admin' | 'operator';\nexport const permissionMatrix = { admin: [], operator: [] };\n");
    writeFixture(repo, 'src/router.tsx', "const routes = [{ path: '/admin' }, { path: '/operator' }];\n");
    writeFixture(repo, 'package.json', '{"scripts":{"build":"true","lint":"true","test":"node -e \\\"\\\""}}');
    const baseline = commitFixture(repo, 'baseline');

    writeFixture(repo, 'README.md', '# documentation change\n');
    const docsCommit = commitFixture(repo, 'docs: update readme');
    const docsPlan = analyzeRepository({ base: baseline, candidate: docsCommit, cwd: repo });
    if (docsPlan.regression_level !== 'R0') throw new Error(`Self-test docs expected R0, got ${docsPlan.regression_level}`);

    writeFixture(repo, 'src/features/admin/Panel.tsx', 'export const Panel = () => null;\n');
    const sourceCommit = commitFixture(repo, 'feat: add admin panel');
    const sourcePlan = analyzeRepository({ base: docsCommit, candidate: sourceCommit, cwd: repo });
    if (sourcePlan.regression_level !== 'R2') throw new Error(`Self-test source expected R2, got ${sourcePlan.regression_level}`);
    if (!sourcePlan.required_e2e.includes('playwright-real-world-workflow')) throw new Error('Self-test source expected E2E requirement');

    writeFixture(repo, 'supabase/migrations/001_test.sql', 'alter table example add column value text;\n');
    const dbCommit = commitFixture(repo, 'db: add migration');
    const dbPlan = analyzeRepository({ base: sourceCommit, candidate: dbCommit, cwd: repo });
    if (dbPlan.regression_level !== 'R3') throw new Error(`Self-test db expected R3, got ${dbPlan.regression_level}`);
    if (!dbPlan.database_impact) throw new Error('Self-test db expected database impact');

    writeFixture(repo, 'src/core/permissions/permissionMatrix.ts', "export type UserRole = 'admin' | 'operator';\nexport const permissionMatrix = { admin: [], operator: [] };\nexport const security = 'PermissionGuard';\n");
    const securityCommit = commitFixture(repo, 'security: adjust permissions');
    const securityPlan = analyzeRepository({ base: dbCommit, candidate: securityCommit, cwd: repo });
    if (securityPlan.regression_level !== 'R3') throw new Error(`Self-test security expected R3, got ${securityPlan.regression_level}`);
    if (securityPlan.required_negative_tests.length === 0) throw new Error('Self-test security expected negative tests');

    writeFixture(repo, 'src/features/reception/A.tsx', 'import X from "../doctor/B"; export const A = X;\n');
    const crossCommit = commitFixture(repo, 'feat: cross-module integration');
    const crossPlan = analyzeRepository({ base: securityCommit, candidate: crossCommit, cwd: repo });
    if (!['R2', 'R3'].includes(crossPlan.regression_level)) throw new Error(`Self-test cross-module unexpected ${crossPlan.regression_level}`);

    return { status: 'PASS', scenarios: ['documentation', 'source/UI', 'database', 'security/role', 'cross-module'] };
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
}

function main() {
  const args = parseArgs(process.argv);
  if (args.selfTest) {
    const result = runSelfTest();
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const candidate = args.candidate || process.env.GITHUB_SHA || runGit(['rev-parse', 'HEAD']);
  const base = args.base || (process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'HEAD^');
  const plan = analyzeRepository({ base, candidate, cwd: REPO_ROOT });
  const validation = { plan_valid: true };
  if (args.execute) {
    try {
      validation.engineering = executeEngineering(plan, REPO_ROOT);
    } catch (error) {
      validation.engineering = error.results ?? [];
      plan.closure_state = 'NOT CLOSED';
      if (!args.noWrite) fs.writeFileSync(args.output, JSON.stringify(plan, null, 2) + '\n', 'utf8');
      throw error;
    }
  }
  if (!args.noWrite) fs.writeFileSync(args.output, JSON.stringify(plan, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ plan, validation }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`[test-execution-setup] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
