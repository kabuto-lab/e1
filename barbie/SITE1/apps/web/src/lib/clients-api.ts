'use client';

/**
 * clients-api — типизированный клиент для /v1/clients (tenant-scoped CRM).
 *
 * Особенности API, которые UI должен учитывать:
 *  - list endpoint НЕ возвращает `notes` (PII-защита). Для полной карточки
 *    делаем отдельный GET /:id.
 *  - POST на phone-конфликт возвращает 409 `{code: 'CLIENT_PHONE_TAKEN', existing: {id}}`.
 *    Helper `isPhoneConflict()` распознаёт его, чтобы UI мог предложить
 *    «открыть существующего клиента».
 *  - totalSpentKopecks приходит строкой (BigInt-safe).
 */
import { apiFetch, ApiError } from './api-client';

export type ClientStatus = 'active' | 'blocked' | 'archived';

export interface ClientListItem {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  birthdate: string | null;
  tags: string[];
  userId: string | null;
  status: ClientStatus;
  firstVisitAt: string | null;
  lastVisitAt: string | null;
  totalSpentKopecks: string;
  createdAt: string;
  updatedAt: string;
}

export interface Client extends ClientListItem {
  /** Полное поле notes (PII) — только в GET /:id. */
  notes: string | null;
}

export interface ClientListResponse {
  data: ClientListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateClientPayload {
  name: string;
  phone: string;
  email?: string;
  birthdate?: string;
  notes?: string;
  tags?: string[];
  userId?: string;
}

export interface UpdateClientPayload extends Partial<CreateClientPayload> {
  status?: ClientStatus;
}

export interface ListClientsQuery {
  status?: ClientStatus;
  q?: string;
  tag?: string;
  hasUser?: boolean;
  limit?: number;
  offset?: number;
}

function buildQuery(q: ListClientsQuery): string {
  const params = new URLSearchParams();
  if (q.status) params.set('status', q.status);
  if (q.q) params.set('q', q.q);
  if (q.tag) params.set('tag', q.tag);
  if (q.hasUser != null) params.set('hasUser', String(q.hasUser));
  if (q.limit != null) params.set('limit', String(q.limit));
  if (q.offset != null) params.set('offset', String(q.offset));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const clientsApi = {
  list(q: ListClientsQuery = {}): Promise<ClientListResponse> {
    return apiFetch<ClientListResponse>(`/v1/clients${buildQuery(q)}`);
  },
  get(id: string): Promise<Client> {
    return apiFetch<Client>(`/v1/clients/${id}`);
  },
  create(payload: CreateClientPayload): Promise<Client> {
    return apiFetch<Client>('/v1/clients', { method: 'POST', body: payload });
  },
  update(id: string, payload: UpdateClientPayload): Promise<Client> {
    return apiFetch<Client>(`/v1/clients/${id}`, { method: 'PATCH', body: payload });
  },
  archive(id: string): Promise<Client> {
    return apiFetch<Client>(`/v1/clients/${id}`, { method: 'DELETE' });
  },
};

/** Распознать 409-конфликт по phone и достать existing.id для UX. */
export function getPhoneConflictExistingId(err: unknown): string | null {
  if (!(err instanceof ApiError)) return null;
  if (err.status !== 409) return null;
  // ApiErrorBody — открытый record; 409-conflict payload расширяет его полем `existing`.
  const body = err.body as { code?: string; existing?: { id?: string } };
  if (body.code !== 'CLIENT_PHONE_TAKEN') return null;
  return body.existing?.id ?? null;
}

/** "125000" → "1250.00" (RUB). "" если невалид. */
export function kopecksToRub(kopecks: string): string {
  if (!/^\d+$/.test(kopecks)) return '';
  const padded = kopecks.padStart(3, '0');
  return `${padded.slice(0, -2)}.${padded.slice(-2)}`;
}
