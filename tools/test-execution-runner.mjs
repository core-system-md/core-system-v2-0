#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const planPath = path.resolve(process.argv[2] ?? 'test-execution-plan.json');
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));

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
  migration_validation: ['node', ['tools/migration-validation.mjs', '--apply']],
  api_tests: ['node', ['tools/api-validation.mjs']],
  integration_tests: ['node', ['tools/integration-validation.mjs']],
  database_validation: ['node', ['tools/database-validation.mjs']],
};

for (const check of plan.required_engineering) {
  const command = engineeringCommands[check];
  if (!command) throw new Error(`NOT VERIFIED: required engineering validation '${check}' has no executable repository-native runner.`);
  run(command[0], command[1]);
}

if (plan.required_e2e.length > 0 || plan.required_negative_tests.length > 0 || plan.required_reconciliation.length > 0) {
  if (process.env.TEST_EXECUTION_RUN_E2E !== 'true') {
    throw new Error('NOT VERIFIED: browser validation is required by the Decision Engine. Set TEST_EXECUTION_RUN_E2E=true in an explicitly provisioned isolated environment.');
  }
  run('npm', ['run', 'e2e:full']);
}

if (plan.required_negative_tests.length > 0 && !fs.existsSync(path.join(ROOT, 'e2e/security-negative.spec.mjs'))) {
  throw new Error('NOT VERIFIED: required negative/security suite is missing.');
}

if (plan.required_reconciliation.length > 0 && !fs.existsSync(path.join(ROOT, 'e2e/reconcile.mjs'))) {
  throw new Error('NOT VERIFIED: required reconciliation runner is missing.');
}

console.log('[validation] Selected scope completed.');
