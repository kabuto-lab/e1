'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AppWindow,
  CalendarCheck,
  ChevronDown,
  HelpCircle,
  MessageCircle,
  PanelBottom,
  PhoneCall,
  Send,
  type LucideIcon,
} from 'lucide-react';
import type { Project } from '@/lib/projects-data';
import { ProjectCard } from './ProjectCard';
import {
  loadDraft,
  saveDraft,
  type SalonDraft,
  type TouchpointKey,
  type TouchpointConfig,
} from '@/lib/salon-draft';

/**
 * SalonColumn — одна колонка TweetDeck-раскладки /admin/projects.
 *
 * Сверху вниз:
 *  1. ProjectCard — визитка тенанта (design tokens, API-backed).
 *  2. 5 квадратных кнопок быстрых действий (per-salon).
 *  3. SEO-секция главной (meta title + description) — draft в localStorage.
 *  4. Аккордеон «Услуги» — заголовок + редактируемый текст внутри.
 *
 * SEO/услуги пока persist в localStorage (DRAFT MODE). См. salon-draft.ts.
 */

interface Props {
  project: Project;
}

/* ──────────────────  Тонировка деки в цвета тенанта  ─────────────────── */

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.trim().replace('#', '');
  if (m.length === 3) {
    return { r: parseInt(m[0] + m[0], 16), g: parseInt(m[1] + m[1], 16), b: parseInt(m[2] + m[2], 16) };
  }
  if (m.length === 6) {
    return { r: parseInt(m.slice(0, 2), 16), g: parseInt(m.slice(2, 4), 16), b: parseInt(m.slice(4, 6), 16) };
  }
  return null;
}

/** Хроматичность (max−min каналов): 0 у чёрного/белого/серого, высокая у насыщенных. */
function chroma(hex: string): number {
  const c = hexToRgb(hex);
  if (!c) return 0;
  return Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
}

function rgba(hex: string, a: number): string {
  const c = hexToRgb(hex);
  if (!c) return `rgba(0,0,0,${a})`;
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`;
}

/**
 * Самый «брендовый» цвет тенанта для тонировки деки — наиболее хроматичный
 * из акцента / заголовка / фона. Так у barbie берётся розовый #FF1493
 * (а не белый акцент), у pentagon — красный, у roxy — циан и т.д.
 */
function brandColor(p: Project): string {
  return [p.accColor, p.headColor, p.bg].reduce((best, cur) =>
    chroma(cur) > chroma(best) ? cur : best,
  );
}

export function SalonColumn({ project }: Props) {
  const brand = brandColor(project);
  return (
    <div
      className="w-full flex flex-col gap-2 min-w-0 rounded-2xl p-2.5"
      style={{
        // Фон-мат, объединяющий все карточки деки в цвет тенанта: насыщеннее
        // сверху, мягкий хвост до низа — тенантовый оттенок держится по всей колонке.
        background: `linear-gradient(180deg, ${rgba(brand, 0.18)} 0%, ${rgba(brand, 0.06)} 45%, ${rgba(brand, 0.035)} 100%)`,
        border: `1px solid ${rgba(brand, 0.28)}`,
        borderTop: `3px solid ${brand}`,
      }}
    >
      <ProjectCard project={project} />
      <Touchpoints project={project} />
      <SeoSection project={project} />
      <ServicesAccordion project={project} />
    </div>
  );
}

/* ───────────────────────────  Точки касания  ──────────────────────────── */

interface TouchpointMeta {
  key: TouchpointKey;
  icon: LucideIcon;
  /** короткая подпись под иконкой */
  short: string;
  /** заголовок панели — где живёт точка на сайте */
  title: string;
  /** подпись поля «цель» */
  valueLabel: string;
  valuePlaceholder: string;
  /** дефолтный текст CTA */
  defaultLabel: string;
}

// Ряд 1 — CTA-точки на публичном сайте. Ряд 2 — интерактив (квиз/попап).
const ROW_1: TouchpointMeta[] = [
  { key: 'booking', icon: CalendarCheck, short: 'Запись', title: 'Хедер / записаться', valueLabel: 'Куда ведёт (ссылка / якорь)', valuePlaceholder: '#booking', defaultLabel: 'Записаться' },
  { key: 'operator', icon: MessageCircle, short: 'Оператор', title: '«Написать оператору» — в теле сайта', valueLabel: 'Чат / мессенджер (ссылка)', valuePlaceholder: 'https://t.me/operator', defaultLabel: 'Написать оператору' },
  { key: 'footer', icon: PanelBottom, short: 'Футер', title: 'CTA в футере сайта', valueLabel: 'Куда ведёт (ссылка / якорь)', valuePlaceholder: '#footer-cta', defaultLabel: 'Связаться' },
  { key: 'callWidget', icon: PhoneCall, short: 'Call', title: 'Плавающий call-виджет (угол сайта)', valueLabel: 'Телефон', valuePlaceholder: '+7 (495) 000-00-00', defaultLabel: 'Позвонить' },
  { key: 'telegram', icon: Send, short: 'TG', title: 'Telegram', valueLabel: 'Telegram (@username / ссылка)', valuePlaceholder: '@salon', defaultLabel: 'Telegram' },
];
const ROW_2: TouchpointMeta[] = [
  { key: 'quiz', icon: HelpCircle, short: 'Квиз', title: 'Квиз-подбор услуги', valueLabel: 'Ссылка / якорь квиза', valuePlaceholder: '#quiz', defaultLabel: 'Подобрать' },
  { key: 'popup', icon: AppWindow, short: 'Попап', title: 'Всплывающее окно (попап)', valueLabel: 'Триггер / ссылка', valuePlaceholder: 'timer:15s', defaultLabel: 'Спецпредложение' },
];

const DEFAULT_TP: TouchpointConfig = { enabled: false, label: '', value: '' };
const ALL_TP: TouchpointMeta[] = [...ROW_1, ...ROW_2];

interface AnchorRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function Touchpoints({ project }: Props) {
  const [draft, setDraft] = useState<SalonDraft>(() => loadDraft(project.id));
  const [openKey, setOpenKey] = useState<TouchpointKey | null>(null);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const flashTimer = useRef<number | null>(null);

  useEffect(() => {
    setDraft(loadDraft(project.id));
    setOpenKey(null);
    setAnchor(null);
  }, [project.id]);

  const cfg = (openKey && draft.touchpoints[openKey]) || DEFAULT_TP;
  const meta = ALL_TP.find((m) => m.key === openKey) ?? null;

  function onButtonClick(m: TouchpointMeta, e: React.MouseEvent<HTMLButtonElement>) {
    if (openKey === m.key) {
      setOpenKey(null);
      setAnchor(null);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    setAnchor({ left: r.left, top: r.top, width: r.width, height: r.height });
    setOpenKey(m.key);
  }

  // Сохраняем точку в черновик на каждое изменение — без потери при уходе.
  function patch(next: Partial<TouchpointConfig>) {
    if (!openKey) return;
    setDraft((prev) => {
      const np = {
        ...prev,
        touchpoints: {
          ...prev.touchpoints,
          [openKey]: { ...DEFAULT_TP, ...prev.touchpoints[openKey], ...next },
        },
      };
      saveDraft(project.id, np);
      return np;
    });
  }
  function flashSaved() {
    setSavedFlash(true);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setSavedFlash(false), 1400);
  }

  function renderButton(m: TouchpointMeta) {
    const on = draft.touchpoints[m.key]?.enabled ?? false;
    const active = openKey === m.key;
    const Icon = m.icon;
    return (
      <button
        key={m.key}
        type="button"
        title={m.title}
        onClick={(e) => onButtonClick(m, e)}
        className={`relative aspect-square flex flex-col items-center justify-center gap-1 rounded-lg border transition-colors ${
          active
            ? 'border-gold/70 bg-gold/10 text-gold'
            : on
            ? 'border-gold/30 bg-surface text-text'
            : 'border-line bg-surface text-text-dim hover:text-text hover:border-line-strong'
        }`}
      >
        {/* индикатор вкл/выкл */}
        <span
          className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${on ? 'bg-gold' : 'bg-line-strong'}`}
        />
        <Icon size={17} strokeWidth={1.8} />
        <span className="font-mono text-[8.5px] tracking-[.04em] uppercase leading-none">{m.short}</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-5 gap-2">{ROW_1.map(renderButton)}</div>
      {/* Ряд 2 — интерактив; место под будущие точки. */}
      <div className="grid grid-cols-5 gap-2">{ROW_2.map(renderButton)}</div>

      {meta && anchor && (
        <TouchpointPopover
          anchor={anchor}
          meta={meta}
          cfg={cfg}
          savedFlash={savedFlash}
          onPatch={patch}
          onFlash={flashSaved}
          onClose={() => {
            setOpenKey(null);
            setAnchor(null);
          }}
        />
      )}
    </div>
  );
}

/* Попап точки касания — всплывает у кликнутой кнопки (как редактор в /admin/models). */
function TouchpointPopover({
  anchor,
  meta,
  cfg,
  savedFlash,
  onPatch,
  onFlash,
  onClose,
}: {
  anchor: AnchorRect;
  meta: TouchpointMeta;
  cfg: TouchpointConfig;
  savedFlash: boolean;
  onPatch: (next: Partial<TouchpointConfig>) => void;
  onFlash: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Левый-верхний угол попапа совпадает с левым-верхним углом нажатой кнопки
  // (с зажимом в пределах вьюпорта, чтобы не уезжал за край).
  const W = 252;
  const EST_H = 220;
  const left = Math.max(8, Math.min(anchor.left - 20, window.innerWidth - W - 8));
  const top = Math.max(8, Math.min(anchor.top - 20, window.innerHeight - EST_H - 8));

  return (
    <>
      {/* backdrop для закрытия по клику вне */}
      <div className="fixed inset-0 z-[90]" onClick={onClose} />
      <div
        className="fixed z-[91] rounded-xl bg-bg-elev border border-gold/40 shadow-2xl p-3 flex flex-col gap-2.5"
        style={{ left, top, width: W }}
      >
        <div className="flex items-center gap-2">
          {/* красный круглый крестик «закрыть» — слева от заголовка */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="shrink-0 w-5 h-5 rounded-full bg-red text-white flex items-center justify-center hover:brightness-110"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          <span className="flex-1 text-[11.5px] font-semibold text-text leading-tight">{meta.title}</span>
          <span
            className={`font-mono text-[9px] tracking-widest uppercase transition-opacity mt-0.5 ${
              savedFlash ? 'opacity-100 text-green' : 'opacity-0'
            }`}
          >
            сохранено
          </span>
        </div>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-[11.5px] text-text-dim">Показывать на сайте</span>
          <button
            type="button"
            role="switch"
            aria-checked={cfg.enabled}
            onClick={() => {
              onPatch({ enabled: !cfg.enabled });
              onFlash();
            }}
            className={`relative w-9 h-5 rounded-full transition-colors ${cfg.enabled ? 'bg-gold' : 'bg-line-strong'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-bg-elev transition-transform ${
                cfg.enabled ? 'translate-x-4' : ''
              }`}
            />
          </button>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] text-text-dim">Текст</span>
          <input
            type="text"
            autoFocus
            value={cfg.label}
            onChange={(e) => onPatch({ label: e.target.value })}
            onBlur={onFlash}
            placeholder={meta.defaultLabel}
            className="w-full bg-surface border border-line rounded-md px-2.5 py-1.5 text-[12px] text-text placeholder:text-text-mute/60 focus:border-gold/60 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] text-text-dim">{meta.valueLabel}</span>
          <input
            type="text"
            value={cfg.value}
            onChange={(e) => onPatch({ value: e.target.value })}
            onBlur={onFlash}
            placeholder={meta.valuePlaceholder}
            className="w-full bg-surface border border-line rounded-md px-2.5 py-1.5 text-[12px] text-text placeholder:text-text-mute/60 focus:border-gold/60 focus:outline-none"
          />
        </label>
      </div>
    </>
  );
}

/* ─────────────────────────────  SEO section  ──────────────────────────── */

const TITLE_MAX = 60;
const DESC_MAX = 160;

function SeoSection({ project }: Props) {
  const [draft, setDraft] = useState<SalonDraft>(() => loadDraft(project.id));
  const [savedFlash, setSavedFlash] = useState(false);
  const flashTimer = useRef<number | null>(null);

  useEffect(() => {
    setDraft(loadDraft(project.id));
  }, [project.id]);

  function flashSaved() {
    setSavedFlash(true);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setSavedFlash(false), 1400);
  }

  // Сохраняем в черновик на каждое изменение — нечаянный уход не теряет данные.
  function update<K extends keyof SalonDraft>(key: K, val: SalonDraft[K]) {
    setDraft((prev) => {
      const next = { ...prev, [key]: val };
      saveDraft(project.id, next);
      return next;
    });
  }

  return (
    <section className="rounded-xl bg-surface border border-line p-3 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[.12em] uppercase text-text-mute">
          SEO · главная
        </span>
        <span
          className={`font-mono text-[9px] tracking-widest uppercase transition-opacity ${
            savedFlash ? 'opacity-100 text-green' : 'opacity-0'
          }`}
        >
          сохранено
        </span>
      </div>

      <label className="flex flex-col gap-1">
        <span className="flex items-center justify-between text-[10.5px] text-text-dim">
          Title
          <span className={`font-mono text-[9px] ${draft.seoTitle.length > TITLE_MAX ? 'text-red' : 'text-text-mute'}`}>
            {draft.seoTitle.length}/{TITLE_MAX}
          </span>
        </span>
        <input
          type="text"
          value={draft.seoTitle}
          onChange={(e) => update('seoTitle', e.target.value)}
          onBlur={flashSaved}
          placeholder={`${project.name} — массаж-салон, Москва`}
          className="w-full bg-bg-elev border border-line rounded-md px-2.5 py-1.5 text-[12px] text-text placeholder:text-text-mute/60 focus:border-gold/60 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="flex items-center justify-between text-[10.5px] text-text-dim">
          Description
          <span className={`font-mono text-[9px] ${draft.seoDescription.length > DESC_MAX ? 'text-red' : 'text-text-mute'}`}>
            {draft.seoDescription.length}/{DESC_MAX}
          </span>
        </span>
        <textarea
          value={draft.seoDescription}
          onChange={(e) => update('seoDescription', e.target.value)}
          onBlur={flashSaved}
          rows={3}
          placeholder="Короткое описание для поисковой выдачи…"
          className="w-full resize-none bg-bg-elev border border-line rounded-md px-2.5 py-1.5 text-[12px] leading-[1.45] text-text placeholder:text-text-mute/60 focus:border-gold/60 focus:outline-none"
        />
      </label>
    </section>
  );
}

/* ───────────────────────────  Услуги accordion  ───────────────────────── */

function ServicesAccordion({ project }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SalonDraft>(() => loadDraft(project.id));
  const [savedFlash, setSavedFlash] = useState(false);
  const flashTimer = useRef<number | null>(null);

  useEffect(() => {
    setDraft(loadDraft(project.id));
  }, [project.id]);

  function flashSaved() {
    setSavedFlash(true);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setSavedFlash(false), 1400);
  }

  return (
    <section className="rounded-xl bg-surface border border-line overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-bg-elev/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="font-mono text-[10px] tracking-[.12em] uppercase text-text-mute">
            Услуги
          </span>
          {savedFlash && (
            <span className="font-mono text-[9px] tracking-widest uppercase text-green">
              сохранено
            </span>
          )}
        </span>
        <ChevronDown
          size={15}
          className={`text-text-dim transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-3 pb-3 pt-0.5 border-t border-line">
          <textarea
            value={draft.services}
            onChange={(e) =>
              setDraft((prev) => {
                const next = { ...prev, services: e.target.value };
                saveDraft(project.id, next);
                return next;
              })
            }
            onBlur={flashSaved}
            rows={6}
            placeholder={'Описание услуг салона.\nКаждая услуга — с новой строки или абзацем.'}
            className="mt-2 w-full resize-y bg-bg-elev border border-line rounded-md px-2.5 py-2 text-[12px] leading-[1.5] text-text placeholder:text-text-mute/60 focus:border-gold/60 focus:outline-none"
          />
        </div>
      )}
    </section>
  );
}
