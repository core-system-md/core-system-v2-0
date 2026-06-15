// src/core/offline/NetworkMonitor.ts
// Polls every 5s; 3 failures → offline

import { useEffect, useState, useRef } from 'react';
import { syncEngine } from './SyncEngine';

const POLL_INTERVAL_MS = 5000;
const FAILURE_THRESHOLD = 3;

export function useNetworkMonitor() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const failuresRef = useRef(0);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Lightweight ping to Supabase
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const response = await fetch('/api/health', {
          method: 'HEAD',
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          failuresRef.current = 0;
          if (!isOnline) {
            setIsOnline(true);
            // Trigger sync on reconnect
            setIsSyncing(true);
            await syncEngine.sync();
            setIsSyncing(false);
          }
        } else {
          failuresRef.current++;
        }
      } catch {
        failuresRef.current++;
      }

      if (failuresRef.current >= FAILURE_THRESHOLD && isOnline) {
        setIsOnline(false);
      }
    };

    // Initial check
    checkConnection();

    const interval = setInterval(checkConnection, POLL_INTERVAL_MS);

    const handleOnline = () => {
      failuresRef.current = 0;
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline]);

  return { isOnline, isSyncing };
}
