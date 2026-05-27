'use client';

/**
 * /admin/wfy/cities — справочник городов для work-for-you-tenant'а.
 *
 * Доступно только тенантам с site_type='wfy-city-dir'; для остальных API
 * вернёт 409 TENANT_SITE_TYPE_MISMATCH и UI покажет соответствующее
 * сообщение вместо списка.
 *
 * Паттерн = /admin/salons/page.tsx (list + form split), но облегчённый:
 * нет working-hours, нет cover image, основной use case — массовое
 * редактирование 57 seed-городов (status toggle + extras.metaTitle для SEO).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import {
  wfyCitiesApi,
  type WfyCity,
  type WfyCityStatus,
  type WfyCityExtras,
  type ListWfyCitiesQuery,
} from '@/lib/wfy-cities-api';

const STATUSES: WfyCityStatus[] = ['draft', 'published', 'archived'];

type StatusFilter = WfyCityStatus | 'all';

interface FormState {
  slug: string;
  cityName: string;
  region: string;
  country: string;
  headline: string;
  description: string;
  status: WfyCityStatus;
  ord: number;
  metaTitle: string;
  metaDescription: string;
}

function emptyForm(): FormState {
  return {
    slug: '',
    cityName: '',
    region: '',
    country: 'RU',
    headline: '',
    description: '',
    status: 'draft',
    ord: 0,
    metaTitle: '',
    metaDescription: '',
  };
}

function fromCity(c: WfyCity): FormState {
  return {
    slug: c.slug,
    cityName: c.cityName,
    region: c.region ?? '',
    country: c.country,
    headline: c.headline ?? '',
    description: c.description ?? '',
    status: c.status,
    ord: c.ord,
    metaTitle: c.extras?.metaTitle ?? '',
    metaDescription: c.extras?.metaDescription ?? '',
  };
}

function toExtras(form: FormState, prev: WfyCityExtras = {}): WfyCityExtras {
  return {
    ...prev,
    metaTitle: form.metaTitle || undefined,
    metaDescription: form.metaDescription || undefined,
  };
}

export default function WfyCitiesPage() {
  const [items, setItems] = useState<WfyCity[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [capabilityBlocked, setCapabilityBlocked] = useState(false);

  const selected = useMemo(
    () => items.find((it) => it.id === selectedId) ?? null,
    [items, selectedId],
  );

  const reload = useCallback(async () => {
    setError(null);
    const q: ListWfyCitiesQuery = { limit: 200 };
    if (statusFilter !== 'all') q.status = statusFilter;
    if (query.trim()) q.q = query.trim();
    try {
      const res = await wfyCitiesApi.list(q);
      setItems(res.data);
      setCapabilityBlocked(false);
    } catch (err) {
      if (err instanceof ApiError && err.body.code === 'TENANT_SITE_TYPE_MISMATCH') {
        setCapabilityBlocked(true);
      } else {
        setError(formatErr(err));
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, query]);

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
      const created = await wfyCitiesApi.create({
        slug: form.slug,
        cityName: form.cityName,
        region: form.region || undefined,
        country: form.country || 'RU',
        headline: form.headline || undefined,
        description: form.description || undefined,
        status: form.status,
        ord: form.ord,
        extras: toExtras(form),
      });
      setItems((prev) => [created, ...prev]);
      setCreating(false);
      setSelectedId(created.id);
      showNotice('Город создан');
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
      const updated = await wfyCitiesApi.update(selected.id, {
        slug: form.slug,
        cityName: form.cityName,
        region: form.region || undefined,
        country: form.country || 'RU',
        headline: form.headline || undefined,
        description: form.description || undefined,
        status: form.status,
        ord: form.ord,
        extras: toExtras(form, selected.extras),
      });
      setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
      showNotice('Сохранено');
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Удалить город безвозвратно? Будут затронуты связанные данные.')) return;
    setSaving(true);
    setError(null);
    try {
      await wfyCitiesApi.remove(id);
      setItems((prev) => prev.filter((it) => it.id !== id));
      if (selectedId === id) setSelectedId(null);
      showNotice('Удалено');
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setSaving(false);
    }
  }

  if (capabilityBlocked) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center text-text-mute space-y-3">
        <div className="text-sm uppercase tracking-widest">Модуль недоступен</div>
        <div className="text-base text-text">
          City pages — модуль для тенантов типа{' '}
          <code className="font-mono text-accent">wfy-city-dir</code>. Текущий
          тенант имеет другой site_type и не должен видеть этот пункт меню.
        </div>
        <div className="text-[12px] italic">
          Этот же запрет дублируется на API (409 TENANT_SITE_TYPE_MISMATCH) —
          UI fail-safe в случае рассинхронизации меню и tenant.site_type.
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-text-mute font-mono text-xs">loading wfy cities…</div>;
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
            placeholder="по названию города…"
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
          />
        </label>
        <button
          onClick={onAdd}
          disabled={saving}
          className="px-4 py-2 bg-accent text-bg font-semibold rounded-md disabled:opacity-50"
        >
          + Новый город
        </button>
      </section>

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
              Города ({items.length})
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
                  <div className="text-sm truncate">{it.cityName}</div>
                  <div className="text-[11.5px] text-text-mute font-mono truncate">
                    {it.country}
                    {it.region ? ` · ${it.region}` : ''} · {it.slug}
                  </div>
                </div>
                <StatusPill status={it.status} />
              </li>
            ))}
            {items.length === 0 && (
              <li className="p-6 text-center text-text-mute text-sm">
                Городов нет под текущий фильтр. Нажмите «+ Новый город».
              </li>
            )}
          </ul>
        </div>

        {/* Form */}
        <div className="border border-border rounded-md bg-surface p-4">
          {creating ? (
            <CityForm
              key="new"
              initial={emptyForm()}
              isNew
              saving={saving}
              onSubmit={onSubmitNew}
              onCancel={() => setCreating(false)}
            />
          ) : selected ? (
            <CityForm
              key={selected.id}
              initial={fromCity(selected)}
              saving={saving}
              onSubmit={onSubmitEdit}
              onDelete={() => onDelete(selected.id)}
              meta={`${selected.id.slice(0, 8)}… · обновлён ${selected.updatedAt.slice(0, 16).replace('T', ' ')}`}
            />
          ) : (
            <div className="text-text-mute text-sm py-10 text-center">
              Выберите город слева или нажмите «+ Новый город».
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: WfyCityStatus }) {
  const cls =
    status === 'published'
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

function CityForm({
  initial,
  saving,
  isNew,
  meta,
  onSubmit,
  onCancel,
  onDelete,
}: {
  initial: FormState;
  saving: boolean;
  isNew?: boolean;
  meta?: string;
  onSubmit: (form: FormState) => void;
  onCancel?: () => void;
  onDelete?: () => void;
}) {
  const [slug, setSlug] = useState(initial.slug);
  const [cityName, setCityName] = useState(initial.cityName);
  const [region, setRegion] = useState(initial.region);
  const [country, setCountry] = useState(initial.country);
  const [headline, setHeadline] = useState(initial.headline);
  const [description, setDescription] = useState(initial.description);
  const [status, setStatus] = useState<WfyCityStatus>(initial.status);
  const [ord, setOrd] = useState(initial.ord);
  const [metaTitle, setMetaTitle] = useState(initial.metaTitle);
  const [metaDescription, setMetaDescription] = useState(initial.metaDescription);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      slug,
      cityName,
      region,
      country,
      headline,
      description,
      status,
      ord,
      metaTitle,
      metaDescription,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-xs uppercase tracking-widest text-text-mute">
        {isNew ? 'Новый город' : 'Город'}{' '}
        {meta && <span className="font-mono opacity-60">· {meta}</span>}
      </div>

      <Field label="Название города">
        <input
          required
          minLength={1}
          maxLength={128}
          value={cityName}
          onChange={(e) => setCityName(e.target.value)}
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Slug" hint="lowercase, цифры, дефисы; уник. в тенанте">
          <input
            required
            minLength={2}
            maxLength={64}
            pattern="^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent font-mono"
          />
        </Field>
        <Field label="Статус">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as WfyCityStatus)}
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-[2fr,1fr,1fr] gap-3">
        <Field label="Регион">
          <input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            maxLength={128}
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
        <Field label="Порядок">
          <input
            type="number"
            min={0}
            value={ord}
            onChange={(e) => setOrd(Number(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent font-mono"
          />
        </Field>
      </div>

      <Field label="Заголовок страницы (headline)">
        <input
          maxLength={500}
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
        />
      </Field>

      <Field label="Описание">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={20000}
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
        />
      </Field>

      <fieldset className="border border-border rounded-md p-3 space-y-3">
        <legend className="text-xs uppercase tracking-wider text-text-mute px-1">SEO</legend>
        <Field label="meta_title">
          <input
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            maxLength={200}
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
          />
        </Field>
        <Field label="meta_description">
          <textarea
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            rows={2}
            maxLength={500}
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
          />
        </Field>
      </fieldset>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            className="px-3 py-2 text-sm text-red-400 border border-red-500/40 rounded-md hover:bg-red-500/10 disabled:opacity-50"
          >
            Удалить
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
