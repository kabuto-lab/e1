'use client';

/**
 * /admin/wfy/advantages — блоки «преимущества» для work-for-you-тенанта.
 *
 * Доступно только тенантам с site_type='wfy-city-dir'; для остальных API
 * вернёт 409 TENANT_SITE_TYPE_MISMATCH и UI покажет capability-block state.
 *
 * Отличие от opportunities: нет cover-изображения (значит нет media picker'а),
 * есть `iconName` (lucide-name) и **drag-reorder** списка — порядок `ord`
 * меняется перетаскиванием и сохраняется PATCH'ем только изменённых строк.
 *
 * Pattern = /admin/wfy/opportunities (Track D step 3.4 replication).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import {
  wfyAdvantagesApi,
  type WfyAdvantage,
  type ListWfyAdvantagesQuery,
} from '@/lib/wfy-advantages-api';

interface FormState {
  title: string;
  description: string;
  iconName: string;
  ord: number;
}

function emptyForm(): FormState {
  return { title: '', description: '', iconName: '', ord: 0 };
}

function fromAdvantage(a: WfyAdvantage): FormState {
  return {
    title: a.title,
    description: a.description ?? '',
    iconName: a.iconName ?? '',
    ord: a.ord,
  };
}

export default function WfyAdvantagesPage() {
  const [items, setItems] = useState<WfyAdvantage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [capabilityBlocked, setCapabilityBlocked] = useState(false);

  const selected = useMemo(
    () => items.find((it) => it.id === selectedId) ?? null,
    [items, selectedId],
  );

  const reload = useCallback(async () => {
    setError(null);
    const q: ListWfyAdvantagesQuery = { limit: 200 };
    if (query.trim()) q.q = query.trim();
    try {
      const res = await wfyAdvantagesApi.list(q);
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
      const created = await wfyAdvantagesApi.create({
        title: form.title,
        description: form.description || undefined,
        iconName: form.iconName || undefined,
        ord: form.ord,
      });
      setItems((prev) => sortByOrd([created, ...prev]));
      setCreating(false);
      setSelectedId(created.id);
      showNotice('Преимущество создано');
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
      const updated = await wfyAdvantagesApi.update(selected.id, {
        title: form.title,
        description: form.description || null,
        iconName: form.iconName || null,
        ord: form.ord,
      });
      setItems((prev) => sortByOrd(prev.map((it) => (it.id === updated.id ? updated : it))));
      showNotice('Сохранено');
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Удалить преимущество безвозвратно?')) return;
    setSaving(true);
    setError(null);
    try {
      await wfyAdvantagesApi.remove(id);
      setItems((prev) => prev.filter((it) => it.id !== id));
      if (selectedId === id) setSelectedId(null);
      showNotice('Удалено');
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setSaving(false);
    }
  }

  /**
   * Применяет новый порядок: переставляет элемент с позиции `from` на `to`,
   * переназначает `ord = index` и сохраняет PATCH'ем только те строки, у
   * которых ord реально изменился. Оптимистично обновляет список; при ошибке
   * откатывает через reload().
   */
  async function applyReorder(from: number, to: number) {
    if (from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    const renumbered = next.map((it, idx) => ({ ...it, ord: idx }));
    const origOrd = new Map(items.map((it) => [it.id, it.ord]));
    const changed = renumbered.filter((it) => origOrd.get(it.id) !== it.ord);

    setItems(renumbered);
    setReordering(true);
    setError(null);
    try {
      await Promise.all(
        changed.map((it) => wfyAdvantagesApi.update(it.id, { ord: it.ord })),
      );
      showNotice('Порядок сохранён');
    } catch (err) {
      setError(formatErr(err));
      await reload();
    } finally {
      setReordering(false);
    }
  }

  if (capabilityBlocked) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center text-text-mute space-y-3">
        <div className="text-sm uppercase tracking-widest">Модуль недоступен</div>
        <div className="text-base text-text">
          Преимущества — модуль для тенантов типа{' '}
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
    return <div className="p-8 text-text-mute font-mono text-xs">loading advantages…</div>;
  }

  const dragDisabled = saving || reordering || Boolean(query.trim());

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
          + Новое преимущество
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
              Преимущества ({items.length})
            </h2>
            <span className="text-[10.5px] uppercase font-mono text-text-mute">
              {query.trim()
                ? 'reorder off при поиске'
                : reordering
                  ? 'сохранение…'
                  : 'перетащите для порядка'}
            </span>
          </div>
          <AdvantageList
            items={items}
            selectedId={selectedId}
            creating={creating}
            dragDisabled={dragDisabled}
            onSelect={(id) => {
              setCreating(false);
              setSelectedId(id);
            }}
            onReorder={applyReorder}
          />
        </div>

        <div className="border border-border rounded-md bg-surface p-4">
          {creating ? (
            <AdvantageForm
              key="new"
              initial={emptyForm()}
              isNew
              saving={saving}
              onSubmit={onSubmitNew}
              onCancel={() => setCreating(false)}
            />
          ) : selected ? (
            <AdvantageForm
              key={selected.id}
              initial={fromAdvantage(selected)}
              saving={saving}
              onSubmit={onSubmitEdit}
              onDelete={() => onDelete(selected.id)}
              meta={`${selected.id.slice(0, 8)}… · обновлён ${selected.updatedAt.slice(0, 16).replace('T', ' ')}`}
            />
          ) : (
            <div className="text-text-mute text-sm py-10 text-center">
              Выберите преимущество слева или нажмите «+ Новое преимущество».
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function AdvantageList({
  items,
  selectedId,
  creating,
  dragDisabled,
  onSelect,
  onReorder,
}: {
  items: WfyAdvantage[];
  selectedId: string | null;
  creating: boolean;
  dragDisabled: boolean;
  onSelect: (id: string) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const dragIndex = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  if (items.length === 0) {
    return (
      <ul className="divide-y divide-border">
        <li className="p-6 text-center text-text-mute text-sm">
          Преимуществ нет. Нажмите «+ Новое преимущество».
        </li>
      </ul>
    );
  }

  return (
    <ul className="divide-y divide-border max-h-[70vh] overflow-y-auto">
      {items.map((it, idx) => (
        <li
          key={it.id}
          draggable={!dragDisabled}
          onDragStart={() => {
            dragIndex.current = idx;
          }}
          onDragOver={(e) => {
            if (dragDisabled || dragIndex.current === null) return;
            e.preventDefault();
            if (overIndex !== idx) setOverIndex(idx);
          }}
          onDrop={(e) => {
            e.preventDefault();
            const from = dragIndex.current;
            dragIndex.current = null;
            setOverIndex(null);
            if (from !== null && from !== idx) onReorder(from, idx);
          }}
          onDragEnd={() => {
            dragIndex.current = null;
            setOverIndex(null);
          }}
          className={`flex items-center gap-2 p-3 cursor-pointer ${
            overIndex === idx ? 'bg-accent/10 ring-1 ring-accent/40' : ''
          } ${
            selectedId === it.id && !creating ? 'bg-surface-2' : 'hover:bg-surface-2/50'
          }`}
          onClick={() => onSelect(it.id)}
        >
          {!dragDisabled && (
            <span
              className="cursor-grab active:cursor-grabbing select-none text-text-mute text-sm leading-none"
              title="перетащите для изменения порядка"
              aria-hidden
            >
              ⠿
            </span>
          )}
          <span className="w-6 shrink-0 text-[11px] font-mono text-text-mute text-right">
            {it.ord}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate">{it.title}</div>
            <div className="text-[11.5px] text-text-mute font-mono truncate">
              {it.description || '—'}
            </div>
          </div>
          {it.iconName && (
            <span className="text-[10.5px] uppercase font-mono px-1.5 py-0.5 rounded-md bg-accent/10 text-accent">
              {it.iconName}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function AdvantageForm({
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
  const [description, setDescription] = useState(initial.description);
  const [iconName, setIconName] = useState(initial.iconName);
  const [ord, setOrd] = useState(initial.ord);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ title, description, iconName, ord });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-xs uppercase tracking-widest text-text-mute">
        {isNew ? 'Новое преимущество' : 'Преимущество'}{' '}
        {meta && <span className="font-mono opacity-60">· {meta}</span>}
      </div>

      <Field label="Title">
        <input
          required
          minLength={1}
          maxLength={255}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Стабильный доход"
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
        />
      </Field>

      <Field label="Icon" hint="lucide-icon name или symbol-key, напр. wallet (≤64)">
        <input
          maxLength={64}
          value={iconName}
          onChange={(e) => setIconName(e.target.value)}
          placeholder="wallet"
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent font-mono"
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

      <Field label="Порядок отображения" hint="можно менять перетаскиванием в списке">
        <input
          type="number"
          min={0}
          value={ord}
          onChange={(e) => setOrd(Number(e.target.value) || 0)}
          className="w-full max-w-[120px] px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent font-mono"
        />
      </Field>

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

function sortByOrd(list: WfyAdvantage[]): WfyAdvantage[] {
  return [...list].sort((a, b) => a.ord - b.ord || a.title.localeCompare(b.title));
}

function formatErr(err: unknown): string {
  if (err instanceof ApiError) {
    return err.body.message ?? `HTTP ${err.status} (${err.body.code ?? 'unknown'})`;
  }
  return String(err);
}
