import { useTenantStore } from '../store/tenantStore';

export function useTenant() {
  const { tenantId, clinicName, subscriptionTier, primaryColor, fetchTenant } = useTenantStore();
  
  return {
    tenantId,
    tenantName: clinicName, // Alias for backward compatibility
    clinicName,
    subscriptionTier,
    primaryColor,
    refreshTenant: fetchTenant
  };
}
