// src/core/auth/AuthProvider.tsx
// Simplified: Zustand is now the Single Source of Truth. Context is no longer needed for Auth.
import { ReactNode } from 'react';

export function AuthProvider({ children }: { children: ReactNode }) {
  // Zustand handles everything globally. No Context Provider logic needed.
  return <>{children}</>;
}

export default AuthProvider;
// DO NOT export useAuth from here anymore. It comes from @/core/auth/useAuth.ts
