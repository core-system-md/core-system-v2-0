// ============================================================
// CORE SYSTEM v2.1 — App.tsx
// Root providers: Query, Auth, Tenant, PinAuth, Realtime, Router, Toaster.
// FIXED: 2026-07-01 — Added TenantProvider + RealtimeProvider, fixed provider nesting order
// Constitution §1: React 18+ + Vite + TypeScript (strict)
// Constitution §3: Folder structure — core/ NEVER imports from features/.
// ============================================================

import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/core/auth/AuthProvider';
import { PinAuthProvider } from '@/core/auth/PinAuthProvider';
import { TenantProvider } from '@/core/providers/TenantProvider';
import { RealtimeProvider } from '@/core/providers/RealtimeProvider';
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
          {/* TenantProvider = Loads tenant data after auth */}
          <TenantProvider>
            {/* PinAuthProvider = Kiosk mode, completes session */}
            <PinAuthProvider>
              {/* RealtimeProvider = Supabase realtime subscriptions */}
              <RealtimeProvider>
                <Router />
                {/* Sonner = OFFICIAL toast for Shadcn/UI (Constitution §1) */}
                <Toaster position="top-right" richColors />
              </RealtimeProvider>
            </PinAuthProvider>
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
