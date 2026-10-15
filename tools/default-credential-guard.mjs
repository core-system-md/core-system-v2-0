const isolatedFixturePath = 'e2e/fixtures/staff.mjs';
const isolatedFixtureMarker = 'ISOLATED E2E ONLY';

function isLabeledIsolatedFixture(path, content) {
  return path.replaceAll('\\', '/') === isolatedFixturePath
    && content.split(/\r?\n/).slice(0, 8).some((line) => line.includes(isolatedFixtureMarker));
}

/**
 * Find credential-like literals without including matched values in findings.
 * Any four-digit scalar next to a PIN/authentication field is prohibited outside
 * the explicitly labelled synthetic E2E staff fixture.
 */
export function findDefaultCredentialReferences(path, content) {
  if (isLabeledIsolatedFixture(path, content)) return [];

  const findings = [];
  const lines = content.split(/\r?\n/);
  const pinContext = /\bpin\b|pin[_-]?code|p_pin|loginwithpin|default.{0,20}pin|default.{0,20}credential/i;
  const fourDigitScalar = /(?:['"`]\s*\d{4}\s*['"`]|\b\d{4}\b)/;
  const demoLicense = /\bDEMO\s*[-_]\s*LICENSE\s*[-_]\s*\d{4}\b/i;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (demoLicense.test(line)) {
      findings.push({ path, line: index + 1, kind: 'demo license key' });
    }
    const codeComment = /\\.(?:ts|tsx|js|jsx|mjs|cjs|sql)$/i.test(path)
      && /^\\s*(?:\\/\\/|--|\\/\\*|\\*)/.test(line);
    const issueDateComment = codeComment
      && /(?:FIXED|BUG|ISSUE)[^\\n]{0,32}\\b\\d{4}-\\d{2}-\\d{2}\\b/i.test(line);
    if (!issueDateComment && pinContext.test(line) && fourDigitScalar.test(line)) {
      findings.push({ path, line: index + 1, kind: 'four-digit PIN literal' });
    }
  }

  return findings;
}
