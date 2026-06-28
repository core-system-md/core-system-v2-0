// src/core/auth/PinAuthProvider.tsx
// NEUTRALIZED: Logic moved to @/core/auth/useAuth.ts + @/shared/store/authStore.ts
// Context is no longer used for Auth per Constitution §1 (Zustand only).

import React from 'react';

export function PinAuthProvider({ children }: { children: React.ReactNode }) {
  // Zustand is now the Single Source of Truth. 
  // This component is kept only to prevent App.tsx crash if it's still wrapped.
  return <>{children}</>;
}

// DO NOT export usePinAuth anymore. Use useAuth from @/core/auth/useAuth.ts instead.
