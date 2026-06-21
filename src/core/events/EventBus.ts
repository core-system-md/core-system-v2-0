// src/core/events/EventBus.ts
// Typed pub/sub event bus — no external dependencies

export type EventCallback<T = any> = (payload: T) => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  subscribe<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit<T>(event: string, payload: T): void {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;
    callbacks.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[EventBus] Error in listener for ${event}:`, err);
      }
    });
  }

  once<T>(event: string, callback: EventCallback<T>): void {
    const unsubscribe = this.subscribe<T>(event, (payload) => {
      unsubscribe();
      callback(payload);
    });
  }

  clear(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

export const eventBus = new EventBus();

export const EVENTS = {
  APPOINTMENT_CREATED: 'appointment:created',
  SESSION_STATUS_CHANGED: 'session:status_changed',
  PAYMENT_COLLECTED: 'payment:collected',
  BREACH_DETECTED: 'breach:detected',
  QUEUE_UPDATED: 'queue:updated',
  SCORE_COMPUTED: 'score:computed',
  PATIENT_ARRIVED: 'patient:arrived',
  INVOICE_PAID: 'invoice:paid',
} as const;
