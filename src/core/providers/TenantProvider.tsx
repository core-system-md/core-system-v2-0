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
  const setTenantId = useTenantStore((s) => s.setTenantId);
  const clearTenant = useTenantStore((s) => s.clearTenant);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // ── Load tenant when tenant_id changes ──
  useEffect(() => {
    if (tenantId) {
      setTenantId(tenantId);
    } else {
      clearTenant();
    }
  }, [tenantId, setTenantId, clearTenant]);

  // ── Clear tenant on logout ──
  useEffect(() => {
    if (!isAuthenticated && !tenantId) {
      clearTenant();
    }
  }, [isAuthenticated, tenantId, clearTenant]);

  return <>{children}</>;
}

export default TenantProvider;
