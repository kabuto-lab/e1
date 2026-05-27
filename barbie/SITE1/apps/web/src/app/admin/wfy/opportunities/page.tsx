'use client';

/**
 * /admin/wfy/opportunities — карточки «заработай на …» для work-for-you-tenant'а.
 *
 * Доступно только тенантам с site_type='wfy-city-dir'; для остальных API
 * вернёт 409 TENANT_SITE_TYPE_MISMATCH и UI покажет capability-block state.
 *
 * CoverImagePicker — inline компонент (mirror LogoPicker из partner-salons, но
 * filter module='wfy-opp' и возвращает `key` не `id`). Productor-clean.
 *
 * Pattern = /admin/wfy/partner-salons (Track D step 3.2 replication).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api-client';
import {
  wfyOpportunitiesApi,
  type WfyOpportunity,
  type ListWfyOpportunitiesQuery,
} from '@/lib/wfy-opportunities-api';

interface FormState {
  title: string;
  headline: string;
  description: string;
  coverImageKey: string | null;
  ord: number;
}

function emptyForm(): FormState {
  return {
    title: '',
    headline: '',
    description: '',
    coverImageKey: null,
    ord: 0,
  };
}

function fromOpportunity(o: WfyOpportunity): FormState {
  return {
    title: o.title,
    headline: o.headline ?? '',
    description: o.description ?? '',
    coverImageKey: o.coverImageKey,
    ord: o.ord,
  };
}

export default function WfyOpportunitiesPage() {
  const [items, setItems] = useState<WfyOpportunity[]>([]);
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
    const q: ListWfyOpportunitiesQuery = { limit: 200 };
    if (query.trim()) q.q = query.trim();
    try {
      const res = await wfyOpportunitiesApi.list(q);
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
      const created = await wfyOpportunitiesApi.create({
        title: form.title,
        headline: form.headline || undefined,
        description: form.description || undefined,
        coverImageKey: form.coverImageKey ?? undefined,
        ord: form.ord,
      });
      setItems((prev) => [created, ...prev]);
      setCreating(false);
      setSelectedId(created.id);
      showNotice('Opportunity создан');
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
      const updated = await wfyOpportunitiesApi.update(selected.id, {
        title: form.title,
        headline: form.headline || null,
        description: form.description || null,
        coverImageKey: form.coverImageKey,
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
    if (!confirm('Удалить opportunity безвозвратно?')) return;
    setSaving(true);
    setError(null);
    try {
      await wfyOpportunitiesApi.remove(id);
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
          Opportunities — модуль для тенантов типа{' '}
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
    return <div className="p-8 text-text-mute font-mono text-xs">loading opportunities…</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <section className="flex flex-wrap items-end gap-3">
        <label className="block space-y-1 flex-1 min-w-[200px]">
          <span className="text-xs uppercase tracking-wider text-text-mute">Поиск</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="по title…"
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
          />
        </label>
        <button
          onClick={onAdd}
          disabled={saving}
          className="px-4 py-2 bg-accent text-bg font-semibold rounded-md disabled:opacity-50"
        >
          + Новый opportunity
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
              Opportunities ({items.length})
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
                  <div className="text-sm truncate">{it.title}</div>
                  <div className="text-[11.5px] text-text-mute font-mono truncate">
                    {it.headline || '—'}
                  </div>
                </div>
                {it.coverImageKey && (
                  <span className="text-[10.5px] uppercase font-mono px-1.5 py-0.5 rounded-md bg-accent/10 text-accent">
                    cover
                  </span>
                )}
              </li>
            ))}
            {items.length === 0 && (
              <li className="p-6 text-center text-text-mute text-sm">
                Opportunities нет. Нажмите «+ Новый opportunity».
              </li>
            )}
          </ul>
        </div>

        <div className="border border-border rounded-md bg-surface p-4">
          {creating ? (
            <OpportunityForm
              key="new"
              initial={emptyForm()}
              isNew
              saving={saving}
              onSubmit={onSubmitNew}
              onCancel={() => setCreating(false)}
            />
          ) : selected ? (
            <OpportunityForm
              key={selected.id}
              initial={fromOpportunity(selected)}
              saving={saving}
              onSubmit={onSubmitEdit}
              onDelete={() => onDelete(selected.id)}
              meta={`${selected.id.slice(0, 8)}… · обновлён ${selected.updatedAt.slice(0, 16).replace('T', ' ')}`}
            />
          ) : (
            <div className="text-text-mute text-sm py-10 text-center">
              Выберите opportunity слева или нажмите «+ Новый opportunity».
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function OpportunityForm({
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
  const [title, setTitle] = useState(initial.title);
  const [headline, setHeadline] = useState(initial.headline);
  const [description, setDescription] = useState(initial.description);
  const [coverImageKey, setCoverImageKey] = useState<string | null>(initial.coverImageKey);
  const [ord, setOrd] = useState(initial.ord);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ title, headline, description, coverImageKey, ord });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-xs uppercase tracking-widest text-text-mute">
        {isNew ? 'Новый opportunity' : 'Opportunity'}{' '}
        {meta && <span className="font-mono opacity-60">· {meta}</span>}
      </div>

      <Field label="Title">
        <input
          required
          minLength={1}
          maxLength={255}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Заработай на новую машину"
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
        />
      </Field>

      <Field label="Headline" hint="сумма / краткое описание награды">
        <input
          maxLength={255}
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="1 500 000 ₽"
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
        />
      </Field>

      <Field label="Описание">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={20000}
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

      <CoverImagePicker coverImageKey={coverImageKey} onPick={setCoverImageKey} />

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
  key: string;
  url: string;
  alt: string | null;
  mime: string;
}

interface ListMediaResponse {
  data: MediaItem[];
  total: number;
}

/**
 * Inline picker для wfy-opp обложек. Mirror LogoPicker pattern, но:
 *   - фильтр `module=wfy-opp` (не `logo`)
 *   - возвращает `key` (S3 string), не `id` (UUID) — соответствует
 *     schema choice `coverImageKey: varchar(500)`
 *
 * При rule-of-three (D.5 vacancies likely 3-й consumer) — extract в shared
 * MediaPicker компонент с props { module, returnType: 'id'|'key' }.
 */
function CoverImagePicker({
  coverImageKey,
  onPick,
}: {
  coverImageKey: string | null;
  onPick: (key: string | null) => void;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch<ListMediaResponse>('/v1/media?module=wfy-opp&status=ready&limit=200')
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

  const selected = items.find((m) => m.key === coverImageKey);

  return (
    <fieldset className="border border-border rounded-md p-3 space-y-3">
      <legend className="text-xs uppercase tracking-wider text-text-mute px-1">
        Cover image
      </legend>

      {coverImageKey && (
        <div className="flex items-center gap-3 p-2 bg-surface-2 rounded-md">
          {selected ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.url}
                alt={selected.alt ?? 'cover'}
                className="w-12 h-12 object-cover rounded-md bg-bg"
              />
              <div className="flex-1 min-w-0 text-[12px] font-mono text-text-mute truncate">
                {selected.alt || selected.key.split('/').pop() || selected.key}
              </div>
            </>
          ) : (
            <div className="flex-1 text-[12px] text-text-mute font-mono">
              key: {coverImageKey} (не найден в module=wfy-opp — возможно из другого module)
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
          Обложек нет. Загрузите файл через <code className="font-mono">/admin/media</code> с module=wfy-opp (страница появится в Phase F).
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-[200px] overflow-y-auto">
          {items.map((m) => {
            const isPicked = m.key === coverImageKey;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onPick(m.key)}
                title={m.alt ?? m.key}
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
