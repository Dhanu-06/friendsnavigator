import { EventEmitter } from 'events';
import type { FirestorePermissionError } from './errors';

// Define the event map for type-safe event emitting.
type EventMap = {
  'permission-error': (error: FirestorePermissionError) => void;
};

class TypedEventEmitter {
  private emitter = new EventEmitter();

  on<E extends keyof EventMap>(event: E, listener: EventMap[E]): void {
    this.emitter.on(event, listener);
  }

  off<E extends keyof EventMap>(event: E, listener: EventMap[E]): void {
    this.emitter.off(event, listener);
  }

  emit<E extends keyof EventMap>(event: E, ...args: Parameters<EventMap[E]>): void {
    this.emitter.emit(event, ...args);
  }
}

// Create a singleton instance of the typed event emitter.
export const errorEmitter = new TypedEventEmitter();
