import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/core/auth/AuthProvider";
import { PinAuthProvider } from "@/core/auth/PinAuthProvider";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PinAuthProvider>
          <RouterProvider router={router} />
        </PinAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;