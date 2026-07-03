import { useAuthStore } from '@/shared/store/authStore';

export function useRole() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? null;

  const isSuperAdmin = role === 'super_admin';
  const isClinicAdmin = role === 'clinic_admin';
  const isDoctor = role === 'doctor';
  const isReceptionist = role === 'receptionist';
  const isAdmin = isSuperAdmin || isClinicAdmin;

  return {
    role,
    isSuperAdmin,
    isClinicAdmin,
    isDoctor,
    isReceptionist,
    isAdmin,
    isStaff: !!role,
  };
}
