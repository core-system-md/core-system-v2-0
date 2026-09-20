// ============================================================
// CORE SYSTEM v2.1 — App.tsx
// Root providers: Query, Auth, Tenant, PinAuth, Realtime, Router, Toaster.
// FIXED: 2026-07-06 — Removed BrowserRouter (createBrowserRouter handles routing)
// Constitution §1: React 18+ + Vite + TypeScript (strict)
// Constitution §3: Folder structure — core/ NEVER imports from features/.
// ============================================================

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from '@/core/auth/AuthProvider';
import { TenantProvider } from '@/core/providers/TenantProvider';
import { RealtimeProvider } from '@/core/providers/RealtimeProvider';
import { Router } from '@/router';
import { Toaster } from 'sonner';
import OfflineBanner from '@/components/OfflineBanner';
import LanguageSwitcher from '@/components/LanguageSwitcher';

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
      return <AppErrorView onReload={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}

function AppErrorView({ onReload }: { onReload: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-primary">{t('error.renderTitle', 'حدث خطأ أثناء عرض التطبيق')}</h1>
        <p className="mt-2 text-sm text-gray-600">
          {t('error.renderDescription', 'تم تعطيل العرض المتقدم مؤقتًا حتى يتم إصلاح المشكلة.')}
        </p>
        <button
          className="mt-4 rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
          onClick={onReload}
        >
          {t('actions.reload')}
        </button>
      </div>
    </div>
  );
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
      {/* BrowserRouter REMOVED — createBrowserRouter in router.tsx handles routing */}
      <AuthProvider>
        <TenantProvider>
          <RealtimeProvider>
            <AppErrorBoundary>
              {/* Root application shell; direction is managed centrally on <html> by i18n. */}
              <div className="min-h-screen bg-primary">
                <div className="pointer-events-none fixed right-3 top-3 z-50">
                  <div className="pointer-events-auto">
                    <LanguageSwitcher />
                  </div>
                </div>
                <OfflineBanner />
                <Router />
                <Toaster position="top-right" richColors />
              </div>
            </AppErrorBoundary>
          </RealtimeProvider>
        </TenantProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}