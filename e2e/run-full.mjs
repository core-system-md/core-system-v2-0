import { spawnSync } from 'node:child_process';

function run(command, args) {
  console.log(`[e2e] ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

const mutationEnv = { ...process.env, E2E_ALLOW_MUTATION: 'true' };
let exitCode = 0;
let seeded = false;

try {
  const seed = spawnSync('node', ['e2e/seed.mjs'], { stdio: 'inherit', env: mutationEnv });
  if (seed.error) throw seed.error;
  if (seed.status !== 0) exitCode = seed.status ?? 1;
  else seeded = true;

  if (exitCode === 0) {
    exitCode = run('npm', ['run', 'e2e:test']);
  }

  if (exitCode === 0) {
    exitCode = run('node', ['e2e/reconcile.mjs']);
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
