import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const preparation = readFileSync(new URL('../../supabase/runbooks/prepare_credential_rotation.sql', import.meta.url), 'utf8');
const apply = readFileSync(new URL('../../supabase/runbooks/apply_credential_rotation.sql', import.meta.url), 'utf8');
const runbook = readFileSync(new URL('../../docs/runbooks/credential-rotation.md', import.meta.url), 'utf8');

function satisfiesHashedPinContract(definition) {
  const referencesHash = /\bpin_hash\b|\bverify_pin_hash\b/i.test(definition);
  const plaintextComparison = /(?:\b[a-z_][a-z_0-9]*\.)?\bpin_code\s*=\s*p_pin\b|\bp_pin\s*=\s*(?:\b[a-z_][a-z_0-9]*\.)?\bpin_code\b/i;
  return referencesHash && !plaintextComparison.test(definition);
}

describe('credential rotation runbook safety contract', () => {
  it('keeps sensitive staging session-scoped and requires parameterized staging', () => {
    expect(preparation).toMatch(/CREATE TEMP TABLE mdcore_rotation_staff_stage/i);
    expect(preparation).toMatch(/CREATE TEMP TABLE mdcore_rotation_license_stage/i);
    expect(preparation).toMatch(/ON COMMIT PRESERVE ROWS/i);
    expect(runbook).toMatch(/parameter binding/i);
    expect(runbook).toMatch(/Never run it on production until FIX-002 is merged/i);
  });

  it('is transaction-scoped, tenant-scoped, and idempotent', () => {
    expect(apply.trimStart()).toMatch(/^--[\s\S]*?BEGIN;/);
    expect(apply).toMatch(/IS DISTINCT FROM/i);
    expect(apply).toMatch(/active-user count/i);
    expect(apply).toMatch(/v_stage_users/i);
    expect(apply.trimEnd()).toMatch(/COMMIT;$/i);
  });

  it('checks every create_pin_session overload and rejects a mixed hashed/plaintext definition', () => {
    expect(apply).toMatch(/v_total_functions/);
    expect(apply).toMatch(/v_hash_aware_functions/);
    expect(apply).toMatch(/v_plaintext_functions/);
    expect(apply).toMatch(/pg_get_functiondef/);
    expect(apply).toContain("WHERE definition ~*");
    expect(apply).toMatch(/FIX-002 is not verified/i);
    expect(apply).toMatch(/pin_code = NULL/i);
    expect(preparation).toMatch(/pin_length SMALLINT NOT NULL CHECK \(pin_length >= 6\)/i);

    const compliant = 'SELECT * FROM clinic_users WHERE tenant_id = p_tenant_id AND pin_hash = crypt(p_pin, pin_hash)';
    const legacyMixed = 'SELECT * FROM clinic_users WHERE tenant_id = p_tenant_id AND pin_hash = crypt(p_pin, pin_hash) AND clinic_users.pin_code = p_pin';
    const legacyPlaintext = 'SELECT * FROM clinic_users WHERE clinic_users.pin_code = p_pin';

    expect(satisfiesHashedPinContract(compliant)).toBe(true);
    expect(satisfiesHashedPinContract(legacyPlaintext)).toBe(false);
    // Regression assertion: the hash reference must not hide a plaintext comparison.
    expect(satisfiesHashedPinContract(legacyMixed)).toBe(false);
  });

  it('soft-revokes tenant sessions and checks revocation in postflight', () => {
    expect(apply).toMatch(/UPDATE public\.pin_sessions ps[\s\S]*?SET deleted_at = NOW\(\)[\s\S]*?ps\.tenant_id/);
    expect(apply).toMatch(/ps\.deleted_at IS NULL/);
    expect(apply).toMatch(/Postflight failed: one or more live PIN sessions remain/);
  });

  it('requires FIX-002 hashed PIN contract before applying', () => {
    expect(apply).toMatch(/create_pin_session/i);
    expect(apply).toMatch(/verify_pin_hash/i);
    expect(apply).toMatch(/FIX-002 is not verified/i);
  });

  it('documents scope exclusions carried by FIX-002', () => {
    expect(runbook).toMatch(/clinic_users\.password/);
    expect(runbook).toMatch(/pin_attempt_log\.attempted_pin/);
    expect(runbook).toMatch(/Supabase Auth email\/password accounts/);
    expect(runbook).toMatch(/Git history/);
    expect(runbook).toMatch(/FIX-002/);
  });

  it('contains no destructive statements or security bypasses', () => {
    expect(apply).not.toMatch(/\b(?:DROP|TRUNCATE|DELETE)\s+(?:TABLE|FROM|SCHEMA|FUNCTION|POLICY)\b/i);
    expect(apply).not.toMatch(/DISABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(apply).not.toMatch(/ALTER\s+TABLE\s+.*\s+DROP\s+COLUMN/i);
  });
});
