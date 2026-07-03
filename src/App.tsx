// ============================================================
// CORE SYSTEM v2.1 — App.tsx
// Root providers: Query, Auth, Tenant, PinAuth, Realtime, Router, Toaster.
// FIXED: 2026-07-01 — Added TenantProvider + RealtimeProvider, fixed provider nesting order
// Constitution §1: React 18+ + Vite + TypeScript (strict)
// Constitution §3: Folder structure — core/ NEVER imports from features/.
// ============================================================

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/core/auth/AuthProvider';
import { TenantProvider } from '@/core/providers/TenantProvider';
import { RealtimeProvider } from '@/core/providers/RealtimeProvider';
import { Router } from '@/router';
import { Toaster } from 'sonner';

class AppErrorBoundary extends React.Component<React.PropsWithChildren, { hasError: boolean }> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[App] Render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
          <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 text-center shadow-sm">
            <h1 className="text-xl font-bold text-[#1B2A4A]">حدث خطأ أثناء عرض التطبيق</h1>
            <p className="mt-2 text-sm text-gray-600">تم تعطيل العرض المتقدم مؤقتًا حتى يتم إصلاح المشكلة.</p>
            <button
              className="mt-4 rounded bg-[#1B2A4A] px-4 py-2 text-sm text-white"
              onClick={() => window.location.reload()}
            >
              إعادة التحميل
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
        <AuthProvider>
          <TenantProvider>
            <RealtimeProvider>\n            <AppErrorBoundary>
              <Router />
              <Toaster position="top-right" richColors />
            </AppErrorBoundary>\n          </RealtimeProvider>
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
