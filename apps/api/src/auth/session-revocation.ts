import { EventEmitter } from 'node:events';

// One API process today. Keep this internal event independent of Nest modules
// to avoid a Users -> Messages -> Users dependency cycle.
const events = new EventEmitter();

export function notifySessionRevoked(userId: string): void {
  events.emit('revoked', userId);
}

export function subscribeSessionRevoked(listener: (userId: string) => void): () => void {
  events.on('revoked', listener);
  return () => { events.off('revoked', listener); };
}
