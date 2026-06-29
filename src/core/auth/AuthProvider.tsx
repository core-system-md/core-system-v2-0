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
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  tenantId: null,
  role: null,
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
    login: () => { /* delegated to useAuth hook */ },
    logout: () => store.logout(),
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
  
  // Use selector for stable subscription to isAuthenticated
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const tenantId = useAuthStore((s) => s.tenant_id);

  // ── Initialize: Sync persisted store with Supabase session ──
  useEffect(() => {
    // Guard against double initialization in StrictMode
    if (initialized.current) return;
    initialized.current = true;

    const initAuth = async () => {
      // Use getState() to avoid stale closure
      const store = useAuthStore.getState();
      store.setLoading(true);

      try {
        // Check Supabase session (official source)
        const session = await getCurrentSession();

        if (session?.user) {
          // Supabase has a session — verify it matches our store
          const jwtTenantId = session.user.user_metadata?.tenant_id;
          const jwtRole = session.user.user_metadata?.user_role;

          // Validate claims exist and are correct types
          if (
            typeof jwtTenantId === 'string' &&
            isValidUserRole(jwtRole)
          ) {
            // Valid session — populate store
            store.setUser({
              id: session.user.id,
              full_name: String(session.user.user_metadata?.full_name || ''),
              role: jwtRole,
              tenant_id: jwtTenantId,
              email: session.user.email || undefined,
            });
            store.setStatus('authenticated');
          } else {
            // Session exists but missing or invalid claims → invalidate
            await supabase.auth.signOut();
            store.logout();
          }
        } else {
          // No Supabase session — check if we have persisted license
          // (Zustand persist already loaded tenant_id from localStorage)
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

    // ── Subscribe to Supabase auth state changes ──
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Use getState() to always get fresh store reference
        const store = useAuthStore.getState();

        if (event === 'SIGNED_OUT') {
          store.logout();
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Session refreshed — update if needed
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
          // Handle initial session event (same logic as initAuth)
          const jwtTenantId = session.user.user_metadata?.tenant_id;
          const jwtRole = session.user.user_metadata?.user_role;

          if (
            typeof jwtTenantId === 'string' &&
            isValidUserRole(jwtRole)
          ) {
            store.setUser({
              id: session.user.id,
              full_name: String(session.user.user_metadata?.full_name || ''),
              role: jwt
