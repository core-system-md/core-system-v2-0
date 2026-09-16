#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const planPath = path.resolve(process.argv[2] ?? 'test-execution-plan.json');
const payload = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const plan = payload.plan ?? payload;

function run(command, args, env = process.env) {
  console.log(`[validation] ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit', env });
  if (result.error) throw new Error(`Environment failure while running ${command}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Validation failure: ${command} exited with ${result.status}`);
}

const engineeringCommands = {
  build: ['npm', ['run', 'build']],
  lint: ['npm', ['run', 'lint']],
  typecheck: ['npx', ['tsc', '--noEmit']],
  unit_tests: ['npm', ['test']],
  integration_tests: ['npm', ['run', 'e2e:full']],
  api_tests: ['node', ['tools/api-validation.mjs']],
  migration_validation: ['node', ['tools/migration-validation.mjs', '--apply']],
  database_validation: ['node', ['tools/migration-validation.mjs', '--apply']],
};

const requiredEngineering = Array.isArray(plan.required_engineering) ? plan.required_engineering : [];
const requiredE2E = Array.isArray(plan.required_e2e) ? plan.required_e2e : [];
const requiredNegative = Array.isArray(plan.required_negative_tests) ? plan.required_negative_tests : [];
const requiredReconciliation = Array.isArray(plan.required_reconciliation) ? plan.required_reconciliation : [];
const runsFullE2EAsEngineering = requiredEngineering.includes('integration_tests');

for (const check of requiredEngineering) {
  const command = engineeringCommands[check];
  if (!command) {
    throw new Error(`NOT VERIFIED: required engineering validation '${check}' has no executable repository-native runner.`);
  }
  run(command[0], command[1]);
}

const browserValidationRequired = requiredE2E.length > 0 || requiredNegative.length > 0 || requiredReconciliation.length > 0;

if (browserValidationRequired) {
  if (process.env.TEST_EXECUTION_RUN_E2E !== 'true') {
    throw new Error('NOT VERIFIED: browser validation is required by the Decision Engine. Set TEST_EXECUTION_RUN_E2E=true in an explicitly provisioned isolated environment.');
  }

  // integration_tests is repository-mapped to the complete Playwright workflow.
  // Do not execute the mutating E2E suite a second time in the same isolated run.
  if (!runsFullE2EAsEngineering) {
    run('npm', ['run', 'e2e:full']);
  }
}

if (requiredNegative.length > 0 && !fs.existsSync(path.join(ROOT, 'e2e/security-negative.spec.mjs'))) {
  throw new Error('NOT VERIFIED: required negative/security suite is missing.');
}

if (requiredReconciliation.length > 0 && !fs.existsSync(path.join(ROOT, 'e2e/reconcile.mjs'))) {
  throw new Error('NOT VERIFIED: required reconciliation runner is missing.');
}

console.log('[validation] Selected scope completed.');
