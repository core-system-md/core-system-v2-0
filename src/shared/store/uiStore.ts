// src/shared/store/uiStore.ts
// Zustand: modals, toasts, kiosk mode, offline banner

import { create } from 'zustand';

export type ModalType = 'patient_lookup' | 'quick_invoice' | 'new_inquiry' | 'confirm_action' | null;

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

export interface UiState {
  // Modal
  activeModal: ModalType;
  modalData: Record<string, unknown> | null;

  // Toasts
  toasts: Toast[];

  // Kiosk
  isKioskMode: boolean;
  kioskIdleSeconds: number;

  // Offline
  isOffline: boolean;

  // Actions
  openModal: (modal: ModalType, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  addToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  setKioskMode: (active: boolean) => void;
  setOffline: (offline: boolean) => void;
}

let toastIdCounter = 0;

export const useUiStore = create<UiState>()((set) => ({
  activeModal: null,
  modalData: null,
  toasts: [],
  isKioskMode: false,
  kioskIdleSeconds: 0,
  isOffline: false,

  openModal: (modal, data) => set({ activeModal: modal, modalData: data || null }),

  closeModal: () => set({ activeModal: null, modalData: null }),

  addToast: (message, type, duration = 4000) => {
    const id = `toast-${++toastIdCounter}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  setKioskMode: (active) => set({ isKioskMode: active, kioskIdleSeconds: 0 }),

  setOffline: (offline) => set({ isOffline: offline }),
}));
