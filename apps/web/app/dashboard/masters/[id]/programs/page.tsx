'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react';
import { api, type MassageServiceProgram } from '@/lib/api-client';
import { NumberStepperInput } from '@/components/NumberStepperInput';

const emptyForm = { name: '', description: '', price: '', durationMinutes: '' };

export default function MasterProgramsPage() {
  const { id } = useParams<{ id: string }>();
  const [programs, setPrograms] = useState<MassageServiceProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .getMassagePrograms(id)
      .then(setPrograms)
      .catch(() => setError('Не удалось загрузить программы'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.createMassageProgram({
        masterId: id,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: Number(form.price),
        durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
      });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить программу');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (programId: string) => {
    if (!confirm('Удалить программу?')) return;
    try {
      await api.deleteMassageProgram(programId);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить');
    }
  };

  return (
    <div className="flex-1 font-body">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/dashboard/masters" className="mb-1 inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/70">
            <ArrowLeft className="h-3.5 w-3.5" /> К списку мастеров
          </Link>
          <h1 className="font-display text-xl font-semibold text-white">Программы</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-[#d4af37] to-[#b8941f] px-4 py-2 text-sm font-semibold text-black hover:shadow-md hover:shadow-[#d4af37]/15"
        >
          <Plus className="h-4 w-4" /> Добавить программу
        </button>
      </div>

      {error ? (
        <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
      ) : null}

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d4af37]/20 border-t-[#d4af37]" />
        </div>
      ) : programs.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-500">Программ пока нет.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {programs.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-[#141414] px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{p.name}</p>
                {p.description ? <p className="mt-0.5 truncate text-xs text-white/35">{p.description}</p> : null}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-display text-sm font-bold text-[#d4af37]">
                  {Math.round(Number(p.price)).toLocaleString('ru-RU')} ₽
                </span>
                <button type="button" onClick={() => remove(p.id)} className="rounded-md border border-white/[0.08] p-1.5 text-red-400/70 hover:border-red-500/40 hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#141414] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-white">Новая программа</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-white/40 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">Название *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.06] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none focus:border-[#d4af37]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">Описание</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-white/[0.06] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none focus:border-[#d4af37]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">Цена (₽) *</label>
                  <NumberStepperInput
                    value={form.price ? Number(form.price) : undefined}
                    onChange={(v) => setForm({ ...form, price: v ? String(v) : '' })}
                    min={0}
                    max={1_000_000}
                    step={100}
                    placeholder="3000"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">Длительность (мин)</label>
                  <NumberStepperInput
                    value={form.durationMinutes ? Number(form.durationMinutes) : undefined}
                    onChange={(v) => setForm({ ...form, durationMinutes: v ? String(v) : '' })}
                    min={0}
                    max={600}
                    step={5}
                    placeholder="60"
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-lg border border-white/[0.08] px-4 py-2.5 text-sm text-white/60 hover:bg-white/[0.04]">
                Отмена
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={saving || !form.name.trim() || !form.price}
                className="flex-1 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-semibold text-black hover:bg-[#c49a2b] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Сохраняем…' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
