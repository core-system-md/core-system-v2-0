// src/shared/store/queueStore.ts
// Zustand: live queue state + drag-drop reorder + hot-swap

import { create } from 'zustand';

export interface QueueItem {
  sessionId: string;
  patientId: string;
  patientName: string;
  priority: 'low_priority' | 'medium_priority' | 'high_priority' | 'qualified' | 'hot_lead';
  slaStatus: 'green' | 'yellow' | 'red';
  waitMinutes: number;
  lockHolderId: string | null;
  lockHolderName: string | null;
  roomId: string | null;
  doctorId: string | null;
  procedureName: string | null;
  coreScoreDisplay: number | null;
}

export interface QueueState {
  items: QueueItem[];
  selectedSessionId: string | null;
  isLoading: boolean;

  // Actions
  setItems: (items: QueueItem[]) => void;
  updateItem: (sessionId: string, partial: Partial<QueueItem>) => void;
  removeItem: (sessionId: string) => void;
  reorderItem: (fromIndex: number, toIndex: number) => void;
  selectSession: (sessionId: string | null) => void;
  setLoading: (loading: boolean) => void;
  getById: (sessionId: string) => QueueItem | undefined;
  getActiveCount: () => number;
  getRedCount: () => number;
}

export const useQueueStore = create<QueueState>()((set, get) => ({
  items: [],
  selectedSessionId: null,
  isLoading: true,

  setItems: (items) => set({ items, isLoading: false }),

  updateItem: (sessionId, partial) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.sessionId === sessionId ? { ...item, ...partial } : item
      ),
    })),

  removeItem: (sessionId) =>
    set((state) => ({
      items: state.items.filter((item) => item.sessionId !== sessionId),
    })),

  reorderItem: (fromIndex, toIndex) =>
    set((state) => {
      const items = [...state.items];
        const [moved] = items.splice(fromIndex, 1) as [QueueItem | undefined];
      if (!moved) return { items };
      items.splice(toIndex, 0, moved);
      return { items };
    }),

  selectSession: (sessionId) => set({ selectedSessionId: sessionId }),

  setLoading: (loading) => set({ isLoading: loading }),

  getById: (sessionId) => get().items.find((i) => i.sessionId === sessionId),

  getActiveCount: () => get().items.length,

  getRedCount: () => get().items.filter((i) => i.slaStatus === 'red').length,
}));
