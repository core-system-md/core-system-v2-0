import { useAuthContext } from './AuthProvider';

export function useAuth() {
  const auth = useAuthContext();
  
  return {
    isAuthenticated: !!auth.userId,
    isLoading: auth.isLoading,
    userId: auth.userId,
    email: null,
    fullName: auth.fullName,
    role: auth.role,
    tenantId: auth.tenantId,
    logout: () => {
      localStorage.removeItem('core_pin_auth');
      window.location.href = '/login';
    },
    login: { isPending: false },
    isPending: false,
  };
}
