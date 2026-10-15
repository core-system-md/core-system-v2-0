import { describe, expect, it } from 'vitest';
import { findDefaultCredentialReferences } from '../../tools/default-credential-guard.mjs';

const pinOne = String.fromCharCode(49, 50, 51, 52);
const pinTwo = String.fromCharCode(53, 54, 55, 56);
const pinThree = String.fromCharCode(48, 48, 48, 48);
const demoLicense = ['DEMO', 'LICENSE', '2024'].join('-');

describe('default credential guard', () => {
  it('detects a four-digit PIN value assigned to a PIN field without echoing the value', () => {
    const findings = findDefaultCredentialReferences(
      'supabase/seed/demo_data.sql',
      `INSERT INTO clinic_users (pin_code) VALUES ('${pinOne}');`,
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ path: 'supabase/seed/demo_data.sql', line: 1, kind: 'four-digit PIN literal' });
    expect(JSON.stringify(findings)).not.toContain(pinOne);
  });

  it('detects a default PIN stored in a camelCase variable', () => {
    expect(findDefaultCredentialReferences(
      'src/auth.ts',
      `const defaultPin = '${pinTwo}';`,
    )).toHaveLength(1);
  });

  it('detects each documented four-digit default used in PIN context', () => {
    for (const pin of [pinOne, pinTwo, pinThree]) {
      expect(findDefaultCredentialReferences('TEST_CHECKLIST.md', `PIN login with ${pin}`)).toHaveLength(1);
    }
  });

  it('detects a demo license pattern without storing the whole key in the guard', () => {
    const findings = findDefaultCredentialReferences(
      'TEST_CHECKLIST.md',
      `license_key = '${demoLicense}'`,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('demo license key');
    expect(JSON.stringify(findings)).not.toContain(demoLicense);
  });

  it('ignores unrelated UUID substrings when they are not credential values', () => {
    expect(findDefaultCredentialReferences(
      'e2e/fixtures/tenant.mjs',
      "export const tenant = '20000000-0000-4000-8000-000000000001';",
    )).toHaveLength(0);
  });

  it('only exempts the named fixture while its isolated-test label is present', () => {
    const fixture = 'e2e/fixtures/staff.mjs';
    expect(findDefaultCredentialReferences(
      fixture,
      `// ISOLATED E2E ONLY — synthetic test accounts\nexport const pin = '${pinOne}';`,
    )).toHaveLength(0);
    expect(findDefaultCredentialReferences(
      fixture,
      `export const pin = '${pinOne}';`,
    )).toHaveLength(1);
  });
});
