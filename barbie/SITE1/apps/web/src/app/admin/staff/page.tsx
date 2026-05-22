'use client';

/**
 * /admin/staff — CRUD для мастеров тенанта.
 *
 * Pattern совпадает с /admin/services: toolbar + list (слева) + form (справа).
 * Tenant-context подкладывает apiFetch (X-Tenant-Slug из auth-сессии).
 *
 * salonId обязателен (NOT NULL в схеме). Если у тенанта нет ни одного салона —
 * страница покажет инструкцию завести салон в /admin/salons.
 *
 * M2M staff_services редактируется чекбоксами из active-услуг тенанта; полный
 * редактор price/duration overrides — отдельная задача.
 *
 * schedule — пока default пустая неделя; полноценный редактор расписания
 * подъедет вместе с /admin/appointments (календарь).
 *
 * «Удалить» — soft archive (DELETE /v1/staff/:id → status=archived). Из списка
 * не пропадает, получает pill; чтобы убрать с глаз — фильтр статуса.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import {
  staffApi,
  EMPTY_SCHEDULE,
  type Staff,
  type StaffStatus,
} from '@/lib/staff-api';
import {
  servicesApi,
  listSalonsLite,
  type Service,
  type SalonLite,
} from '@/lib/services-api';

const STATUSES: StaffStatus[] = ['active', 'on_leave', 'archived'];

type StatusFilter = StaffStatus | 'all';

interface FormState {
  name: string;
  bio: string;
  salonId: string;
  userId: string;
  photoKey: string;
  specialtiesRaw: string;
  serviceIds: string[];
  status: StaffStatus;
}

const EMPTY_FORM: FormState = {
  name: '',
  bio: '',
  salonId: '',
  userId: '',
  photoKey: '',
  specialtiesRaw: '',
  serviceIds: [],
  status: 'active',
};

function fromStaff(s: Staff): FormState {
  return {
    name: s.name,
    bio: s.bio ?? '',
    salonId: s.salonId,
    userId: s.userId ?? '',
    photoKey: s.photoKey ?? '',
    specialtiesRaw: s.specialties.join(', '),
    serviceIds: s.services ?? [],
    status: s.status,
  };
}

function parseSpecialties(raw: string): string[] {
  return raw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function StaffPage() {
  const [items, setItems] = useState<Staff[]>([]);
  const [salons, setSalons] = useState<SalonLite[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [salonFilter, setSalonFilter] = useState<string>('');
  const [query, setQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = useMemo(
    () => items.find((it) => it.id === selectedId) ?? null,
    [items, selectedId],
  );

  const salonName = useCallback(
    (id: string) => salons.find((s) => s.id === id)?.name ?? id.slice(0, 8) + '…',
    [salons],
  );

  // Selected detail fetch — list-эндпоинт не отдаёт services[], нужен /:id
  useEffect(() => {
    if (!selectedId || creating) return;
    const stillHasServices = items.find((it) => it.id === selectedId)?.services;
    if (stillHasServices) return;
    let cancelled = false;
    staffApi
      .get(selectedId)
      .then((full) => {
        if (cancelled) return;
        setItems((prev) => prev.map((it) => (it.id === full.id ? full : it)));
      })
      .catch(() => {
        // Молча — без services[] форма откроется с пустыми чекбоксами.
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, creating, items]);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const res = await staffApi.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        salonId: salonFilter || undefined,
        q: query.trim() || undefined,
      });
      setItems(res.data);
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, salonFilter, query]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    listSalonsLite()
      .then((data) => {
        if (!cancelled) setSalons(data);
      })
      .catch(() => {});
    servicesApi
      .list({ status: 'active', limit: 200 })
      .then((r) => {
        if (!cancelled) setServices(r.data);
      })
      .catch(() => {});
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
    if (!form.salonId) {
      setError('Выберите салон');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await staffApi.create({
        salonId: form.salonId,
        userId: form.userId.trim() || undefined,
        name: form.name,
        bio: form.bio || undefined,
        photoKey: form.photoKey.trim() || undefined,
        specialties: parseSpecialties(form.specialtiesRaw),
        schedule: EMPTY_SCHEDULE,
        serviceIds: form.serviceIds,
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
    if (!form.salonId) {
      setError('Выберите салон');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await staffApi.update(selected.id, {
        salonId: form.salonId,
        userId: form.userId.trim() || undefined,
        name: form.name,
        bio: form.bio || undefined,
        photoKey: form.photoKey.trim() || undefined,
        specialties: parseSpecialties(form.specialtiesRaw),
        serviceIds: form.serviceIds,
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
    if (!confirm('Архивировать мастера? Запись останется в БД со статусом archived. M2M-связки сохранятся.')) return;
    setSaving(true);
    setError(null);
    try {
      const archived = await staffApi.archive(id);
      setItems((prev) => prev.map((it) => (it.id === archived.id ? archived : it)));
      showNotice('Архивировано');
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-text-mute font-mono text-xs">loading staff…</div>;
  }

  const noSalons = salons.length === 0;

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
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-wider text-text-mute">Салон</span>
          <select
            value={salonFilter}
            onChange={(e) => setSalonFilter(e.target.value)}
            className="px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
          >
            <option value="">все салоны</option>
            {salons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 flex-1 min-w-[200px]">
          <span className="text-xs uppercase tracking-wider text-text-mute">Поиск</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="имя…"
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
          />
        </label>
        <button
          onClick={onAdd}
          disabled={saving || noSalons}
          title={noSalons ? 'Сначала заведи салон в /admin/salons' : undefined}
          className="px-4 py-2 bg-accent text-bg font-semibold rounded-md disabled:opacity-50"
        >
          + Новый мастер
        </button>
      </section>

      {/* Notices */}
      {noSalons && (
        <div className="px-3 py-2 border border-yellow-500/40 bg-yellow-500/10 text-yellow-300 text-sm rounded-md">
          У тенанта нет ни одного салона. Заведи салон в <a href="/admin/salons" className="underline">/admin/salons</a> — мастер обязан быть привязан к салону.
        </div>
      )}
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
              Мастера ({items.length})
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
                    {salonName(it.salonId)}
                    {it.specialties.length > 0 && ` · ${it.specialties.join(', ')}`}
                  </div>
                </div>
                <StatusPill status={it.status} />
              </li>
            ))}
            {items.length === 0 && (
              <li className="p-6 text-center text-text-mute text-sm">
                Мастеров нет под текущий фильтр.
              </li>
            )}
          </ul>
        </div>

        {/* Form */}
        <div className="border border-border rounded-md bg-surface p-4">
          {creating ? (
            <StaffForm
              key="new"
              initial={{ ...EMPTY_FORM, salonId: salons[0]?.id ?? '' }}
              isNew
              salons={salons}
              services={services}
              saving={saving}
              onSubmit={onSubmitNew}
              onCancel={() => setCreating(false)}
            />
          ) : selected ? (
            <StaffForm
              key={selected.id}
              initial={fromStaff(selected)}
              salons={salons}
              services={services}
              saving={saving}
              onSubmit={onSubmitEdit}
              onArchive={selected.status !== 'archived' ? () => onArchive(selected.id) : undefined}
              meta={`${selected.id.slice(0, 8)}… · обновлено ${selected.updatedAt.slice(0, 16).replace('T', ' ')}`}
            />
          ) : (
            <div className="text-text-mute text-sm py-10 text-center">
              Выберите мастера слева или нажмите «+ Новый мастер».
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: StaffStatus }) {
  const cls =
    status === 'active'
      ? 'bg-green-500/10 text-green-400'
      : status === 'on_leave'
        ? 'bg-yellow-500/10 text-yellow-400'
        : 'bg-red-500/10 text-red-400';
  return (
    <span className={`text-[11.5px] uppercase font-mono px-1.5 py-0.5 rounded-md ${cls}`}>
      {status}
    </span>
  );
}

function StaffForm({
  initial,
  salons,
  services,
  saving,
  isNew,
  meta,
  onSubmit,
  onCancel,
  onArchive,
}: {
  initial: FormState;
  salons: SalonLite[];
  services: Service[];
  saving: boolean;
  isNew?: boolean;
  meta?: string;
  onSubmit: (form: FormState) => void;
  onCancel?: () => void;
  onArchive?: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [bio, setBio] = useState(initial.bio);
  const [salonId, setSalonId] = useState(initial.salonId);
  const [userId, setUserId] = useState(initial.userId);
  const [photoKey, setPhotoKey] = useState(initial.photoKey);
  const [specialtiesRaw, setSpecialtiesRaw] = useState(initial.specialtiesRaw);
  const [serviceIds, setServiceIds] = useState<string[]>(initial.serviceIds);
  const [status, setStatus] = useState<StaffStatus>(initial.status);

  function toggleService(id: string) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ name, bio, salonId, userId, photoKey, specialtiesRaw, serviceIds, status });
  }

  // Сгруппируем услуги по category для удобного выбора
  const servicesByCategory = useMemo(() => {
    const map = new Map<string, Service[]>();
    for (const s of services) {
      const key = s.category || '—';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [services]);

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-xs uppercase tracking-widest text-text-mute">
        {isNew ? 'Новый мастер' : 'Мастер'}{' '}
        {meta && <span className="font-mono opacity-60">· {meta}</span>}
      </div>

      <Field label="Имя">
        <input
          required
          minLength={2}
          maxLength={255}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
        />
      </Field>

      <Field label="Салон" hint="к какому салону тенанта привязан мастер">
        <select
          required
          value={salonId}
          onChange={(e) => setSalonId(e.target.value)}
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
        >
          <option value="" disabled>
            — выбрать салон —
          </option>
          {salons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Био">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={5000}
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
        />
      </Field>

      <Field label="Специализации" hint="через запятую: hair, color, massage">
        <input
          value={specialtiesRaw}
          onChange={(e) => setSpecialtiesRaw(e.target.value)}
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
        />
      </Field>

      <Field
        label={`Услуги мастера (${serviceIds.length})`}
        hint="отметь, какие услуги делает; price/duration overrides — отдельная задача"
      >
        <div className="border border-border rounded-md p-3 max-h-[200px] overflow-y-auto bg-bg space-y-3">
          {services.length === 0 && (
            <div className="text-text-mute text-xs italic">
              Услуг нет. Заведи их в /admin/services.
            </div>
          )}
          {servicesByCategory.map(([cat, list]) => (
            <div key={cat}>
              <div className="text-[10px] uppercase tracking-wider text-text-mute mb-1">{cat}</div>
              <div className="space-y-1">
                {list.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={serviceIds.includes(s.id)}
                      onChange={() => toggleService(s.id)}
                      className="accent-accent"
                    />
                    <span className="truncate">{s.name}</span>
                    <span className="text-[11px] text-text-mute font-mono ml-auto">
                      {s.durationMin} мин
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="user_id" hint="UUID существующего tenant_users (опц.)">
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="не привязан"
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent font-mono text-xs"
          />
        </Field>
        <Field label="Статус">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StaffStatus)}
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

      <Field label="S3 key фото" hint='напр. "tenants/aurelia/staff/anna.jpg" (uploader позже)'>
        <input
          value={photoKey}
          onChange={(e) => setPhotoKey(e.target.value)}
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent font-mono text-xs"
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
