'use client';

/**
 * /admin/services — CRUD для каталога услуг тенанта.
 *
 * Pattern совпадает с /admin/menu: toolbar + list (слева) + form (справа).
 * Tenant-context подкладывает apiFetch (X-Tenant-Slug из auth-сессии).
 *
 * Поведение «Удалить» — soft archive (DELETE /v1/services/:id возвращает
 * запись со статусом archived). Из списка она не пропадает, но получает
 * соответствующий pill; чтобы убрать с глаз — фильтр статуса.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import {
  servicesApi,
  listSalonsLite,
  kopecksToRub,
  rubToKopecks,
  type Service,
  type ServiceStatus,
  type SalonLite,
  type ListServicesQuery,
} from '@/lib/services-api';

const STATUSES: ServiceStatus[] = ['active', 'draft', 'archived'];

type StatusFilter = ServiceStatus | 'all';

interface FormState {
  name: string;
  slug: string;
  description: string;
  category: string;
  durationMin: number;
  priceRub: string;
  salonId: string;
  status: ServiceStatus;
}

const EMPTY_FORM: FormState = {
  name: '',
  slug: '',
  description: '',
  category: '',
  durationMin: 60,
  priceRub: '0.00',
  salonId: '',
  status: 'draft',
};

function fromService(s: Service): FormState {
  return {
    name: s.name,
    slug: s.slug,
    description: s.description ?? '',
    category: s.category,
    durationMin: s.durationMin,
    priceRub: kopecksToRub(s.priceKopecks),
    salonId: s.salonId ?? '',
    status: s.status,
  };
}

export default function ServicesPage() {
  const [items, setItems] = useState<Service[]>([]);
  const [salons, setSalons] = useState<SalonLite[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [query, setQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = useMemo(
    () => items.find((it) => it.id === selectedId) ?? null,
    [items, selectedId],
  );

  const reload = useCallback(async () => {
    setError(null);
    const q: ListServicesQuery = {};
    if (statusFilter !== 'all') q.status = statusFilter;
    if (query.trim()) q.q = query.trim();
    try {
      const res = await servicesApi.list(q);
      setItems(res.data);
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, query]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Salons — однократно при mount'е (если протух — обновим при следующей странице).
  useEffect(() => {
    let cancelled = false;
    listSalonsLite()
      .then((data) => {
        if (!cancelled) setSalons(data);
      })
      .catch(() => {
        // Не критично — салон-select просто не будет содержать опций;
        // UUID-инпут останется доступен через текст. Молча.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function showNotice(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2500);
  }

  function onAdd() {
    setCreating(true);
    setSelectedId(null);
  }

  async function onSubmitNew(form: FormState) {
    const priceKopecks = rubToKopecks(form.priceRub);
    if (priceKopecks === null) {
      setError('Цена должна быть числом (например 1500 или 1500.50)');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await servicesApi.create({
        name: form.name,
        slug: form.slug,
        description: form.description || undefined,
        category: form.category,
        durationMin: form.durationMin,
        priceKopecks,
        salonId: form.salonId || null,
      });
      setItems((prev) => [created, ...prev]);
      setCreating(false);
      setSelectedId(created.id);
      showNotice('Создано');
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setSaving(false);
    }
  }

  async function onSubmitEdit(form: FormState) {
    if (!selected) return;
    const priceKopecks = rubToKopecks(form.priceRub);
    if (priceKopecks === null) {
      setError('Цена должна быть числом (например 1500 или 1500.50)');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await servicesApi.update(selected.id, {
        name: form.name,
        slug: form.slug,
        description: form.description || undefined,
        category: form.category,
        durationMin: form.durationMin,
        priceKopecks,
        salonId: form.salonId || null,
        status: form.status,
      });
      setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
      showNotice('Сохранено');
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setSaving(false);
    }
  }

  async function onArchive(id: string) {
    if (!confirm('Архивировать услугу? Запись останется в БД со статусом archived.')) return;
    setSaving(true);
    setError(null);
    try {
      const archived = await servicesApi.archive(id);
      setItems((prev) => prev.map((it) => (it.id === archived.id ? archived : it)));
      showNotice('Архивировано');
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-text-mute font-mono text-xs">loading services…</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Toolbar */}
      <section className="flex flex-wrap items-end gap-3">
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-wider text-text-mute">Статус</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
          >
            <option value="all">все</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 flex-1 min-w-[200px]">
          <span className="text-xs uppercase tracking-wider text-text-mute">Поиск</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="название или slug…"
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
          />
        </label>
        <button
          onClick={onAdd}
          disabled={saving}
          className="px-4 py-2 bg-accent text-bg font-semibold rounded-md disabled:opacity-50"
        >
          + Новая услуга
        </button>
      </section>

      {/* Notices */}
      {error && (
        <div className="px-3 py-2 border border-red-500/40 bg-red-500/10 text-red-300 text-sm rounded-md">
          {error}
        </div>
      )}
      {notice && (
        <div className="px-3 py-2 border border-green-500/40 bg-green-500/10 text-green-300 text-sm rounded-md">
          {notice}
        </div>
      )}

      {/* Editor split */}
      <section className="grid grid-cols-1 md:grid-cols-[1fr,1.4fr] gap-6">
        {/* List */}
        <div className="border border-border rounded-md bg-surface">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h2 className="text-xs uppercase tracking-widest text-text-mute">
              Услуги ({items.length})
            </h2>
          </div>
          <ul className="divide-y divide-border max-h-[70vh] overflow-y-auto">
            {items.map((it) => (
              <li
                key={it.id}
                className={`flex items-center gap-2 p-3 cursor-pointer ${
                  selectedId === it.id && !creating
                    ? 'bg-surface-2'
                    : 'hover:bg-surface-2/50'
                }`}
                onClick={() => {
                  setCreating(false);
                  setSelectedId(it.id);
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{it.name}</div>
                  <div className="text-[11.5px] text-text-mute font-mono truncate">
                    {it.slug} · {it.category} · {it.durationMin} мин · {kopecksToRub(it.priceKopecks)}{' '}
                    {it.currency}
                  </div>
                </div>
                <StatusPill status={it.status} />
              </li>
            ))}
            {items.length === 0 && (
              <li className="p-6 text-center text-text-mute text-sm">
                Услуг нет под текущий фильтр. Нажмите «+ Новая услуга».
              </li>
            )}
          </ul>
        </div>

        {/* Form */}
        <div className="border border-border rounded-md bg-surface p-4">
          {creating ? (
            <ServiceForm
              key="new"
              initial={EMPTY_FORM}
              isNew
              salons={salons}
              saving={saving}
              onSubmit={onSubmitNew}
              onCancel={() => setCreating(false)}
            />
          ) : selected ? (
            <ServiceForm
              key={selected.id}
              initial={fromService(selected)}
              salons={salons}
              saving={saving}
              onSubmit={onSubmitEdit}
              onArchive={
                selected.status !== 'archived' ? () => onArchive(selected.id) : undefined
              }
              meta={`${selected.id.slice(0, 8)}… · обновлено ${selected.updatedAt.slice(0, 16).replace('T', ' ')}`}
            />
          ) : (
            <div className="text-text-mute text-sm py-10 text-center">
              Выберите услугу слева или нажмите «+ Новая услуга».
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: ServiceStatus }) {
  const cls =
    status === 'active'
      ? 'bg-green-500/10 text-green-400'
      : status === 'draft'
        ? 'bg-yellow-500/10 text-yellow-400'
        : 'bg-red-500/10 text-red-400';
  return (
    <span className={`text-[11.5px] uppercase font-mono px-1.5 py-0.5 rounded-md ${cls}`}>
      {status}
    </span>
  );
}

function ServiceForm({
  initial,
  salons,
  saving,
  isNew,
  meta,
  onSubmit,
  onCancel,
  onArchive,
}: {
  initial: FormState;
  salons: SalonLite[];
  saving: boolean;
  isNew?: boolean;
  meta?: string;
  onSubmit: (form: FormState) => void;
  onCancel?: () => void;
  onArchive?: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [description, setDescription] = useState(initial.description);
  const [category, setCategory] = useState(initial.category);
  const [durationMin, setDurationMin] = useState(initial.durationMin);
  const [priceRub, setPriceRub] = useState(initial.priceRub);
  const [salonId, setSalonId] = useState(initial.salonId);
  const [status, setStatus] = useState<ServiceStatus>(initial.status);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ name, slug, description, category, durationMin, priceRub, salonId, status });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-xs uppercase tracking-widest text-text-mute">
        {isNew ? 'Новая услуга' : 'Услуга'}{' '}
        {meta && <span className="font-mono opacity-60">· {meta}</span>}
      </div>

      <Field label="Название">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
        />
      </Field>

      <Field label="Slug" hint="lowercase, 1-40 символов, цифры и дефисы">
        <input
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent font-mono"
        />
      </Field>

      <Field label="Описание">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Категория" hint='напр. "manicure", "massage"'>
          <input
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
          />
        </Field>
        <Field label="Длительность (мин)" hint="5–1440">
          <input
            type="number"
            min={5}
            max={1440}
            required
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Цена (RUB)" hint="например 1500 или 1500.50">
          <input
            required
            value={priceRub}
            onChange={(e) => setPriceRub(e.target.value)}
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent font-mono"
          />
        </Field>
        <Field label="Статус">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ServiceStatus)}
            disabled={isNew}
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent disabled:opacity-50"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Салон" hint="пусто = глобальная для всех салонов тенанта">
        <select
          value={salonId}
          onChange={(e) => setSalonId(e.target.value)}
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
        >
          <option value="">— Все салоны (глобальная) —</option>
          {salons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        {onArchive ? (
          <button
            type="button"
            onClick={onArchive}
            disabled={saving}
            className="px-3 py-2 text-sm text-red-400 border border-red-500/40 rounded-md hover:bg-red-500/10 disabled:opacity-50"
          >
            Архивировать
          </button>
        ) : onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-3 py-2 text-sm text-text-mute border border-border rounded-md hover:bg-surface-2 disabled:opacity-50"
          >
            Отмена
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-accent text-bg font-semibold rounded-md disabled:opacity-50"
        >
          {saving ? '…' : isNew ? 'Создать' : 'Сохранить'}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs uppercase tracking-wider text-text-mute">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-text-mute italic">{hint}</span>}
    </label>
  );
}

function formatErr(err: unknown): string {
  if (err instanceof ApiError) {
    return err.body.message ?? `HTTP ${err.status} (${err.body.code ?? 'unknown'})`;
  }
  return String(err);
}
