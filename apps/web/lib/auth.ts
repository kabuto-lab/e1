/**
 * Authentication Utilities
 * Token management, session handling, and route protection
 */

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'model' | 'client';
  status: 'active' | 'suspended' | 'blacklisted';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthData extends AuthTokens {
  user: User;
}

/**
 * Save authentication data to localStorage
 */
export function saveAuth(data: AuthData): void {
  try {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('authTimestamp', Date.now().toString());
  } catch (error) {
    console.error('Failed to save auth data:', error);
  }
}

/**
 * Get current access token
 */
export function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

/**
 * Get current user
 */
export function getCurrentUser(): User | null {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Failed to parse user:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const token = getAccessToken();
  if (!token) return false;
  
  // Check if token is expired (basic check)
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  } catch {
    return false;
  }
}

/**
 * Check if user has required role
 */
export function hasRole(requiredRoles: string[]): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  return requiredRoles.includes(user.role);
}

/**
 * Clear authentication data (logout)
 */
export function clearAuth(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('authTimestamp');
}

/**
 * Get auth header for API requests
 */
export function getAuthHeader(): HeadersInit {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
