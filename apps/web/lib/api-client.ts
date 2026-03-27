/**
 * API Client for communicating with NestJS backend
 * Handles authentication, error handling, and type-safe requests
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const BASE_PATH = API_URL; // No versioning prefix

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
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'video/mp4';
  fileSize: number;
  modelId?: string;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  storageKey: string;
  cdnUrl: string;
  mediaId: string;
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

    const message = Array.isArray(errorData?.message)
      ? errorData.message[0]
      : errorData?.message || `HTTP ${response.status}: ${response.statusText}`;

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
    const res = await fetch(`${BASE_PATH}/auth/refresh`, {
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

    const response = await authFetch(`${BASE_PATH}/models`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    return handleResponse<Profile>(response);
  },

  async getMyProfile(): Promise<Profile | null> {
    const response = await authFetch(`${BASE_PATH}/profiles/me`);
    const data = await handleResponse<{ profile: Profile | null }>(response);
    return data.profile;
  },

  async getProfile(id: string): Promise<Profile> {
    const response = await fetch(`${BASE_PATH}/profiles/${id}`);
    return handleResponse<Profile>(response);
  },

  async getCatalog(params?: { limit?: number; offset?: number; includeUnpublished?: boolean }): Promise<Profile[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.includeUnpublished) searchParams.set('includeUnpublished', 'true');

    const response = await authFetch(`${BASE_PATH}/profiles?${searchParams.toString()}`);
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

    const response = await fetch(`${BASE_PATH}/models?${searchParams.toString()}`);
    return handleResponse<Profile[]>(response);
  },

  async getMyModels(): Promise<Profile[]> {
    const response = await authFetch(`${BASE_PATH}/models/my`);
    return handleResponse<Profile[]>(response);
  },

  async updateProfile(id: string, data: Partial<CreateProfileData>): Promise<Profile> {
    const response = await authFetch(`${BASE_PATH}/profiles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Profile>(response);
  },

  async publishProfile(id: string, isPublished: boolean): Promise<Profile> {
    const response = await authFetch(`${BASE_PATH}/profiles/${id}/publish`, {
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
    const response = await authFetch(`${BASE_PATH}/profiles/media/presigned`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<PresignedUrlResponse>(response);
  },

  async confirmUpload(mediaId: string, data: { cdnUrl?: string; modelId?: string; metadata?: any }): Promise<any> {
    const response = await authFetch(`${BASE_PATH}/profiles/media/${mediaId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async uploadToMinIO(uploadUrl: string, file: File): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }
  },

  async setMainPhoto(mediaId: string, modelId: string): Promise<Profile> {
    const response = await authFetch(
      `${BASE_PATH}/profiles/media/${mediaId}/set-main?modelId=${modelId}`,
      { method: 'PUT' },
    );
    return handleResponse<Profile>(response);
  },

  async getProfileMedia(modelId: string): Promise<any[]> {
    const response = await fetch(`${BASE_PATH}/profiles/models/${modelId}/media`);
    return handleResponse(response);
  },

  async getMyMedia(): Promise<any[]> {
    const response = await authFetch(`${BASE_PATH}/profiles/media/my`);
    return handleResponse(response);
  },

  async deleteMedia(mediaId: string): Promise<void> {
    const response = await authFetch(`${BASE_PATH}/profiles/media/${mediaId}`, {
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
    const response = await authFetch(`${BASE_PATH}/media/${mediaId}/visibility`, {
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
    const response = await authFetch(`${BASE_PATH}/media/bulk-visibility`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaIds, ...updates }),
    });
    return handleResponse(response);
  },

};

export default api;
