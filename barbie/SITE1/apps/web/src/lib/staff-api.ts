'use client';

/**
 * staff-api — типизированный клиент для /v1/staff (tenant-scoped CRUD).
 *
 * Schedule jsonb приходит/уходит как `StaffSchedule`. Phase 0 — UI пишет в
 * него только дефолт-пустую неделю; полноценный редактор будет позже.
 *
 * serviceIds — список service.id из M2M staff_services. При update передача
 * массива заменяет связки атомарно; undefined — не трогает.
 */
import { apiFetch } from './api-client';

export type StaffStatus = 'active' | 'on_leave' | 'archived';

export type StaffScheduleSlot = { from: string; to: string };
export type StaffSchedule = {
  weekly: Record<
    'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun',
    StaffScheduleSlot[] | null
  >;
  exceptions?: Array<{ date: string; slots: StaffScheduleSlot[] | null }>;
};

export const EMPTY_SCHEDULE: StaffSchedule = {
  weekly: { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null },
};

export interface Staff {
  id: string;
  tenantId: string;
  salonId: string;
  userId: string | null;
  name: string;
  bio: string | null;
  photoKey: string | null;
  specialties: string[];
  schedule: StaffSchedule;
  status: StaffStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  services?: string[];
}

export interface StaffListResponse {
  data: Staff[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateStaffPayload {
  salonId: string;
  userId?: string;
  name: string;
  bio?: string;
  photoKey?: string;
  specialties?: string[];
  schedule?: StaffSchedule;
  serviceIds?: string[];
}

export interface UpdateStaffPayload extends Partial<CreateStaffPayload> {
  status?: StaffStatus;
}

export interface ListStaffQuery {
  salonId?: string;
  status?: StaffStatus;
  q?: string;
  limit?: number;
  offset?: number;
}

function buildQuery(q: ListStaffQuery): string {
  const params = new URLSearchParams();
  if (q.salonId) params.set('salonId', q.salonId);
  if (q.status) params.set('status', q.status);
  if (q.q) params.set('q', q.q);
  if (q.limit != null) params.set('limit', String(q.limit));
  if (q.offset != null) params.set('offset', String(q.offset));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const staffApi = {
  list(q: ListStaffQuery = {}): Promise<StaffListResponse> {
    return apiFetch<StaffListResponse>(`/v1/staff${buildQuery(q)}`);
  },
  get(id: string): Promise<Staff> {
    return apiFetch<Staff>(`/v1/staff/${id}`);
  },
  create(payload: CreateStaffPayload): Promise<Staff> {
    return apiFetch<Staff>('/v1/staff', { method: 'POST', body: payload });
  },
  update(id: string, payload: UpdateStaffPayload): Promise<Staff> {
    return apiFetch<Staff>(`/v1/staff/${id}`, { method: 'PATCH', body: payload });
  },
  archive(id: string): Promise<Staff> {
    return apiFetch<Staff>(`/v1/staff/${id}`, { method: 'DELETE' });
  },
};
