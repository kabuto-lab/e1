import type { Socket } from 'socket.io-client';

interface SessionRecovery {
  getToken: () => string | null;
  refresh: () => Promise<boolean>;
  onUnauthorized: () => void;
  onReady: () => void;
}

/** Renew an expired socket session once; a denied refresh never loops. */
export function bindSocketSession(socket: Socket, options: SessionRecovery): () => void {
  let disposed = false;
  let recovering = false;
  let attemptedSinceReady = false;

  const deny = () => {
    if (disposed) return;
    disposed = true;
    socket.disconnect();
    options.onUnauthorized();
  };
  const ready = () => {
    if (disposed) return;
    attemptedSinceReady = false;
    options.onReady();
  };
  const disconnected = async (reason: string) => {
    if (disposed || recovering || reason !== 'io server disconnect') return;
    if (attemptedSinceReady) { deny(); return; }
    attemptedSinceReady = true;
    recovering = true;
    try {
      const renewed = await options.refresh();
      if (disposed) return;
      const token = renewed ? options.getToken() : null;
      if (!token) { deny(); return; }
      socket.auth = { token };
      socket.connect();
    } catch { deny(); }
    finally { recovering = false; }
  };

  socket.on('session_ready', ready);
  socket.on('disconnect', disconnected);
  return () => {
    disposed = true;
    socket.off('session_ready', ready);
    socket.off('disconnect', disconnected);
  };
}
