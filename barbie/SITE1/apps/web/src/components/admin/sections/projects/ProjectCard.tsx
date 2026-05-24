'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Project } from '@/lib/projects-data';
import {
  loadTokens,
  saveTokens,
  encodeTokensForPreview,
  type SavedTokens,
} from '@/lib/projects-storage';
import { TokenPopover, type PopoverRole } from './TokenPopover';

/**
 * ProjectCard — визитка тенанта с editable design tokens.
 *
 * Реплика `.pcard` из dashboard-2077.html. Поведение:
 *  - Клик на name/tagline/phones/ФОН → открывает TokenPopover для роли.
 *  - SVG-логотип → upload в data: URL (живёт в localStorage до /admin/media).
 *  - «Сохранить» → PATCH /v1/platform/tenants/:slug/design-tokens (+ cache).
 *  - «Превью» → открывает /{slug}?td=<base64> в новой вкладке.
 *
 * Source of truth — API `tenant_design_tokens`. localStorage — cache:
 *  показывает stale значения при network error, чтобы UI не пустел.
 */

interface Props {
  project: Project;
}

type LoadState = 'loading' | 'server' | 'cache' | 'defaults';
type SaveState = 'idle' | 'saving' | 'saved' | 'fail';

export function ProjectCard({ project }: Props) {
  const [saved, setSaved] = useState<SavedTokens>({});
  const [loadState, setLoadState] = useState<LoadState>('loading');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { tokens, fromServer } = await loadTokens(project.id, project.domain);
      if (cancelled) return;
      setSaved(tokens);
      if (fromServer) {
        setLoadState('server');
      } else if (Object.keys(tokens).length > 0) {
        setLoadState('cache');
      } else {
        setLoadState('defaults');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project.id, project.domain]);

  // Effective tokens = defaults ← saved.
  const tokens = useMemo(() => {
    return {
      bg:         saved.bg         ?? project.bg,
      headColor:  saved.headColor  ?? project.headColor,
      headFont:   saved.headFont   ?? project.headFont,
      accColor:   saved.accColor   ?? project.accColor,
      accFont:    saved.accFont    ?? project.accFont,
      bodyColor:  saved.bodyColor  ?? project.bodyColor,
      bodyFont:   saved.bodyFont   ?? project.bodyFont,
      logo:       saved.logo,
    };
  }, [project, saved]);

  // Popover state.
  const [popRole, setPopRole] = useState<PopoverRole | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  function openPop(role: PopoverRole, ev: React.MouseEvent<HTMLElement>): void {
    ev.stopPropagation();
    setAnchor(ev.currentTarget);
    setPopRole(role);
  }
  function closePop(): void {
    setAnchor(null);
    setPopRole(null);
  }

  function setToken<K extends keyof SavedTokens>(key: K, val: SavedTokens[K]): void {
    setSaved((prev) => ({ ...prev, [key]: val }));
  }

  function onColor(hex: string): void {
    if (popRole === 'bg')   setToken('bg', hex);
    if (popRole === 'head') setToken('headColor', hex);
    if (popRole === 'acc')  setToken('accColor', hex);
    if (popRole === 'body') setToken('bodyColor', hex);
  }
  function onFont(font: string): void {
    if (popRole === 'head') setToken('headFont', font);
    if (popRole === 'acc')  setToken('accFont', font);
    if (popRole === 'body') setToken('bodyFont', font);
  }

  // Logo upload (SVG only).
  const logoInputRef = useRef<HTMLInputElement>(null);
  function onLogoFile(e: React.ChangeEvent<HTMLInputElement>): void {
    const f = e.target.files?.[0];
    if (!f) return;
    const isSvg = /\.svg$/i.test(f.name) || f.type === 'image/svg+xml';
    if (!isSvg) {
      window.alert('Только SVG. Загрузите файл с расширением .svg');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = String(ev.target?.result ?? '');
      if (src) setToken('logo', src);
    };
    reader.readAsDataURL(f);
  }

  // Save → API.
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  async function onSave(): Promise<void> {
    setSaveState('saving');
    setSaveError(null);
    const res = await saveTokens(
      project.id,
      {
        bg: tokens.bg,
        headColor: tokens.headColor,
        headFont: tokens.headFont,
        accColor: tokens.accColor,
        accFont: tokens.accFont,
        bodyColor: tokens.bodyColor,
        bodyFont: tokens.bodyFont,
        logo: tokens.logo,
      },
      project.domain,
    );
    if (res.ok) {
      setSaveState('saved');
      if (res.tokens) setSaved(res.tokens);
      setLoadState('server');
    } else {
      setSaveState('fail');
      setSaveError(res.error ?? null);
    }
    window.setTimeout(() => setSaveState('idle'), 1800);
  }

  // Preview → open public site with ?td=base64 if overrides exist.
  function onPreview(): void {
    const hasOverrides = Object.keys(saved).length > 0;
    let url = project.site;
    if (hasOverrides) {
      const b64 = encodeTokensForPreview({
        bg: tokens.bg,
        headColor: tokens.headColor,
        headFont: tokens.headFont,
        accColor: tokens.accColor,
        accFont: tokens.accFont,
        bodyColor: tokens.bodyColor,
        bodyFont: tokens.bodyFont,
        logo: tokens.logo,
      });
      url += (url.includes('?') ? '&' : '?') + 'td=' + b64;
    }
    window.open(url, '_blank', 'noopener');
  }

  // Popover anchor color/font hints.
  const popColor = (() => {
    if (popRole === 'bg')   return tokens.bg;
    if (popRole === 'head') return tokens.headColor;
    if (popRole === 'acc')  return tokens.accColor;
    if (popRole === 'body') return tokens.bodyColor;
    return '#888888';
  })();
  const popFont = (() => {
    if (popRole === 'head') return tokens.headFont;
    if (popRole === 'acc')  return tokens.accFont;
    if (popRole === 'body') return tokens.bodyFont;
    return undefined;
  })();

  // Suppress hydration mismatch on the bg layer: paint defaults during initial
  // server render, switch to loaded tokens after first client paint.
  const previewStyle: React.CSSProperties = {
    background: loadState === 'loading' ? project.bg : tokens.bg,
  };

  const statusLabel =
    loadState === 'loading' ? 'LOADING…'
    : loadState === 'server' ? 'LIVE'
    : loadState === 'cache' ? 'CACHED'
    : 'DRAFT';

  return (
    <>
      <div className="bg-surface border border-line rounded-xl overflow-hidden flex flex-col hover:border-line-strong transition-colors">
        {/* preview area — paints with tenant's tokens */}
        <div className="relative p-[18px] min-h-[170px] flex flex-col gap-2 overflow-hidden" style={previewStyle}>
          {/* gradient overlay at bottom */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,.18))' }} />

          {/* top-left: BG button (opens bg popover) */}
          <button
            onClick={(e) => openPop('bg', e)}
            className="absolute top-3 left-3 z-[2] inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[.08em] uppercase text-white/55 hover:text-white/90 bg-black/30 border border-transparent hover:border-white/40 px-2 py-[3px] rounded-full transition-all"
            title="Цвет фона"
          >
            <span className="inline-block w-2.5 h-2.5 rounded-full border border-white/40" style={{ background: tokens.bg }} />
            ФОН
          </button>

          {/* top-right: domain pill */}
          <span className="absolute top-3 right-3 z-[2] font-mono text-[10px] tracking-[.06em] text-white/55 bg-black/30 px-2 py-[3px] rounded-full pointer-events-none">
            {project.domain}
          </span>

          {/* headline: logo + name */}
          <div className="flex items-center gap-2.5 relative z-[1]">
            <label className="relative w-[38px] h-[38px] rounded-[9px] bg-black/20 border border-transparent hover:border-dashed hover:border-white/70 hover:bg-white/10 flex items-center justify-center overflow-hidden cursor-pointer flex-shrink-0 transition-colors group/logo" title="Загрузить SVG-логотип">
              {tokens.logo ? (
                <img src={tokens.logo} alt={project.name} className="w-full h-full object-contain" />
              ) : (
                <span className="text-white/45 group-hover/logo:text-white/85 transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </span>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept=".svg,image/svg+xml"
                onChange={onLogoFile}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>

            <button
              onClick={(e) => openPop('head', e)}
              className="relative z-[1] text-[22px] font-extrabold leading-[1.05] tracking-[-.01em] m-0 cursor-pointer hover:outline hover:outline-1 hover:outline-dashed hover:outline-offset-4 hover:opacity-90 transition-opacity bg-transparent border-0 text-left"
              style={{ color: tokens.headColor, fontFamily: `'${tokens.headFont}', sans-serif` }}
              title="Цвет и шрифт заголовка"
            >
              {project.name}
            </button>
          </div>

          {/* tagline */}
          <button
            onClick={(e) => openPop('acc', e)}
            className="relative z-[1] text-[13px] italic leading-[1.3] m-0 cursor-pointer hover:outline hover:outline-1 hover:outline-dashed hover:outline-offset-4 hover:opacity-90 transition-opacity bg-transparent border-0 text-left self-start"
            style={{ color: tokens.accColor, fontFamily: `'${tokens.accFont}', sans-serif` }}
            title="Цвет и шрифт подзаголовка"
          >
            {project.tagline}
          </button>

          {/* phones — pushed to bottom */}
          <button
            onClick={(e) => openPop('body', e)}
            className="mt-auto relative z-[1] text-[12px] pt-2 cursor-pointer hover:outline hover:outline-1 hover:outline-dashed hover:outline-offset-4 hover:opacity-90 transition-opacity bg-transparent border-0 text-left flex flex-col gap-[2px] self-start"
            style={{ color: tokens.bodyColor, fontFamily: `'${tokens.bodyFont}', sans-serif` }}
            title="Цвет и шрифт телефонов"
          >
            {project.phones.map((ph) => (
              <span key={ph}>{ph}</span>
            ))}
          </button>
        </div>

        {/* footer */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-bg-elev border-t border-line">
          <span
            className="font-mono text-[10px] tracking-widest text-text-mute"
            title={
              loadState === 'cache'
                ? 'Показ из локального кэша (API недоступен)'
                : loadState === 'server'
                ? 'Загружено из tenant_design_tokens'
                : loadState === 'loading'
                ? 'Запрос к API…'
                : 'Defaults (тенант не найден в БД)'
            }
          >
            {project.id.toUpperCase()} · {statusLabel}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onPreview}
              className="inline-flex items-center gap-1 font-mono text-[10px] tracking-widest text-text-dim hover:text-text bg-transparent border border-line hover:border-line-strong px-2.5 py-1 rounded-md transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Превью
            </button>
            <button
              onClick={onSave}
              disabled={saveState === 'saving' || saveState === 'saved'}
              title={saveState === 'fail' && saveError ? saveError : undefined}
              className={`inline-flex items-center gap-1 font-mono text-[10px] tracking-widest px-2.5 py-1 rounded-md border transition-colors ${
                saveState === 'saved'
                  ? 'text-green border-green/50 bg-green/10'
                  : saveState === 'fail'
                  ? 'text-red border-red/50 bg-red/10'
                  : saveState === 'saving'
                  ? 'text-text-mute border-line cursor-wait'
                  : 'text-text-dim hover:text-text border-line hover:border-line-strong'
              }`}
            >
              {saveState === 'saving' ? (
                'Сохраняю…'
              ) : saveState === 'saved' ? (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Сохранено
                </>
              ) : saveState === 'fail' ? (
                'Ошибка'
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Сохранить
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* popover */}
      {popRole && (
        <TokenPopover
          anchor={anchor}
          role={popRole}
          color={popColor}
          font={popFont}
          bgPreview={tokens.bg}
          onColorChange={onColor}
          onFontChange={onFont}
          onClose={closePop}
        />
      )}
    </>
  );
}
