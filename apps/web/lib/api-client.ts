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
    
    try {
      const text = await response.text();
      if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
        errorData = JSON.parse(text);
      }
    } catch {
      // non-JSON error response
    }

    let message = Array.isArray(errorData?.message)
      ? errorData.message[0]
      : errorData?.message || `HTTP ${response.status}: ${response.statusText}`;

    const errs = errorData?.errors;
    if (Array.isArray(errs) && errs.length > 0) {
      const detail = errs
        .map((e: { field?: string; errors?: string[] }) =>
          [e.field, ...(e.errors || [])].filter(Boolean).join(': '),
        )
        .join('; ');
      if (detail) message = `${message} (${detail})`;
    }

    throw new Error(message);
  }
  
  return response.json();
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

let _refreshing: Promise<boolean> | null = null;

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

async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const go = () => fetch(url, { ...init, headers: { ...init?.headers, ...getAuthHeader() } });

  let res = await go();

  if (res.status === 401) {
    console.log('[auth] 401 on', url, '— attempting token refresh');
    if (!_refreshing) _refreshing = refreshAccessToken();
    const ok = await _refreshing;
    _refreshing = null;
    if (ok) {
      console.log('[auth] Retrying request after refresh');
      res = await go();
    } else {
      console.warn('[auth] Refresh failed — clearing auth and redirecting to login');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }

  return res;
}

// API Client
export const api = {
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

  async getMyModels(): Promise<Profile[]> {
    const response = await authFetch(apiUrl('/models/my'));
    return handleResponse<Profile[]>(response);
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

  async confirmUpload(mediaId: string, data: { cdnUrl?: string; modelId?: string; metadata?: any }): Promise<any> {
    const response = await authFetch(apiUrl(`/profiles/media/${mediaId}/confirm`), {
      method: 'POST',
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
    updates: { isPublicVisible?: boolean; albumCategory?: 'portfolio' | 'vip' | 'elite' | 'verified' }
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
  }> {
    const response = await authFetch(apiUrl('/models/moderation/queue'));
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
};

export default api;
