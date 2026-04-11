'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getFavoriteModels, type FavoriteModel } from '@/lib/client-favorites';

export default function CabinetFavoritesPage() {
  const [items, setItems] = useState<FavoriteModel[]>([]);

  useEffect(() => {
    setItems(getFavoriteModels());
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Избранное</h1>
        <p className="mt-1 font-body text-sm text-white/40">
          Список хранится в этом браузере. После входа с другого устройства его нужно собрать заново,
          пока нет серверной синхронизации.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-[#141414]/60 p-8 text-center">
          <p className="font-body text-white/45">Пока пусто.</p>
          <Link
            href="/models"
            className="mt-4 inline-block font-body text-sm font-medium text-[#d4af37] hover:underline"
          >
            Перейти к каталогу
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((m) => (
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
