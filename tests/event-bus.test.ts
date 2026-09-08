import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eventBus, EVENTS } from '../src/core/events/EventBus';

describe('EventBus', () => {
  beforeEach(() => {
    eventBus.clear();
  });

  it('subscribes, emits, and unsubscribes listeners', () => {
    const callback = vi.fn();
    const unsubscribe = eventBus.subscribe('test:event', callback);

    eventBus.emit('test:event', { value: 42 });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({ value: 42 });

    unsubscribe();
    eventBus.emit('test:event', { value: 43 });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('invokes once listeners a single time', () => {
    const callback = vi.fn();
    eventBus.once('test:once', callback);

    eventBus.emit('test:once', 1);
    eventBus.emit('test:once', 2);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(1);
  });

  it('isolates listener exceptions so other listeners still run', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failing = vi.fn(() => {
      throw new Error('listener failed');
    });
    const healthy = vi.fn();

    eventBus.subscribe('test:error', failing);
    eventBus.subscribe('test:error', healthy);
    eventBus.emit('test:error', { ok: true });

    expect(failing).toHaveBeenCalledTimes(1);
    expect(healthy).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });

  it('clears listeners for one event or all events', () => {
    const first = vi.fn();
    const second = vi.fn();

    eventBus.subscribe('test:first', first);
    eventBus.subscribe('test:second', second);
    eventBus.clear('test:first');

    eventBus.emit('test:first', null);
    eventBus.emit('test:second', null);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);

    eventBus.clear();
    eventBus.emit('test:second', null);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('keeps the public SCORE_COMPUTED constant aligned with the emitted score event', () => {
    const callback = vi.fn();
    eventBus.subscribe(EVENTS.SCORE_COMPUTED, callback);

    eventBus.emit('score:calculated', { backend: 850 });

    expect(EVENTS.SCORE_COMPUTED).toBe('score:calculated');
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({ backend: 850 });
  });
});
