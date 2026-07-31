'use client';

import { useEffect, useState } from 'react';
import { api, type MassageBooking } from '@/lib/api-client';

const STATUS_LABEL: Record<MassageBooking['status'], string> = {
  new: 'Новая',
  contacted: 'Связались',
  done: 'Завершена',
  cancelled: 'Отменена',
};

export default function MassageBookingsPage() {
  const [bookings, setBookings] = useState<MassageBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getMassageBookingsAdmin()
      .then(setBookings)
      .catch(() => setError('Не удалось загрузить заявки'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 font-body">
      <div className="mb-4">
        <h1 className="font-display text-xl font-semibold text-white">Заявки на бронь</h1>
        <p className="mt-0.5 text-xs text-gray-500">Массажный режим — заявки «Забронировать» у мастера</p>
      </div>

      {error ? (
        <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
      ) : null}

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d4af37]/20 border-t-[#d4af37]" />
        </div>
      ) : bookings.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-500">Заявок пока нет.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/25 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2.5">Имя</th>
                <th className="px-4 py-2.5">Контакт</th>
                <th className="px-4 py-2.5">Дата</th>
                <th className="px-4 py-2.5">Комментарий</th>
                <th className="px-4 py-2.5">Статус</th>
                <th className="px-4 py-2.5">Создана</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {bookings.map((b) => (
                <tr key={b.id} className="text-white/85">
                  <td className="px-4 py-2.5 font-medium">{b.name}</td>
                  <td className="px-4 py-2.5">{b.contact}</td>
                  <td className="px-4 py-2.5 text-white/50">{b.desiredDate ?? '—'}</td>
                  <td className="max-w-[20rem] truncate px-4 py-2.5 text-white/40">{b.comment ?? '—'}</td>
                  <td className="px-4 py-2.5 text-white/60">{STATUS_LABEL[b.status]}</td>
                  <td className="px-4 py-2.5 text-white/35">{new Date(b.createdAt).toLocaleString('ru-RU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
