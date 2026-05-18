'use client';

/**
 * services-api — типизированный клиент для /v1/services (tenant-scoped CRUD).
 *
 * Tenant-контекст подкладывает apiFetch (X-Tenant-Slug из auth).
 * priceKopecks ездит как строка (BigInt-safe, см. ServiceResponseDto).
 *
 * Также экспортирует `listSalonsLite()` — для dropdown'а салонов в форме услуги.
 * Полноценный SalonsApi появится когда сделаем /admin/salons.
 */
import { apiFetch } from './api-client';

export type ServiceStatus = 'active' | 'draft' | 'archived';

export interface Service {
  id: string;
  tenantId: string;
  salonId: string | null;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  durationMin: number;
  priceKopecks: string;
  currency: string;
  coverImageKey: string | null;
  status: ServiceStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceListResponse {
  data: Service[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateServicePayload {
  name: string;
  slug: string;
  description?: string;
  category: string;
  durationMin: number;
  priceKopecks: string;
  salonId?: string | null;
}

export interface UpdateServicePayload extends Partial<CreateServicePayload> {
  status?: ServiceStatus;
}

export interface ListServicesQuery {
  status?: ServiceStatus;
  salonId?: string;
  category?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

function buildQuery(q: ListServicesQuery): string {
  const params = new URLSearchParams();
  if (q.status) params.set('status', q.status);
  if (q.salonId) params.set('salonId', q.salonId);
  if (q.category) params.set('category', q.category);
  if (q.q) params.set('q', q.q);
  if (q.limit != null) params.set('limit', String(q.limit));
  if (q.offset != null) params.set('offset', String(q.offset));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const servicesApi = {
  list(q: ListServicesQuery = {}): Promise<ServiceListResponse> {
    return apiFetch<ServiceListResponse>(`/v1/services${buildQuery(q)}`);
  },
  get(id: string): Promise<Service> {
    return apiFetch<Service>(`/v1/services/${id}`);
  },
  create(payload: CreateServicePayload): Promise<Service> {
    return apiFetch<Service>('/v1/services', { method: 'POST', body: payload });
  },
  update(id: string, payload: UpdateServicePayload): Promise<Service> {
    return apiFetch<Service>(`/v1/services/${id}`, { method: 'PATCH', body: payload });
  },
  archive(id: string): Promise<Service> {
    return apiFetch<Service>(`/v1/services/${id}`, { method: 'DELETE' });
  },
};

export interface SalonLite {
  id: string;
  name: string;
  slug: string;
}

interface SalonListEnvelope {
  data: SalonLite[];
  total?: number;
}

export async function listSalonsLite(): Promise<SalonLite[]> {
  const res = await apiFetch<SalonListEnvelope>('/v1/salons?limit=100');
  return res.data;
}

// ── price helpers ────────────────────────────────────────────────────────────

/** "150000" → "1500.00" (RUB display). Возвращает "" если ввод невалиден. */
export function kopecksToRub(kopecks: string): string {
  if (!/^\d+$/.test(kopecks)) return '';
  const padded = kopecks.padStart(3, '0');
  const rub = padded.slice(0, -2);
  const kop = padded.slice(-2);
  return `${rub}.${kop}`;
}

/**
 * RUB-строка (например "1500", "1500.5", "1500.50") → kopecks-строка ("150000").
 * Принимает запятую как разделитель тоже. Возвращает null если невалидно.
 */
export function rubToKopecks(rub: string): string | null {
  const norm = rub.trim().replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(norm)) return null;
  const [whole, frac = ''] = norm.split('.');
  const fracPad = (frac + '00').slice(0, 2);
  const result = `${whole}${fracPad}`.replace(/^0+(?=\d)/, '');
  return result === '' ? '0' : result;
}
