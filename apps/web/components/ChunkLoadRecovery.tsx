'use client';

import { useEffect } from 'react';

const SESSION_KEY = 'lovnge_chunk_reload_used';

function matchesChunkFailure(message: string): boolean {
  return /Loading chunk|ChunkLoadError|chunk load failed|Importing a module script failed/i.test(message);
}

/**
 * Dev server restarts (and sometimes new deploys) invalidate old hashed chunks; the shell may still request a removed file.
 * One full reload usually fixes it. Guard avoids infinite loops if the chunk stays missing.
 */
export function ChunkLoadRecovery() {
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
        /* */
      }
    }, 10_000);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const tryReload = () => {
      try {
        if (typeof sessionStorage === 'undefined') return;
        if (sessionStorage.getItem(SESSION_KEY) === '1') return;
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        /* storage blocked */
      }
      window.location.reload();
    };

    const onWindowError = (e: ErrorEvent) => {
      const msg = `${e.message || ''} ${e.filename || ''}`;
      if (matchesChunkFailure(msg)) tryReload();
    };

    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      const msg =
        typeof r === 'object' && r !== null && 'message' in r
          ? String((r as Error).message)
          : String(r);
      if (matchesChunkFailure(msg)) tryReload();
    };

    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onWindowError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}

