'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { getFavoriteModels, type FavoriteModel } from '@/lib/client-favorites';
import { publicMediaUrl } from '@/lib/public-media-url';

type ServerFavorite = {
  id: string;
  modelId: string;
  slug: string;
  displayName: string;
  mainPhotoUrl: string | null;
  createdAt: string;
};

export default function CabinetFavoritesPage() {
  const [serverItems, setServerItems] = useState<ServerFavorite[] | null>(null);
  const [localItems, setLocalItems] = useState<FavoriteModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getServerFavorites();
      setServerItems(data);
    } catch {
      setServerItems(null);
      setLocalItems(getFavoriteModels());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handleRemove = async (modelId: string) => {
    try {
      await api.removeServerFavorite(modelId);
      setServerItems((prev) => prev?.filter((x) => x.modelId !== modelId) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка удаления');
    }
  };

  const useServer = serverItems !== null;
  const isEmpty = useServer ? serverItems.length === 0 : localItems.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white md:text-3xl">Избранное</h1>
        <p className="mt-2 font-body text-sm text-white/40">
          {useServer
            ? 'Синхронизировано с сервером — доступно на всех устройствах.'
            : 'Список хранится только в этом браузере. Войдите, чтобы синхронизировать.'}
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 font-body text-xs text-red-300">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 font-body text-sm text-white/40">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загружаем…
        </div>
      ) : isEmpty ? (
        <div className="rounded-xl border border-white/[0.06] bg-[#141414]/60 p-8 text-center">
          <Star className="mx-auto mb-3 h-8 w-8 text-white/20" />
          <p className="font-body text-white/45">Пока пусто.</p>
          <Link
            href="/models"
            className="mt-4 inline-block font-body text-sm font-medium text-[#d4af37] hover:underline"
          >
            Перейти к каталогу
          </Link>
        </div>
      ) : useServer ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {serverItems.map((m) => (
            <li key={m.id} className="group relative">
              <Link
                href={`/models/${encodeURIComponent(m.slug)}`}
                className="block overflow-hidden rounded-xl border border-white/[0.06] bg-[#141414]/80 transition-colors hover:border-[#d4af37]/20"
              >
                {m.mainPhotoUrl ? (
                  <div className="aspect-[3/4] overflow-hidden">
                    <Image
                      src={publicMediaUrl(m.mainPhotoUrl)}
                      alt={m.displayName}
                      width={300}
                      height={400}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="aspect-[3/4] bg-white/[0.03]" />
                )}
                <div className="px-3 py-2">
                  <p className="font-body text-sm font-medium text-white truncate">{m.displayName}</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => handleRemove(m.modelId)}
                className="absolute right-2 top-2 rounded-lg bg-black/60 p-1.5 text-white/60 opacity-0 transition-opacity hover:text-red-300 group-hover:opacity-100"
                aria-label="Убрать из избранного"
              >
                <Star className="h-4 w-4 fill-[#d4af37] text-[#d4af37]" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {localItems.map((m) => (
            <li key={m.slug}>
              <Link
                href={`/models/${encodeURIComponent(m.slug)}`}
                className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#141414]/80 px-4 py-3 transition-colors hover:border-[#d4af37]/20"
              >
                <span className="font-body font-medium text-white">{m.displayName}</span>
                <span className="font-body text-xs text-white/35">Открыть →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
