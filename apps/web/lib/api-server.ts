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

export async function serverFetchModelStats() {
  return (
    (await serverGet<{ total: number; online: number; verified: number; elite: number }>(
      '/models/stats',
    )) ?? { total: 0, online: 0, verified: 0, elite: 0 }
  );
}

export async function serverFetchPreviewModels() {
  return (await serverGet<unknown[]>('/models?limit=4&orderBy=createdAt&order=desc')) ?? [];
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
    }
  );
}
