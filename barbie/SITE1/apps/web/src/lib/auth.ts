'use client';

const STORAGE_KEY = 'nas.auth';

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  kind: 'tenant' | 'platform';
  role: string;
  email: string;
  /** Slug of the tenant the user is operating on. For platform-admin this may be a chosen tenant. */
  tenantSlug: string;
  expiresAt: number;
}

export function saveAuth(session: AuthSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function getAuth(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as AuthSession;
    if (!s.accessToken || !s.tenantSlug) return null;
    if (s.expiresAt && Date.now() > s.expiresAt) {
      clearAuth();
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function isLoggedIn(): boolean {
  return getAuth() !== null;
}
