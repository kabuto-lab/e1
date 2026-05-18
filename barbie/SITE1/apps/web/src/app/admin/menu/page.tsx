'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api-client';

interface MenuItem {
  id: string;
  tenantId: string;
  parentId: string | null;
  label: string;
  href: string;
  imageKey: string | null;
  icon: string | null;
  sortOrder: number;
  locale: string;
  status: 'active' | 'hidden' | 'archived';
  payload?: { description?: string; badge?: string; openInNewTab?: boolean; highlight?: boolean } | null;
  createdAt: string;
  updatedAt: string;
}

type NavTemplate = 'top-classic' | 'mega-images' | 'vertical-side';

const TEMPLATES: { id: NavTemplate; label: string; desc: string }[] = [
  { id: 'top-classic', label: 'Top Classic', desc: 'Горизонтальная шапка, текст-only' },
  { id: 'mega-images', label: 'Mega Images', desc: 'Dropdown с большими картинками' },
  { id: 'vertical-side', label: 'Vertical Side', desc: 'Боковая навигация с иконками, 2 уровня' },
];

const STATUSES: MenuItem['status'][] = ['active', 'hidden', 'archived'];

export default function MenuEditorPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [template, setTemplate] = useState<NavTemplate>('top-classic');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = useMemo(() => items.find((it) => it.id === selectedId) ?? null, [items, selectedId]);

  // Top-level items only (Phase 0 — children TBD).
  const topLevel = useMemo(
    () => items.filter((it) => it.parentId === null).sort((a, b) => a.sortOrder - b.sortOrder),
    [items],
  );

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [list, tpl] = await Promise.all([
        apiFetch<MenuItem[]>('/v1/menu/items'),
        apiFetch<{ navTemplate: NavTemplate }>('/v1/menu/template'),
      ]);
      setItems(list);
      setTemplate(tpl.navTemplate);
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  function showNotice(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2500);
  }

  async function onChangeTemplate(t: NavTemplate) {
    if (t === template) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/v1/menu/template', { method: 'PUT', body: { navTemplate: t } });
      setTemplate(t);
      showNotice(`Шаблон → ${t}`);
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setSaving(false);
    }
  }

  async function onAddItem() {
    setSaving(true);
    setError(null);
    try {
      const nextSort = topLevel.length > 0 ? Math.max(...topLevel.map((i) => i.sortOrder)) + 1 : 0;
      const created = await apiFetch<MenuItem>('/v1/menu/items', {
        method: 'POST',
        body: {
          label: 'Новый пункт',
          href: '/',
          sortOrder: nextSort,
          status: 'active',
        },
      });
      setItems((prev) => [...prev, created]);
      setSelectedId(created.id);
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setSaving(false);
    }
  }

  async function onMove(id: string, dir: -1 | 1) {
    const sorted = [...topLevel];
    const idx = sorted.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const swap = idx + dir;
    if (swap < 0 || swap >= sorted.length) return;

    const a = sorted[idx];
    const b = sorted[swap];
    const changes = [
      { id: a.id, parentId: a.parentId, sortOrder: b.sortOrder },
      { id: b.id, parentId: b.parentId, sortOrder: a.sortOrder },
    ];

    setSaving(true);
    setError(null);
    try {
      await apiFetch('/v1/menu/reorder', { method: 'POST', body: { changes } });
      await reload();
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setSaving(false);
    }
  }

  async function onSave(formItem: MenuItem) {
    setSaving(true);
    setError(null);
    try {
      const patch = {
        label: formItem.label,
        href: formItem.href,
        sortOrder: formItem.sortOrder,
        status: formItem.status,
        icon: formItem.icon || undefined,
        imageKey: formItem.imageKey || undefined,
      };
      const updated = await apiFetch<MenuItem>(`/v1/menu/items/${formItem.id}`, {
        method: 'PATCH',
        body: patch,
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
    if (!confirm('Удалить пункт? Дочерние тоже удалятся каскадно.')) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/v1/menu/items/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((it) => it.id !== id));
      setSelectedId(null);
      showNotice('Удалено');
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-text-mute font-mono text-xs">loading menu…</div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Template selector */}
      <section>
        <h2 className="text-xs uppercase tracking-widest text-text-mute mb-3">Шаблон навигации</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => onChangeTemplate(t.id)}
              disabled={saving}
              className={`text-left p-3 border rounded-md transition ${
                template === t.id
                  ? 'border-accent bg-surface-2'
                  : 'border-border hover:border-text-mute'
              }`}
            >
              <div className="font-semibold text-sm">{t.label}</div>
              <div className="text-xs text-text-mute mt-1">{t.desc}</div>
              <div className="text-[11.5px] font-mono text-text-mute mt-2 opacity-60">{t.id}</div>
            </button>
          ))}
        </div>
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
              Пункты ({topLevel.length})
            </h2>
            <button
              onClick={onAddItem}
              disabled={saving}
              className="px-2 py-1 text-xs bg-accent text-bg font-semibold rounded-md disabled:opacity-50"
            >
              + Добавить
            </button>
          </div>
          <ul className="divide-y divide-border">
            {topLevel.map((it, i) => (
              <li
                key={it.id}
                className={`flex items-center gap-2 p-3 cursor-pointer ${
                  selectedId === it.id ? 'bg-surface-2' : 'hover:bg-surface-2/50'
                }`}
                onClick={() => setSelectedId(it.id)}
              >
                <div className="flex flex-col gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMove(it.id, -1);
                    }}
                    disabled={saving || i === 0}
                    className="px-1 text-xs text-text-mute hover:text-text disabled:opacity-30"
                    title="Вверх"
                  >
                    ↑
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMove(it.id, 1);
                    }}
                    disabled={saving || i === topLevel.length - 1}
                    className="px-1 text-xs text-text-mute hover:text-text disabled:opacity-30"
                    title="Вниз"
                  >
                    ↓
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{it.label}</div>
                  <div className="text-xs text-text-mute font-mono truncate">{it.href}</div>
                </div>
                <span
                  className={`text-[11.5px] uppercase font-mono px-1.5 py-0.5 rounded-md ${
                    it.status === 'active'
                      ? 'bg-green-500/10 text-green-400'
                      : it.status === 'hidden'
                        ? 'bg-yellow-500/10 text-yellow-400'
                        : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  {it.status}
                </span>
              </li>
            ))}
            {topLevel.length === 0 && (
              <li className="p-6 text-center text-text-mute text-sm">
                Пунктов нет. Нажмите «+ Добавить».
              </li>
            )}
          </ul>
        </div>

        {/* Form */}
        <div className="border border-border rounded-md bg-surface p-4">
          {selected ? (
            <ItemForm
              key={selected.id}
              item={selected}
              saving={saving}
              onSave={onSave}
              onDelete={() => onDelete(selected.id)}
            />
          ) : (
            <div className="text-text-mute text-sm py-10 text-center">
              Выберите пункт слева или добавьте новый.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ItemForm({
  item,
  saving,
  onSave,
  onDelete,
}: {
  item: MenuItem;
  saving: boolean;
  onSave: (it: MenuItem) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(item.label);
  const [href, setHref] = useState(item.href);
  const [sortOrder, setSortOrder] = useState(item.sortOrder);
  const [status, setStatus] = useState<MenuItem['status']>(item.status);
  const [icon, setIcon] = useState(item.icon ?? '');
  const [imageKey, setImageKey] = useState(item.imageKey ?? '');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      ...item,
      label,
      href,
      sortOrder,
      status,
      icon: icon || null,
      imageKey: imageKey || null,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-xs uppercase tracking-widest text-text-mute">
        Пункт меню · <span className="font-mono opacity-60">{item.id.slice(0, 8)}…</span>
      </div>

      <Field label="Label">
        <input
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
        />
      </Field>

      <Field
        label="Href"
        hint='Должен начинаться с "/" или "http(s)://"'
      >
        <input
          required
          value={href}
          onChange={(e) => setHref(e.target.value)}
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent font-mono"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Sort order">
          <input
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
          />
        </Field>
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as MenuItem['status'])}
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

      <Field label="Icon (vertical-side template only)" hint="Имя из lucide-react">
        <input
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="напр. scissors"
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent"
        />
      </Field>

      <Field label="Image key (mega-images template)" hint="S3 key, относительно бакета">
        <input
          value={imageKey}
          onChange={(e) => setImageKey(e.target.value)}
          placeholder="tenant/<tid>/menu/<id>.webp"
          className="w-full px-3 py-2 bg-bg border border-border rounded-md outline-none focus:border-accent font-mono"
        />
      </Field>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <button
          type="button"
          onClick={onDelete}
          disabled={saving}
          className="px-3 py-2 text-sm text-red-400 border border-red-500/40 rounded-md hover:bg-red-500/10 disabled:opacity-50"
        >
          Удалить
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-accent text-bg font-semibold rounded-md disabled:opacity-50"
        >
          {saving ? '…' : 'Сохранить'}
        </button>
      </div>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
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
