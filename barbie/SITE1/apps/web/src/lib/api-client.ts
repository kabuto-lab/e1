'use client';

import { clearAuth, getAuth } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5110';

export interface ApiErrorBody {
  code?: string;
  message?: string;
  statusCode?: number;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody,
  ) {
    super(body.message ?? `API ${status}`);
  }
}

interface ApiFetchOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: unknown;
  headers?: Record<string, string>;
  /** Skip auth headers (e.g., for login itself). */
  skipAuth?: boolean;
  /** Override tenant slug (otherwise reads from auth). */
  tenantSlug?: string;
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: ApiFetchOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers ?? {}),
  };

  if (!opts.skipAuth) {
    const auth = getAuth();
    if (auth) {
      headers.Authorization = `Bearer ${auth.accessToken}`;
      const slug = opts.tenantSlug ?? auth.tenantSlug;
      if (slug) headers['X-Tenant-Slug'] = slug;
    } else if (opts.tenantSlug) {
      headers['X-Tenant-Slug'] = opts.tenantSlug;
    }
  } else if (opts.tenantSlug) {
    headers['X-Tenant-Slug'] = opts.tenantSlug;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 401 && !opts.skipAuth) {
    clearAuth();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin/login')) {
      window.location.href = '/admin/login';
    }
  }

  if (!res.ok) {
    let body: ApiErrorBody = {};
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      // empty body — keep default
    }
    throw new ApiError(res.status, body);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
