'use client';

/**
 * wp-import-api — клиент для WordPress-импорта.
 *
 * Endpoints:
 *  - POST /v1/tools/wp-probe → WpProbeResult (sync, fast)
 *  - POST /v1/platform/tenants/bootstrap-wp → { jobId } (async kick-off)
 *  - GET  /v1/platform/tenants/bootstrap-wp/:jobId/stream?token=… (SSE)
 *
 * EventSource не поддерживает custom Authorization header — токен идёт
 * через query. Это ok: API_BASE — HTTPS на vps и localhost в dev.
 */
import { apiFetch } from './api-client';
import { getAuth } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5110';

export interface WpProbeCounts {
  pages: number;
  media: number;
  posts: number;
  menus: number;
}

export interface WpProbeResult {
  isWp: boolean;
  restApiUrl: string | null;
  counts: WpProbeCounts;
  siteName: string | null;
  description: string | null;
  notes: string[];
}

export interface WpImportOptions {
  pages: boolean;
  media: boolean;
  menu: boolean;
  posts: boolean;
}

export interface BootstrapWpPayload {
  sourceUrl: string;
  slug: string;
  name: string;
  customDomain?: string;
  importOptions: WpImportOptions;
  maxMediaItems?: number;
}

export interface BootstrapWpKickoff {
  jobId: string;
}

export type WpImportEventType =
  | 'start'
  | 'progress'
  | 'tenant.created'
  | 'pages.fetched'
  | 'page.imported'
  | 'posts.fetched'
  | 'post.imported'
  | 'media.fetched'
  | 'media.imported'
  | 'media.failed'
  | 'menu.fetched'
  | 'menu.imported'
  | 'done'
  | 'error';

export interface WpImportEvent {
  type: WpImportEventType;
  message: string;
  current?: number;
  total?: number;
  payload?: Record<string, unknown>;
  error?: { code: string; message: string };
}

export const wpImportApi = {
  probe(url: string): Promise<WpProbeResult> {
    return apiFetch<WpProbeResult>('/v1/tools/wp-probe', {
      method: 'POST',
      body: { url },
    });
  },
  kickoff(payload: BootstrapWpPayload): Promise<BootstrapWpKickoff> {
    return apiFetch<BootstrapWpKickoff>('/v1/platform/tenants/bootstrap-wp', {
      method: 'POST',
      body: payload,
    });
  },
  /**
   * Открыть SSE-stream для job'а. Возвращает EventSource — caller должен
   * .close() когда не нужен. Все типы event'ов (`start`, `page.imported`, …)
   * приходят как именованные SSE event'ы; `onEvent` ловит каждый.
   */
  stream(
    jobId: string,
    onEvent: (event: WpImportEvent) => void,
    onError?: (err: Event) => void,
  ): EventSource {
    const auth = getAuth();
    const token = auth?.accessToken ?? '';
    const url = `${API_BASE}/v1/platform/tenants/bootstrap-wp/${jobId}/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    const types: WpImportEventType[] = [
      'start',
      'progress',
      'tenant.created',
      'pages.fetched',
      'page.imported',
      'posts.fetched',
      'post.imported',
      'media.fetched',
      'media.imported',
      'media.failed',
      'menu.fetched',
      'menu.imported',
      'done',
      'error',
    ];
    for (const t of types) {
      es.addEventListener(t, (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data) as WpImportEvent;
          onEvent(data);
          if (t === 'done' || t === 'error') es.close();
        } catch {
          // ignore parse errors
        }
      });
    }
    if (onError) es.onerror = onError;
    return es;
  },
};
