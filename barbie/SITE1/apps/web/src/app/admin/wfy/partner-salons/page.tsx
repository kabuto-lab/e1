'use client';

/**
 * /admin/wfy/partner-salons — каталог партнёрских салонов для work-for-you-tenant'а.
 *
 * Доступно только тенантам с site_type='wfy-city-dir'; для остальных API
 * вернёт 409 TENANT_SITE_TYPE_MISMATCH и UI покажет capability-block state.
 *
 * Logo media picker — inline компонент (LogoPicker). Fetch /v1/media?module=logo
 * текущего тенанта (auto tenant scope), сетка мини-превью, click → пик.
 * Productor-clean: оператор не вводит UUID руками.
 *
 * Паттерн = /admin/wfy/cities/page.tsx (replication Track D.2), но без
 * status enum, slug uniq и SEO extras. Зато с logoMediaId picker.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api-client';
import {
  wfyPartnerSalonsApi,
  type WfyPartnerSalon,
  type ListWfyPartnerSalonsQuery,
} from '@/lib/wfy-partner-salons-api';

interface FormState {
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  externalLink: string;
  logoMediaId: string | null;
  ord: number;
}

function emptyForm(): FormState {
  return {
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    externalLink: '',
    logoMediaId: null,
    ord: 0,
  };
}

function fromPartnerSalon(p: WfyPartnerSalon): FormState {
  return {
    name: p.name,
    description: p.description ?? '',
    address: p.address ?? '',
    phone: p.phone ?? '',
    email: p.email ?? '',
    externalLink: p.externalLink ?? '',
    logoMediaId: p.logoMediaId,
    ord: p.ord,
  };
}

export default function WfyPartnerSalonsPage() {
  const [items, setItems] = useState<WfyPartnerSalon[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
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
    const q: ListWfyPartnerSalonsQuery = { limit: 200 };
    if (query.trim()) q.q = query.trim();
    try {
      const res = await wfyPartnerSalonsApi.list(q);
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
  }, [query]);

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
      const created = await wfyPartnerSalonsApi.create({
        name: form.name,
        description: form.description || undefined,
        address: form.address || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        externalLink: form.externalLink || undefined,
        logoMediaId: form.logoMediaId ?? undefined,
        ord: form.ord,
      });
      setItems((prev) => [created, ...prev]);
      setCreating(false);
      setSelectedId(created.id);
      showNotice('Партнёр создан');
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
      const updated = await wfyPartnerSalonsApi.update(selected.id, {
        name: form.name,
        description: form.description || null,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
        externalLink: form.externalLink || null,
        logoMediaId: form.logoMediaId,
        ord: form.ord,
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
    if (!confirm('Удалить партнёра безвозвратно?')) return;
    setSaving(true);
    setError(null);
    try {
      await wfyPartnerSalonsApi.remove(id);
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
          Партнёрские салоны — модуль для тенантов типа{' '}
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
    return <div className="p-8 text-text-mute font-mono text-xs">loading partner-salons…</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <section className="flex flex-wrap items-end gap-3">
        <label className="block space-y-1 flex-1 min-w-[200px]">
          <span className="text-xs uppercase tracking-wider text-text-mute">Поиск</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="по названию партнёра…"
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
          />
        </label>
        <button
          onClick={onAdd}
          disabled={saving}
          className="px-4 py-2 bg-accent text-bg font-semibold rounded-md disabled:opacity-50"
        >
          + Новый партнёр
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

      <section className="grid grid-cols-1 md:grid-cols-[1fr,1.4fr] gap-6">
        <div className="border border-border rounded-md bg-surface">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h2 className="text-xs uppercase tracking-widest text-text-mute">
              Партнёры ({items.length})
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
                    {it.address || it.externalLink || '—'}
                  </div>
                </div>
                {it.logoMediaId && (
                  <span className="text-[10.5px] uppercase font-mono px-1.5 py-0.5 rounded-md bg-accent/10 text-accent">
                    лого
                  </span>
                )}
              </li>
            ))}
            {items.length === 0 && (
              <li className="p-6 text-center text-text-mute text-sm">
                Партнёров нет. Нажмите «+ Новый партнёр».
              </li>
            )}
          </ul>
        </div>

        <div className="border border-border rounded-md bg-surface p-4">
          {creating ? (
            <PartnerSalonForm
              key="new"
              initial={emptyForm()}
              isNew
              saving={saving}
              onSubmit={onSubmitNew}
              onCancel={() => setCreating(false)}
            />
          ) : selected ? (
            <PartnerSalonForm
              key={selected.id}
              initial={fromPartnerSalon(selected)}
              saving={saving}
              onSubmit={onSubmitEdit}
              onDelete={() => onDelete(selected.id)}
              meta={`${selected.id.slice(0, 8)}… · обновлён ${selected.updatedAt.slice(0, 16).replace('T', ' ')}`}
            />
          ) : (
            <div className="text-text-mute text-sm py-10 text-center">
              Выберите партнёра слева или нажмите «+ Новый партнёр».
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function PartnerSalonForm({
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
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [address, setAddress] = useState(initial.address);
  const [phone, setPhone] = useState(initial.phone);
  const [email, setEmail] = useState(initial.email);
  const [externalLink, setExternalLink] = useState(initial.externalLink);
  const [logoMediaId, setLogoMediaId] = useState<string | null>(initial.logoMediaId);
  const [ord, setOrd] = useState(initial.ord);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name,
      description,
      address,
      phone,
      email,
      externalLink,
      logoMediaId,
      ord,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-xs uppercase tracking-widest text-text-mute">
        {isNew ? 'Новый партнёр' : 'Партнёр'}{' '}
        {meta && <span className="font-mono opacity-60">· {meta}</span>}
      </div>

      <Field label="Название">
        <input
          required
          minLength={1}
          maxLength={255}
          value={name}
          onChange={(e) => setName(e.target.value)}
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

      <Field label="Адрес">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={500}
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Телефон">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={64}
            placeholder="+7 (495) 123-45-67"
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent font-mono"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={320}
            placeholder="info@partner.ru"
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
          />
        </Field>
      </div>

      <Field label="Внешний сайт" hint="полный URL с https:// или http://">
        <input
          type="url"
          value={externalLink}
          onChange={(e) => setExternalLink(e.target.value)}
          maxLength={2048}
          placeholder="https://partner.ru"
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
        />
      </Field>

      <Field label="Порядок отображения">
        <input
          type="number"
          min={0}
          value={ord}
          onChange={(e) => setOrd(Number(e.target.value) || 0)}
          className="w-full max-w-[120px] px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent font-mono"
        />
      </Field>

      <LogoPicker logoMediaId={logoMediaId} onPick={setLogoMediaId} />

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

interface MediaItem {
  id: string;
  url: string;
  alt: string | null;
  mime: string;
}

interface ListMediaResponse {
  data: MediaItem[];
  total: number;
}

/**
 * Inline picker: fetch /v1/media?module=logo текущего тенанта, сетка мини-превью.
 * Productor-clean: оператор не вводит UUID руками. Если логотипов нет —
 * подсказка про /admin/media (Phase F).
 */
function LogoPicker({
  logoMediaId,
  onPick,
}: {
  logoMediaId: string | null;
  onPick: (id: string | null) => void;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch<ListMediaResponse>('/v1/media?module=logo&status=ready&limit=200')
      .then((res) => {
        if (cancelled) return;
        setItems(res.data.filter((m) => m.mime.startsWith('image/')));
        setErr(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setErr(e instanceof ApiError ? (e.body.message ?? `HTTP ${e.status}`) : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = items.find((m) => m.id === logoMediaId);

  return (
    <fieldset className="border border-border rounded-md p-3 space-y-3">
      <legend className="text-xs uppercase tracking-wider text-text-mute px-1">Логотип</legend>

      {logoMediaId && (
        <div className="flex items-center gap-3 p-2 bg-surface-2 rounded-md">
          {selected ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.url}
                alt={selected.alt ?? 'логотип'}
                className="w-12 h-12 object-cover rounded-md bg-bg"
              />
              <div className="flex-1 min-w-0 text-[12px] font-mono text-text-mute truncate">
                {selected.alt || selected.id.slice(0, 8) + '…'}
              </div>
            </>
          ) : (
            <div className="flex-1 text-[12px] text-text-mute font-mono">
              media-id: {logoMediaId.slice(0, 8)}… (не найден в module=logo — возможно загружен в другом module)
            </div>
          )}
          <button
            type="button"
            onClick={() => onPick(null)}
            className="text-[11px] uppercase font-mono text-red-400 px-2 py-1 hover:bg-red-500/10 rounded-md"
          >
            убрать
          </button>
        </div>
      )}

      {loading && <div className="text-[12px] text-text-mute font-mono">loading media…</div>}
      {err && (
        <div className="text-[12px] text-red-400 font-mono">media error: {err}</div>
      )}

      {!loading && !err && items.length === 0 && (
        <div className="text-[12px] text-text-mute italic">
          Логотипов нет. Загрузите файл через <code className="font-mono">/admin/media</code> с module=logo (страница появится в Phase F).
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-[200px] overflow-y-auto">
          {items.map((m) => {
            const isPicked = m.id === logoMediaId;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onPick(m.id)}
                title={m.alt ?? m.id}
                className={`aspect-square rounded-md overflow-hidden border-2 transition-colors ${
                  isPicked ? 'border-accent' : 'border-transparent hover:border-border'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.url}
                  alt={m.alt ?? ''}
                  className="w-full h-full object-cover bg-bg"
                />
              </button>
            );
          })}
        </div>
      )}
    </fieldset>
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
