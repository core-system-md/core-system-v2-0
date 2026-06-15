// src/core/realtime/RealtimeProvider.tsx
// Supabase Realtime channels manager

import { createContext, useContext, useEffect, useRef } from 'react';
import { supabase } from '../../infrastructure/supabase/client';

interface RealtimeContextValue {
  subscribeToTable: (table: string, callback: (payload: unknown) => void) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  useEffect(() => {
    return () => {
      // Cleanup all channels on unmount
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, []);

  const subscribeToTable = (table: string, callback: (payload: unknown) => void) => {
    const channel = supabase
      .channel(`public:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
      .subscribe();

    channelsRef.current.push(channel);
    return () => supabase.removeChannel(channel);
  };

  return (
    <RealtimeContext.Provider value={{ subscribeToTable }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeContext() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtimeContext must be inside RealtimeProvider');
  return ctx;
}
