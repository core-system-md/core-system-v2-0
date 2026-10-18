import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const preparation = readFileSync(new URL('../../supabase/runbooks/prepare_credential_rotation.sql', import.meta.url), 'utf8');
const apply = readFileSync(new URL('../../supabase/runbooks/apply_credential_rotation.sql', import.meta.url), 'utf8');
const runbook = readFileSync(new URL('../../docs/runbooks/credential-rotation.md', import.meta.url), 'utf8');
const bcrypt2bFixture = readFileSync(new URL('../../tests/fixtures/credential-rotation/reject-bcrypt-2b.sql', import.meta.url), 'utf8');
const normalizedBcryptFixture = readFileSync(new URL('../../tests/fixtures/credential-rotation/bcrypt-normalized-login.sql', import.meta.url), 'utf8');
const loginBehavior = readFileSync(new URL('../../tests/fixtures/credential-rotation/login-behavior.sql', import.meta.url), 'utf8');
const schemaFixture = readFileSync(new URL('../../tests/fixtures/credential-rotation/schema-fixture.sql', import.meta.url), 'utf8');
const fix002Migration = readFileSync(new URL('../../supabase/migrations/20261018123700_fix_002_hash_pins_and_lock_secret_columns.sql', import.meta.url), 'utf8');
const fix002Rollback = readFileSync(new URL('../../supabase/runbooks/rollback_fix_002_hash_pins_and_lock_secret_columns.sql', import.meta.url), 'utf8');
const securityFixture = readFileSync(new URL('../../tests/fixtures/credential-rotation/security-privileges.sql', import.meta.url), 'utf8');
const rehearsal = readFileSync(new URL('../../tools/rehearse-credential-rotation.mjs', import.meta.url), 'utf8');
const followups = readFileSync(new URL('../../docs/runbooks/fix-002-followups.md', import.meta.url), 'utf8');
const authProvider = readFileSync(new URL('../../src/core/auth/AuthProvider.tsx', import.meta.url), 'utf8');
const authStore = readFileSync(new URL('../../src/shared/store/authStore.ts', import.meta.url), 'utf8');
const supabaseClient = readFileSync(new URL('../../src/infrastructure/supabase/client.ts', import.meta.url), 'utf8');
const syncEngine = readFileSync(new URL('../../src/core/offline/SyncEngine.ts', import.meta.url), 'utf8');

function satisfiesHashedPinContract(definition) {
  const referencesHash = /\bpin_hash\b|\bverify_pin_hash\b/i.test(definition);
  const plaintextComparison = /(?:\b[a-z_][a-z_0-9]*\.)?\bpin_code\s*=\s*p_pin\b|\bp_pin\s*=\s*(?:\b[a-z_][a-z_0-9]*\.)?\bpin_code\b/i;
  return referencesHash && !plaintextComparison.test(definition);
}

describe('credential rotation runbook safety contract', () => {
  it('keeps session-scoped staging and parameter-bound loading documented', () => {
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

  it('accepts only the pgcrypto-compatible $2a$ staged hash prefix', () => {
    const stagedHashLine = apply.split(/\r?\n/).find((line) => line.includes('s.pin_hash !~'));
    expect(stagedHashLine).toBeDefined();
    expect(stagedHashLine).toContain('2a');
    expect(stagedHashLine).not.toContain('2b');
    expect(stagedHashLine).not.toContain('[ab]');
    expect(apply).toContain('hash is not an accepted $2a$ bcrypt hash');
    expect(bcrypt2bFixture).toContain('__RUNTIME_BCRYPT_2B_HASH__');
    expect(runbook).toContain('Never stage a raw `$2b$` hash');
  });

  it('rejects a mixed hashed/plaintext function contract even if hash is referenced', () => {
    expect(apply).toMatch(/v_total_functions/);
    expect(apply).toMatch(/v_hash_aware_functions/);
    expect(apply).toMatch(/v_plaintext_functions/);
    expect(apply).toContain('WHERE definition ~*');
    expect(apply).toMatch(/FIX-002 is not verified/i);

    const compliant = 'SELECT * FROM clinic_users WHERE tenant_id = p_tenant_id AND pin_hash = crypt(p_pin, pin_hash)';
    const legacyMixed = 'SELECT * FROM clinic_users WHERE tenant_id = p_tenant_id AND pin_hash = crypt(p_pin, pin_hash) AND clinic_users.pin_code = p_pin';
    const legacyPlaintext = 'SELECT * FROM clinic_users WHERE clinic_users.pin_code = p_pin';

    expect(satisfiesHashedPinContract(compliant)).toBe(true);
    expect(satisfiesHashedPinContract(legacyPlaintext)).toBe(false);
    expect(satisfiesHashedPinContract(legacyMixed)).toBe(false);
  });

  it('rehearses the real FIX-002 login definitions, not boolean stubs', () => {
    expect(schemaFixture).not.toMatch(/CREATE OR REPLACE FUNCTION public\.create_pin_session/i);
    expect(rehearsal).toContain('20261018123700_fix_002_hash_pins_and_lock_secret_columns.sql');
    expect(rehearsal).toContain("runFile(resolve(fixtureDir, 'login-behavior.sql')");
    expect(loginBehavior).toContain('public.create_pin_session(v_state.tenant_id,v_state.synthetic_pin_a)');
    expect(loginBehavior).toContain("public.create_pin_session(v_state.tenant_id,'REHEARSAL-B',v_state.synthetic_pin_b)");
    expect(loginBehavior).toContain('extensions.crypt(v_state.synthetic_pin_b,v_hash)');
    expect(loginBehavior).toContain('pg_get_functiondef');
    expect(loginBehavior).toContain("attempted_pin IS DISTINCT FROM '****'");
    expect(normalizedBcryptFixture).toContain('__RUNTIME_SYNTHETIC_PIN__');
    expect(normalizedBcryptFixture).toContain('__RUNTIME_WRONG_PIN__');
    expect(normalizedBcryptFixture).toContain('__RUNTIME_BCRYPT_2A_HASH__');
    expect(normalizedBcryptFixture).toContain("v_result->>'success'");
    expect(normalizedBcryptFixture).toContain('ROLLBACK;');
    expect(runbook).toMatch(/correct synthetic PIN/i);
    expect(runbook).toMatch(/wrong PIN/i);
    expect(runbook).toMatch(/trim\(p_pin\)/i);
    expect(runbook).toMatch(/::text.*casts/i);
  });
  it('soft-revokes tenant sessions and checks revocation in postflight', () => {
    expect(apply).toMatch(/UPDATE public\.pin_sessions ps[\s\S]*?SET deleted_at = NOW\(\)[\s\S]*?ps\.tenant_id/);
    expect(apply).toMatch(/ps\.deleted_at IS NULL/);
    expect(apply).toMatch(/Postflight failed: one or more live PIN sessions remain/);
  });

  it('documents rotation exclusions assigned to FIX-002', () => {
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
  it('backfills valid pgcrypto hashes and enforces secret-column privileges', () => {
    expect(fix002Migration).toContain("extensions.crypt(u.pin_code, extensions.gen_salt('bf', 12))");
    expect(fix002Migration).toContain("v_schema IS DISTINCT FROM 'extensions'");
    const bodies = fix002Migration.split('CREATE OR REPLACE FUNCTION public.create_pin_session(').slice(1);
    expect(bodies).toHaveLength(2);
    for (const body of bodies) {
      const definition = body.split('$function$;')[0];
      expect(definition).not.toMatch(/\bpin_code\b/i);
      expect(definition).toContain('SECURITY DEFINER');
      expect(definition).toContain("SET search_path = ''");
      expect(definition).toContain('extensions.crypt(p_pin, u.pin_hash) = u.pin_hash');
    }
    expect(fix002Migration).toContain('REVOKE SELECT ON TABLE public.clinic_users FROM PUBLIC, anon, authenticated');
    expect(fix002Migration).toContain('REVOKE SELECT (');
    expect(fix002Migration).toContain('GRANT SELECT (');
    expect(fix002Migration).toContain('attempted_pin, success, ip_address');
    expect(fix002Migration).toContain('REVOKE EXECUTE ON FUNCTION public.validate_pin(uuid, text) FROM PUBLIC, anon, authenticated');
    expect(fix002Migration).toContain('REVOKE EXECUTE ON FUNCTION public.validate_pin(jsonb) FROM PUBLIC, anon, authenticated');
  });

  it('includes isolated role/privilege tests and a manual, tested rollback contract', () => {
    expect(securityFixture).toContain('SET ROLE anon');
    expect(securityFixture).toContain('SET ROLE authenticated');
    expect(securityFixture).toContain('super_admin');
    expect(securityFixture).toContain('clinic_admin');
    expect(securityFixture).toContain('doctor');
    expect(securityFixture).toContain('receptionist');
    expect(securityFixture).toContain('rls_users_insert_admin');
    expect(securityFixture).toContain('rls_users_update_admin');
    expect(securityFixture).toContain('public.update_clinic_user_role');
    expect(fix002Rollback).toContain('NEVER AUTO-RUN');
    expect(fix002Rollback).toContain('pin_code = p_pin');
    expect(followups).toContain('ALTER TABLE public.clinic_users DROP COLUMN pin_code');
    expect(followups).toContain('ALTER TABLE public.clinic_users DROP COLUMN password');
    expect(followups).toContain('DELETE FROM public.pin_attempt_log');
  });

  it('removes PIN from client auth state and redacts local sync/log writes', () => {
    expect(authProvider).not.toMatch(/\.from\('clinic_users'\)\s*\.select\('\*'\)/);
    expect(authProvider).not.toContain('pin_code: profile.pin_code');
    expect(authStore).not.toMatch(/pin_code\??:/);
    expect(authStore).toContain('stripLegacyPinCode');
    expect(authStore).toContain('migrate: (persistedState)');
    expect(authStore).toContain('delete safeUser.pin_code');
    expect(supabaseClient).toContain("attempted_pin: '****'");
    expect(supabaseClient).not.toMatch(/attempted_pin:\s*pinCode/);
    expect(syncEngine).toContain("table === 'clinic_users'");
    expect(syncEngine).toContain('selectedColumns');
  });

});
