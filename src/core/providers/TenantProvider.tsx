// ============================================================
// CORE SYSTEM v2.1 — TenantProvider
// Bridges AuthProvider ↔ tenantStore. Loads tenant data when auth changes.
// NEW: 2026-07-01 — Created to sync auth state with tenant data
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
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // ── Load tenant when tenant_id changes ──
  useEffect(() => {
    console.log('[TENANT FLOW] tenantId changed', { tenantId, hasData: !!tenantData });
    if (tenantId) {
      if (tenantData) {
        console.log('[TENANT FLOW] using cached tenantData');
        setTenantId(tenantId, tenantData);
      } else {
        console.log('[TENANT FLOW] calling setTenantId (fallback)');
        setTenantId(tenantId);
      }
    } else {
      console.log('[TENANT FLOW] clearing tenant');
      clearTenant();
    }
  }, [tenantId, tenantData, setTenantId, clearTenant]);

  // ── Clear tenant on logout ──
  useEffect(() => {
    if (!isAuthenticated && !tenantId) {
      clearTenant();
    }
  }, [isAuthenticated, tenantId, clearTenant]);

  return <>{children}</>;
}

export default TenantProvider;