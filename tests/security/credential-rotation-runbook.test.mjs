import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const preparation = readFileSync(new URL('../../supabase/runbooks/prepare_credential_rotation.sql', import.meta.url), 'utf8');
const apply = readFileSync(new URL('../../supabase/runbooks/apply_credential_rotation.sql', import.meta.url), 'utf8');
const runbook = readFileSync(new URL('../../docs/runbooks/credential-rotation.md', import.meta.url), 'utf8');

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

  it('requires the post-FIX-002 hashed PIN contract before applying', () => {
    expect(apply).toMatch(/create_pin_session/i);
    expect(apply).toMatch(/verify_pin_hash/i);
    expect(apply).toMatch(/FIX-002 is not verified/i);
    expect(apply).toMatch(/pin_code = NULL/i);
    expect(preparation).toMatch(/pin_length SMALLINT NOT NULL CHECK \(pin_length >= 6\)/i);
  });

  it('contains no destructive statements or security bypasses', () => {
    expect(apply).not.toMatch(/\b(?:DROP|TRUNCATE|DELETE)\s+(?:TABLE|FROM|SCHEMA|FUNCTION|POLICY)\b/i);
    expect(apply).not.toMatch(/DISABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(apply).not.toMatch(/ALTER\s+TABLE\s+.*\s+DROP\s+COLUMN/i);
  });
});
