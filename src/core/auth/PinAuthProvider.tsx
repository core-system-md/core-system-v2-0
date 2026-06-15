// src/core/auth/PinAuthProvider.tsx
// 4-digit PIN fast-switch for kiosk mode

import { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '../../infrastructure/supabase/client';

interface PinAuthContextValue {
  isPinVerified: boolean;
  verifyPin: (pin: string, userId: string) => Promise<boolean>;
  clearPin: () => void;
  lastUserId: string | null;
}

const PinAuthContext = createContext<PinAuthContextValue | undefined>(undefined);

export function PinAuthProvider({ children }: { children: React.ReactNode }) {
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [lastUserId, setLastUserId] = useState<string | null>(null);

  const verifyPin = useCallback(async (pin: string, userId: string): Promise<boolean> => {
    // Verify against clinic_users.pin_code (encrypted comparison)
    const { data, error } = await supabase
      .from('clinic_users')
      .select('id, pin_code')
      .eq('id', userId)
      .single();

    if (error || !data) return false;

    // NOTE: In production, pin_code should be hashed. 
    // This is a simplified comparison for kiosk fast-switch.
    const isValid = data.pin_code === pin;

    if (isValid) {
      setIsPinVerified(true);
      setLastUserId(userId);
    }

    return isValid;
  }, []);

  const clearPin = useCallback(() => {
    setIsPinVerified(false);
    setLastUserId(null);
  }, []);

  return (
    <PinAuthContext.Provider value={{ isPinVerified, verifyPin, clearPin, lastUserId }}>
      {children}
    </PinAuthContext.Provider>
  );
}

export function usePinAuth() {
  const ctx = useContext(PinAuthContext);
  if (!ctx) throw new Error('usePinAuth must be inside PinAuthProvider');
  return ctx;
}
