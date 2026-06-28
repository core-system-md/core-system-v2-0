// ============================================================
// CORE SYSTEM v2.1 — AuthProvider
// SINGLE SOURCE OF SESSION for the entire application.
// Constitution §1: React 18+ + Vite + TypeScript (strict)
// Constitution §9: Security — RLS, JWT Claims, PIN Auth.
// 
// Responsibilities:
//   1. Initialize auth state from persisted store (license/tenant only)
//   2. Sync with Supabase session on mount
//   3. Provide NO Context — Zustand is the single source.
//   4. Handle session expiry and refresh.
//
// DOES NOT:
//   - Handle PIN logic (that's PinAuthProvider + useAuth)
//   - Read from LocalStorage directly (Zustand persist handles that)
//   - Create multiple session sources.
// ============================================================

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { supabase, getCurrentSession } from '@/infrastructure/supabase/client';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const initialized = useRef(false);
  const store = useAuthStore();

  // ── Initialize: Sync persisted store with Supabase session ──
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initAuth = async () => {
      store.setLoading(true);

      try {
        // Check Supabase session (official source)
        const session = await getCurrentSession();

        if (session?.user) {
          // Supabase has a session — verify it matches our store
          const jwtTenantId = session.user.user_metadata?.tenant_id as string | undefined;
          const jwtRole = session.user.user_metadata?.user_role as string | undefined;

          if (jwtTenantId && jwtRole) {
            // Valid session — populate store
            store.setUser({
              id: session.user.id,
              full_name: session.user.user_metadata?.full_name as string || '',
              role: jwtRole as any,
              tenant_id: jwtTenantId,
              email: session.user.email || undefined,
            });
            store.setStatus('authenticated');
          } else {
            // Session exists but missing claims → invalidate
            await supabase.auth.signOut();
            store.logout();
          }
        } else {
          // No Supabase session — check if we have persisted license
          // (Zustand persist already loaded tenant_id from localStorage)
          if (store.tenant_id) {
            store.setStatus('license_valid');
          } else {
            store.setStatus('idle');
          }
        }
      } catch (err) {
        console.error('AuthProvider init error:', err);
        store.setError('فشل في تهيئة المصادقة. يرجى تحديث الصفحة.');
        store.setStatus('error');
      } finally {
        store.setLoading(false);
      }
    };

    initAuth();

    // ── Subscribe to Supabase auth state changes ──
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          store.logout();
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Session refreshed — update if needed
          const jwtTenantId = session.user.user_metadata?.tenant_id as string | undefined;
          const jwtRole = session.user.user_metadata?.user_role as string | undefined;
          
          if (jwtTenantId && jwtRole && store.user) {
            store.setUser({
              ...store.user,
              id: session.user.id,
              tenant_id: jwtTenantId,
              role: jwtRole as any,
            });
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Run once on mount

  // ── Periodic session sync (every 5 minutes) ──
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!store.isAuthenticated) return;
      
      try {
        const session = await getCurrentSession();
        if (!session) {
          // Session expired
          store.logout();
        }
      } catch (err) {
        console.error('Periodic session sync error:', err);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [store.isAuthenticated]);

  return <>{children}</>;
}
