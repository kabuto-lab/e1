/**
 * ED-editor pure helpers + shared <Label> leaf.
 * Element/section defaults, panel positioning, padding shorthand parsing.
 */
import React from 'react';
import type { WidgetType, CanvasElement, Section } from '../ed-types';
import { C } from './editor-constants';
import { getBlockDef } from '../block-registry';

export const uid = () => Math.random().toString(36).slice(2, 9);

export function newElement(type: WidgetType, opts?: { presetId?: string }): CanvasElement {
  const id = uid();
  switch (type) {
    case 'heading':
      return { id, type, heading:  { text: 'Заголовок', tag: 'h2', align: 'left', color: '#F2EBD9', fontSize: 32 } };
    case 'text':
      return { id, type, text:     { content: 'Введите текст здесь. Нажмите чтобы редактировать.', align: 'left', color: '#C9C2B0' } };
    case 'button':
      return { id, type, button:   { label: 'Нажми меня', align: 'left', style: 'primary', size: 'md' } };
    case 'divider':
      return { id, type, divider:  { lineStyle: 'solid', color: '#3A3D4C', weight: 1 } };
    case 'spacer':
      return { id, type, spacer:   { height: 40 } };
    case 'icon-box':
      return { id, type, iconBox:  { icon: 'Star', title: 'Icon Box', description: 'Описание блока с иконкой.', iconColor: '#00FFCC', layout: 'top' } };
    case 'cta':
      return { id, type, cta:      { headline: 'Призыв к действию', description: 'Опишите ваше предложение кратко.', buttonText: 'Узнать больше', align: 'center' } };
    case 'image':
      return { id, type, image: {} };
    case 'video-embed':
      return {
        id,
        type,
        videoEmbed: { url: '', autoplay: false, loop: false, aspectRatio: '16/9' },
      };
    case 'section-preset': {
      const presetId = opts?.presetId ?? 'hero';
      // Φ6: для standalone-presets c defaultProps — копируем их в новый элемент.
      const def = getBlockDef(presetId);
      const props: Record<string, unknown> = def?.defaultProps ? { ...def.defaultProps } : {};
      return {
        id,
        type,
        sectionPreset: { presetId, props },
      };
    }
  }
}

export function newSection(cols: number): Section {
  const span = Math.floor(12 / cols);
  return {
    id: uid(),
    padding: '40px 24px',
    columns: Array.from({ length: cols }, () => ({ id: uid(), span, elements: [] })),
  };
}

/** Floating-panel positioning that keeps the 300×PANEL_MAX_H panel inside viewport.
 *  PANEL_MAX_H — динамический потолок, должен СОВПАДАТЬ с maxHeight в
 *  FloatingPropsPanel (иначе clamp обманет, и панель уйдёт за низ экрана). */
export const PANEL_MAX_H_VH = 0.7; // 70vh — пересчитывается из window.innerHeight
export const PANEL_MAX_H_CAP = 640; // абсолютный потолок: не больше 640px даже на 4K
export function getPanelMaxHeight(): number {
  if (typeof window === 'undefined') return PANEL_MAX_H_CAP;
  return Math.min(Math.round(window.innerHeight * PANEL_MAX_H_VH), PANEL_MAX_H_CAP);
}
export const PANEL_WIDTH = 400;
export function computePanelPos(e: React.MouseEvent): { x: number; y: number } {
  const margin = 16;
  const panelW = PANEL_WIDTH;
  const panelH = getPanelMaxHeight();
  let x = e.clientX + 10;
  let y = e.clientY - 10;
  if (x + panelW > window.innerWidth - margin) x = e.clientX - panelW - 10;
  if (y + panelH > window.innerHeight - margin) y = window.innerHeight - panelH - margin;
  if (y < 60) y = 60;
  return { x, y };
}

/** Parse CSS-shorthand padding ("40px 24px" / "8px 32px 56px" / "10px") → [t, r, b, l]. */
export function parsePadding(s: string): [number, number, number, number] {
  const parts = s.trim().split(/\s+/).map((p) => parseInt(p, 10) || 0);
  if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
  if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
  if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]];
  return [parts[0], parts[1], parts[2], parts[3]];
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        color: C.textMute,
        fontWeight: 600,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        marginBottom: 5,
      }}
    >
      {children}
    </div>
  );
}
