import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  userId: string | null;
  fullName: string | null;
  role: string | null;
  tenantId: string | null;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  userId: null,
  fullName: null,
  role: null,
  tenantId: null,
  isLoading: true,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthContextType>({
    userId: null,
    fullName: null,
    role: null,
    tenantId: null,
    isLoading: true,
    logout: () => {
      localStorage.removeItem('core_pin_auth');
      window.location.href = '/login';
    },
  });

  useEffect(() => {
    const pinData = localStorage.getItem('core_pin_auth');
    if (pinData) {
      try {
        const parsed = JSON.parse(pinData);
        if (parsed.expiry && Date.now() < parsed.expiry) {
          setAuth(prev => ({
            ...prev,
            userId: parsed.user_id || null,
            fullName: parsed.full_name || null,
            role: parsed.role || null,
            tenantId: parsed.tenant_id || null,
            isLoading: false,
          }));
        } else {
          localStorage.removeItem('core_pin_auth');
          setAuth(prev => ({ ...prev, isLoading: false }));
        }
      } catch {
        setAuth(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setAuth(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}

// FIX: Export useAuth for backward compatibility
export function useAuth() {
  return useAuthContext();
}
