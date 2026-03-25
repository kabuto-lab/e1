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
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  storageKey: string;
  cdnUrl: string;
  mediaId: string;
}

// Helper functions
async function handleResponse<T>(response: Response): Promise<T> {
  // Clone response to read multiple times for debugging
  const responseClone = response.clone();
  
  if (!response.ok) {
    let errorData: any = {};
    let errorText = '';
    
    try {
      errorText = await responseClone.text();
      console.error('❌ API Error Response Body:', errorText);
      
      // Try to parse as JSON
      if (errorText.trim().startsWith('{')) {
        errorData = JSON.parse(errorText);
      }
    } catch (e) {
      console.error('Failed to parse error response:', e);
    }

    console.error('🚨 API Error:', {
      url: response.url,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      errorData: errorData,
      errorText: errorText,
    });

    const message = Array.isArray(errorData?.message)
      ? errorData.message[0]
      : errorData?.message || `HTTP ${response.status}: ${response.statusText}`;

    throw new Error(message);
  }
  
  return response.json();
}

function getAuthHeader(): HeadersInit {
  let token = localStorage.getItem('accessToken');
  
  // Debug logging
  console.log('🔑 getAuthHeader - Raw token from localStorage:', token ? `${token.substring(0, 20)}...` : 'NULL');
  console.log('🔑 getAuthHeader - Token length:', token?.length || 0);
  
  // Clean token: remove quotes if present
  if (token) {
    token = token.replace(/^"|"$/g, ''); // Remove surrounding quotes
    token = token.replace(/^Bearer\s+/i, ''); // Remove "Bearer " prefix if present
  }
  
  console.log('🔑 getAuthHeader - Cleaned token:', token ? `${token.substring(0, 20)}...` : 'NULL');
  console.log('🔑 getAuthHeader - Token has quotes:', token?.startsWith('"') || token?.endsWith('"'));
  console.log('🔑 getAuthHeader - Token has Bearer:', token?.includes('Bearer'));
  
  // Only add Authorization header if token exists and is not empty
  const authHeader = token && token.length > 0 ? { Authorization: `Bearer ${token}` } : {};
  console.log('🔑 getAuthHeader - Final Authorization header:', authHeader.Authorization ? `Bearer ${authHeader.Authorization.split(' ')[1]?.substring(0, 20)}...` : 'NONE (no token)');
  
  return authHeader;
}

// API Client
export const api = {
  // ============================================
  // PROFILES
  // ============================================

  async createProfile(data: CreateProfileData): Promise<Profile> {
    // Ensure displayName exists and is not empty
    if (!data.displayName || data.displayName.trim().length === 0) {
      throw new Error('displayName is required and cannot be empty');
    }

    const requestBody = JSON.stringify({ displayName: data.displayName.trim() });
    console.log('📝 createProfile request:', requestBody);

    // Use /models endpoint
    const response = await fetch(`${BASE_PATH}/models`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody,
    });

    console.log('📝 createProfile response status:', response.status);
    const responseData = await handleResponse<Profile>(response);
    console.log('📝 createProfile response data:', responseData);
    return responseData;
  },

  async getMyProfile(): Promise<Profile | null> {
    const response = await fetch(`${BASE_PATH}/profiles/me`, {
      headers: getAuthHeader(),
    });
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

    const response = await fetch(`${BASE_PATH}/profiles?${searchParams.toString()}`, {
      headers: getAuthHeader(),
    });
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

  async updateProfile(id: string, data: Partial<CreateProfileData>): Promise<Profile> {
    const response = await fetch(`${BASE_PATH}/profiles/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse<Profile>(response);
  },

  async publishProfile(id: string, isPublished: boolean): Promise<Profile> {
    const response = await fetch(`${BASE_PATH}/profiles/${id}/publish`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ isPublished }),
    });
    return handleResponse<Profile>(response);
  },

  // ============================================
  // MEDIA
  // ============================================

  async generatePresignedUrl(data: PresignedUrlData): Promise<PresignedUrlResponse> {
    const response = await fetch(`${BASE_PATH}/profiles/media/presigned`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse<PresignedUrlResponse>(response);
  },

  async confirmUpload(mediaId: string, data: { cdnUrl?: string; metadata?: any }): Promise<any> {
    const response = await fetch(`${BASE_PATH}/profiles/media/${mediaId}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
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
    const response = await fetch(
      `${BASE_PATH}/profiles/media/${mediaId}/set-main?modelId=${modelId}`,
      {
        method: 'PUT',
        headers: getAuthHeader(),
      }
    );
    return handleResponse<Profile>(response);
  },

  async getProfileMedia(modelId: string): Promise<any[]> {
    const response = await fetch(`${BASE_PATH}/profiles/models/${modelId}/media`);
    return handleResponse(response);
  },

  async deleteMedia(mediaId: string): Promise<void> {
    const response = await fetch(`${BASE_PATH}/profiles/media/${mediaId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Delete failed');
    }
  },

  async updateMediaVisibility(
    mediaId: string,
    updates: { isPublicVisible?: boolean; albumCategory?: 'portfolio' | 'vip' | 'elite' | 'verified' }
  ): Promise<void> {
    const response = await fetch(`${BASE_PATH}/media/${mediaId}/visibility`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(updates),
    });
    return handleResponse(response);
  },

  async bulkUpdateMediaVisibility(
    mediaIds: string[],
    updates: { isPublicVisible?: boolean; albumCategory?: string }
  ): Promise<void> {
    const response = await fetch(`${BASE_PATH}/media/bulk-visibility`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ mediaIds, ...updates }),
    });
    return handleResponse(response);
  },

  async setMainPhoto(mediaId: string, modelId: string): Promise<Profile> {
    // First get the media file to get its CDN URL
    const mediaResponse = await fetch(`${BASE_PATH}/media/${mediaId}`, {
      headers: getAuthHeader(),
    });
    const media = await handleResponse<any>(mediaResponse);

    // Then update the model profile with the main photo URL
    const response = await fetch(`${BASE_PATH}/models/${modelId}/set-main-photo`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ photoUrl: media.cdnUrl }),
    });
    return handleResponse<Profile>(response);
  },
};

export default api;
