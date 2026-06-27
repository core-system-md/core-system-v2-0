// ============================================================
// CORE SYSTEM v2.1 — App.tsx
// Root providers: Query, Zustand, Auth, PinAuth, Router, Toaster.
// Constitution §1: React 18+ + Vite + TypeScript (strict)
// Constitution §3: Folder structure — core/ NEVER imports from features/.
// ============================================================

import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/core/auth/AuthProvider';
import { PinAuthProvider } from '@/core/auth/PinAuthProvider';
import { Router } from '@/router';
import { Toaster } from 'sonner';

// Create QueryClient with Constitution-compliant defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
      // ALL queries MUST include tenant_id (Constitution §2.7)
    },
    mutations: {
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* AuthProvider = Single Source of Session */}
        <AuthProvider>
          {/* PinAuthProvider = Kiosk mode, completes session (does NOT create independent session) */}
          <PinAuthProvider>
            <Router />
            {/* Sonner = OFFICIAL toast for Shadcn/UI (Constitution §1) */}
            <Toaster position="top-right" richColors />
          </PinAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
