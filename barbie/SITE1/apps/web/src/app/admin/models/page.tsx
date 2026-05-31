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

const INP = 'bg-bg border border-border rounded-md px-2 py-1.5 text-[13px] text-text outline-none focus:border-accent';

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
  const [salonFilter, setSalonFilter] = useState(''); // slug салона: показать модели, активные там

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
      if (salonFilter && !activeTenantsOf(g).includes(salonFilter)) return false;
      return true;
    });
  }, [items, q, ageMin, ageMax, hMin, hMax, bMin, bMax, sil, act, covFilter, salonFilter]);

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
    setQ(''); setAgeMin(''); setAgeMax(''); setHMin(''); setHMax(''); setBMin(''); setBMax(''); setSil(''); setAct(''); setCovFilter(''); setSalonFilter('');
  }

  if (loading) return <div className="p-8 text-text-mute font-mono text-xs">loading models…</div>;

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-sm uppercase tracking-widest text-text-mute">
          Модели <span className="text-accent font-mono">{filtered.length}/{items.length}</span>
        </h1>
        {notice && <span className="text-[12px] text-green-300">{notice}</span>}
        {error && <span className="text-[12px] text-red-300">{error}</span>}
      </div>

      <section className="flex flex-wrap items-end gap-3 p-3 border border-border rounded-md bg-surface">
        <Filt label="Поиск"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="имя…" className={`${INP} w-[150px]`} /></Filt>
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
        <Filt label="Салон">
          <select value={salonFilter} onChange={(e) => setSalonFilter(e.target.value)} className={INP}>
            <option value="">— любой —</option>
            {TENANTS.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
          </select>
        </Filt>
        <button onClick={resetFilters} className="px-3 py-2 text-[12px] text-text-mute border border-border rounded-md hover:bg-surface-2">Сброс</button>
      </section>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))' }}>
        {filtered.map((g) => {
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
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setAnchor({ left: r.left, top: r.top, width: r.width, height: r.height });
                setEditId(g.id);
              }}
              className={`relative cursor-pointer text-left bg-surface border rounded-lg hover:border-accent transition-colors ${tenantId === g.id ? 'z-[1950]' : 'overflow-hidden'} ${hidden ? 'border-red-500/40 opacity-60' : 'border-border'}`}
            >
              <div className="relative aspect-[3/4] bg-black bg-cover bg-center" style={{ backgroundImage: cover ? `url('${mediaUrl(cover)}')` : undefined }}>
                {/* Индикатор-кнопка активности по салонам: зелёный=все, янтарь=часть, красный=нигде. Клик → оверлей поверх этой плитки. */}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); openTenants(g); }}
                  className={`absolute top-1.5 left-1.5 z-10 flex items-center justify-center w-5 h-5 rounded-full border text-[10px] leading-none shadow cursor-pointer hover:scale-110 transition-transform ${ring}`}
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
      {editing && <EditModal key={editing.id} girl={editing} anchor={anchor} onClose={() => setEditId(null)} onSave={onSave} />}
    </div>
  );
}

function Filt({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1"><span className="text-[10px] uppercase tracking-wider text-text-mute">{label}</span>{children}</label>;
}
function Range({ label, a, b, sa, sb, step }: { label: string; a: string; b: string; sa: (v: string) => void; sb: (v: string) => void; step?: string }) {
  return (
    <Filt label={label}>
      <div className="flex items-center gap-1">
        <input type="number" step={step} value={a} onChange={(e) => sa(e.target.value)} placeholder="от" className={`${INP} w-[56px]`} />
        <span className="text-text-mute">–</span>
        <input type="number" step={step} value={b} onChange={(e) => sb(e.target.value)} placeholder="до" className={`${INP} w-[56px]`} />
      </div>
    </Filt>
  );
}

function EditModal({ girl, anchor, onClose, onSave }: {
  girl: Girl;
  anchor: Anchor | null;
  onClose: () => void;
  onSave: (id: string, patch: { name: string; params: GirlParams; mediaKeys: string[] }) => void;
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
    }),
    [girl],
  );
  const dirty = JSON.stringify({
    name, age, height, weight, breast, silicon, active, media,
    inactive: [...inactive].sort(),
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
          width: 'min(720px, calc(100vw - 24px))',
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
        <div className="relative flex items-center px-4 py-3 border-b border-line bg-surface/50 rounded-t-xl">
          {/* macOS-vibe — закрытие на красном кружке (слева от заголовка) */}
          <button
            onClick={requestClose}
            aria-label="Закрыть"
            title="Закрыть"
            className="group absolute left-4 w-6 h-6 rounded-full bg-[#ff5f57] hover:brightness-95 flex items-center justify-center"
          >
            <span className="opacity-70 group-hover:opacity-100 transition-opacity text-[13px] leading-none text-black/70">✕</span>
          </button>
          <div className="mx-auto text-xs uppercase tracking-widest text-text-mute select-none">
            Карточка · <span className="font-mono">{girl.slug}</span>
            {dirty && <span className="ml-2 normal-case tracking-normal text-amber-400" title="Есть несохранённые изменения">● не сохранено</span>}
          </div>
        </div>

        <div className="p-4 grid md:grid-cols-[1fr,1.3fr] gap-5">
          <div className="space-y-3">
            <Fld label="Имя"><input value={name} onChange={(e) => setName(e.target.value)} className={`${INP} w-full`} /></Fld>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Возраст"><input type="number" value={age} onChange={(e) => setAge(e.target.value)} className={`${INP} w-full`} /></Fld>
              <Fld label="Рост, см"><input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className={`${INP} w-full`} /></Fld>
              <Fld label="Вес, кг"><input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className={`${INP} w-full`} /></Fld>
              <Fld label="Грудь"><input type="number" step="0.5" value={breast} onChange={(e) => setBreast(e.target.value)} className={`${INP} w-full`} /></Fld>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={silicon} onChange={(e) => setSilicon(e.target.checked)} /> силикон</label>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> модель активна (видна на сайте)</label>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-mute mb-2">Фото · {media.filter((k) => !inactive.includes(k)).length}/{media.length} активны · перетащи для порядка</div>
            <div className="grid grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto">
              {media.map((k, idx) => {
                const off = inactive.includes(k);
                return (
                  <div key={k} draggable
                    onDragStart={() => { dragIdx.current = idx; }}
                    onDragOver={(e) => { e.preventDefault(); if (overIdx !== idx) setOverIdx(idx); }}
                    onDrop={(e) => { e.preventDefault(); const f = dragIdx.current; dragIdx.current = null; setOverIdx(null); if (f != null) reorder(f, idx); }}
                    onDragEnd={() => { dragIdx.current = null; setOverIdx(null); }}
                    className={`relative aspect-[3/4] rounded-md overflow-hidden border-2 ${overIdx === idx ? 'border-accent' : off ? 'border-red-500/40' : 'border-transparent'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaUrl(k)} alt="" onClick={(e) => { e.stopPropagation(); setLightbox(idx); }} className={`w-full h-full object-cover cursor-zoom-in ${off ? 'opacity-35 grayscale' : ''}`} />
                    {idx === 0 && <span className="absolute top-1 left-1 text-[8px] uppercase px-1 rounded bg-accent text-bg font-bold">обложка</span>}
                    <div className="absolute bottom-0 inset-x-0 flex justify-between bg-black/55 text-[10px]">
                      <button title={off ? 'включить' : 'выключить'} onClick={() => togglePhoto(k)} className="px-1.5 py-0.5 hover:bg-white/10">{off ? 'вкл' : 'выкл'}</button>
                      {idx !== 0 && <button title="сделать обложкой" onClick={() => makeCover(k)} className="px-1.5 py-0.5 hover:bg-white/10">★</button>}
                      <button title="удалить" onClick={() => removePhoto(k)} className="px-1.5 py-0.5 text-red-300 hover:bg-white/10">×</button>
                    </div>
                  </div>
                );
              })}
              {media.length === 0 && <div className="col-span-4 text-text-mute text-xs py-6 text-center">Фото нет</div>}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-start gap-2 p-4 border-t border-line">
          <button onClick={requestClose} className="px-4 py-2 text-sm text-text-mute border border-border rounded-full hover:bg-surface-2">Отмена</button>
          <button onClick={submit} disabled={saving} className="px-5 py-2 text-sm bg-accent text-bg font-semibold rounded-full disabled:opacity-50">{saving ? '…' : 'Сохранить'}</button>
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
