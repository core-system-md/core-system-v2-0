import { describe, expect, it } from 'vitest';
import {
  getDefaultRoute,
  hasPermission,
  permissionMatrix,
} from '../src/core/permissions/permissionMatrix';

describe('permission matrix contract', () => {
  it('keeps revenue access on the established view_invoices permission', () => {
    expect(hasPermission('super_admin', 'view_invoices')).toBe(true);
    expect(hasPermission('clinic_admin', 'view_invoices')).toBe(true);
    expect(hasPermission('receptionist', 'view_invoices')).toBe(true);
    expect(hasPermission('doctor', 'view_invoices')).toBe(false);
  });

  it('grants receptionist inquiry access without exposing it to the clinical roles', () => {
    expect(hasPermission('receptionist', 'view_inquiries')).toBe(true);
    expect(hasPermission('receptionist', 'edit_inquiries')).toBe(true);
    expect(hasPermission('doctor', 'view_inquiries')).toBe(false);
    expect(hasPermission('doctor', 'edit_inquiries')).toBe(false);
  });

  it('keeps receptionist away from clinical scoring and administration domains', () => {
    expect(hasPermission('receptionist', 'edit_sessions')).toBe(false);
    expect(hasPermission('receptionist', 'view_analytics')).toBe(false);
    expect(hasPermission('receptionist', 'view_staff')).toBe(false);
    expect(hasPermission('receptionist', 'view_inventory')).toBe(false);
    expect(hasPermission('receptionist', 'view_settings')).toBe(false);
    expect(hasPermission('receptionist', 'view_audit')).toBe(false);
    expect(hasPermission('receptionist', 'super_admin_access')).toBe(false);
  });

  it('keeps analytics access separate from invoice access for receptionist and doctor roles', () => {
    expect(hasPermission('clinic_admin', 'view_analytics')).toBe(true);
    expect(hasPermission('super_admin', 'view_analytics')).toBe(true);
    expect(hasPermission('receptionist', 'view_analytics')).toBe(false);
    expect(hasPermission('doctor', 'view_analytics')).toBe(false);
  });

  it('keeps every role permission list free of duplicates', () => {
    for (const permissions of Object.values(permissionMatrix)) {
      expect(new Set(permissions).size).toBe(permissions.length);
    }
  });

  it('preserves role default routes', () => {
    expect(getDefaultRoute('super_admin')).toBe('/super-admin');
    expect(getDefaultRoute('clinic_admin')).toBe('/admin');
    expect(getDefaultRoute('doctor')).toBe('/doctor');
    expect(getDefaultRoute('receptionist')).toBe('/reception');
    expect(getDefaultRoute(undefined)).toBe('/login');
  });
});
