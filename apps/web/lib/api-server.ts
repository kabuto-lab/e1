import { Profile } from "@/types/model";

const INTERNAL_API = process.env.INTERNAL_API_URL ?? 'http://localhost:3000';

async function serverGet<T>(path: string, revalidate = 30): Promise<T | null> {
  try {
    const res = await fetch(`${INTERNAL_API}${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export async function serverFetchModels(query = 'orderBy=rating&order=desc&limit=50') {
  return (await serverGet<unknown[]>(`/models?${query}`)) ?? [];
}

/** Как serverFetchModels(), но также возвращает X-Total-Count — нужен, чтобы пагинация
 * в каталоге была видна сразу на SSR-рендере, а не только после первого клиентского фетча. */
export async function serverFetchModelsWithTotal(
  query = 'orderBy=rating&order=desc&limit=50',
): Promise<{ items: unknown[]; total: number }> {
  try {
    const res = await fetch(`${INTERNAL_API}/models?${query}`, { next: { revalidate: 30 } });
    if (!res.ok) return { items: [], total: 0 };
    const items = (await res.json()) as unknown[];
    const totalHeader = res.headers.get('X-Total-Count');
    const total = totalHeader ? parseInt(totalHeader, 10) : items.length;
    return { items, total: Number.isFinite(total) ? total : items.length };
  } catch {
    return { items: [], total: 0 };
  }
}

export async function serverFetchModelStats() {
  return (
    (await serverGet<{ total: number; online: number; verified: number; elite: number }>(
      '/models/stats',
    )) ?? { total: 0, online: 0, verified: 0, elite: 0 }
  );
}

export async function serverFetchPreviewModels() {
  return (await serverGet<Profile[]>('/models?limit=4&orderBy=createdAt&order=desc')) ?? [];
}

export async function serverFetchModelBySlug(slug: string) {
  return serverGet<unknown>(`/models/${encodeURIComponent(slug)}`);
}

export async function serverFetchModelMedia(modelId: string) {
  return (await serverGet<unknown[]>(`/media/model/${modelId}`)) ?? [];
}

export interface ServerMassageMode {
  enabled: boolean;
  catalogMode: 'open' | 'closed';
  siteName: string;
  landingMode: 'main' | 'massage';
}

/**
 * Флаг массажного режима, читаемый на сервере — устраняет «вспышку» эскорт-контента перед
 * переключением на клиенте (см. MassageModeProvider). Короткий revalidate — переключение
 * в /dashboard/settings должно доходить до посетителей быстро, без rebuild/redeploy.
 */
export async function serverFetchMassageMode(): Promise<ServerMassageMode> {
  return (
    (await serverGet<ServerMassageMode>('/massage/settings/public', 5)) ?? {
      enabled: false,
      catalogMode: 'open',
      siteName: 'Название проекта',
      landingMode: 'main',
    }
  );
}
