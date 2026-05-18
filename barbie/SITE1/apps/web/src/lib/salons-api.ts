'use client';

/**
 * salons-api — типизированный клиент для /v1/salons (tenant-scoped CRUD).
 *
 * workingHours хранится в DB как jsonb со схемой: 7 ключей-дней (mon..sun)
 * + опциональный exceptions[]. UI Phase-0 редактирует только дни недели
 * (7 строк), exceptions откладывается до полноценного календаря.
 */
import { apiFetch } from './api-client';

export type SalonStatus = 'active' | 'paused' | 'archived';

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const DAY_LABELS_RU: Record<DayKey, string> = {
  mon: 'Пн',
  tue: 'Вт',
  wed: 'Ср',
  thu: 'Чт',
  fri: 'Пт',
  sat: 'Сб',
  sun: 'Вс',
};

export interface WorkingHoursDay {
  open: string;
  close: string;
  closed?: boolean;
}

export interface WorkingHoursException {
  date: string;
  closed?: boolean;
  open?: string;
  close?: string;
}

export type WorkingHours = Partial<Record<DayKey, WorkingHoursDay>> & {
  exceptions?: WorkingHoursException[];
};

export interface Salon {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  region: string | null;
  country: string;
  postalCode: string | null;
  geoLat: string | null;
  geoLng: string | null;
  phone: string | null;
  email: string | null;
  workingHours: WorkingHours | null;
  status: SalonStatus;
  coverImageKey: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalonListResponse {
  data: Salon[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateSalonPayload {
  name: string;
  slug: string;
  address: string;
  city: string;
  region?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  workingHours?: WorkingHours;
  coverImageKey?: string;
  description?: string;
}

export interface UpdateSalonPayload extends Partial<CreateSalonPayload> {
  status?: SalonStatus;
}

export interface ListSalonsQuery {
  status?: SalonStatus;
  city?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

function buildQuery(q: ListSalonsQuery): string {
  const params = new URLSearchParams();
  if (q.status) params.set('status', q.status);
  if (q.city) params.set('city', q.city);
  if (q.q) params.set('q', q.q);
  if (q.limit != null) params.set('limit', String(q.limit));
  if (q.offset != null) params.set('offset', String(q.offset));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const salonsApi = {
  list(q: ListSalonsQuery = {}): Promise<SalonListResponse> {
    return apiFetch<SalonListResponse>(`/v1/salons${buildQuery(q)}`);
  },
  get(id: string): Promise<Salon> {
    return apiFetch<Salon>(`/v1/salons/${id}`);
  },
  create(payload: CreateSalonPayload): Promise<Salon> {
    return apiFetch<Salon>('/v1/salons', { method: 'POST', body: payload });
  },
  update(id: string, payload: UpdateSalonPayload): Promise<Salon> {
    return apiFetch<Salon>(`/v1/salons/${id}`, { method: 'PATCH', body: payload });
  },
  archive(id: string): Promise<Salon> {
    return apiFetch<Salon>(`/v1/salons/${id}`, { method: 'DELETE' });
  },
};

/** Дефолтное расписание для новой формы: будни 10–22, выходные 11–22. */
export function defaultWorkingHours(): WorkingHours {
  return {
    mon: { open: '10:00', close: '22:00' },
    tue: { open: '10:00', close: '22:00' },
    wed: { open: '10:00', close: '22:00' },
    thu: { open: '10:00', close: '22:00' },
    fri: { open: '10:00', close: '22:00' },
    sat: { open: '11:00', close: '22:00' },
    sun: { open: '11:00', close: '22:00' },
  };
}
