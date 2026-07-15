// ============================================================
// CORE SYSTEM v2.1 — TenantProvider
// Bridges AuthProvider ↔ tenantStore. Loads tenant data when auth changes.
// NEW: 2026-07-09 — Reads tenantData from authStore to bypass RLS re-query
// FIX: 2026-07-15 — Removed redundant second useEffect (BUG 7)
// Constitution §2.7: ALL queries MUST include tenant_id
// ============================================================

import { useEffect } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { useTenantStore } from '@/shared/store/tenantStore';

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const tenantId = useAuthStore((s) => s.tenant_id);
  const tenantData = useAuthStore((s) => s.tenantData);
  const setTenantId = useTenantStore((s) => s.setTenantId);
  const clearTenant = useTenantStore((s) => s.clearTenant);

  // ── Sync tenant store with auth store tenant state ──
  useEffect(() => {
    console.log('[TENANT FLOW] tenantId changed', { tenantId, hasTenantData: !!tenantData });
    if (tenantId) {
      if (tenantData) {
        // Use cached tenant data from authStore (bypasses RLS re-query)
        console.log('[TENANT FLOW] using cached tenantData from authStore');
        setTenantId(tenantId, tenantData);
      } else {
        console.log('[TENANT FLOW] calling setTenantId without data');
        setTenantId(tenantId);
      }
    } else {
      console.log('[TENANT FLOW] clearing tenant');
      clearTenant();
    }
  }, [tenantId, tenantData, setTenantId, clearTenant]);

  return <>{children}</>;
}

export default TenantProvider;