// src/core/events/EventBus.ts
// Typed pub/sub — zero external dependencies

type EventCallback<T = unknown> = (payload: T) => void;

class EventBus {
  private listeners = new Map<string, Set<EventCallback>>();

  on<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback);

    return () => {
      this.listeners.get(event)?.delete(callback as EventCallback);
    };
  }

  emit<T>(event: string, payload: T): void {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;
    callbacks.forEach((cb) => cb(payload));
  }

  off(event: string): void {
    this.listeners.delete(event);
  }
}

export const eventBus = new EventBus();

// Typed events
export const EVENTS = {
  APPOINTMENT_CREATED: 'appointment:created',
  SESSION_STATUS_CHANGED: 'session:status_changed',
  PAYMENT_COLLECTED: 'payment:collected',
  BREACH_DETECTED: 'breach:detected',
  QUEUE_REORDERED: 'queue:reordered',
} as const;
