import type { FirestorePermissionError } from './errors';

type EventMap = {
  'permission-error': (error: FirestorePermissionError) => void;
};

class TypedEventEmitter {
  private handlers: { [K in keyof EventMap]?: Set<EventMap[K]> } = {};

  on<E extends keyof EventMap>(event: E, listener: EventMap[E]): void {
    if (!this.handlers[event]) this.handlers[event] = new Set();
    this.handlers[event]!.add(listener);
  }

  off<E extends keyof EventMap>(event: E, listener: EventMap[E]): void {
    this.handlers[event]?.delete(listener);
  }

  emit<E extends keyof EventMap>(event: E, arg: Parameters<EventMap[E]>[0]): void {
    const set = this.handlers[event];
    if (!set || set.size === 0) return;
    for (const fn of set) fn(arg);
  }
}

export const errorEmitter = new TypedEventEmitter();
