'use client';

/**
 * /admin/clients — CRM-карточки клиентов тенанта.
 *
 * Pattern: toolbar + list + form (как /admin/menu и /admin/services), но
 * с двумя API-нюансами:
 *
 *   1. list endpoint НЕ возвращает `notes` (PII-защита). Когда выбираем
 *      строку в списке — делаем отдельный GET /:id для полной карточки
 *      (notes + всё остальное).
 *   2. POST с конфликтом по phone возвращает 409 `CLIENT_PHONE_TAKEN` с
 *      existing.id. UI ловит это, показывает баннер «Этот телефон уже у
 *      клиента X — открыть?», и по клику переключается на edit-режим
 *      существующего.
 *
 * Tags хранятся как jsonb string[]; в UI редактируются как comma-separated
 * input. На submit — split / trim / filter-empty.
 *
 * Агрегаты (totalSpent / firstVisit / lastVisit) — read-only из визитов;
 * показываем в edit-режиме отдельной панелью.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import {
  clientsApi,
  getPhoneConflictExistingId,
  kopecksToRub,
  type Client,
  type ClientListItem,
  type ClientStatus,
  type ListClientsQuery,
} from '@/lib/clients-api';

const STATUSES: ClientStatus[] = ['active', 'blocked', 'archived'];

type StatusFilter = ClientStatus | 'all';

interface FormState {
  name: string;
  phone: string;
  email: string;
  birthdate: string;
  notes: string;
  tagsInput: string;
  status: ClientStatus;
}

const EMPTY_FORM: FormState = {
  name: '',
  phone: '',
  email: '',
  birthdate: '',
  notes: '',
  tagsInput: '',
  status: 'active',
};

function fromClient(c: Client): FormState {
  return {
    name: c.name,
    phone: c.phone,
    email: c.email ?? '',
    birthdate: c.birthdate ?? '',
    notes: c.notes ?? '',
    tagsInput: c.tags.join(', '),
    status: c.status,
  };
}

function tagsFromInput(s: string): string[] {
  return s
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export default function ClientsPage() {
  const [items, setItems] = useState<ClientListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Client | null>(null);
  const [creating, setCreating] = useState(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [query, setQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [phoneConflictId, setPhoneConflictId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    const q: ListClientsQuery = {};
    if (statusFilter !== 'all') q.status = statusFilter;
    if (query.trim()) q.q = query.trim();
    try {
      const res = await clientsApi.list(q);
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

  // Загрузить полную карточку при смене selectedId (список не содержит notes).
  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    let cancelled = false;
    clientsApi
      .get(selectedId)
      .then((c) => {
        if (!cancelled) setSelected(c);
      })
      .catch((err) => {
        if (!cancelled) setError(formatErr(err));
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  function showNotice(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2500);
  }

  function onAdd() {
    setCreating(true);
    setSelectedId(null);
    setSelected(null);
    setPhoneConflictId(null);
  }

  async function onSubmitNew(form: FormState) {
    setSaving(true);
    setError(null);
    setPhoneConflictId(null);
    try {
      const created = await clientsApi.create({
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        birthdate: form.birthdate || undefined,
        notes: form.notes || undefined,
        tags: tagsFromInput(form.tagsInput),
      });
      // list endpoint не вернул бы notes — кладём минимум полей в локальный list.
      const listItem: ClientListItem = stripNotes(created);
      setItems((prev) => [listItem, ...prev]);
      setCreating(false);
      setSelectedId(created.id);
      setSelected(created);
      showNotice('Создан');
    } catch (err) {
      const conflictId = getPhoneConflictExistingId(err);
      if (conflictId) {
        setPhoneConflictId(conflictId);
        setError('Этот телефон уже занят в текущем тенанте.');
      } else {
        setError(formatErr(err));
      }
    } finally {
      setSaving(false);
    }
  }

  async function onSubmitEdit(form: FormState) {
    if (!selected) return;
    setSaving(true);
    setError(null);
    setPhoneConflictId(null);
    try {
      const updated = await clientsApi.update(selected.id, {
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        birthdate: form.birthdate || undefined,
        notes: form.notes || undefined,
        tags: tagsFromInput(form.tagsInput),
        status: form.status,
      });
      setItems((prev) =>
        prev.map((it) => (it.id === updated.id ? stripNotes(updated) : it)),
      );
      setSelected(updated);
      showNotice('Сохранено');
    } catch (err) {
      const conflictId = getPhoneConflictExistingId(err);
      if (conflictId && conflictId !== selected.id) {
        setPhoneConflictId(conflictId);
        setError('Этот телефон уже занят другим клиентом в текущем тенанте.');
      } else {
        setError(formatErr(err));
      }
    } finally {
      setSaving(false);
    }
  }

  async function onArchive(id: string) {
    if (!confirm('Архивировать клиента? Запись останется со статусом archived.')) return;
    setSaving(true);
    setError(null);
    try {
      const archived = await clientsApi.archive(id);
      setItems((prev) =>
        prev.map((it) => (it.id === archived.id ? stripNotes(archived) : it)),
      );
      setSelected(archived);
      showNotice('Архивировано');
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setSaving(false);
    }
  }

  function openExistingFromConflict() {
    if (!phoneConflictId) return;
    setCreating(false);
    setSelectedId(phoneConflictId);
    setPhoneConflictId(null);
    setError(null);
  }

  if (loading) {
    return <div className="p-8 text-text-mute font-mono text-xs">loading clients…</div>;
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
            className="px-3 py-2 bg-bg border border-border rounded outline-none focus:border-accent"
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
            placeholder="имя / телефон / email…"
            className="w-full px-3 py-2 bg-bg border border-border rounded outline-none focus:border-accent"
          />
        </label>
        <button
          onClick={onAdd}
          disabled={saving}
          className="px-4 py-2 bg-accent text-bg font-semibold rounded disabled:opacity-50"
        >
          + Новый клиент
        </button>
      </section>

      {/* Notices */}
      {error && (
        <div className="px-3 py-2 border border-red-500/40 bg-red-500/10 text-red-300 text-sm rounded flex items-center justify-between gap-3">
          <span>{error}</span>
          {phoneConflictId && (
            <button
              onClick={openExistingFromConflict}
              className="px-2 py-1 text-xs bg-accent text-bg font-semibold rounded whitespace-nowrap"
            >
              Открыть существующего
            </button>
          )}
        </div>
      )}
      {notice && (
        <div className="px-3 py-2 border border-green-500/40 bg-green-500/10 text-green-300 text-sm rounded">
          {notice}
        </div>
      )}

      {/* Editor split */}
      <section className="grid grid-cols-1 md:grid-cols-[1fr,1.4fr] gap-6">
        {/* List */}
        <div className="border border-border rounded bg-surface">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h2 className="text-xs uppercase tracking-widest text-text-mute">
              Клиенты ({items.length})
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
                    {it.phone}
                    {it.email ? ` · ${it.email}` : ''}
                  </div>
                  {it.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {it.tags.slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className="text-[10.5px] uppercase px-1.5 py-0.5 bg-surface-2 text-text-mute rounded"
                        >
                          {t}
                        </span>
                      ))}
                      {it.tags.length > 4 && (
                        <span className="text-[10.5px] text-text-mute">
                          +{it.tags.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <StatusPill status={it.status} />
              </li>
            ))}
            {items.length === 0 && (
              <li className="p-6 text-center text-text-mute text-sm">
                Клиентов нет под текущий фильтр. Нажмите «+ Новый клиент».
              </li>
            )}
          </ul>
        </div>

        {/* Form */}
        <div className="border border-border rounded bg-surface p-4">
          {creating ? (
            <ClientForm
              key="new"
              initial={EMPTY_FORM}
              isNew
              saving={saving}
              onSubmit={onSubmitNew}
              onCancel={() => setCreating(false)}
            />
          ) : selected ? (
            <>
              <ClientForm
                key={selected.id}
                initial={fromClient(selected)}
                saving={saving}
                onSubmit={onSubmitEdit}
                onArchive={
                  selected.status !== 'archived' ? () => onArchive(selected.id) : undefined
                }
                meta={`${selected.id.slice(0, 8)}… · обновлено ${selected.updatedAt.slice(0, 16).replace('T', ' ')}`}
              />
              <AggregatesPanel client={selected} />
            </>
          ) : selectedId ? (
            <div className="text-text-mute text-sm py-10 text-center">loading…</div>
          ) : (
            <div className="text-text-mute text-sm py-10 text-center">
              Выберите клиента слева или нажмите «+ Новый клиент».
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function stripNotes(c: Client): ClientListItem {
  const { notes: _notes, ...rest } = c;
  return rest;
}

function StatusPill({ status }: { status: ClientStatus }) {
  const cls =
    status === 'active'
      ? 'bg-green-500/10 text-green-400'
      : status === 'blocked'
        ? 'bg-yellow-500/10 text-yellow-400'
        : 'bg-red-500/10 text-red-400';
  return (
    <span className={`text-[11.5px] uppercase font-mono px-1.5 py-0.5 rounded ${cls}`}>
      {status}
    </span>
  );
}

function AggregatesPanel({ client }: { client: Client }) {
  const hasAny =
    client.firstVisitAt || client.lastVisitAt || client.totalSpentKopecks !== '0';
  if (!hasAny) {
    return (
      <div className="mt-6 pt-4 border-t border-border text-[11.5px] text-text-mute font-mono">
        Агрегаты пока пусты — обновляются триггером при завершении appointments.
      </div>
    );
  }
  return (
    <div className="mt-6 pt-4 border-t border-border grid grid-cols-3 gap-3 text-[11.5px] font-mono">
      <Agg label="Первый визит" value={formatTs(client.firstVisitAt)} />
      <Agg label="Последний визит" value={formatTs(client.lastVisitAt)} />
      <Agg label="Сумма (RUB)" value={kopecksToRub(client.totalSpentKopecks)} />
    </div>
  );
}

function Agg({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-text-mute uppercase tracking-wider text-[10.5px]">{label}</div>
      <div className="text-text mt-0.5">{value || '—'}</div>
    </div>
  );
}

function formatTs(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 16).replace('T', ' ');
}

function ClientForm({
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
  const [phone, setPhone] = useState(initial.phone);
  const [email, setEmail] = useState(initial.email);
  const [birthdate, setBirthdate] = useState(initial.birthdate);
  const [notes, setNotes] = useState(initial.notes);
  const [tagsInput, setTagsInput] = useState(initial.tagsInput);
  const [status, setStatus] = useState<ClientStatus>(initial.status);

  const tagsPreview = useMemo(() => tagsFromInput(tagsInput), [tagsInput]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ name, phone, email, birthdate, notes, tagsInput, status });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-xs uppercase tracking-widest text-text-mute">
        {isNew ? 'Новый клиент' : 'Клиент'}{' '}
        {meta && <span className="font-mono opacity-60">· {meta}</span>}
      </div>

      <Field label="Имя">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 bg-bg border border-border rounded outline-none focus:border-accent"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Телефон" hint="E.164: опциональный +, 7-15 цифр">
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+79991234567"
            pattern="^\+?[0-9]{7,15}$"
            className="w-full px-3 py-2 bg-bg border border-border rounded outline-none focus:border-accent font-mono"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-bg border border-border rounded outline-none focus:border-accent"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Дата рождения">
          <input
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            className="w-full px-3 py-2 bg-bg border border-border rounded outline-none focus:border-accent"
          />
        </Field>
        <Field label="Статус">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ClientStatus)}
            disabled={isNew}
            className="w-full px-3 py-2 bg-bg border border-border rounded outline-none focus:border-accent disabled:opacity-50"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Теги" hint="через запятую; нормализуются lowercase+trim на бэке">
        <input
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="vip, постоянный, отказывается от рассылки"
          className="w-full px-3 py-2 bg-bg border border-border rounded outline-none focus:border-accent"
        />
        {tagsPreview.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {tagsPreview.map((t) => (
              <span
                key={t}
                className="text-[10.5px] uppercase px-1.5 py-0.5 bg-surface-2 text-text-mute rounded"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </Field>

      <Field label="Заметки (PII)" hint="видны только в карточке, не в списке">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 bg-bg border border-border rounded outline-none focus:border-accent"
        />
      </Field>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        {onArchive ? (
          <button
            type="button"
            onClick={onArchive}
            disabled={saving}
            className="px-3 py-2 text-sm text-red-400 border border-red-500/40 rounded hover:bg-red-500/10 disabled:opacity-50"
          >
            Архивировать
          </button>
        ) : onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-3 py-2 text-sm text-text-mute border border-border rounded hover:bg-surface-2 disabled:opacity-50"
          >
            Отмена
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-accent text-bg font-semibold rounded disabled:opacity-50"
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
