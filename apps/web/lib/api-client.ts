/**
 * Клиент браузера/SSR для вызовов Nest API.
 *
 * Базовый URL задаёт api-url.ts: в dev в браузере обычно /api/... (прокси Next → 127.0.0.1:3000).
 * Защищённые вызовы идут через authFetch: заголовок Authorization из localStorage accessToken;
 * при 401 — refresh по /auth/refresh, иначе очистка сессии и редирект на /login.
 *
 * Методы сгруппированы по доменам (профили, медиа, каталог). Тела запросов — JSON; загрузка файлов —
 * отдельный PUT на uploadUrl (MinIO), затем confirm на API.
 */

import { apiUrl } from './api-url';

// Types
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}

export interface PhysicalAttributes {
  age?: number;
  height?: number;
  weight?: number;
  bustSize?: number;
  bustType?: 'natural' | 'silicone';
  bodyType?: 'slim' | 'curvy' | 'bbw' | 'pear' | 'fit';
  temperament?: 'gentle' | 'active' | 'adaptable';
  sexuality?: 'active' | 'passive' | 'universal';
  hairColor?: string;
  eyeColor?: string;
}

export interface ModelProfile {
  id: string;
  userId: string | null;
  managerId: string | null;
  managerCommissionRate: string | null;
  displayName: string;
  slug: string | null;
  biography: string | null;
  verificationStatus: 'pending' | 'video_required' | 'document_required' | 'verified' | 'rejected';
  eliteStatus: boolean;
  isPublished: boolean;
  mainPhotoUrl: string | null;
  rateHourly: string | null;
  rateOvernight: string | null;
  availabilityStatus: 'offline' | 'online' | 'in_shift' | 'busy';
  physicalAttributes: {
    age?: number;
    height?: number;
    weight?: number;
    bustSize?: number;
    bustType?: 'natural' | 'silicone';
    bodyType?: 'slim' | 'curvy' | 'bbw' | 'pear' | 'fit';
    temperament?: 'gentle' | 'active' | 'adaptable';
    sexuality?: 'active' | 'passive' | 'universal';
    hairColor?: string;
    eyeColor?: string;
    city?: string;
    country?: string;
  } | null;
  languages: string[] | null;
  psychotypeTags: string[] | null;
  ratingReliability: string;
  totalMeetings: number;
  totalCancellations: number;
  contactTelegram: string | null;
  contactPhone: string | null;
  contactWhatsapp: string | null;
  contactEmail: string | null;
  videoWalkthroughUrl: string | null;
  nextAvailableAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfileData {
  displayName: string;
  slug?: string;
  biography?: string;
  physicalAttributes?: PhysicalAttributes;
  languages?: string[];
  psychotypeTags?: string[];
  rateHourly?: number;
  rateOvernight?: number;
}

export interface Profile {
  id: string;
  userId: string;
  managerId?: string | null;
  managerCommissionRate?: string | null;
  displayName: string;
  slug: string;
  biography?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  eliteStatus: boolean;
  isPublished: boolean;
  mainPhotoUrl?: string;
  physicalAttributes?: PhysicalAttributes;
  createdAt: string;
  updatedAt: string;
}

export interface PresignedUrlData {
  fileName: string;
  mimeType:
    | 'image/jpeg'
    | 'image/png'
    | 'image/webp'
    | 'image/gif'
    | 'image/avif'
    | 'image/heic'
    | 'image/heif'
    | 'video/mp4'
    | 'video/webm';
  fileSize: number;
  modelId?: string;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  storageKey: string;
  cdnUrl: string;
  mediaId: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  senderName: string | null;
  senderLogin: string | null;
  senderRole: string;
}

export interface MessagesConversation {
  conversationId: string;
  interlocutor: { userId: string; fullName: string | null; login: string | null; email: string | null; telegramUsername: string | null; role: string; avatarUrl: string | null; modelSlug: string | null } | null;
  lastMessage: { content: string; senderId: string; createdAt: string } | null;
  lastReadAt: string | null;
  unread: boolean;
}

export interface MassageMaster {
  id: string;
  displayName: string;
  slug: string;
  description: string | null;
  priceFrom: string | null;
  mainPhotoUrl: string | null;
  photoUrls: string[] | null;
  availabilityStatus: 'available' | 'busy' | 'unavailable';
  isPopular: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MassageServiceProgram {
  id: string;
  masterId: string;
  name: string;
  description: string | null;
  price: string;
  durationMinutes: number | null;
  sortOrder: number;
  createdAt: string;
}

export interface MassageBooking {
  id: string;
  masterId: string;
  name: string;
  contact: string;
  desiredDate: string | null;
  comment: string | null;
  status: 'new' | 'contacted' | 'done' | 'cancelled';
  createdAt: string;
}

export interface MassageAccessRequest {
  id: string;
  name: string;
  contact: string;
  comment: string | null;
  status: 'new' | 'contacted' | 'done' | 'cancelled';
  createdAt: string;
}

export interface MassageSettingsAdmin {
  id: string;
  enabled: boolean;
  catalogMode: 'open' | 'closed';
  siteName: string;
  updatedAt: string;
}

export type BlacklistReason =
  | 'fake_photos'
  | 'client_complaints'
  | 'fraud'
  | 'no_show'
  | 'video_fake'
  | 'non_payment'
  | 'rudeness'
  | 'pressure';

export interface BlacklistEntry {
  id: string;
  entityType: 'model' | 'client' | 'manager';
  entityId: string;
  reason: BlacklistReason;
  description: string | null;
  status: 'blocked' | 'under_review' | 'restored';
  blockedBy: string;
  reviewedBy: string | null;
  restoredBy: string | null;
  blockedAt: string;
  reviewedAt: string | null;
  restoredAt: string | null;
  isPublic: boolean | null;
}

export interface BlacklistHistoryEntry extends BlacklistEntry {
  entityLogin: string | null;
  entityEmail: string | null;
  blockedByLogin: string | null;
  restoredByLogin: string | null;
}

/** Ответ GET /escrow/ton/booking/:bookingId (клиент брони или staff). */
export interface TonEscrowClientView {
  id: string;
  bookingId: string;
  paymentProvider: string;
  status: string;
  amountHeld: string;
  currency?: string | null;
  expectedAmountAtomic?: string | null;
  receivedAmountAtomic?: string | null;
  assetDecimals?: number | null;
  network?: string | null;
  jettonMasterAddress?: string | null;
  treasuryAddress?: string | null;
  expectedMemo?: string | null;
  fundedTxHash?: string | null;
  releaseTxHash?: string | null;
  refundTxHash?: string | null;
  confirmations: number;
  expectedAmountHuman?: string | null;
  receivedAmountHuman?: string | null;
  fundedAt?: string | null;
  holdUntil?: string | null;
  releasedAt?: string | null;
  refundedAt?: string | null;
  releaseTrigger?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PayoutRequestStatus = 'pending' | 'approved' | 'paid' | 'rejected';

export interface PayoutBalance {
  earned: string;
  paid: string;
  pending: string;
  available: string;
}

export interface PayoutRequest {
  id: string;
  userId: string;
  amount: string;
  status: PayoutRequestStatus;
  note: string | null;
  processedByUserId: string | null;
  processedAt: string | null;
  requestedAt: string;
  createdAt: string;
  updatedAt: string;
}

/** Normalize `File.type` for presign + MinIO PUT (empty on drag-drop, `image/jpg`, etc.). */
export function resolveUploadMimeType(file: File): string {
  let t = file.type?.trim() || '';
  if (t === 'image/jpg') return 'image/jpeg';
  if (t) return t;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const byExt: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    avif: 'image/avif',
    heic: 'image/heic',
    heif: 'image/heif',
    mp4: 'video/mp4',
    webm: 'video/webm',
  };
  return byExt[ext] || 'image/jpeg';
}

// Helper functions
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: any = {};
    let rawText = '';

    try {
      rawText = await response.text();
      if (rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
        errorData = JSON.parse(rawText);
      }
    } catch {
      // non-JSON error response
    }

    let message =
      (Array.isArray(errorData?.message) ? errorData.message[0] : errorData?.message) ||
      (rawText && !rawText.trim().startsWith('<')
        ? rawText.trim().slice(0, 240)
        : `HTTP ${response.status}: ${response.statusText}`);

    const errs = errorData?.errors;
    if (Array.isArray(errs) && errs.length > 0) {
      const detail = errs
        .map((e: { field?: string; errors?: string[] }) =>
          [e.field, ...(e.errors || [])].filter(Boolean).join(': '),
        )
        .join('; ');
      if (detail) message = `${message} (${detail})`;
    }

    // Next.js /api proxy often returns generic 500 when upstream Nest API is down.
    // Avoid matching "connect" inside "connection" (Postgres/Nest DB errors) — that caused false hints.
    const looksLikeProxyOrTcpFailure =
      /ECONNREFUSED|ENOTFOUND|ECONNRESET|socket hang up|fetch failed|AggregateError|Bad Gateway|Error occurred prerendering|upstream connect error/i.test(
        rawText,
      );
    if (response.status === 500 && response.url.includes('/api/') && looksLikeProxyOrTcpFailure) {
      message = `${message}. API upstream is unreachable (expected at http://127.0.0.1:3000).`;
    }

    throw new Error(`${response.url} -> ${response.status} ${response.statusText}. ${message}`);
  }

  const text = await response.text();
  if (!text || text.trim() === '') return null as T;
  return JSON.parse(text);
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};

  let token = localStorage.getItem('accessToken');
  
  if (token) {
    token = token.replace(/^"|"$/g, '');
    token = token.replace(/^Bearer\s+/i, '');
  }
  
  return token && token.length > 0 ? { Authorization: `Bearer ${token}` } : {};
}

let isRefreshing = false;
const refreshWaiters: Array<(ok: boolean) => void> = [];

async function refreshOnce(): Promise<boolean> {
  if (isRefreshing) {
    return new Promise<boolean>((resolve) => refreshWaiters.push(resolve));
  }
  isRefreshing = true;
  try {
    const ok = await refreshAccessToken();
    refreshWaiters.forEach((cb) => cb(ok));
    return ok;
  } finally {
    isRefreshing = false;
    refreshWaiters.length = 0;
  }
}

async function refreshAccessToken(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  let rt = localStorage.getItem('refreshToken');
  if (!rt) {
    console.warn('[auth] No refresh token in localStorage');
    return false;
  }
  rt = rt.replace(/^"|"$/g, '');
  if (!rt || rt === 'undefined' || rt === 'null') {
    console.warn('[auth] Refresh token is invalid:', rt);
    return false;
  }
  try {
    const res = await fetch(apiUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn('[auth] Refresh failed:', res.status, body);
      return false;
    }
    const data = await res.json();
    if (!data.accessToken) {
      console.warn('[auth] Refresh response missing accessToken');
      return false;
    }
    localStorage.setItem('accessToken', data.accessToken);
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    console.log('[auth] Token refreshed successfully');
    return true;
  } catch (err) {
    console.warn('[auth] Refresh error:', err);
    return false;
  }
}

export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const go = () => fetch(url, { ...init, headers: { ...init?.headers, ...getAuthHeader() } });

  let res = await go();

  if (res.status === 401) {
    const ok = await refreshOnce();
    if (ok) {
      res = await go();
    } else {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
        return new Promise<Response>(() => {});
      }
    }
  }

  return res;
}

export interface BookingRecord {
  id: string;
  clientId: string;
  modelId: string;
  modelName?: string | null;
  modelSlug?: string | null;
  managerId?: string | null;
  status: 'draft' | 'time_proposed' | 'pending_payment' | 'escrow_funded' | 'confirmed' | 'in_progress' | 'completed' | 'disputed' | 'declined' | 'refunded' | 'cancelled';
  startTime: string;
  durationHours: number;
  locationType?: string | null;
  totalAmount: string;
  platformFee?: string | null;
  modelPayout?: string | null;
  currency?: string | null;
  specialRequests?: string | null;
  proposedStartTime?: string | null;
  proposedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewRecord {
  id: string;
  clientId: string;
  modelId: string;
  modelName?: string;
  modelSlug?: string | null;
  bookingId: string | null;
  rating: number;
  comment: string | null;
  characteristics: string[] | null;
  isPublic: boolean | null;
  isVerified: boolean | null;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  moderationReason: string | null;
  complaintStatus: 'none' | 'open' | 'resolved';
  complaintReason: string | null;
  complaintComment: string | null;
  complaintResolution: 'dismissed' | 'redacted' | 'deleted' | null;
  createdAt: string;
  updatedAt: string;
}

// API Client
export const api = {
  // ============================================
  // ESCROW (TON USDT)
  // ============================================

  async getTonEscrowByBooking(bookingId: string): Promise<TonEscrowClientView> {
    const response = await authFetch(
      apiUrl(`/escrow/ton/booking/${encodeURIComponent(bookingId)}`),
    );
    if (response.status === 404 || response.status === 403) {
      let message = `HTTP ${response.status}`;
      try {
        const raw = await response.text();
        const j = JSON.parse(raw) as { message?: string | string[] };
        message =
          (Array.isArray(j?.message) ? j.message[0] : j?.message) || message;
      } catch {
        // keep default message
      }
      const err = new Error(message) as Error & { statusCode: number };
      err.statusCode = response.status;
      throw err;
    }
    return handleResponse<TonEscrowClientView>(response);
  },

  // ============================================
  // PROFILES
  // ============================================

  async createProfile(data: CreateProfileData): Promise<Profile> {
    if (!data.displayName || data.displayName.trim().length === 0) {
      throw new Error('displayName is required and cannot be empty');
    }

    const response = await authFetch(apiUrl('/models'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    return handleResponse<Profile>(response);
  },

  async getMyProfile(): Promise<Profile | null> {
    const response = await authFetch(apiUrl('/profiles/me'));
    const data = await handleResponse<{ profile: Profile | null }>(response);
    return data.profile;
  },

  async getProfile(id: string): Promise<Profile> {
    const response = await fetch(apiUrl(`/profiles/${id}`));
    return handleResponse<Profile>(response);
  },

  async getCatalog(params?: { limit?: number; offset?: number; includeUnpublished?: boolean }): Promise<Profile[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.includeUnpublished) searchParams.set('includeUnpublished', 'true');

    const response = await authFetch(apiUrl(`/profiles?${searchParams.toString()}`));
    return handleResponse<Profile[]>(response);
  },

  async getModels(params?: { 
    limit?: number; 
    offset?: number; 
    availabilityStatus?: string;
    verificationStatus?: string;
    eliteStatus?: boolean;
    orderBy?: string;
    order?: string;
  }): Promise<Profile[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.availabilityStatus) searchParams.set('availabilityStatus', params.availabilityStatus);
    if (params?.verificationStatus) searchParams.set('verificationStatus', params.verificationStatus);
    if (params?.eliteStatus !== undefined) searchParams.set('eliteStatus', String(params.eliteStatus));
    if (params?.orderBy) searchParams.set('orderBy', params.orderBy);
    if (params?.order) searchParams.set('order', params.order);

    const response = await fetch(apiUrl(`/models?${searchParams.toString()}`));
    return handleResponse<Profile[]>(response);
  },

  async getMyModels(limit?: number): Promise<Profile[]> {
    const qs = limit ? `?limit=${limit}` : '';
    const response = await authFetch(apiUrl(`/models/my${qs}`));
    return handleResponse<Profile[]>(response);
  },

  /** Все менеджеры — для группировки моделей на «Пользователи → Доли» (admin/moderator). */
  async listManagers(): Promise<Array<{ id: string; login: string | null; email: string | null }>> {
    const response = await authFetch(apiUrl('/users/managers'));
    return handleResponse(response);
  },

  /** Задать долю менеджера у модели (admin/moderator). ratePercent — 0..100, null — сбросить в 0. */
  async updateModelManagerShare(modelId: string, ratePercent: number | null): Promise<ModelProfile> {
    const managerCommissionRate = ratePercent != null ? (ratePercent / 100).toFixed(3) : '0';
    const response = await authFetch(apiUrl(`/models/${modelId}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ managerCommissionRate }),
    });
    return handleResponse<ModelProfile>(response);
  },

  /** Удалить анкету модели (Admin — любую, Manager — только свою). */
  async deleteModel(id: string): Promise<void> {
    const response = await authFetch(apiUrl(`/models/${id}`), { method: 'DELETE' });
    return handleResponse(response);
  },

  /** Анкета текущей модели (role=model). 404 → null (анкета не привязана). */
  async getMyModelProfile(): Promise<ModelProfile | null> {
    const response = await authFetch(apiUrl('/models/me'));
    if (response.status === 404) return null;
    return handleResponse<ModelProfile>(response);
  },

  async updateMyModelProfile(id: string, data: Partial<Pick<ModelProfile,
    'displayName' | 'biography' | 'rateHourly' | 'rateOvernight' |
    'languages' | 'psychotypeTags' | 'physicalAttributes' | 'isPublished' |
    'contactTelegram' | 'contactPhone' | 'contactWhatsapp' | 'contactEmail'
  >>): Promise<ModelProfile> {
    const response = await authFetch(apiUrl(`/models/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<ModelProfile>(response);
  },

  async updateMyAvailability(id: string, status: ModelProfile['availabilityStatus'], nextAvailableAt?: string | null): Promise<ModelProfile> {
    const response = await authFetch(apiUrl(`/models/${id}/availability`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, nextAvailableAt: nextAvailableAt ?? undefined }),
    });
    return handleResponse<ModelProfile>(response);
  },

  async updateProfile(id: string, data: Partial<CreateProfileData>): Promise<Profile> {
    const response = await authFetch(apiUrl(`/profiles/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Profile>(response);
  },

  async publishProfile(id: string, isPublished: boolean): Promise<Profile> {
    const response = await authFetch(apiUrl(`/profiles/${id}/publish`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished }),
    });
    return handleResponse<Profile>(response);
  },

  // ============================================
  // MEDIA
  // ============================================

  async generatePresignedUrl(data: PresignedUrlData): Promise<PresignedUrlResponse> {
    const response = await authFetch(apiUrl('/profiles/media/presigned'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<PresignedUrlResponse>(response);
  },

  async confirmUpload(
    mediaId: string,
    data: { cdnUrl?: string; modelId?: string; metadata?: any; sortOrder?: number },
  ): Promise<any> {
    const response = await authFetch(apiUrl(`/profiles/media/${mediaId}/confirm`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async assignMediaToModel(
    mediaId: string,
    data: { modelId: string; sortOrder: number },
  ): Promise<unknown> {
    const response = await authFetch(apiUrl(`/profiles/media/${mediaId}/assign-to-model`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async uploadToMinIO(uploadUrl: string, file: File, contentType?: string): Promise<void> {
    const ct =
      (contentType?.trim() || file.type?.trim() || 'application/octet-stream');
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': ct,
      },
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }
  },

  /** Есть ли у анкеты доступный relay-канал в Telegram (публично, без авторизации — для disable кнопки). */
  async getModelTelegramAvailability(modelId: string): Promise<{ available: boolean }> {
    const response = await fetch(apiUrl(`/models/${modelId}/telegram-availability`));
    return handleResponse(response);
  },

  /** Одноразовый deep-link на бота для анонимной relay-переписки по анкете. Требует авторизации. */
  async getModelTelegramContactToken(modelId: string): Promise<{ deepLink: string | null }> {
    const response = await authFetch(apiUrl(`/models/${modelId}/telegram-contact-token`), { method: 'POST' });
    return handleResponse(response);
  },

  async setMainPhoto(mediaId: string, modelId: string): Promise<Profile> {
    const response = await authFetch(
      apiUrl(`/profiles/media/${mediaId}/set-main?modelId=${modelId}`),
      { method: 'PUT' },
    );
    return handleResponse<Profile>(response);
  },

  /**
   * Список медиа модели. Эндпоинт без JWT — используем fetch, чтобы превью в админке
   * не пропадало из‑за истёкшего токена (раньше authFetch на 401 уводил на /login).
   */
  async getProfileMedia(modelId: string): Promise<any[]> {
    const response = await fetch(apiUrl(`/profiles/models/${modelId}/media`));
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = (err as ApiError)?.message || `HTTP ${response.status}`;
      throw new Error(Array.isArray(msg) ? msg[0] : String(msg));
    }
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data.map((row: any) => {
      const cdn =
        row.cdnUrl ||
        row.cdn_url ||
        row.presignedUrl ||
        row.presigned_url ||
        '';
      return {
        ...row,
        cdnUrl: cdn,
        sortOrder: row.sortOrder ?? row.sort_order ?? 0,
      };
    });
  },

  async getMyMedia(): Promise<any[]> {
    const response = await authFetch(apiUrl('/profiles/media/my'));
    return handleResponse(response);
  },

  async deleteMedia(mediaId: string): Promise<void> {
    const response = await authFetch(apiUrl(`/profiles/media/${mediaId}`), {
      method: 'DELETE',
    });
    if (!response.ok) {
      let message = 'Delete failed';
      try {
        const text = await response.text();
        if (text.trim().startsWith('{')) {
          const error = JSON.parse(text);
          message = error.message || message;
        }
      } catch {
        // non-JSON error
      }
      throw new Error(message);
    }
  },

  async updateMediaVisibility(
    mediaId: string,
    updates: { isPublicVisible?: boolean; albumCategory?: 'portfolio' | 'vip' | 'elite' | 'verified'; sortOrder?: number }
  ): Promise<void> {
    const response = await authFetch(apiUrl(`/media/${mediaId}/visibility`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleResponse(response);
  },

  async bulkUpdateMediaVisibility(
    mediaIds: string[],
    updates: { isPublicVisible?: boolean; albumCategory?: string }
  ): Promise<void> {
    const response = await authFetch(apiUrl('/media/bulk-visibility'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaIds, ...updates }),
    });
    return handleResponse(response);
  },

  async getModerationQueue(): Promise<{
    profiles: unknown[];
    media: unknown[];
    reviews: unknown[];
    disputedReviews: unknown[];
  }> {
    const response = await authFetch(apiUrl('/models/moderation/queue'));
    return handleResponse(response);
  },

  async getManagerApplications(): Promise<unknown[]> {
    const response = await authFetch(apiUrl('/admin/managers/applications'));
    return handleResponse(response);
  },

  async approveManager(userId: string): Promise<unknown> {
    const response = await authFetch(apiUrl(`/admin/managers/${userId}/approve`), { method: 'POST' });
    return handleResponse(response);
  },

  async rejectManager(userId: string, reason?: string): Promise<unknown> {
    const response = await authFetch(apiUrl(`/admin/managers/${userId}/reject`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    return handleResponse(response);
  },

  async moderateProfileVerification(
    profileId: string,
    verificationStatus: 'verified' | 'rejected',
  ): Promise<unknown> {
    const response = await authFetch(apiUrl(`/models/moderation/profiles/${profileId}/verification`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificationStatus }),
    });
    return handleResponse(response);
  },

  async moderateReview(
    reviewId: string,
    moderationStatus: 'approved' | 'rejected',
    moderationReason?: string,
  ): Promise<unknown> {
    const response = await authFetch(apiUrl(`/models/moderation/reviews/${reviewId}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moderationStatus, moderationReason }),
    });
    return handleResponse(response);
  },

  /** Разрешить жалобу модели на отзыв (admin/manager/moderator). */
  async resolveReviewComplaint(
    reviewId: string,
    resolution: 'dismissed' | 'redacted' | 'deleted',
    redactedComment?: string,
  ): Promise<unknown> {
    const response = await authFetch(apiUrl(`/models/moderation/reviews/${reviewId}/complaint`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution, redactedComment }),
    });
    return handleResponse(response);
  },

  async approveProfileMedia(mediaId: string): Promise<unknown> {
    const response = await authFetch(apiUrl(`/profiles/media/${mediaId}/approve`), {
      method: 'PUT',
    });
    return handleResponse(response);
  },

  async rejectProfileMedia(mediaId: string, moderationReason: string): Promise<unknown> {
    const response = await authFetch(apiUrl(`/profiles/media/${mediaId}/reject`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moderationStatus: 'rejected' as const,
        moderationReason: moderationReason || 'Content violates guidelines',
      }),
    });
    return handleResponse(response);
  },

  /** Отзывы по модели (JWT + refresh как у остального дашборда). */
  async getModelReviews(
    modelId: string,
    limit = 100,
  ): Promise<
    | { accessMode: 'list'; reviews: unknown[] }
    | { accessMode: 'summary'; averageRating: string; totalReviews: number }
    | null
  > {
    const response = await authFetch(apiUrl(`/reviews/model/${modelId}?limit=${limit}`));
    if (response.status === 401 || response.status === 403) return null;
    if (!response.ok) return null;
    return response.json();
  },

  /** Публичные одобренные отзывы модели (для анкеты; без JWT, доступно гостям). */
  async getPublicModelReviews(modelId: string, limit = 20): Promise<{
    averageRating: string;
    totalReviews: number;
    reviews: Array<{
      id: string;
      rating: number;
      comment: string | null;
      characteristics: string[];
      isVerified: boolean;
      createdAt: string;
      clientLabel: string;
    }>;
  }> {
    const response = await fetch(apiUrl(`/reviews/public/model/${modelId}?limit=${limit}`));
    return handleResponse(response);
  },

  /** Отзывы, оставленные текущим клиентом (для его личного кабинета). */
  async getMyReviews(): Promise<ReviewRecord[]> {
    const response = await authFetch(apiUrl('/reviews/my'));
    return handleResponse(response);
  },

  /** Оставить отзыв после завершённой встречи (client). */
  async createReview(data: {
    bookingId: string;
    modelId: string;
    rating: number;
    comment?: string;
    characteristics?: string[];
    isAnonymous?: boolean;
  }): Promise<ReviewRecord> {
    const response = await authFetch(apiUrl('/reviews'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /** Пожаловаться на отзыв о себе (model). */
  async fileReviewComplaint(reviewId: string, reason: string, comment?: string): Promise<ReviewRecord> {
    const response = await authFetch(apiUrl(`/reviews/${reviewId}/complaint`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, comment }),
    });
    return handleResponse(response);
  },

  // ============================================
  // BOOKING + TON ESCROW FLOW
  // ============================================

  /** Создать заявку на бронирование (авторизованный клиент) — сумма считается сервером от тарифа модели */
  async createBookingForModel(data: {
    modelId: string;
    startTime: string;
    durationHours: number;
    locationType?: 'incall' | 'outcall' | 'travel' | 'hotel' | 'dacha';
    specialRequests?: string;
  }): Promise<BookingRecord> {
    const response = await authFetch(apiUrl('/bookings'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelId: data.modelId,
        startTime: data.startTime,
        durationHours: data.durationHours,
        locationType: data.locationType,
        specialRequests: data.specialRequests,
      }),
    });
    return handleResponse<BookingRecord>(response);
  },

  /** Создать TON USDT эскроу intent (получаем адрес, мемо, сумму) */
  async createTonIntent(bookingId: string, amountUsdt: number): Promise<TonEscrowClientView> {
    const atomic = String(Math.round(amountUsdt * 1_000_000)); // 6 decimals
    const response = await authFetch(apiUrl('/escrow/ton/intent'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, expectedAmountAtomic: atomic, assetDecimals: 6 }),
    });
    return handleResponse<TonEscrowClientView>(response);
  },

  /** Статус TON эскроу для бронирования */
  async getTonEscrowStatus(bookingId: string): Promise<TonEscrowClientView> {
    const response = await authFetch(
      apiUrl(`/escrow/ton/booking/${encodeURIComponent(bookingId)}`),
    );
    return handleResponse<TonEscrowClientView>(response);
  },

  /** Создать заказ T-Bank (Init, двухстадийный) на полную сумму брони — редиректить на paymentUrl */
  async createTbankOrder(bookingId: string): Promise<{ escrowTransactionId: string; paymentUrl: string }> {
    const response = await authFetch(apiUrl('/escrow/tbank/create'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId }),
    });
    return handleResponse<{ escrowTransactionId: string; paymentUrl: string }>(response);
  },

  /** Статус T-Bank эскроу для бронирования */
  async getTbankEscrowStatus(bookingId: string): Promise<TonEscrowClientView> {
    const response = await authFetch(
      apiUrl(`/escrow/tbank/booking/${encodeURIComponent(bookingId)}`),
    );
    return handleResponse<TonEscrowClientView>(response);
  },

  /** T-Bank: списать холд (Confirm) и завершить встречу — роли admin/manager */
  async releaseTbankEscrow(escrowTransactionId: string): Promise<TonEscrowClientView> {
    const response = await authFetch(apiUrl(`/escrow/tbank/${escrowTransactionId}/release`), {
      method: 'POST',
    });
    return handleResponse<TonEscrowClientView>(response);
  },

  /** T-Bank: снять холд (Cancel) до списания — роли admin/manager */
  async refundTbankEscrow(escrowTransactionId: string, cancellationReason?: string): Promise<TonEscrowClientView> {
    const response = await authFetch(apiUrl(`/escrow/tbank/${escrowTransactionId}/refund`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancellationReason }),
    });
    return handleResponse<TonEscrowClientView>(response);
  },

  // ============================================
  // PAYOUTS — баланс и заявки на вывод (модель/менеджер), очередь admin/moderator
  // ============================================

  /** Баланс заработанного (модель/менеджер): заработано/выплачено/в ожидании/доступно */
  async getPayoutBalance(): Promise<PayoutBalance> {
    const response = await authFetch(apiUrl('/payouts/balance'));
    return handleResponse<PayoutBalance>(response);
  },

  /** Создать заявку на вывод (не больше доступного баланса) */
  async createPayoutRequest(amount: string): Promise<PayoutRequest> {
    const response = await authFetch(apiUrl('/payouts/requests'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });
    return handleResponse<PayoutRequest>(response);
  },

  /** Список заявок — модель/менеджер видят свои, admin/moderator видят все */
  async getPayoutRequests(status?: PayoutRequestStatus): Promise<PayoutRequest[]> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    const response = await authFetch(apiUrl(`/payouts/requests${qs}`));
    return handleResponse<PayoutRequest[]>(response);
  },

  /** Одобрить/отклонить/отметить выплаченной (admin/moderator) */
  async transitionPayoutRequest(
    id: string,
    status: 'approved' | 'rejected' | 'paid',
    note?: string,
  ): Promise<PayoutRequest> {
    const response = await authFetch(apiUrl(`/payouts/requests/${id}/transition`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note }),
    });
    return handleResponse<PayoutRequest>(response);
  },

  /** Контакты менеджера — только после funded эскроу */
  async getModelContacts(slug: string): Promise<{
    contactTelegram: string | null;
    contactPhone: string | null;
    contactWhatsapp: string | null;
  }> {
    const response = await authFetch(apiUrl(`/models/${encodeURIComponent(slug)}/contacts`));
    return handleResponse(response);
  },

  // ============================================
  // BOOKINGS
  // ============================================

  async getMyBookings(): Promise<BookingRecord[]> {
    const response = await authFetch(apiUrl('/bookings'));
    return handleResponse<BookingRecord[]>(response);
  },

  async getBookingById(id: string): Promise<BookingRecord> {
    const response = await authFetch(apiUrl(`/bookings/${id}`));
    return handleResponse<BookingRecord>(response);
  },

  async getMyModelBookings(): Promise<BookingRecord[]> {
    const response = await authFetch(apiUrl('/bookings/as-model'));
    return handleResponse<BookingRecord[]>(response);
  },

  async listBookings(): Promise<BookingRecord[]> {
    const response = await authFetch(apiUrl('/bookings/all'));
    return handleResponse<BookingRecord[]>(response);
  },

  async getServerFavorites(): Promise<{ id: string; modelId: string; slug: string; displayName: string; mainPhotoUrl: string | null; createdAt: string }[]> {
    const response = await authFetch(apiUrl('/clients/me/favorites'));
    return handleResponse(response);
  },

  async addServerFavorite(modelId: string): Promise<{ modelId: string }> {
    const response = await authFetch(apiUrl(`/clients/me/favorites/${modelId}`), { method: 'POST' });
    return handleResponse(response);
  },

  async removeServerFavorite(modelId: string): Promise<void> {
    await authFetch(apiUrl(`/clients/me/favorites/${modelId}`), { method: 'DELETE' });
  },

  async createGuestBooking(data: {
    modelId: string;
    guestName: string;
    guestPhone: string;
    guestEmail?: string;
    guestMessage?: string;
    startTime: string;
    durationHours: number;
    totalAmount?: string;
  }): Promise<{ id: string }> {
    const response = await fetch(apiUrl('/bookings/guest'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<{ id: string }>(response);
  },

  /** Занятые интервалы модели (публично, для UI создания брони — дизейблить даты/время) */
  async getModelBusySlots(modelId: string): Promise<{ start: string; end: string }[]> {
    const response = await fetch(apiUrl(`/bookings/model/${modelId}/busy-slots`));
    return handleResponse<{ start: string; end: string }[]>(response);
  },

  /** Подтвердить заявку (исполнитель или её менеджер) — до оплаты */
  async confirmBooking(id: string): Promise<BookingRecord> {
    const response = await authFetch(apiUrl(`/bookings/${id}/confirm`), { method: 'POST' });
    return handleResponse<BookingRecord>(response);
  },

  /** Отклонить заявку (исполнитель или её менеджер) — до оплаты, с необязательной причиной */
  async declineBooking(id: string, reason?: string): Promise<BookingRecord> {
    const response = await authFetch(apiUrl(`/bookings/${id}/decline`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    return handleResponse<BookingRecord>(response);
  },

  /** Предложить другое время встречи (исполнитель или её менеджер) */
  async proposeBookingTime(id: string, proposedStartTime: string): Promise<BookingRecord> {
    const response = await authFetch(apiUrl(`/bookings/${id}/propose-time`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposedStartTime }),
    });
    return handleResponse<BookingRecord>(response);
  },

  /** Клиент принимает предложенное время встречи */
  async acceptProposedTime(id: string): Promise<BookingRecord> {
    const response = await authFetch(apiUrl(`/bookings/${id}/accept-proposed-time`), { method: 'POST' });
    return handleResponse<BookingRecord>(response);
  },

  async cancelBooking(id: string, reason?: string): Promise<BookingRecord> {
    const response = await authFetch(apiUrl(`/bookings/${id}/cancel`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    return handleResponse<BookingRecord>(response);
  },

  async getPlatformSettings(): Promise<Record<string, unknown>> {
    const response = await authFetch(apiUrl('/settings'));
    return handleResponse<Record<string, unknown>>(response);
  },

  async savePlatformSettings(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await authFetch(apiUrl('/settings'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Record<string, unknown>>(response);
  },

  async presignPlatformLogo(data: {
    fileName: string;
    mimeType: string;
    fileSize: number;
  }): Promise<{ uploadUrl: string; storageKey: string; cdnUrl: string; expiresAt: string }> {
    const response = await authFetch(apiUrl('/settings/logo-presign'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // ============================================
  // TELEGRAM — web-first линковка (§Q2)
  // ============================================

  /**
   * Создать одноразовый link-token для привязки Telegram.
   * После получения — фронт открывает deepLink (если не null) и начинает поллить
   * getTelegramStatus(), пока linked=true.
   */
  async createTelegramLinkToken(): Promise<{
    token: string;
    expiresAt: string;
    deepLink: string | null;
  }> {
    const response = await authFetch(apiUrl('/auth/telegram/link-token'), {
      method: 'POST',
    });
    return handleResponse(response);
  },

  /** Статус привязки TG для текущего пользователя (для polling). */
  async getTelegramStatus(): Promise<{
    linked: boolean;
    telegramId: string | null;
    telegramUsername: string | null;
    telegramLinkedAt: string | null;
  }> {
    const response = await authFetch(apiUrl('/users/me/telegram-status'));
    return handleResponse(response);
  },

  /**
   * Отвязать Telegram от текущего пользователя.
   * 400 для TG-only аккаунтов (нет email/password — нельзя оставить без доступа).
   */
  async unlinkTelegram(): Promise<{
    linked: false;
    telegramId: null;
    telegramUsername: null;
    telegramLinkedAt: null;
  }> {
    const response = await authFetch(apiUrl('/users/me/telegram'), {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  /** Список пользователей (Admin only). Включает TG-поля. Опциональный фильтр по роли. */
  async listUsers(role?: string): Promise<Array<{
    id: string;
    email: string;
    role: string;
    status: string;
    lastLogin?: string;
    createdAt: string;
    telegramId?: string | null;
    telegramUsername?: string | null;
    telegramLinkedAt?: string | null;
    login?: string | null;
    recoveryCode?: string | null;
    initialPassword?: string | null;
  }>> {
    const response = await authFetch(apiUrl(`/users${role ? `?role=${encodeURIComponent(role)}` : ''}`));
    return handleResponse(response);
  },

  /** Создать пользователя напрямую (Admin only) — используется для роли moderator. */
  async createUser(data: { login: string; password: string; role?: 'client' | 'model' | 'moderator' }): Promise<{ id: string; login: string | null; role: string; status: string }> {
    const response = await authFetch(apiUrl('/users'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /** Удалить пользователя (Admin only). Разрешено только для role=moderator|manager|model. */
  async deleteUser(id: string): Promise<{ success: true }> {
    const response = await authFetch(apiUrl(`/users/${id}`), { method: 'DELETE' });
    return handleResponse(response);
  },

  /** Сменить роль (Admin only). Только между client/moderator/admin. */
  async updateUserRole(id: string, role: 'client' | 'moderator' | 'admin'): Promise<unknown> {
    const response = await authFetch(apiUrl(`/users/${id}/role`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    return handleResponse(response);
  },

  /** Поиск client/model/manager для блокировки (Admin/Moderator only) — без recoveryCode/initialPassword. */
  async searchBlockableUsers(query?: string): Promise<Array<{ id: string; login: string | null; email: string | null; role: string; status: string }>> {
    const response = await authFetch(apiUrl(`/users/blockable${query ? `?query=${encodeURIComponent(query)}` : ''}`));
    return handleResponse(response);
  },

  /** Заблокировать аккаунт (client/model/manager) — Admin/Moderator only. Блокирует вход, модель скрывается из каталога. */
  async blacklistAdd(data: {
    entityType: 'model' | 'client' | 'manager';
    entityId: string;
    reason: BlacklistReason;
    description?: string;
  }): Promise<BlacklistEntry> {
    const response = await authFetch(apiUrl('/blacklist'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /** Разблокировать по entityId — снимает последнюю активную блокировку (Admin/Moderator only). */
  async blacklistRestore(entityType: 'model' | 'client' | 'manager', entityId: string): Promise<BlacklistEntry> {
    const response = await authFetch(apiUrl('/blacklist/restore-by-entity'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, entityId }),
    });
    return handleResponse(response);
  },

  /** Полная история блокировок для страницы «Чёрный список» (Admin/Moderator only). */
  async blacklistHistory(): Promise<BlacklistHistoryEntry[]> {
    const response = await authFetch(apiUrl('/blacklist/history'));
    return handleResponse(response);
  },

  async getMe(): Promise<{
    sub: string;
    email: string;
    role: string;
    status: string;
    subscriptionTier: 'none' | 'basic' | 'standard' | 'premium';
    fullName?: string | null;
    login?: string | null;
    phone?: string | null;
    telegram: {
      linked: boolean;
      telegramId: string | null;
      telegramUsername: string | null;
      telegramLinkedAt: string | null;
    };
  }> {
    const response = await authFetch(apiUrl('/auth/me'));
    return handleResponse(response);
  },

  async getMyClientProfile(): Promise<{
    id: string;
    userId: string;
    vipTier: 'standard' | 'silver' | 'gold' | 'platinum';
    trustScore: string;
    psychotype: string | null;
    preferences: {
      languages?: string[];
      ageRange?: [number, number];
      physicalTypes?: string[];
      temperament?: string;
    } | null;
    totalBookings: number;
    successfulMeetings: number;
    cancellationRate: string;
    blacklistStatus: 'clear' | 'warning' | 'banned';
    contactTelegram: string | null;
    contactWhatsapp: string | null;
    createdAt: string;
  } | null> {
    const response = await authFetch(apiUrl('/clients/me'));
    if (response.status === 404) return null;
    return handleResponse(response);
  },

  async updateMyClientContacts(data: { contactTelegram?: string; contactWhatsapp?: string }): Promise<{ contactTelegram: string | null; contactWhatsapp: string | null }> {
    const r = await authFetch(apiUrl('/clients/me'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },

  async updateMyProfile(data: { fullName?: string; phone?: string; email?: string }): Promise<{ ok: boolean }> {
    const r = await authFetch(apiUrl('/auth/profile'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },

  async updateMyManagerProfile(data: { phone?: string; telegramContact?: string; contactWhatsapp?: string; companyName?: string }): Promise<{ id: string; phone: string | null; telegramContact: string | null; contactWhatsapp: string | null; companyName: string | null }> {
    const r = await authFetch(apiUrl('/managers/me'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },

  // ── Messages ──────────────────────────────────────────────────────────────

  async getMessagesUsers(): Promise<{ id: string; fullName: string | null; login: string | null; email: string | null; telegramUsername: string | null; role: string; avatarUrl: string | null }[]> {
    const r = await authFetch(apiUrl('/messages/users'));
    return handleResponse(r);
  },

  /** Быстрые контакты для раздела «Сообщения»: админ поддержки + менеджер (для модели). */
  async getSupportContacts(): Promise<{ adminUserId: string | null; managerUserId: string | null }> {
    const r = await authFetch(apiUrl('/messages/support-contacts'));
    return handleResponse(r);
  },

  async getConversations(): Promise<MessagesConversation[]> {
    const r = await authFetch(apiUrl('/messages/conversations'));
    return handleResponse(r);
  },

  async startConversation(targetUserId: string): Promise<{ conversationId: string }> {
    const r = await authFetch(apiUrl('/messages/conversations'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId }),
    });
    return handleResponse(r);
  },

  async getMessages(conversationId: string, limit = 50): Promise<ChatMessage[]> {
    const r = await authFetch(apiUrl(`/messages/conversations/${conversationId}?limit=${limit}`));
    return handleResponse(r);
  },

  async deleteConversation(conversationId: string): Promise<void> {
    const r = await authFetch(apiUrl(`/messages/conversations/${conversationId}`), { method: 'DELETE' });
    return handleResponse(r);
  },

  // --- Массажный режим (отдельная сущность, второй набор контента на тех же URL) ---

  async getMassageMasters(): Promise<MassageMaster[]> {
    const r = await fetch(apiUrl('/massage/masters'), { cache: 'no-store' });
    return handleResponse(r);
  },

  async getMassageMasterBySlug(slug: string): Promise<MassageMaster> {
    const r = await fetch(apiUrl(`/massage/masters/${encodeURIComponent(slug)}`), { cache: 'no-store' });
    return handleResponse(r);
  },

  async getMassagePrograms(masterId: string): Promise<MassageServiceProgram[]> {
    const r = await fetch(apiUrl(`/massage/programs?masterId=${encodeURIComponent(masterId)}`), { cache: 'no-store' });
    return handleResponse(r);
  },

  async createMassageBooking(data: {
    masterId: string;
    name: string;
    contact: string;
    desiredDate?: string;
    comment?: string;
  }): Promise<{ id: string }> {
    const r = await fetch(apiUrl('/massage/bookings'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },

  async createMassageAccessRequest(data: {
    name: string;
    contact: string;
    comment?: string;
  }): Promise<{ id: string }> {
    const r = await fetch(apiUrl('/massage/access-requests'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },

  // --- Массажный режим: admin (staff-only) ---

  async presignMasterPhoto(data: {
    fileName: string;
    mimeType: string;
    fileSize: number;
  }): Promise<{ uploadUrl: string; storageKey: string; cdnUrl: string; expiresAt: string }> {
    const r = await authFetch(apiUrl('/massage/masters/photo-presign'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },

  async getAllMassageMasters(): Promise<MassageMaster[]> {
    const r = await authFetch(apiUrl('/massage/masters/all'));
    return handleResponse(r);
  },

  async getMassageMasterById(id: string): Promise<MassageMaster> {
    const r = await authFetch(apiUrl(`/massage/masters/id/${id}`));
    return handleResponse(r);
  },

  async createMassageMaster(data: {
    displayName: string;
    slug?: string;
    description?: string;
    priceFrom?: number;
    mainPhotoUrl?: string;
    photoUrls?: string[];
    isPopular?: boolean;
    isPublished?: boolean;
  }): Promise<MassageMaster> {
    const r = await authFetch(apiUrl('/massage/masters'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },

  async updateMassageMaster(id: string, data: Partial<{
    displayName: string;
    slug: string;
    description: string;
    priceFrom: number;
    mainPhotoUrl: string;
    photoUrls: string[];
    availabilityStatus: 'available' | 'busy' | 'unavailable';
    isPopular: boolean;
    isPublished: boolean;
  }>): Promise<MassageMaster> {
    const r = await authFetch(apiUrl(`/massage/masters/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },

  async deleteMassageMaster(id: string): Promise<void> {
    const r = await authFetch(apiUrl(`/massage/masters/${id}`), { method: 'DELETE' });
    return handleResponse(r);
  },

  async createMassageProgram(data: {
    masterId: string;
    name: string;
    description?: string;
    price: number;
    durationMinutes?: number;
    sortOrder?: number;
  }): Promise<MassageServiceProgram> {
    const r = await authFetch(apiUrl('/massage/programs'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },

  async updateMassageProgram(id: string, data: Partial<{
    name: string;
    description: string;
    price: number;
    durationMinutes: number;
    sortOrder: number;
  }>): Promise<MassageServiceProgram> {
    const r = await authFetch(apiUrl(`/massage/programs/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },

  async deleteMassageProgram(id: string): Promise<void> {
    const r = await authFetch(apiUrl(`/massage/programs/${id}`), { method: 'DELETE' });
    return handleResponse(r);
  },

  async getMassageBookingsAdmin(): Promise<(MassageBooking)[]> {
    const r = await authFetch(apiUrl('/massage/bookings'));
    return handleResponse(r);
  },

  async getMassageAccessRequestsAdmin(): Promise<MassageAccessRequest[]> {
    const r = await authFetch(apiUrl('/massage/access-requests'));
    return handleResponse(r);
  },

  async getMassageSettingsAdmin(): Promise<MassageSettingsAdmin> {
    const r = await authFetch(apiUrl('/massage/settings'));
    return handleResponse(r);
  },

  async saveMassageSettingsAdmin(data: Partial<{
    enabled: boolean;
    catalogMode: 'open' | 'closed';
    siteName: string;
  }>): Promise<MassageSettingsAdmin> {
    const r = await authFetch(apiUrl('/massage/settings'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },
};

export default api;
