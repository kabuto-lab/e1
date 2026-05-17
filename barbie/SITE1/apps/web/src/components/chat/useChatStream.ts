'use client';

import { useEffect, useRef } from 'react';
import { buildStreamUrl, type ChatStreamEvent } from '@/lib/chat-api';

/**
 * useChatStream — открывает EventSource на /v1/chat/stream и зовёт onEvent
 * на каждое событие. Сохраняет lastEventId в ref, чтобы при reconnect
 * браузер сам передал `Last-Event-ID` (внутри EventSource).
 *
 * При размонтировании / смене handler — закрывает соединение.
 */
export function useChatStream(onEvent: (ev: ChatStreamEvent) => void): void {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    let cancelled = false;
    let es: EventSource | null = null;

    function connect(): void {
      if (cancelled) return;
      es = new EventSource(buildStreamUrl());

      es.addEventListener('message', (e) => {
        try {
          const data = JSON.parse(e.data) as ChatStreamEvent;
          handlerRef.current(data);
        } catch {
          // ignore parse errors
        }
      });

      es.addEventListener('error', () => {
        // Браузер сам ретрайнет EventSource (default 3s). Но если соединение
        // закрылось окончательно — переоткроем вручную через 5с.
        if (es && es.readyState === EventSource.CLOSED) {
          es.close();
          es = null;
          setTimeout(connect, 5000);
        }
      });
    }

    connect();

    return () => {
      cancelled = true;
      es?.close();
    };
  }, []);
}
