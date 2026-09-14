import { spawnSync } from 'node:child_process';

function run(command, args, env) {
  console.log(`[e2e] ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit', env });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

const mutationEnv = { ...process.env, E2E_ALLOW_MUTATION: 'true' };
let exitCode = 0;
let seeded = false;

const suites = [
  'e2e/patient-journey.spec.mjs',
  'e2e/role-routes.spec.mjs',
  'e2e/security-negative.spec.mjs',
];

try {
  const initialSeed = spawnSync('node', ['e2e/seed.mjs'], { stdio: 'inherit', env: mutationEnv });
  if (initialSeed.error) throw initialSeed.error;
  if (initialSeed.status !== 0) exitCode = initialSeed.status ?? 1;
  else seeded = true;

  if (seeded) {
    for (const suite of suites) {
      const suiteSeed = run('node', ['e2e/seed.mjs'], mutationEnv);
      if (suiteSeed !== 0) {
        exitCode = exitCode || suiteSeed;
        continue;
      }

      const suiteResult = run('npx', ['playwright', 'test', suite], process.env);
      if (suiteResult !== 0) exitCode = exitCode || suiteResult;
    }

    if (exitCode === 0) {
      exitCode = run('node', ['e2e/reconcile.mjs'], process.env);
    }
  }
} finally {
  if (seeded) {
    const reset = spawnSync('node', ['e2e/reset.mjs'], { stdio: 'inherit', env: mutationEnv });
    if (reset.error) {
      console.error(`[e2e] cleanup error: ${reset.error.message}`);
      exitCode = exitCode || 1;
    } else if (reset.status !== 0) {
      exitCode = exitCode || reset.status || 1;
    }
  }
}

process.exit(exitCode);
