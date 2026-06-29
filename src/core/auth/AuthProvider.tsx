// ============================================================
// CORE SYSTEM v2.1 — AuthProvider
// SINGLE SOURCE OF SESSION for the entire application.
// Constitution §1: React 18+ + Vite + TypeScript (strict)
// Constitution §9: Security — RLS, JWT Claims, PIN Auth.
// 
// Responsibilities:
//   1. Initialize auth state from persisted store (license/tenant only)
//   2. Sync with Supabase session on mount
//   3. Provide Context for backward compatibility
//   4. Handle session expiry and refresh.
//
// DOES NOT:
//   - Handle PIN logic (that's PinAuthProvider + useAuth)
//   - Read from LocalStorage directly (Zustand persist handles that)
//   - Create multiple session sources.
// ============================================================

import { useEffect, useRef, createContext, useContext } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { supabase, getCurrentSession } from '@/infrastructure/supabase/client';
import type { UserRole, AuthUser } from '@/shared/types/auth';

interface AuthProviderProps {
  children: React.ReactNode;
}

// ── Context for backward compatibility ──
interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  tenantId: string | null;
  role: UserRole | null;
  fullName: string;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  tenantId: null,
  role: null,
  fullName: '',
  logout: () => {},
});

// ── Hook: useAuthContext (backward compatibility) ──
export function useAuthContext(): AuthContextValue {
  return useContext(AuthContext);
}

// ── Hook: useAuth (backward compatibility) ──
export function useAuth() {
  const store = useAuthStore();
  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    tenantId: store.tenant_id,
    role: store.user?.role ?? null,
    userRole: store.user?.role ?? null,
    fullName: store.user?.full_name ?? '',
    login: () => { /* delegated to useAuth hook */ },
    logout: () => store.logout(),
    signOut: () => store.logout(),
  };
}

// ── Type Guard: Validate JWT role against allowed roles ──
const VALID_ROLES: readonly UserRole[] = ['super_admin', 'clinic_admin', 'doctor', 'receptionist'];

function isValidUserRole(role: unknown): role is UserRole {
  return typeof role === 'string' && VALID_ROLES.includes(role as UserRole);
}

// ── Error Helper ──
function isErrorWithMessage(err: unknown): err is { message: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as Record<string, unknown>).message === 'string'
  );
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (isErrorWithMessage(err)) return err.message;
  return fallback;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const initialized = useRef(false);
  
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const tenantId = useAuthStore((s) => s.tenant_id);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initAuth = async () => {
      const store = useAuthStore.getState();
      store.setLoading(true);

      try {
        const session = await getCurrentSession();

        if (session?.user) {
          const jwtTenantId = session.user.user_metadata?.tenant_id;
          const jwtRole = session.user.user_metadata?.user_role;

          if (
            typeof jwtTenantId === 'string' &&
            isValidUserRole(jwtRole)
          ) {
            store.setUser({
              id: session.user.id,
              full_name: String(session.user.user_metadata?.full_name || ''),
              role: jwtRole,
              tenant_id: jwtTenantId,
              email: session.user.email || undefined,
            });
            store.setStatus('authenticated');
          } else {
            await supabase.auth.signOut();
            store.logout();
          }
        } else {
          const currentTenantId = store.tenant_id;
          if (currentTenantId) {
            store.setStatus('license_valid');
          } else {
            store.setStatus('idle');
          }
        }
      } catch (err: unknown) {
        console.error('AuthProvider init error:', getErrorMessage(err, 'Unknown error'));
        const store = useAuthStore.getState();
        store.setError('فشل في تهيئة المصادقة. يرجى تحديث الصفحة.');
        store.setStatus('error');
      } finally {
        const store = useAuthStore.getState();
        store.setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const store = useAuthStore.getState();

        if (event === 'SIGNED_OUT') {
          store.logout();
        } else if (event === 'TOKEN_REFRESHED' && session) {
          const jwtTenantId = session.user.user_metadata?.tenant_id;
          const jwtRole = session.user.user_metadata?.user_role;

          if (
            typeof jwtTenantId === 'string' &&
            isValidUserRole(jwtRole) &&
            store.user
          ) {
            store.setUser({
              ...store.user,
              id: session.user.id,
              tenant_id: jwtTenantId,
              role: jwtRole,
            });
          }
        } else if (event === 'INITIAL_SESSION' && session) {
          const jwtTenantId = session.user.user_metadata?.tenant_id;
          const jwtRole = session.user.user_metadata?.user_role;

          if (
            typeof jwtTenantId === 'string' &&
            isValidUserRole(jwtRole)
          ) {
            store.setUser({
              id: session.user.id,
              full_name: String(session.user.user_metadata?.full_name || ''),
              role: jwtRole,
              tenant_id: jwtTenantId,
              email: session.user.email || undefined,
            });
            store.setStatus('authenticated');
          }
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!isAuthenticated) return;
      
      try {
        const session = await getCurrentSession();
        if (!session) {
          useAuthStore.getState().logout();
        }
      } catch (err: unknown) {
        console.error('Periodic session sync error:', getErrorMessage(err, 'Unknown error'));
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const contextValue: AuthContextValue = {
    user,
    isAuthenticated,
    isLoading,
    tenantId,
    role: user?.role ?? null,
    fullName: user?.full_name ?? '',
    logout: () => useAuthStore.getState().logout(),
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
