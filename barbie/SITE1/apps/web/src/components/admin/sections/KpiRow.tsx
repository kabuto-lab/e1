'use client';

import { useEffect, useState } from 'react';
import { Calendar, UsersRound, Users, Sparkles } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { KpiTile } from '@/components/admin/primitives/KpiTile';

/**
 * KpiRow — 4-в-ряд секция мокапа. Революцию пока выкинули — вместо неё показываем
 * реальные счётчики из API.
 *
 * Реальные данные:
 *  - Активные брони → GET /v1/appointments?status=booked (берём total)
 *  - Мастера на смене → GET /v1/staff?status=active (total)
 *  - Клиенты тенанта → GET /v1/clients (total)
 *  - Услуги тенанта → GET /v1/services (total)
 *
 * Если эндпоинт упал — показываем "—" вместо числа, без блокировки страницы.
 */
interface Counts {
  bookings: number | null;
  staff: number | null;
  clients: number | null;
  services: number | null;
}

interface ListResponse {
  total?: number;
  items?: unknown[];
}

export function KpiRow() {
  const [counts, setCounts] = useState<Counts>({
    bookings: null,
    staff: null,
    clients: null,
    services: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load<K extends keyof Counts>(
      key: K,
      url: string,
    ): Promise<void> {
      try {
        const res = await apiFetch<ListResponse | unknown[]>(url);
        const total = Array.isArray(res)
          ? res.length
          : typeof res?.total === 'number'
            ? res.total
            : Array.isArray(res?.items)
              ? res.items.length
              : 0;
        if (!cancelled) setCounts((p) => ({ ...p, [key]: total }));
      } catch (err) {
        if (err instanceof ApiError) {
          if (!cancelled) setCounts((p) => ({ ...p, [key]: 0 }));
        }
      }
    }

    void load('bookings', '/v1/appointments?status=booked&limit=1');
    void load('staff', '/v1/staff?status=active&limit=1');
    void load('clients', '/v1/clients?limit=1');
    void load('services', '/v1/services?limit=1');

    return () => {
      cancelled = true;
    };
  }, []);

  const fmt = (n: number | null) => (n === null ? '—' : n.toLocaleString('ru-RU'));

  return (
    <section className="grid grid-cols-4 gap-4 max-[1280px]:grid-cols-2">
      <KpiTile
        icon={<Calendar />}
        label="Активные брони"
        value={fmt(counts.bookings)}
        sub="STATUS · BOOKED"
      />
      <KpiTile
        icon={<UsersRound />}
        label="Мастера на смене"
        value={fmt(counts.staff)}
        sub="STATUS · ACTIVE"
      />
      <KpiTile
        icon={<Users />}
        label="Клиенты"
        value={fmt(counts.clients)}
        sub="TENANT TOTAL"
      />
      <KpiTile
        icon={<Sparkles />}
        label="Услуги"
        value={fmt(counts.services)}
        sub="TENANT TOTAL"
      />
    </section>
  );
}
