'use client';

/**
 * /admin/salons — физические локации тенанта.
 *
 * Pattern совпадает с /admin/services и /admin/clients: toolbar + list (слева) +
 * form (справа). Особенности:
 *
 *   - workingHours редактируется встроенным 7-строчным мини-редактором
 *     (день | open | close | closed-checkbox). Exceptions откладываются до
 *     полноценного календаря.
 *   - status доступен только при edit (создание выставляет default 'active').
 *   - Архивирование = soft-DELETE (status=archived).
 *
 * Этот же endpoint /v1/salons потребуется для будущего /admin/staff
 * (multi-select салонов для мастера) — там переиспользуем lib/salons-api.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import {
  salonsApi,
  defaultWorkingHours,
  DAY_KEYS,
  DAY_LABELS_RU,
  type Salon,
  type SalonStatus,
  type WorkingHours,
  type WorkingHoursDay,
  type DayKey,
  type ListSalonsQuery,
} from '@/lib/salons-api';

const STATUSES: SalonStatus[] = ['active', 'paused', 'archived'];

type StatusFilter = SalonStatus | 'all';

interface FormState {
  name: string;
  slug: string;
  address: string;
  city: string;
  region: string;
  country: string;
  postalCode: string;
  phone: string;
  email: string;
  description: string;
  workingHours: WorkingHours;
  status: SalonStatus;
}

function emptyForm(): FormState {
  return {
    name: '',
    slug: '',
    address: '',
    city: '',
    region: '',
    country: 'RU',
    postalCode: '',
    phone: '',
    email: '',
    description: '',
    workingHours: defaultWorkingHours(),
    status: 'active',
  };
}

function fromSalon(s: Salon): FormState {
  return {
    name: s.name,
    slug: s.slug,
    address: s.address,
    city: s.city,
    region: s.region ?? '',
    country: s.country,
    postalCode: s.postalCode ?? '',
    phone: s.phone ?? '',
    email: s.email ?? '',
    description: s.description ?? '',
    workingHours: s.workingHours ?? defaultWorkingHours(),
    status: s.status,
  };
}

export default function SalonsPage() {
  const [items, setItems] = useState<Salon[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [query, setQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('');

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
    const q: ListSalonsQuery = {};
    if (statusFilter !== 'all') q.status = statusFilter;
    if (query.trim()) q.q = query.trim();
    if (cityFilter.trim()) q.city = cityFilter.trim();
    try {
      const res = await salonsApi.list(q);
      setItems(res.data);
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, query, cityFilter]);

  useEffect(() => {
    reload();
  }, [reload]);

  function showNotice(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2500);
  }

  function onAdd() {
    setCreating(true);
    setSelectedId(null);
  }

  async function onSubmitNew(form: FormState) {
    setSaving(true);
    setError(null);
    try {
      const created = await salonsApi.create({
        name: form.name,
        slug: form.slug,
        address: form.address,
        city: form.city,
        region: form.region || undefined,
        country: form.country || 'RU',
        postalCode: form.postalCode || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        description: form.description || undefined,
        workingHours: form.workingHours,
      });
      setItems((prev) => [created, ...prev]);
      setCreating(false);
      setSelectedId(created.id);
      showNotice('Создан');
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setSaving(false);
    }
  }

  async function onSubmitEdit(form: FormState) {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await salonsApi.update(selected.id, {
        name: form.name,
        slug: form.slug,
        address: form.address,
        city: form.city,
        region: form.region || undefined,
        country: form.country || 'RU',
        postalCode: form.postalCode || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        description: form.description || undefined,
        workingHours: form.workingHours,
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
    if (!confirm('Архивировать салон? Запись останется со статусом archived.')) return;
    setSaving(true);
    setError(null);
    try {
      const archived = await salonsApi.archive(id);
      setItems((prev) => prev.map((it) => (it.id === archived.id ? archived : it)));
      showNotice('Архивировано');
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-text-mute font-mono text-xs">loading salons…</div>;
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
        <label className="block space-y-1 w-[180px]">
          <span className="text-xs uppercase tracking-wider text-text-mute">Город</span>
          <input
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            placeholder="точное совпадение"
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
          />
        </label>
        <label className="block space-y-1 flex-1 min-w-[200px]">
          <span className="text-xs uppercase tracking-wider text-text-mute">Поиск</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="по названию…"
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
          />
        </label>
        <button
          onClick={onAdd}
          disabled={saving}
          className="px-4 py-2 bg-accent text-bg font-semibold rounded-md disabled:opacity-50"
        >
          + Новый салон
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
              Салоны ({items.length})
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
                    {it.city} · {it.slug}
                    {it.phone ? ` · ${it.phone}` : ''}
                  </div>
                </div>
                <StatusPill status={it.status} />
              </li>
            ))}
            {items.length === 0 && (
              <li className="p-6 text-center text-text-mute text-sm">
                Салонов нет под текущий фильтр. Нажмите «+ Новый салон».
              </li>
            )}
          </ul>
        </div>

        {/* Form */}
        <div className="border border-border rounded-md bg-surface p-4">
          {creating ? (
            <SalonForm
              key="new"
              initial={emptyForm()}
              isNew
              saving={saving}
              onSubmit={onSubmitNew}
              onCancel={() => setCreating(false)}
            />
          ) : selected ? (
            <SalonForm
              key={selected.id}
              initial={fromSalon(selected)}
              saving={saving}
              onSubmit={onSubmitEdit}
              onArchive={
                selected.status !== 'archived' ? () => onArchive(selected.id) : undefined
              }
              meta={`${selected.id.slice(0, 8)}… · обновлён ${selected.updatedAt.slice(0, 16).replace('T', ' ')}`}
            />
          ) : (
            <div className="text-text-mute text-sm py-10 text-center">
              Выберите салон слева или нажмите «+ Новый салон».
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: SalonStatus }) {
  const cls =
    status === 'active'
      ? 'bg-green-500/10 text-green-400'
      : status === 'paused'
        ? 'bg-yellow-500/10 text-yellow-400'
        : 'bg-red-500/10 text-red-400';
  return (
    <span className={`text-[11.5px] uppercase font-mono px-1.5 py-0.5 rounded-md ${cls}`}>
      {status}
    </span>
  );
}

function SalonForm({
  initial,
  saving,
  isNew,
  meta,
  onSubmit,
  onCancel,
  onArchive,
}: {
  initial: FormState;
  saving: boolean;
  isNew?: boolean;
  meta?: string;
  onSubmit: (form: FormState) => void;
  onCancel?: () => void;
  onArchive?: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [address, setAddress] = useState(initial.address);
  const [city, setCity] = useState(initial.city);
  const [region, setRegion] = useState(initial.region);
  const [country, setCountry] = useState(initial.country);
  const [postalCode, setPostalCode] = useState(initial.postalCode);
  const [phone, setPhone] = useState(initial.phone);
  const [email, setEmail] = useState(initial.email);
  const [description, setDescription] = useState(initial.description);
  const [workingHours, setWorkingHours] = useState<WorkingHours>(initial.workingHours);
  const [status, setStatus] = useState<SalonStatus>(initial.status);

  function patchDay(day: DayKey, patch: Partial<WorkingHoursDay>) {
    setWorkingHours((prev) => {
      const current: WorkingHoursDay = prev[day] ?? { open: '10:00', close: '22:00' };
      return { ...prev, [day]: { ...current, ...patch } };
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name,
      slug,
      address,
      city,
      region,
      country,
      postalCode,
      phone,
      email,
      description,
      workingHours,
      status,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-xs uppercase tracking-widest text-text-mute">
        {isNew ? 'Новый салон' : 'Салон'}{' '}
        {meta && <span className="font-mono opacity-60">· {meta}</span>}
      </div>

      <Field label="Название">
        <input
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Slug" hint="lowercase, цифры, дефисы; уник. в тенанте">
          <input
            required
            minLength={2}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent font-mono"
          />
        </Field>
        <Field label="Статус">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SalonStatus)}
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

      <Field label="Адрес">
        <textarea
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
        />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Город">
          <input
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
          />
        </Field>
        <Field label="Регион">
          <input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
          />
        </Field>
        <Field label="Страна" hint="ISO-2 (RU, KZ, …)">
          <input
            maxLength={2}
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase())}
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent font-mono uppercase"
          />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Индекс">
          <input
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent font-mono"
          />
        </Field>
        <Field label="Телефон">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+7 495 123-45-67"
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent font-mono"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
          />
        </Field>
      </div>

      {/* Working hours mini-editor */}
      <fieldset className="border border-border rounded-md p-3">
        <legend className="text-xs uppercase tracking-wider text-text-mute px-1">
          Часы работы
        </legend>
        <div className="space-y-1.5">
          {DAY_KEYS.map((day) => {
            const dh: WorkingHoursDay = workingHours[day] ?? { open: '10:00', close: '22:00' };
            const closed = dh.closed === true;
            return (
              <div key={day} className="grid grid-cols-[40px,1fr,1fr,auto] items-center gap-2">
                <span className="text-xs font-mono uppercase text-text-mute">
                  {DAY_LABELS_RU[day]}
                </span>
                <input
                  type="time"
                  value={dh.open}
                  disabled={closed}
                  onChange={(e) => patchDay(day, { open: e.target.value })}
                  className="px-2 py-1 bg-bg border border-border rounded-md outline-none focus:border-accent font-mono text-sm disabled:opacity-40"
                />
                <input
                  type="time"
                  value={dh.close}
                  disabled={closed}
                  onChange={(e) => patchDay(day, { close: e.target.value })}
                  className="px-2 py-1 bg-bg border border-border rounded-md outline-none focus:border-accent font-mono text-sm disabled:opacity-40"
                />
                <label className="flex items-center gap-1.5 text-xs text-text-mute">
                  <input
                    type="checkbox"
                    checked={closed}
                    onChange={(e) => patchDay(day, { closed: e.target.checked })}
                    className="accent-accent"
                  />
                  выходной
                </label>
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-[11px] text-text-mute italic">
          Exceptions (праздники) пока редактируются только через API.
        </div>
      </fieldset>

      <Field label="Описание">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
        />
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
