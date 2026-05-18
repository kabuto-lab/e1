/**
 * WpJobStore — in-memory реестр async-импорт-job'ов с EventEmitter-based pub/sub.
 *
 * Используется парой POST /platform/tenants/bootstrap-wp (создаёт job, kicks off
 * import, отвечает jobId) + GET /platform/tenants/bootstrap-wp/:jobId/stream
 * (SSE, subscribe).
 *
 * Trade-offs:
 *   - Single-process: если nginx / pm2 кластер > 1 worker — нужен Redis Pub/Sub.
 *     Phase 0 NAS — единственный node, ok.
 *   - Память: события не buffered (subscriber должен подписаться ДО kickoff'а).
 *     Wizard всегда так делает: POST → получает jobId → сразу открывает EventSource.
 *   - Lifecycle: job очищается через 60 секунд после terminal event'а (`done`/`error`),
 *     даже если subscriber ещё висит — это защита от утечек.
 */
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

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
  /** Текущая позиция (1-indexed) если событие из цикла. */
  current?: number;
  /** Всего элементов в цикле. */
  total?: number;
  /** Произвольная полезная нагрузка — для `done` это финальный summary, для `tenant.created` — { tenantId, slug }. */
  payload?: Record<string, unknown>;
  /** Ошибка — стек обрезаем, чтобы не утекали внутренности. */
  error?: { code: string; message: string };
}

interface JobEntry {
  id: string;
  createdAt: number;
  finishedAt: number | null;
  emitter: EventEmitter;
  buffer: WpImportEvent[]; // буфер для late-subscribers (видим всю историю)
}

const CLEANUP_TTL_MS = 60_000;

@Injectable()
export class WpJobStore {
  private readonly logger = new Logger(WpJobStore.name);
  private readonly jobs = new Map<string, JobEntry>();

  createJob(): string {
    const id = randomUUID();
    const emitter = new EventEmitter();
    // setMaxListeners для случая нескольких SSE-подключений к одному job'у
    emitter.setMaxListeners(20);
    this.jobs.set(id, {
      id,
      createdAt: Date.now(),
      finishedAt: null,
      emitter,
      buffer: [],
    });
    return id;
  }

  emit(jobId: string, event: WpImportEvent): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.buffer.push(event);
    job.emitter.emit('event', event);
  }

  /**
   * Subscribe — возвращает unsubscribe. Late subscribers получают всё buffer'нутые
   * событий синхронно (для UI важно: если EventSource открылся через 50ms после
   * kickoff'а, не теряем стартовых событий).
   */
  subscribe(
    jobId: string,
    listener: (event: WpImportEvent) => void,
  ): { ok: boolean; unsubscribe: () => void } {
    const job = this.jobs.get(jobId);
    if (!job) return { ok: false, unsubscribe: () => {} };

    // Replay буфера
    for (const ev of job.buffer) listener(ev);

    job.emitter.on('event', listener);
    return {
      ok: true,
      unsubscribe: () => job.emitter.off('event', listener),
    };
  }

  /** Финализация — emit'ит terminal event, ставит таймер очистки. */
  finalize(jobId: string, terminal: WpImportEvent): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    if (job.finishedAt) return; // idempotent
    this.emit(jobId, terminal);
    job.finishedAt = Date.now();
    setTimeout(() => {
      job.emitter.removeAllListeners();
      this.jobs.delete(jobId);
      this.logger.debug(`Job ${jobId} reaped from store after ${CLEANUP_TTL_MS}ms`);
    }, CLEANUP_TTL_MS).unref();
  }

  /** Утилита для healthcheck/диагностики. */
  size(): number {
    return this.jobs.size;
  }
}
