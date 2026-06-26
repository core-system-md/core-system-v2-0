import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/infrastructure/supabase/client";

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
  signInWithPin: (pin: string, role: string) => Promise<{ success: boolean; role?: string; error?: string }>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  refreshTenantId: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const PIN_AUTH_KEY = "core_pin_auth";
const LEGACY_TENANT_KEY = "tenant_id";
const PIN_EXPIRY_HOURS = 24;

function getFromAppMeta(session: Session | null, key: string): string | null {
  if (!session) return null;
  return (session.user.app_metadata?.[key] as string) || null;
}

function getTenantIdFromLocalStorage(): string | null {
  const directTenantId = localStorage.getItem(LEGACY_TENANT_KEY);
  if (directTenantId && directTenantId !== "null" && directTenantId !== "undefined") {
    return directTenantId;
  }
  const pinData = localStorage.getItem(PIN_AUTH_KEY);
  if (pinData) {
    try {
      const parsed = JSON.parse(pinData);
      if (parsed.tenant_id && parsed.tenant_id !== "null" && parsed.tenant_id !== "undefined") {
        return parsed.tenant_id;
      }
    } catch { /* ignore */ }
  }
  return null;
}

function getPinAuthData() {
  const pinData = localStorage.getItem(PIN_AUTH_KEY);
  if (!pinData) return { user_id: null, role: null, full_name: null, tenant_id: null, expiry: null };
  try {
    const parsed = JSON.parse(pinData);
    return {
      user_id: parsed.user_id || null,
      role: parsed.role || null,
      full_name: parsed.full_name || null,
      tenant_id: parsed.tenant_id || null,
      expiry: parsed.expiry || null,
    };
  } catch {
    return { user_id: null, role: null, full_name: null, tenant_id: null, expiry: null };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPinAuthenticated, setIsPinAuthenticated] = useState(false);
  const [pinExpiry, setPinExpiry] = useState<number | null>(null);
  const [pinRole, setPinRole] = useState<string | null>(null);
  const [pinTenantId, setPinTenantId] = useState<string | null>(null);
  const [storageVersion, setStorageVersion] = useState(0);

  const tenantIdFromSession = getFromAppMeta(session, "tenant_id");
  const tenantIdFromStorage = getTenantIdFromLocalStorage();
  const tenantId = tenantIdFromSession || tenantIdFromStorage || pinTenantId;
  const userRole = getFromAppMeta(session, "user_role") || pinRole;
  const isAuthenticated = !!user || isPinAuthenticated;

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === PIN_AUTH_KEY || e.key === LEGACY_TENANT_KEY) {
        console.log("[AuthProvider] localStorage changed:", e.key);
        setStorageVersion(v => v + 1);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    const pinData = getPinAuthData();
    if (pinData.expiry && Date.now() < pinData.expiry) {
      setIsPinAuthenticated(true);
      setPinExpiry(pinData.expiry);
      setPinRole(pinData.role);
      setPinTenantId(pinData.tenant_id);
    } else if (pinData.expiry && Date.now() >= pinData.expiry) {
      localStorage.removeItem(PIN_AUTH_KEY);
      setIsPinAuthenticated(false);
      setPinExpiry(null);
      setPinRole(null);
      setPinTenantId(null);
    }
  }, [storageVersion]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);
      setUser(s?.user ?? null);

      const pinData = getPinAuthData();
      if (pinData.expiry && Date.now() < pinData.expiry) {
        setIsPinAuthenticated(true);
        setPinExpiry(pinData.expiry);
        setPinRole(pinData.role);
        setPinTenantId(pinData.tenant_id);
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

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.session) throw new Error("No session");
    try {
      await supabase.functions.invoke("auth-metadata-sync", {
        headers: { Authorization: `Bearer ${data.session.access_token}` }
      });
      await supabase.auth.refreshSession();
    } catch (e) {
      console.error("Metadata sync failed:", e);
    }
  };

  const signInWithPin = async (pin: string, role: string) => {
    const currentTenantId = tenantId || getTenantIdFromLocalStorage();
    if (!currentTenantId) {
      return { success: false, error: "No tenant context. Please validate license first." };
    }

    const { data, error } = await supabase.rpc("validate_pin", {
      params: { p_tenant_id: currentTenantId, p_pin: pin, p_role: role },
    });

    if (error) {
      console.error("validate_pin RPC error:", error);
      return { success: false, error: error.message || "Invalid PIN" };
    }

    let pinData: any;
    if (data && typeof data === "object") {
      pinData = data.data !== undefined ? data.data : data;
    } else if (Array.isArray(data) && data.length > 0) {
      pinData = data[0];
    } else {
      return { success: false, error: "Invalid PIN response format" };
    }

    if (!pinData?.success) {
      return { success: false, error: pinData?.message || "Invalid PIN" };
    }

    const expiry = Date.now() + PIN_EXPIRY_HOURS * 60 * 60 * 1000;
    localStorage.setItem(PIN_AUTH_KEY, JSON.stringify({
      user_id: pinData.user_id,
      role: pinData.role,
      full_name: pinData.full_name,
      tenant_id: currentTenantId,
      employee_code: pinData.employee_code,
      expiry,
    }));
    localStorage.setItem(LEGACY_TENANT_KEY, currentTenantId);

    setIsPinAuthenticated(true);
    setPinExpiry(expiry);
    setPinRole(pinData.role);
    setPinTenantId(currentTenantId);
    setStorageVersion(v => v + 1);

    return { success: true, role: pinData.role };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(PIN_AUTH_KEY);
    localStorage.removeItem(LEGACY_TENANT_KEY);
    setUser(null);
    setSession(null);
    setIsPinAuthenticated(false);
    setPinExpiry(null);
    setPinRole(null);
    setPinTenantId(null);
  };

  const logout = signOut;
  const refreshTenantId = useCallback(() => getTenantIdFromLocalStorage(), []);

  return (
    <AuthContext.Provider value={{
      user, session,
      userId: user?.id || getPinAuthData().user_id,
      email: user?.email || null,
      fullName: getFromAppMeta(session, "full_name") || getPinAuthData().full_name,
      tenantId, userRole, role: userRole,
      isLoading, isAuthenticated, isPinAuthenticated, pinExpiry,
      signInWithEmail, signInWithPin, signOut, logout, setUser, refreshTenantId,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export const useAuthContext = useAuth;
export default AuthProvider;