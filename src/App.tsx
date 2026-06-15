import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/core/auth/AuthProvider";
import { PinAuthProvider } from "@/core/auth/PinAuthProvider";
import { RealtimeProvider } from "@/core/realtime/RealtimeProvider";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import OfflineBanner from "@/components/OfflineBanner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PinAuthProvider>
          <RealtimeProvider>
            <OfflineBanner />
            <RouterProvider router={router} />
          </RealtimeProvider>
        </PinAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;