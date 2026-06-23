// ============================================================
// AuthProvider.tsx — CORE SYSTEM v2.1
// Blueprint: src/core/auth/AuthProvider.tsx
// Purpose: Supabase Auth + JWT claims injection (app_metadata)
// ============================================================

import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/infrastructure/supabase/client";

// ── Types — Blueprint Compliant ──────────────────────────────
interface AuthContextType {
  user: User | null;
  session: Session | null;
  userId: string | null;
  email: string | null;
  fullName: string | null;
  tenantId: string | null;
  userRole: string | null;
  role: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPinAuthenticated: boolean;
  pinExpiry: number | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithPin: (pin: string) => Promise<{ success: boolean; role?: string; error?: string }>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Constants ──────────────────────────────────────────────
const PIN_AUTH_KEY = "core_pin_auth";
const PIN_EXPIRY_HOURS = 24;

// ── Helper: Get from app_metadata (secure, server-readonly) ─
function getFromAppMeta(session: Session | null, key: string): string | null {
  if (!session) return null;
  return (session.user.app_metadata?.[key] as string) || null;
}

// ── Helper: Get tenant_id from localStorage (PIN auth fallback) ─
function getTenantIdFromLocalStorage(): string | null {
  const pinData = localStorage.getItem(PIN_AUTH_KEY);
  if (pinData) {
    try {
      const parsed = JSON.parse(pinData);
      return parsed.tenant_id || null;
    } catch {
      return null;
    }
  }
  return null;
}

// ── Provider — Blueprint Compliant ───────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPinAuthenticated, setIsPinAuthenticated] = useState(false);
  const [pinExpiry, setPinExpiry] = useState<number | null>(null);

  // Derived values
  const userId = user?.id || null;
  const email = user?.email || null;
  const fullName = getFromAppMeta(session, "full_name");
  // FIX: Read tenantId from app_metadata OR localStorage (PIN auth fallback)
  const tenantId = getFromAppMeta(session, "tenant_id") || getTenantIdFromLocalStorage();
  const userRole = getFromAppMeta(session, "user_role");
  const isAuthenticated = !!user;

  // ── Initialize ─────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);
      setUser(s?.user ?? null);

      const pinData = localStorage.getItem(PIN_AUTH_KEY);
      if (pinData) {
        try {
          const parsed = JSON.parse(pinData);
          if (parsed.expiry && Date.now() < parsed.expiry) {
            setIsPinAuthenticated(true);
            setPinExpiry(parsed.expiry);
          } else {
            localStorage.removeItem(PIN_AUTH_KEY);
          }
        } catch {
          localStorage.removeItem(PIN_AUTH_KEY);
        }
      }
      setIsLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // ── Email Sign In — with app_metadata sync ─────────────────
  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.session) throw new Error("No session");

    // Sync app_metadata via Edge Function (Migration 017 fix)
    try {
      await supabase.functions.invoke("auth-metadata-sync", {
        headers: { Authorization: `Bearer ${data.session.access_token}` }
      });
      await supabase.auth.refreshSession();
    } catch (e) {
      console.error("Metadata sync failed:", e);
    }
  };

  // ── PIN Sign In ────────────────────────────────────────────
  const signInWithPin = async (pin: string): Promise<{ success: boolean; role?: string; error?: string }> => {
    if (!tenantId) return { success: false, error: "No tenant context" };

    const { data, error } = await supabase.rpc("validate_pin", {
      p_tenant_id: tenantId,
      p_pin_code: pin
    });

    if (error || !data) return { success: false, error: error?.message || "Invalid PIN" };

    const expiry = Date.now() + PIN_EXPIRY_HOURS * 60 * 60 * 1000;
    // FIX: Store tenant_id in localStorage for PIN auth
    localStorage.setItem(PIN_AUTH_KEY, JSON.stringify({
      user_id: data.id,
      role: data.role,
      full_name: data.full_name,
      tenant_id: tenantId,  // ← ADDED: Store tenant_id for later retrieval
      expiry
    }));

    setIsPinAuthenticated(true);
    setPinExpiry(expiry);
    return { success: true, role: data.role };
  };

  // ── Sign Out ───────────────────────────────────────────────
  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(PIN_AUTH_KEY);
    setUser(null);
    setSession(null);
    setIsPinAuthenticated(false);
    setPinExpiry(null);
  };

  const logout = signOut;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userId,
        email,
        fullName,
        tenantId,
        userRole,
        role: userRole,
        isLoading,
        isAuthenticated,
        isPinAuthenticated,
        pinExpiry,
        signInWithEmail,
        signInWithPin,
        signOut,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hooks — Blueprint Compliant ──────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// Backward compatibility aliases
export const useAuthContext = useAuth;
