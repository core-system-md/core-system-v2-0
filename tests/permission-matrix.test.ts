import { describe, expect, it } from 'vitest';
import {
  getDefaultRoute,
  hasPermission,
  permissionMatrix,
  type UserRole,
} from '../src/core/permissions/permissionMatrix';

describe('permission matrix contract', () => {
  it('keeps revenue access on the established view_invoices permission', () => {
    expect(hasPermission('super_admin', 'view_invoices')).toBe(true);
    expect(hasPermission('clinic_admin', 'view_invoices')).toBe(true);
    expect(hasPermission('receptionist', 'view_invoices')).toBe(true);
    expect(hasPermission('doctor', 'view_invoices')).toBe(false);
  });

  it('keeps analytics access separate from invoice access for receptionist and doctor roles', () => {
    expect(hasPermission('clinic_admin', 'view_analytics')).toBe(true);
    expect(hasPermission('super_admin', 'view_analytics')).toBe(true);
    expect(hasPermission('receptionist', 'view_analytics')).toBe(false);
    expect(hasPermission('doctor', 'view_analytics')).toBe(false);
  });

  it('does not expose unknown permissions through the runtime matrix', () => {
    const roles = Object.keys(permissionMatrix) as UserRole[];
    for (const role of roles) {
      expect(permissionMatrix[role]).toEqual(expect.arrayContaining(permissionMatrix[role]));
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
