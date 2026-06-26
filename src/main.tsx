import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './core/auth/AuthProvider'
import { PinAuthProvider } from './core/auth/PinAuthProvider'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { Toaster } from 'sonner'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PinAuthProvider>
          <RouterProvider router={router} />
          <Toaster position="top-right" richColors />
        </PinAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
)

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister()
    })
  })
}
