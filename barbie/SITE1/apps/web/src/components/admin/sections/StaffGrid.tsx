'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { Card } from '@/components/admin/primitives/Card';
import { Pill } from '@/components/admin/primitives/Pill';

interface Staff {
  id: string;
  name: string;
  salonId: string;
  status: 'active' | 'archived';
  // staff.service may include role/title — но в MVP отображаем only name
}
interface ListResponse {
  items?: Staff[];
  total?: number;
}

/**
 * StaffGrid — 4-в-ряд карточки активных мастеров.
 * Phase 1: статус — синтетический ('work'/'break'/'idle') по детерминированной
 * формуле от id; в Phase 2 заменим на реальный live-статус (нужен новый endpoint
 * "сейчас занят/свободен" — после shift-планировщика).
 */
type LiveStatus = 'work' | 'break' | 'idle' | 'off';

function deriveLiveStatus(id: string, status: string): LiveStatus {
  if (status !== 'active') return 'off';
  const code = (id.charCodeAt(0) + id.charCodeAt(id.length - 1)) % 4;
  if (code === 0) return 'work';
  if (code === 1) return 'work';
  if (code === 2) return 'break';
  return 'idle';
}

export function StaffGrid() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<ListResponse | Staff[]>('/v1/staff?status=active&limit=8')
      .then((res) => {
        if (cancelled) return;
        const items = Array.isArray(res) ? res : (res?.items ?? []);
        setStaff(items.slice(0, 8));
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card
      title="Мастера сейчас"
      sub={`${staff.length} НА СМЕНЕ · DEMO STATUS`}
      actions={
        <Pill active className="!bg-gold/10 !text-gold !border !border-gold/30">
          ВСЕ САЛОНЫ
        </Pill>
      }
    >
      {loading && <div className="text-text-mute text-sm py-3">loading…</div>}
      {error && (
        <div className="text-red text-xs px-2 py-1.5 bg-red/10 border border-red/30 rounded">
          {error}
        </div>
      )}
      {!loading && !error && staff.length === 0 && (
        <div className="text-text-mute text-sm py-3">У этого тенанта нет активных мастеров.</div>
      )}
      <div className="grid grid-cols-4 gap-3 max-[1280px]:grid-cols-2 max-[820px]:grid-cols-1">
        {staff.map((s) => {
          const live = deriveLiveStatus(s.id, s.status);
          const initial = (s.name[0] ?? '?').toUpperCase();
          return (
            <div
              key={s.id}
              className="bg-bg-elev border border-line rounded-md p-3 pt-3 relative"
            >
              <div className="relative mb-2">
                <div
                  className="w-9 h-9 rounded-full grid place-items-center font-display font-semibold text-[13px] text-bg"
                  style={{ background: 'linear-gradient(135deg, #4a3a1a, rgb(var(--gold)))' }}
                >
                  {initial}
                </div>
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-[11px] h-[11px] rounded-full"
                  style={{
                    background:
                      live === 'work' ? 'rgb(var(--green))'
                      : live === 'break' ? 'rgb(var(--amber))'
                      : live === 'idle' ? 'rgb(var(--gold))'
                      : 'rgb(var(--text-mute))',
                    border: '2px solid rgb(var(--bg-elev))',
                    boxShadow: live === 'work' ? '0 0 6px rgb(var(--green) / 0.6)' : undefined,
                  }}
                />
              </div>
              <div className="text-[12.5px] font-semibold leading-tight">{s.name}</div>
              <div className="text-[12px] text-text-mute font-mono tracking-wider mt-0.5">
                staff · active
              </div>
              <div className="mt-2 pt-2 border-t border-line text-[11px] text-text-dim leading-snug">
                {live === 'work' && (
                  <>
                    На смене · <strong className="text-gold font-semibold">DEMO</strong>
                  </>
                )}
                {live === 'break' && (
                  <>
                    Перерыв · <strong>14:40</strong>
                  </>
                )}
                {live === 'idle' && (
                  <>
                    Свободен · след. <strong className="text-gold font-semibold">15:00</strong>
                  </>
                )}
                {live === 'off' && 'Вне смены'}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
