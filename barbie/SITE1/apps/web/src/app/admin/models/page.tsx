'use client';

/**
 * /admin/models — глобальный каталог моделей (Class-G `girls`).
 *
 * Сетка моделей + фильтры по данным (возраст/рост/вес/грудь/силикон/активность/
 * поиск). Клик по плитке → модальная карточка: правка имени и параметров,
 * вкл/выкл модели, менеджер фото (вкл/выкл каждое фото, переупорядочивание
 * перетаскиванием, назначить обложкой, удалить). Save → PATCH /v1/girls/:id.
 *
 * Глобальный ресурс: без tenant-контекста (ADR-008). Фото — публичная статика
 * /model-library/<slug>/NN.webp.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { girlsApi, mediaUrl, type Girl, type GirlParams } from '@/lib/girls-api';
import { PROJECTS } from '@/lib/projects-data';

const INP = 'bg-bg border border-border rounded-md px-1.5 py-0.5 text-[12px] text-text outline-none focus:border-accent';

/**
 * Набор тенантов для индикатора активности модели. Источник — статический
 * `PROJECTS` (тот же, что у /admin/projects); per-тенант API ещё нет. id = slug.
 */
const TENANTS = PROJECTS.map((p) => ({ slug: p.id, name: p.name }));
const ALL_TENANT_SLUGS = TENANTS.map((t) => t.slug);

/** Слаги тенантов, где модель активна. Legacy (нет массива) = активна на всех. */
const activeTenantsOf = (g: Girl): string[] => {
  const at = g.params.activeTenants;
  if (!Array.isArray(at)) return ALL_TENANT_SLUGS;
  return at.filter((s): s is string => typeof s === 'string' && ALL_TENANT_SLUGS.includes(s));
};

type TenantCoverage = 'all' | 'partial' | 'none';
const coverageOf = (g: Girl): { status: TenantCoverage; count: number; total: number; active: Set<string> } => {
  const slugs = activeTenantsOf(g);
  const total = ALL_TENANT_SLUGS.length;
  const count = slugs.length;
  return { status: count === total ? 'all' : count === 0 ? 'none' : 'partial', count, total, active: new Set(slugs) };
};

interface Anchor { left: number; top: number; width: number; height: number }

const num = (v: string): number | null => (v === '' || isNaN(+v) ? null : +v);
const inRange = (v: number | null | undefined, mn: number | null, mx: number | null) => {
  if (v == null) return mn == null && mx == null;
  if (mn != null && v < mn) return false;
  if (mx != null && v > mx) return false;
  return true;
};
const isActivePhoto = (g: Girl, key: string) => !(g.params.inactiveMedia ?? []).includes(key);
const coverOf = (g: Girl) => {
  const active = g.mediaKeys.filter((k) => isActivePhoto(g, k));
  return (active[0] ?? g.mediaKeys[0]) || null;
};

export default function ModelsPage() {
  const [items, setItems] = useState<Girl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  // tenant-activation overlay (поверх плитки; tenantSel — рабочий выбор салонов)
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantSel, setTenantSel] = useState<string[]>([]);

  // filters
  const [q, setQ] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [hMin, setHMin] = useState('');
  const [hMax, setHMax] = useState('');
  const [bMin, setBMin] = useState('');
  const [bMax, setBMax] = useState('');
  const [sil, setSil] = useState('');
  const [act, setAct] = useState('');
  const [covFilter, setCovFilter] = useState('');   // покрытие тенантов: all | partial | none

  // Режим сортировки (drag-n-drop). Глобальный ord → порядок на всех сайтах.
  const [sortMode, setSortMode] = useState(false);
  // Режим «Статус»: на каждой карточке чекбокс активна/скрыта (params.active).
  const [statusMode, setStatusMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const dragFrom = useRef<number | null>(null);
  const sortBackup = useRef<Girl[] | null>(null);

  // «Грязный» порядок: в режиме сортировки текущая раскладка отличается от
  // снимка, сделанного при входе. Управляет предупреждениями о потере правок.
  const sortDirty = useMemo(() => {
    if (!sortMode) return false;
    const base = sortBackup.current;
    if (!base || base.length !== items.length) return false;
    return items.some((g, i) => g.id !== base[i].id);
  }, [items, sortMode]);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const res = await girlsApi.list({ limit: 500 });
      setItems(res.data);
    } catch (e) {
      setError(formatErr(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);

  // Защита несохранённого порядка сортировки от случайной потери:
  //  • beforeunload — закрытие/перезагрузка вкладки, уход на внешний адрес
  //    (браузер показывает свой нативный диалог «изменения не сохранены»);
  //  • перехват кликов по внутренним ссылкам (rail) — SPA-навигация не триггерит
  //    beforeunload, поэтому спрашиваем подтверждение и гасим переход при отказе.
  useEffect(() => {
    if (!sortDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    const onClickCapture = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute('href') ?? '';
      if (!href || href.startsWith('#') || a.target === '_blank' || /^https?:\/\//.test(href)) return;
      if (!window.confirm('Порядок моделей не сохранён. Уйти со страницы без сохранения?')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClickCapture, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClickCapture, true);
    };
  }, [sortDirty]);

  function showNotice(m: string) {
    setNotice(m);
    setTimeout(() => setNotice(null), 2500);
  }

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return items.filter((g) => {
      if (ql && !g.name.toLowerCase().includes(ql) && !g.slug.includes(ql)) return false;
      if (!inRange(g.params.age ?? null, num(ageMin), num(ageMax))) return false;
      if (!inRange(g.params.height ?? null, num(hMin), num(hMax))) return false;
      if (!inRange(g.params.breast ?? null, num(bMin), num(bMax))) return false;
      if (sil === '1' && !g.params.silicon) return false;
      if (sil === '0' && g.params.silicon) return false;
      const active = g.params.active !== false;
      if (act === '1' && !active) return false;
      if (act === '0' && active) return false;
      if (covFilter && coverageOf(g).status !== covFilter) return false;
      return true;
    });
  }, [items, q, ageMin, ageMax, hMin, hMax, bMin, bMax, sil, act, covFilter]);

  const editing = items.find((g) => g.id === editId) ?? null;

  async function onSave(id: string, patch: { name: string; params: GirlParams; mediaKeys: string[] }) {
    setError(null);
    try {
      const updated = await girlsApi.update(id, patch);
      setItems((prev) => prev.map((g) => (g.id === id ? updated : g)));
      showNotice('Сохранено');
      setEditId(null);
    } catch (e) {
      setError(formatErr(e));
    }
  }

  function openTenants(g: Girl) {
    setTenantSel(activeTenantsOf(g));
    setTenantId(g.id);
  }
  const toggleTenant = (slug: string) =>
    setTenantSel((p) => (p.includes(slug) ? p.filter((s) => s !== slug) : [...p, slug]));
  function closeTenants() {
    const g = items.find((x) => x.id === tenantId);
    const orig = g ? [...activeTenantsOf(g)].sort().join(',') : '';
    if (orig === [...tenantSel].sort().join(',') || window.confirm('Вы не сохранили изменения. Закрыть без сохранения?')) {
      setTenantId(null);
    }
  }
  async function saveTenants() {
    if (!tenantId) return;
    setError(null);
    const g = items.find((x) => x.id === tenantId);
    if (!g) return;
    try {
      const updated = await girlsApi.update(tenantId, { params: { ...g.params, activeTenants: tenantSel } });
      setItems((prev) => prev.map((x) => (x.id === tenantId ? updated : x)));
      showNotice('Сохранено');
      setTenantId(null);
    } catch (e) {
      setError(formatErr(e));
    }
  }

  function resetFilters() {
    setQ(''); setAgeMin(''); setAgeMax(''); setHMin(''); setHMax(''); setBMin(''); setBMax(''); setSil(''); setAct(''); setCovFilter('');
  }

  // ─── Режим «Статус» (вкл/выкл активность модели в системе) ──────────────────
  function enterStatus() {
    setSortMode(false);
    setEditId(null);
    setTenantId(null);
    setStatusMode(true);
  }
  // Тумблер активности: active!==false = активна. Деактивация = params.active:false
  // (не удаление — модель просто перестаёт показываться во всех тенантах).
  async function toggleActive(g: Girl) {
    const next = g.params.active === false; // была скрыта → активируем; иначе скрываем
    setItems((prev) => prev.map((x) => (x.id === g.id ? { ...x, params: { ...x.params, active: next } } : x)));
    try {
      const updated = await girlsApi.update(g.id, { params: { ...g.params, active: next } });
      setItems((prev) => prev.map((x) => (x.id === g.id ? updated : x)));
    } catch (e) {
      setError(formatErr(e));
      setItems((prev) => prev.map((x) => (x.id === g.id ? g : x))); // откат при ошибке
    }
  }

  // ─── Режим сортировки ───────────────────────────────────────────────────────
  function enterSort() {
    sortBackup.current = items;
    setStatusMode(false);
    setEditId(null);
    setTenantId(null);
    setSortMode(true);
  }
  function cancelSort() {
    if (sortDirty && !window.confirm('Порядок не сохранён. Отменить сортировку без сохранения?')) return;
    if (sortBackup.current) setItems(sortBackup.current);
    sortBackup.current = null;
    dragFrom.current = null;
    setSortMode(false);
  }
  async function saveSort() {
    setSaving(true);
    setError(null);
    try {
      await girlsApi.reorder(items.map((g) => g.id));
      sortBackup.current = null;
      setSortMode(false);
      showNotice('Порядок сохранён — применён на всех салонах');
      await reload();
    } catch (e) {
      setError(formatErr(e));
    } finally {
      setSaving(false);
    }
  }
  function onDragEnterCard(i: number) {
    const from = dragFrom.current;
    if (from === null || from === i) return;
    setItems((prev) => {
      const a = [...prev];
      const [m] = a.splice(from, 1);
      a.splice(i, 0, m);
      return a;
    });
    dragFrom.current = i;
  }

  if (loading) return <div className="p-8 text-text-mute font-mono text-xs">loading models…</div>;

  return (
    <div className="space-y-4">
      {/* Верхняя панель — full-width, залипает при скролле: заголовок + инструменты + фильтры.
          -mx-7/px-7 «вытягивают» её в полную ширину main (у которого px-7), давая бар во всю ширину. */}
      <div className="sticky top-0 z-30 -mx-7 px-7 bg-bg/85 backdrop-blur-md border-b border-border">
        {/* Одна полоса: «Модели N» · блок фильтров (растягивается, скролл по X при
            нехватке места) · справа переключатель «Сортировать» (или действия сортировки). */}
        <div className="flex items-center gap-3 py-1.5">
          <h1 className="shrink-0 text-sm uppercase tracking-widest text-text-mute whitespace-nowrap">
            Модели <span className="text-accent font-mono">{sortMode ? items.length : `${filtered.length}/${items.length}`}</span>
          </h1>

          {!sortMode ? (
            <div className="flex items-center gap-x-2.5 flex-1 min-w-0 overflow-x-auto">
              <Filt label="Поиск"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="имя…" className={`${INP} w-[110px]`} /></Filt>
              <Range label="Возраст" a={ageMin} b={ageMax} sa={setAgeMin} sb={setAgeMax} />
              <Range label="Рост" a={hMin} b={hMax} sa={setHMin} sb={setHMax} />
              <Range label="Грудь" a={bMin} b={bMax} sa={setBMin} sb={setBMax} step="0.5" />
              <Filt label="Силикон">
                <select value={sil} onChange={(e) => setSil(e.target.value)} className={INP}><option value="">любой</option><option value="1">да</option><option value="0">нет</option></select>
              </Filt>
              <Filt label="Активна">
                <select value={act} onChange={(e) => setAct(e.target.value)} className={INP}><option value="">любая</option><option value="1">да</option><option value="0">скрыта</option></select>
              </Filt>
              <Filt label="Активность">
                <select value={covFilter} onChange={(e) => setCovFilter(e.target.value)} className={INP}>
                  <option value="">любая</option>
                  <option value="all">🟢 на всех</option>
                  <option value="partial">🟡 на части</option>
                  <option value="none">🔴 нигде</option>
                </select>
              </Filt>
              <button onClick={resetFilters} className="shrink-0 px-2.5 py-1 text-[11px] text-text-mute border border-border rounded-md hover:bg-surface-2">Сброс</button>
            </div>
          ) : (
            <span className="flex-1 min-w-0 truncate text-[11px] text-amber-300">Перетаскивайте плитки · порядок применится на всех салонах</span>
          )}

          <div className="flex shrink-0 items-center gap-2">
            {notice && <span className="text-[12px] text-green-300">{notice}</span>}
            {error && <span className="text-[12px] text-red-300">{error}</span>}
            {sortMode ? (
              <>
                <button
                  onClick={cancelSort}
                  disabled={saving}
                  className="px-2.5 py-1 text-[12px] border border-border rounded-md text-text-mute hover:text-text disabled:opacity-50"
                >
                  Отмена
                </button>
                <button
                  onClick={saveSort}
                  disabled={saving}
                  className="whitespace-nowrap px-2.5 py-1 text-[12px] bg-accent text-bg font-semibold rounded-md hover:brightness-95 disabled:opacity-50"
                >
                  {saving ? 'Сохраняю…' : 'Сохранить порядок'}
                </button>
              </>
            ) : statusMode ? (
              <button
                onClick={() => setStatusMode(false)}
                className="whitespace-nowrap px-2.5 py-1 text-[12px] bg-accent text-bg font-semibold rounded-md hover:brightness-95"
              >
                Готово
              </button>
            ) : (
              <>
                <button
                  onClick={enterSort}
                  className="whitespace-nowrap px-2.5 py-1 text-[12px] border border-border rounded-md text-text hover:border-accent"
                >
                  ⇅ Сортировать
                </button>
                <button
                  onClick={enterStatus}
                  className="whitespace-nowrap px-2.5 py-1 text-[12px] border border-border rounded-md text-text hover:border-accent"
                >
                  ✓ Статус
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(9, minmax(0, 1fr))' }}>
        {(sortMode ? items : filtered).map((g, idx) => {
          const cover = coverOf(g);
          const hidden = g.params.active === false;
          const activeCount = g.mediaKeys.filter((k) => isActivePhoto(g, k)).length;
          const cov = coverageOf(g);
          const ring =
            cov.status === 'all'
              ? 'bg-green-500/90 border-green-300 text-black'
              : cov.status === 'partial'
                ? 'bg-amber-400/90 border-amber-200 text-black'
                : 'bg-red-500/85 border-red-300 text-white';
          return (
            <div
              key={g.id}
              role="button"
              tabIndex={0}
              draggable={sortMode}
              onDragStart={sortMode ? () => { dragFrom.current = idx; } : undefined}
              onDragEnter={sortMode ? () => onDragEnterCard(idx) : undefined}
              onDragOver={sortMode ? (e) => e.preventDefault() : undefined}
              onDragEnd={sortMode ? () => { dragFrom.current = null; } : undefined}
              onClick={
                sortMode
                  ? undefined
                  : statusMode
                    ? () => toggleActive(g)
                    : (e) => {
                        const r = e.currentTarget.getBoundingClientRect();
                        setAnchor({ left: r.left, top: r.top, width: r.width, height: r.height });
                        setEditId(g.id);
                      }
              }
              className={`relative text-left bg-surface border rounded-lg transition-colors hover:border-accent ${sortMode ? 'cursor-move ring-1 ring-accent/20' : 'cursor-pointer'} ${tenantId === g.id ? 'z-[1950]' : 'overflow-hidden'} ${hidden ? 'border-red-500/40 opacity-60' : 'border-border'}`}
            >
              {sortMode && (
                <span className="absolute top-1.5 right-1.5 z-20 px-1.5 py-0.5 rounded bg-accent text-bg text-[10px] font-mono font-bold pointer-events-none">
                  {idx + 1}
                </span>
              )}
              <div className="relative aspect-[3/4] bg-black bg-cover bg-center" style={{ backgroundImage: cover ? `url('${mediaUrl(cover)}')` : undefined }}>
                {/* Режим «Статус»: чекбокс активности поверх плитки (клик по карточке — тумблер). */}
                {statusMode && (
                  <span className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/45 pointer-events-none">
                    <span className={`flex items-center justify-center w-10 h-10 rounded-md border-2 text-xl font-black ${hidden ? 'border-white/60 text-transparent bg-black/30' : 'border-green-300 bg-green-500/90 text-black'}`}>✓</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${hidden ? 'bg-red-500/30 text-red-200' : 'bg-green-500/25 text-green-100'}`}>{hidden ? 'Скрыта' : 'Активна'}</span>
                  </span>
                )}
                {/* Индикатор-кнопка активности по салонам: зелёный=все, янтарь=часть, красный=нигде. Клик → оверлей поверх этой плитки. */}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); if (!sortMode && !statusMode) openTenants(g); }}
                  className={`absolute top-1.5 left-1.5 z-10 flex items-center justify-center w-5 h-5 rounded-full border text-[10px] leading-none shadow transition-transform ${sortMode || statusMode ? 'pointer-events-none' : 'cursor-pointer hover:scale-110'} ${ring}`}
                  title={`Активна на ${cov.count}/${cov.total} салонах — клик для настройки`}
                >
                  {cov.status === 'none' ? '–' : '✓'}
                </span>
                {g.params.silicon && <span className="absolute top-1.5 right-1.5 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/40">силикон</span>}
                {hidden && <span className="absolute top-1.5 left-8 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">скрыта</span>}
                <span className="absolute bottom-1.5 left-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/60 text-white/90">{activeCount}/{g.mediaKeys.length} фото</span>
              </div>
              <div className="p-2.5">
                <div className="flex items-baseline justify-between gap-2"><span className="text-sm truncate">{g.name}</span><span className="text-accent text-[13px]">{g.params.age ?? '—'}</span></div>
                <div className="flex gap-2 mt-1 text-[11px] text-text-mute font-mono flex-wrap">
                  <span>рост <b className="text-text font-medium">{g.params.height ?? '—'}</b></span>
                  <span>вес <b className="text-text font-medium">{g.params.weight ?? '—'}</b></span>
                  <span>грудь <b className="text-text font-medium">{g.params.breast ?? '—'}</b></span>
                </div>
              </div>

              {/* Оверлей салонов — на ВСЮ плитку (поверх фото и параметров). Шапка: слева закрыть · центр имя · справа пилюля «сохранить». */}
              {tenantId === g.id && (
                <div onClick={(e) => e.stopPropagation()} className="absolute -inset-[5%] z-40 flex flex-col bg-bg-elev rounded-lg border border-line-strong shadow-2xl overflow-hidden">
                  <div className="flex items-center gap-1.5 px-1.5 py-1.5 border-b border-line shrink-0">
                    {/* красный кружок-закрытие слева */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); closeTenants(); }}
                      aria-label="Закрыть"
                      title="Закрыть"
                      className="group shrink-0 w-4 h-4 rounded-full bg-[#ff5f57] hover:brightness-95 flex items-center justify-center"
                    >
                      <span className="opacity-70 group-hover:opacity-100 transition-opacity text-[10px] leading-none text-black/70">✕</span>
                    </button>
                    <span className="flex-1 text-center text-[10px] font-medium truncate px-1">{g.name}</span>
                    {/* пилюля «сохранить» справа */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); saveTenants(); }}
                      title="Сохранить"
                      className="shrink-0 px-2 py-0.5 text-[9px] bg-accent text-bg font-semibold rounded-full hover:brightness-95"
                    >
                      сохранить
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-1 space-y-px">
                    {TENANTS.map((t) => {
                      const on = tenantSel.includes(t.slug);
                      return (
                        <button
                          type="button"
                          key={t.slug}
                          onClick={(e) => { e.stopPropagation(); toggleTenant(t.slug); }}
                          className={`block w-full truncate px-2 py-0.5 rounded text-[10px] text-left transition-colors ${on ? 'bg-white/10 text-white' : 'text-red-400 hover:bg-surface-2'}`}
                        >
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <div className="col-span-full text-center text-text-mute text-sm py-12">Ничего не найдено</div>}
      </div>

      {/* Затемняющий фон под оверлеем салонов; активная плитка поднята над ним (z-[1950]). Клик по фону = закрыть. */}
      {tenantId && <div onClick={closeTenants} className="fixed inset-0 z-[1900] bg-black/70" />}
      {editing && (
        <EditModal
          key={editing.id}
          girl={editing}
          anchor={anchor}
          onClose={() => setEditId(null)}
          onSave={onSave}
          onUploaded={(g) => setItems((prev) => prev.map((x) => (x.id === g.id ? g : x)))}
        />
      )}
    </div>
  );
}

function Filt({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex shrink-0 items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-text-mute whitespace-nowrap">{label}</span>
      {children}
    </label>
  );
}
function Range({ label, a, b, sa, sb, step }: { label: string; a: string; b: string; sa: (v: string) => void; sb: (v: string) => void; step?: string }) {
  return (
    <Filt label={label}>
      <input type="number" step={step} value={a} onChange={(e) => sa(e.target.value)} placeholder="от" className={`${INP} w-[42px]`} />
      <span className="text-text-mute text-[11px]">–</span>
      <input type="number" step={step} value={b} onChange={(e) => sb(e.target.value)} placeholder="до" className={`${INP} w-[42px]`} />
    </Filt>
  );
}

function EditModal({ girl, anchor, onClose, onSave, onUploaded }: {
  girl: Girl;
  anchor: Anchor | null;
  onClose: () => void;
  onSave: (id: string, patch: { name: string; params: GirlParams; mediaKeys: string[] }) => void;
  onUploaded: (girl: Girl) => void;
}) {
  const [name, setName] = useState(girl.name);
  const [age, setAge] = useState(String(girl.params.age ?? ''));
  const [height, setHeight] = useState(String(girl.params.height ?? ''));
  const [weight, setWeight] = useState(String(girl.params.weight ?? ''));
  const [breast, setBreast] = useState(String(girl.params.breast ?? ''));
  const [silicon, setSilicon] = useState(!!girl.params.silicon);
  const [active, setActive] = useState(girl.params.active !== false);
  const [media, setMedia] = useState<string[]>(girl.mediaKeys);
  const [inactive, setInactive] = useState<string[]>(girl.params.inactiveMedia ?? []);
  const [saving, setSaving] = useState(false);
  const dragIdx = useRef<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null); // индекс фото в лайтбоксе
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [videos, setVideos] = useState<string[]>(girl.params.videoKeys ?? []);
  const [inactiveVideos, setInactiveVideos] = useState<string[]>(girl.params.inactiveVideos ?? []);
  const [confirmVid, setConfirmVid] = useState<string | null>(null); // ключ видео с открытым подтверждением деактивации
  const [vidUploading, setVidUploading] = useState(false);
  const [vidErr, setVidErr] = useState<string | null>(null);
  const vidInput = useRef<HTMLInputElement>(null);

  // Грязное состояние: сравнение текущей формы с исходной карточкой.
  const initialSnap = useMemo(
    () => JSON.stringify({
      name: girl.name,
      age: String(girl.params.age ?? ''),
      height: String(girl.params.height ?? ''),
      weight: String(girl.params.weight ?? ''),
      breast: String(girl.params.breast ?? ''),
      silicon: !!girl.params.silicon,
      active: girl.params.active !== false,
      media: girl.mediaKeys,
      inactive: [...(girl.params.inactiveMedia ?? [])].sort(),
      videos: girl.params.videoKeys ?? [],
      inactiveVid: [...(girl.params.inactiveVideos ?? [])].sort(),
    }),
    [girl],
  );
  const dirty = JSON.stringify({
    name, age, height, weight, breast, silicon, active, media,
    inactive: [...inactive].sort(),
    videos,
    inactiveVid: [...inactiveVideos].sort(),
  }) !== initialSnap;

  // Закрытие с защитой: при несохранённых правках — подтверждение.
  const requestClose = () => {
    if (!dirty || window.confirm('Вы не сохранили изменения. Закрыть без сохранения?')) onClose();
  };
  const closeRef = useRef(requestClose);
  closeRef.current = requestClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (lightbox !== null) {
        if (e.key === 'Escape') setLightbox(null);
        else if (e.key === 'ArrowLeft') setLightbox((i) => (i === null ? null : (i - 1 + media.length) % media.length));
        else if (e.key === 'ArrowRight') setLightbox((i) => (i === null ? null : (i + 1) % media.length));
        return;
      }
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightbox, media.length]);

  // Всплываем рядом с кликнутой плиткой (anchor), а не по центру. Позицию
  // считаем после монтирования по реальным размерам панели, клампим в вьюпорт.
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; origin: string } | null>(null);
  const [shown, setShown] = useState(false);
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const pw = el.offsetWidth;
    const ph = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const m = 8;
    const aLeft = anchor ? anchor.left : (vw - pw) / 2;
    const aTop = anchor ? anchor.top : (vh - ph) / 2;
    const left = Math.max(m, Math.min(aLeft, vw - pw - m));
    const top = Math.max(m, Math.min(aTop, vh - ph - m));
    const ax = anchor ? anchor.left + anchor.width / 2 : left + pw / 2;
    const ay = anchor ? anchor.top + anchor.height / 2 : top + ph / 2;
    const origin = `${Math.max(0, Math.min(ax - left, pw))}px ${Math.max(0, Math.min(ay - top, ph))}px`;
    setPos({ left, top, origin });
  }, [anchor]);
  useEffect(() => {
    if (pos && !shown) {
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
  }, [pos, shown]);

  const togglePhoto = (k: string) => setInactive((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const removePhoto = (k: string) => { setMedia((p) => p.filter((x) => x !== k)); setInactive((p) => p.filter((x) => x !== k)); };
  const makeCover = (k: string) => setMedia((p) => [k, ...p.filter((x) => x !== k)]);
  function reorder(from: number, to: number) {
    if (from === to) return;
    setMedia((p) => { const n = [...p]; const [m] = n.splice(from, 1); n.splice(to, 0, m); return n; });
  }

  // Загрузка фото: сервер конвертирует в WebP и сразу пишет в mediaKeys.
  // Локальный media-стейт синхронизируем с ответом, карточку в гриде обновляем.
  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;
    setUploading(true);
    setUploadErr(null);
    try {
      const { girl: updated } = await girlsApi.uploadPhotos(girl.id, list);
      setMedia(updated.mediaKeys);
      onUploaded(updated);
    } catch (e) {
      setUploadErr(formatErr(e));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  // Загрузка видео (mp4/webm, без транскода). Ключи → params.videoKeys.
  async function uploadVideos(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith('video/'));
    if (!list.length) return;
    setVidUploading(true);
    setVidErr(null);
    try {
      const { girl: updated } = await girlsApi.uploadVideos(girl.id, list);
      setVideos(updated.params.videoKeys ?? []);
      onUploaded(updated);
    } catch (e) {
      setVidErr(formatErr(e));
    } finally {
      setVidUploading(false);
      if (vidInput.current) vidInput.current.value = '';
    }
  }
  const deactivateVideo = (k: string) => setInactiveVideos((p) => (p.includes(k) ? p : [...p, k]));
  const reactivateVideo = (k: string) => setInactiveVideos((p) => p.filter((x) => x !== k));

  function submit() {
    setSaving(true);
    const params: GirlParams = {
      ...girl.params,
      age: age === '' ? undefined : Number(age),
      height: height === '' ? null : Number(height),
      weight: weight === '' ? null : Number(weight),
      breast: breast === '' ? null : Number(breast),
      silicon,
      active,
      inactiveMedia: inactive.filter((k) => media.includes(k)),
      ...(videos.length || girl.params.videoKeys?.length ? { videoKeys: videos } : {}),
      ...(inactiveVideos.length || girl.params.inactiveVideos?.length
        ? { inactiveVideos: inactiveVideos.filter((k) => videos.includes(k)) }
        : {}),
    };
    onSave(girl.id, { name, params, mediaKeys: media });
  }

  return (
    <div onClick={requestClose} className="fixed inset-0 z-[2000] bg-black/70">
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: pos?.left ?? 0,
          top: pos?.top ?? 0,
          width: 'min(960px, calc(100vw - 24px))',
          maxHeight: '88vh',
          overflowY: 'auto',
          transformOrigin: pos?.origin ?? 'center',
          transform: shown ? 'scale(1)' : 'scale(0.96)',
          opacity: shown ? 1 : 0,
          visibility: pos ? 'visible' : 'hidden',
          transition: 'transform 0.14s ease-out, opacity 0.14s ease-out',
        }}
        className="bg-bg-elev border border-line-strong rounded-xl shadow-2xl"
      >
        <div className="relative flex items-center gap-2 px-4 py-3 border-b border-line bg-surface/50 rounded-t-xl">
          {/* macOS-vibe — закрытие на красном кружке (оно же отмена); справа — «Сохранить» */}
          <button
            onClick={requestClose}
            aria-label="Закрыть"
            title="Закрыть (отмена)"
            className="group shrink-0 w-6 h-6 rounded-full bg-[#ff5f57] hover:brightness-95 flex items-center justify-center"
          >
            <span className="opacity-70 group-hover:opacity-100 transition-opacity text-[13px] leading-none text-black/70">✕</span>
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="shrink-0 px-3 py-1 text-[12px] bg-accent text-bg font-semibold rounded-full hover:brightness-95 disabled:opacity-50"
          >
            {saving ? '…' : 'Сохранить'}
          </button>
          <div className="absolute left-1/2 -translate-x-1/2 text-xs uppercase tracking-widest text-text-mute select-none pointer-events-none">
            Карточка · <span className="font-mono">{girl.slug}</span>
            {dirty && <span className="ml-2 normal-case tracking-normal text-amber-400" title="Есть несохранённые изменения">● не сохранено</span>}
          </div>
        </div>

        <div className="p-4 grid md:grid-cols-[200px,1fr] gap-5">
          {/* Слева — информация в одну колонку */}
          <div className="space-y-3">
            <Fld label="Имя"><input value={name} onChange={(e) => setName(e.target.value)} className={`${INP} w-full`} /></Fld>
            <Fld label="Возраст"><input type="number" value={age} onChange={(e) => setAge(e.target.value)} className={`${INP} w-full`} /></Fld>
            <Fld label="Рост, см"><input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className={`${INP} w-full`} /></Fld>
            <Fld label="Вес, кг"><input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className={`${INP} w-full`} /></Fld>
            <Fld label="Грудь"><input type="number" step="0.5" value={breast} onChange={(e) => setBreast(e.target.value)} className={`${INP} w-full`} /></Fld>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={silicon} onChange={(e) => setSilicon(e.target.checked)} /> силикон</label>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> модель отображается</label>
          </div>

          {/* Справа — расширенная галерея + загрузчик */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-[10px] uppercase tracking-wider text-text-mute">
                Фото · {media.filter((k) => !inactive.includes(k)).length}/{media.length} активны · перетащи для порядка
              </div>
              <div className="flex items-center gap-2">
                {uploadErr && <span className="text-[11px] text-red-300 truncate max-w-[180px]" title={uploadErr}>{uploadErr}</span>}
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.length) void uploadFiles(e.target.files); }}
                />
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={uploading}
                  className="shrink-0 px-2.5 py-1 text-[11px] bg-accent text-bg font-semibold rounded-md hover:brightness-95 disabled:opacity-50"
                >
                  {uploading ? 'Загрузка…' : '＋ Загрузить фото'}
                </button>
              </div>
            </div>
            {/* Квадратные миниатюры, тонкий зазор 2px; drop-зона для перетаскивания файлов из ОС */}
            <div
              onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); }}
              onDrop={(e) => { if (e.dataTransfer.files?.length) { e.preventDefault(); void uploadFiles(e.dataTransfer.files); } }}
              className="grid grid-cols-6 gap-[2px] max-h-[56vh] overflow-y-auto"
            >
              {media.map((k, idx) => {
                const off = inactive.includes(k);
                return (
                  <div key={k} draggable
                    onDragStart={() => { dragIdx.current = idx; }}
                    onDragOver={(e) => { e.preventDefault(); if (overIdx !== idx) setOverIdx(idx); }}
                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const f = dragIdx.current; dragIdx.current = null; setOverIdx(null); if (f != null) reorder(f, idx); }}
                    onDragEnd={() => { dragIdx.current = null; setOverIdx(null); }}
                    className={`relative aspect-square overflow-hidden border-2 ${overIdx === idx ? 'border-accent' : off ? 'border-red-500/40' : 'border-transparent'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaUrl(k)} alt="" onClick={(e) => { e.stopPropagation(); setLightbox(idx); }} className={`w-full h-full object-cover cursor-zoom-in ${off ? 'opacity-35 grayscale' : ''}`} />
                    {idx === 0 && <span className="absolute top-0.5 left-0.5 text-[8px] uppercase px-1 rounded bg-accent text-bg font-bold">обложка</span>}
                    <div className="absolute bottom-0 inset-x-0 flex justify-between bg-black/55 text-[10px]">
                      <button title={off ? 'включить' : 'выключить'} onClick={() => togglePhoto(k)} className="px-1 py-0.5 hover:bg-white/10">{off ? 'вкл' : 'выкл'}</button>
                      {idx !== 0 && <button title="сделать обложкой" onClick={() => makeCover(k)} className="px-1 py-0.5 hover:bg-white/10">★</button>}
                      <button title="удалить" onClick={() => removePhoto(k)} className="px-1 py-0.5 text-red-300 hover:bg-white/10">×</button>
                    </div>
                  </div>
                );
              })}
              {media.length === 0 && <div className="col-span-6 text-text-mute text-xs py-6 text-center">Фото нет — перетащите сюда или нажмите «Загрузить»</div>}
            </div>

            {/* Видео — mp4/webm, без транскода. Отдельный subdir model-library/<slug>/video. */}
            <div className="flex items-center justify-between gap-2 mt-4 mb-2">
              <div className="text-[10px] uppercase tracking-wider text-text-mute">Видео · {videos.filter((k) => !inactiveVideos.includes(k)).length}/{videos.length} активны</div>
              <div className="flex items-center gap-2">
                {vidErr && <span className="text-[11px] text-red-300 truncate max-w-[180px]" title={vidErr}>{vidErr}</span>}
                <input
                  ref={vidInput}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  multiple
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.length) void uploadVideos(e.target.files); }}
                />
                <button
                  type="button"
                  onClick={() => vidInput.current?.click()}
                  disabled={vidUploading}
                  className="shrink-0 px-2.5 py-1 text-[11px] border border-border rounded-md text-text hover:border-accent disabled:opacity-50"
                >
                  {vidUploading ? 'Загрузка…' : '＋ Загрузить видео'}
                </button>
              </div>
            </div>
            {videos.length > 0 && (
              <div
                onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); }}
                onDrop={(e) => { if (e.dataTransfer.files?.length) { e.preventDefault(); void uploadVideos(e.dataTransfer.files); } }}
                className="grid grid-cols-3 gap-1.5"
              >
                {videos.map((k) => {
                  const off = inactiveVideos.includes(k);
                  return (
                    <div key={k} className={`relative rounded-md overflow-hidden border-2 ${off ? 'border-red-500/40' : 'border-border'} bg-black`}>
                      <video src={mediaUrl(k)} poster={mediaUrl(k.replace(/\.(mp4|webm|mov)$/i, '.webp'))} controls muted playsInline preload="none" className={`w-full aspect-video object-cover ${off ? 'opacity-35 grayscale' : ''}`} />
                      {/* Кнопка вкл/выкл (НЕ удаление): деактивация скрывает видео с сайта, файл остаётся. */}
                      <button
                        type="button"
                        title={off ? 'Включить видео' : 'Деактивировать видео'}
                        onClick={() => (off ? reactivateVideo(k) : setConfirmVid(k))}
                        className={`absolute top-1 right-1 px-1.5 h-5 rounded-full bg-black/70 text-[10px] flex items-center hover:bg-black ${off ? 'text-green-300' : 'text-amber-300'}`}
                      >
                        {off ? 'вкл' : 'выкл'}
                      </button>
                      {off && <span className="absolute bottom-1 left-1 text-[8px] uppercase px-1 rounded bg-red-500/20 text-red-300 border border-red-500/40">скрыто</span>}
                      {/* Inline-подтверждение деактивации — всплывает рядом, в той же плитке */}
                      {confirmVid === k && (
                        <div className="absolute top-7 right-1 z-20 w-[160px] rounded-md bg-bg-elev border border-line-strong shadow-xl p-2">
                          <div className="mb-1.5 text-[11px] text-text leading-snug">Деактивировать видео, вы уверены?</div>
                          <div className="flex gap-1.5 justify-end">
                            <button type="button" onClick={() => setConfirmVid(null)} className="px-2 py-0.5 text-[11px] border border-border rounded text-text-mute hover:bg-surface-2">Отмена</button>
                            <button type="button" onClick={() => { deactivateVideo(k); setConfirmVid(null); }} className="px-2 py-0.5 text-[11px] bg-accent text-bg font-semibold rounded hover:brightness-95">Да</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Лайтбокс — полноразмерное фото по клику в галерее; ‹ › листают, ✕/клик-фон/Esc закрывают */}
      {lightbox !== null && media[lightbox] && (
        <div onClick={(e) => { e.stopPropagation(); setLightbox(null); }} className="fixed inset-0 z-[2200] bg-black/90 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl(media[lightbox])} alt="" onClick={(e) => e.stopPropagation()} className="max-h-[94vh] max-w-[94vw] object-contain select-none" />
          <button onClick={(e) => { e.stopPropagation(); setLightbox(null); }} aria-label="Закрыть" title="Закрыть" className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg flex items-center justify-center">✕</button>
          {media.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i === null ? null : (i - 1 + media.length) % media.length)); }} aria-label="Назад" className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl flex items-center justify-center">‹</button>
              <button onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i === null ? null : (i + 1) % media.length)); }} aria-label="Вперёд" className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl flex items-center justify-center">›</button>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-xs font-mono bg-black/50 px-2 py-1 rounded">{lightbox + 1}/{media.length}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-[10px] uppercase tracking-wider text-text-mute">{label}</span>{children}</label>;
}

function formatErr(err: unknown): string {
  if (err instanceof ApiError) return err.body.message ?? `HTTP ${err.status} (${err.body.code ?? 'unknown'})`;
  return String(err);
}
