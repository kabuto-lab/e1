'use client';

import { useState } from 'react';
import { X, CalendarClock } from 'lucide-react';
import { useDashboardTheme } from '@/components/DashboardThemeContext';
import { dashboardTone } from '@/lib/dashboard-tone';

interface Props {
  onSubmit: (proposedStartTimeIso: string) => Promise<void>;
  onClose: () => void;
}

export function ProposeTimeModal({ onSubmit, onClose }: Props) {
  const { isWpAdmin: L } = useDashboardTheme();
  const t = dashboardTone(L);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) {
      setError('Укажите дату и время');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(new Date(`${date}T${time}:00`).toISOString());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось предложить время');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className={`relative z-10 w-full max-w-sm rounded-2xl p-5 shadow-2xl ${L ? 'border border-[#c3c4c7] bg-white' : 'border border-white/[0.08] bg-[#141414]'}`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className={`flex items-center gap-2 text-base font-semibold ${L ? 'text-[#1d2327]' : 'text-white'}`}>
            <CalendarClock className={`h-4 w-4 ${L ? 'text-[#2271b1]' : 'text-[#d4af37]'}`} /> Предложить время
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg p-1.5 transition-colors ${L ? 'text-[#646970] hover:bg-[#f0f0f1] hover:text-[#1d2327]' : 'text-white/40 hover:bg-white/[0.06] hover:text-white'}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className={`text-xs ${t.muted}`}>Дата</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                required
                className={`${t.inputXs} ${L ? '' : '[color-scheme:dark]'}`}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={`text-xs ${t.muted}`}>Время</span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className={`${t.inputXs} ${L ? '' : '[color-scheme:dark]'}`}
              />
            </label>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className={`flex-1 ${t.btnSecondary}`}>
              Отмена
            </button>
            <button type="submit" disabled={busy} className={`flex-1 ${t.btnPrimary}`}>
              {busy ? '…' : 'Отправить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
