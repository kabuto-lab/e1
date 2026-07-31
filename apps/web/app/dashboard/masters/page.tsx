'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, ListOrdered, Pencil } from 'lucide-react';
import { api, type MassageMaster } from '@/lib/api-client';

export default function MastersPage() {
  const [masters, setMasters] = useState<MassageMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api
      .getAllMassageMasters()
      .then(setMasters)
      .catch(() => setError('Не удалось загрузить список мастеров'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const remove = async (id: string) => {
    if (!confirm('Удалить мастера?')) return;
    try {
      await api.deleteMassageMaster(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить');
    }
  };

  return (
    <div className="flex-1 font-body">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-white">Мастера</h1>
          <p className="mt-0.5 text-xs text-gray-500">Массажный режим — управление карточками мастеров</p>
        </div>
        <Link
          href="/dashboard/masters/create"
          className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-[#d4af37] to-[#b8941f] px-4 py-2 text-sm font-semibold text-black hover:shadow-md hover:shadow-[#d4af37]/15"
        >
          <Plus className="h-4 w-4" /> Добавить мастера
        </Link>
      </div>

      {error ? (
        <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
      ) : null}

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d4af37]/20 border-t-[#d4af37]" />
        </div>
      ) : masters.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-500">Мастеров пока нет.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/25 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2.5">Имя</th>
                <th className="px-4 py-2.5">Slug</th>
                <th className="px-4 py-2.5">Цена от</th>
                <th className="px-4 py-2.5">Статус</th>
                <th className="px-4 py-2.5">Опубликован</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {masters.map((m) => (
                <tr key={m.id} className="text-white/85 hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 font-medium">{m.displayName}</td>
                  <td className="px-4 py-2.5 text-white/40">{m.slug}</td>
                  <td className="px-4 py-2.5">{m.priceFrom ? `${Math.round(Number(m.priceFrom)).toLocaleString('ru-RU')} ₽` : '—'}</td>
                  <td className="px-4 py-2.5 text-white/50">{m.availabilityStatus}</td>
                  <td className="px-4 py-2.5">{m.isPublished ? '✓' : '—'}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/masters/${m.id}/programs`}
                        className="rounded-md border border-white/[0.08] p-1.5 text-white/60 hover:border-[#d4af37]/40 hover:text-[#d4af37]"
                        title="Программы"
                      >
                        <ListOrdered className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/dashboard/masters/${m.id}/edit`}
                        className="flex items-center gap-1 rounded-md border border-white/[0.08] px-2.5 py-1.5 text-xs text-white/70 hover:border-[#d4af37]/40 hover:text-[#d4af37]"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Править
                      </Link>
                      <button type="button" onClick={() => remove(m.id)} className="rounded-md border border-white/[0.08] p-1.5 text-red-400/70 hover:border-red-500/40 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
