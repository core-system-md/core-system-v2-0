import { useState } from "react";
import { useNetworkStatus } from "@/shared/hooks/useNetworkStatus";
import { WifiOff, X } from "lucide-react";

export default function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if online or dismissed
  if (isOnline || isDismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/20 border-b border-amber-500/30 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        <div className="flex items-center gap-3">
          <WifiOff className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <p className="text-amber-300 text-sm md:text-base font-medium">
            Offline Mode — changes will sync when connected
          </p>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 hover:bg-amber-500/20 rounded-lg text-amber-400 hover:text-amber-300 transition-colors flex-shrink-0"
          aria-label="Dismiss offline warning"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}