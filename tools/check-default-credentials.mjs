import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { findDefaultCredentialReferences } from './default-credential-guard.mjs';

function trackedFiles() {
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
}

let files;
try {
  files = trackedFiles();
} catch {
  console.error('[credential-guard] Could not enumerate tracked Git files.');
  process.exit(2);
}

if (files.length === 0) {
  console.error('[credential-guard] No tracked files found; refusing to report success.');
  process.exit(2);
}

const findings = [];
for (const path of files) {
  let content;
  try {
    content = readFileSync(path, 'utf8');
  } catch {
    console.error('[credential-guard] Could not read a tracked file; refusing to report success.');
    process.exit(2);
  }

  // Ignore binary files instead of interpreting arbitrary bytes as source text.
  if (content.includes('\0')) continue;
  findings.push(...findDefaultCredentialReferences(path, content));
}

if (findings.length > 0) {
  console.error(`[credential-guard] FAILED: ${findings.length} prohibited credential reference(s) found.`);
  for (const item of findings) {
    console.error(`- ${item.path}:${item.line}: ${item.kind}`);
  }
  process.exit(1);
}

console.log(`[credential-guard] PASS: scanned ${files.length} tracked files; no prohibited default credential references found.`);
