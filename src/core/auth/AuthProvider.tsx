// Supabase Auth + JWT claims injection for RLS

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, getCurrentUserWithClaims } from '../../infrastructure/supabase/client';
import type { UserRole } from '../../shared/types/database';

export interface AuthContextValue {
  userId: string | null;
  email: string | null;
  fullName: string | null;
  role: UserRole | null;
  tenantId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  setUser: (user: { userId: string; email: string | null; fullName: string | null; role: UserRole; tenantId: string }) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Omit<AuthContextValue, 'logout' | 'setUser'>>({
    userId: null,
    email: null,
    fullName: null,
    role: null,
    tenantId: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    getCurrentUserWithClaims().then((user) => {
      if (user?.tenantId) {
        setState({
          userId: user.id,
          email: user.email ?? null,
          fullName: user.fullName ?? null,
          role: user.role as UserRole,
          tenantId: user.tenantId,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState((s) => ({ ...s, isLoading: false, isAuthenticated: false }));
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const meta = session.user.user_metadata;
        setState({
          userId: session.user.id,
          email: session.user.email ?? null,
          fullName: meta?.full_name ?? null,
          role: meta?.user_role as UserRole,
          tenantId: meta?.tenant_id as string,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState({
          userId: null,
          email: null,
          fullName: null,
          role: null,
          tenantId: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setState({
      userId: null,
      email: null,
      fullName: null,
      role: null,
      tenantId: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, []);

  const setUser = useCallback((user: { userId: string; email: string | null; fullName: string | null; role: UserRole; tenantId: string }) => {
    setState({
      userId: user.userId,
      email: user.email,
      fullName: user.fullName ?? null,
      role: user.role,
      tenantId: user.tenantId,
      isLoading: false,
      isAuthenticated: true,
    });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
}
