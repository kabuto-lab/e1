/**
 * WidgetView — рендер одного элемента ED (`CanvasElement → JSX`).
 *
 * Общий для редактора (`SandboxEditor.tsx`, mode='editor') и публичного
 * рендерера (`EdRenderer.tsx`, mode='render'). Единый источник вёрстки
 * виджетов — чтобы редактор и публичная страница не разъехались.
 *
 * Расхождение по mode — только в двух виджетах:
 *   - spacer: editor рисует размеченную пунктирную линию с подписью «Npx»,
 *     render — просто пустоту нужной высоты;
 *   - image без url: editor показывает плейсхолдер «выбрать изображение»,
 *     render — ничего (null).
 *
 * Контент-цвета (hex) намеренно литеральные — это style-guide контента,
 * не зависит от CSS-переменных темы админки.
 *
 * Без 'use client': чистая функция без хуков — рендерится и на сервере
 * (EdRenderer SSR), и на клиенте (SandboxEditor).
 */
import React from 'react';
import * as LucideIcons from 'lucide-react';
import type { CanvasElement } from './ed-types';
import type { Tenant } from '@/lib/tenants';
import { getBlockDef } from './block-registry';

export type WidgetViewMode = 'editor' | 'render';

/**
 * CSS-переменные темы NAS — нужны только для editor-only афформансов
 * (метка spacer, плейсхолдер пустой картинки). В render-режиме не участвуют.
 */
const CHROME = {
  line: 'rgb(var(--line))',
  bgElev: 'rgb(var(--bg-elev))',
  surface: 'rgb(var(--surface))',
  textMute: 'rgb(var(--text-mute))',
} as const;

/**
 * Φ4 — inline-edit пропс. Если передан в editor-mode, heading/text рендерятся
 * как contentEditable (двойной клик → курсор → пишешь → Enter/Esc/blur коммит).
 */
type InlineEditHandler = (updated: CanvasElement) => void;

/** Общий набор props для contentEditable элементов в editor-mode. */
function inlineEditAttrs(
  initialText: string,
  onCommit: (next: string) => void,
): {
  contentEditable: true;
  suppressContentEditableWarning: true;
  spellCheck: false;
  onBlur: (e: React.FocusEvent<HTMLElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
  children: string;
} {
  return {
    contentEditable: true,
    suppressContentEditableWarning: true,
    spellCheck: false,
    onBlur: (e) => {
      const next = (e.currentTarget.textContent ?? '').replace(/ /g, ' ');
      if (next !== initialText) onCommit(next);
    },
    onKeyDown: (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        (e.currentTarget as HTMLElement).blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        (e.currentTarget as HTMLElement).blur();
      }
    },
    children: initialText,
  };
}

export function WidgetView({
  el,
  mode = 'editor',
  tenant,
  onElementChange,
}: {
  el: CanvasElement;
  mode?: WidgetViewMode;
  /** Φ3: пробрасывается в Section preset RenderComponent для tenant-coupled рендера. */
  tenant?: Tenant;
  /** Φ4: callback для inline-edit; задаётся только в editor-mode. */
  onElementChange?: InlineEditHandler;
}): React.ReactElement | null {
  // Φ3 — section-preset: lookup в registry, делегируем RenderComponent.
  if (el.type === 'section-preset') {
    const def = el.sectionPreset ? getBlockDef(el.sectionPreset.presetId) : null;
    if (!def) {
      return (
        <div style={{ padding: 16, color: 'rgb(var(--red))', fontSize: 12, fontFamily: 'monospace' }}>
          Unknown section preset: {el.sectionPreset?.presetId ?? '<unset>'}
        </div>
      );
    }
    const Render = def.RenderComponent;
    return <Render props={el.sectionPreset!.props} mode={mode} tenant={tenant} />;
  }

  switch (el.type) {
    case 'heading': {
      const p = el.heading!;
      const style: React.CSSProperties = { textAlign: p.align, color: p.color, fontSize: p.fontSize, margin: 0, fontWeight: 700, lineHeight: 1.2, outline: 'none' };
      // Φ4: inline edit в editor-mode
      if (mode === 'editor' && onElementChange) {
        const attrs = inlineEditAttrs(p.text, (text) =>
          onElementChange({ ...el, heading: { ...p, text } }),
        );
        if (p.tag === 'h1') return <h1 style={style} {...attrs} />;
        if (p.tag === 'h3') return <h3 style={style} {...attrs} />;
        if (p.tag === 'h4') return <h4 style={style} {...attrs} />;
        return <h2 style={style} {...attrs} />;
      }
      if (p.tag === 'h1') return <h1 style={style}>{p.text}</h1>;
      if (p.tag === 'h3') return <h3 style={style}>{p.text}</h3>;
      if (p.tag === 'h4') return <h4 style={style}>{p.text}</h4>;
      return <h2 style={style}>{p.text}</h2>;
    }
    case 'text': {
      const p = el.text!;
      const style: React.CSSProperties = { textAlign: p.align, color: p.color, margin: 0, lineHeight: 1.7, fontSize: 15, outline: 'none' };
      if (mode === 'editor' && onElementChange) {
        return (
          <p
            style={style}
            {...inlineEditAttrs(p.content, (content) =>
              onElementChange({ ...el, text: { ...p, content } }),
            )}
          />
        );
      }
      return <p style={style}>{p.content}</p>;
    }
    case 'button': {
      const p = el.button!;
      const pad = { sm: '6px 14px', md: '10px 22px', lg: '14px 30px' };
      const fs  = { sm: 13, md: 15, lg: 17 };
      const styles: Record<string, React.CSSProperties> = {
        primary:   { background: '#00FFCC', color: '#0A0A0B', border: 'none' },
        secondary: { background: '#3A3D4C', color: '#F2EBD9', border: 'none' },
        outline:   { background: 'transparent', color: '#00FFCC', border: '2px solid #00FFCC' },
      };
      return (
        <div style={{ textAlign: p.align }}>
          <button style={{ ...styles[p.style], padding: pad[p.size], fontSize: fs[p.size], borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>{p.label}</button>
        </div>
      );
    }
    case 'divider': {
      const p = el.divider!;
      return <hr style={{ borderStyle: p.lineStyle, borderColor: p.color, borderWidth: `${p.weight}px 0 0 0`, margin: 0 }} />;
    }
    case 'spacer': {
      const p = el.spacer!;
      if (mode === 'render') return <div style={{ height: p.height }} />;
      return (
        <div style={{ height: p.height, display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%', borderTop: `1px dashed ${CHROME.line}`, position: 'relative' }}>
            <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: -9, background: CHROME.bgElev, padding: '0 8px', fontSize: 10, color: CHROME.textMute }}>{p.height}px</span>
          </div>
        </div>
      );
    }
    case 'icon-box': {
      const p = el.iconBox!;
      const IconComp = LucideIcons[p.icon] as React.ComponentType<{ size?: number; color?: string }>;
      return (
        <div style={{ display: 'flex', flexDirection: p.layout === 'top' ? 'column' : 'row', gap: 12 }}>
          <div>{IconComp && <IconComp size={36} color={p.iconColor} />}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#F2EBD9', marginBottom: 4 }}>{p.title}</div>
            <div style={{ color: '#C9C2B0', fontSize: 14, lineHeight: 1.5 }}>{p.description}</div>
          </div>
        </div>
      );
    }
    case 'cta': {
      const p = el.cta!;
      return (
        <div style={{ textAlign: p.align, padding: '16px 0' }}>
          <h3 style={{ color: '#F2EBD9', fontSize: 22, fontWeight: 700, marginBottom: 8, marginTop: 0 }}>{p.headline}</h3>
          <p style={{ color: '#9A958A', fontSize: 14, marginBottom: 18, marginTop: 0 }}>{p.description}</p>
          <button style={{ background: '#00FFCC', color: '#0A0A0B', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>{p.buttonText}</button>
        </div>
      );
    }
    case 'image': {
      const p = el.image;
      if (p?.url) {
        return <img src={p.url} alt={p.alt || ''} style={{ width: '100%', borderRadius: 8, display: 'block' }} />;
      }
      if (mode === 'render') return null;
      return (
        <div style={{ background: CHROME.surface, borderRadius: 8, aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: CHROME.textMute, gap: 8, border: `2px dashed ${CHROME.line}`, cursor: 'pointer' }}>
          <LucideIcons.Image size={28} />
          <span style={{ fontSize: 13 }}>Нажмите ПКМ → выбрать изображение</span>
        </div>
      );
    }
    case 'video-embed': {
      const p = el.videoEmbed!;
      if (!p.url) {
        if (mode === 'render') return null;
        return (
          <div style={{ background: CHROME.surface, borderRadius: 8, aspectRatio: p.aspectRatio || '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: CHROME.textMute, gap: 8, border: `2px dashed ${CHROME.line}` }}>
            <LucideIcons.Youtube size={28} />
            <span style={{ fontSize: 13 }}>ПКМ → задать URL видео</span>
          </div>
        );
      }
      const isYouTube = /youtube\.com|youtu\.be/.test(p.url);
      const isVimeo = /vimeo\.com/.test(p.url);
      const embedUrl = (() => {
        if (isYouTube) {
          // Extract video id
          const m = p.url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/);
          const id = m?.[1] ?? '';
          const params = new URLSearchParams({
            ...(p.autoplay && { autoplay: '1', mute: '1' }),
            ...(p.loop && { loop: '1', playlist: id }),
          });
          return `https://www.youtube.com/embed/${id}?${params.toString()}`;
        }
        if (isVimeo) {
          const m = p.url.match(/vimeo\.com\/(\d+)/);
          const id = m?.[1] ?? '';
          return `https://player.vimeo.com/video/${id}${p.autoplay ? '?autoplay=1&muted=1' : ''}${p.loop ? '&loop=1' : ''}`;
        }
        return null; // not YT/Vimeo — treat as direct mp4
      })();
      if (embedUrl) {
        return (
          <div style={{ position: 'relative', aspectRatio: p.aspectRatio || '16/9', width: '100%' }}>
            <iframe
              src={embedUrl}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, borderRadius: 8 }}
            />
          </div>
        );
      }
      // Direct video
      return (
        <video
          src={p.url}
          autoPlay={p.autoplay}
          loop={p.loop}
          muted={p.autoplay}
          controls={!p.autoplay}
          playsInline
          style={{ width: '100%', aspectRatio: p.aspectRatio || '16/9', objectFit: 'cover', borderRadius: 8, display: 'block' }}
        />
      );
    }
  }
  // section-preset handled at top of function via registry lookup — fallthrough only.
  return null;
}
