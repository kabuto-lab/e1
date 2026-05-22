'use client';

import React, { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as LucideIcons from 'lucide-react';
import { MediaPickerModal } from './MediaPickerStub';
import { WidgetView } from './WidgetView';
import {
  type WidgetType,
  type CanvasElement,
  type Column,
  type Section,
  defaultElStyle,
} from './ed-types';

// Модель документа (Section/Column/CanvasElement/*Props/ElStyle) вынесена
// в ./ed-types — единый контракт с публичным рендерером. Re-export ниже —
// чтобы внешние импортёры (admin/cms/*) тянули типы по-прежнему отсюда.
export * from './ed-types';

// ─── Types ────────────────────────────────────────────────────────────────────

type CategoryKey = 'textual' | 'buttons' | 'media' | 'icons' | 'structure' | 'interactive';
type DeviceMode = 'desktop' | 'tablet' | 'mobile';
type PanelTab = 'content' | 'style' | 'css';
interface FloatingPanel { x: number; y: number; kind: 'element' | 'section'; id: string; }
interface DropTarget { sectionId: string; columnId: string; index: number; }

// Imperative handle exposed via forwardRef.
// Parent (page wrapper) calls undo()/redo() from external toolbar
// and observes canUndo/canRedo via onHistoryChange callback.
export interface SandboxEditorHandle {
  undo: () => void;
  redo: () => void;
}

// ─── NAS palette (CSS vars resolved at render time) ──────────────────────────
// Chrome of the editor использует NAS-токены. CONTENT-defaults (newElement
// + WidgetView button/cta render-mappings) намеренно оставлены литералами:
// они персистятся / будут отрендерены публичным render'ером (без --vars).

const C = {
  bg:        'rgb(var(--bg))',
  bgElev:    'rgb(var(--bg-elev))',
  surface:   'rgb(var(--surface))',
  surface2:  'rgb(var(--surface-2))',
  line:      'rgb(var(--line))',
  lineStr:   'rgb(var(--line-strong))',
  text:      'rgb(var(--text))',
  textDim:   'rgb(var(--text-dim))',
  textMute:  'rgb(var(--text-mute))',
  gold:      'rgb(var(--gold))',
  accent:    'rgb(var(--accent-2))',
  accentSoft:'rgb(var(--accent-2) / 0.15)',
  accentLine:'rgb(var(--accent-2) / 0.33)',
  red:       'rgb(var(--red))',
  green:     'rgb(var(--green))',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

function newElement(type: WidgetType): CanvasElement {
  const id = uid();
  switch (type) {
    case 'heading':  return { id, type, heading:  { text: 'Заголовок', tag: 'h2', align: 'left', color: '#F2EBD9', fontSize: 32 } };
    case 'text':     return { id, type, text:     { content: 'Введите текст здесь. Нажмите чтобы редактировать.', align: 'left', color: '#C9C2B0' } };
    case 'button':   return { id, type, button:   { label: 'Нажми меня', align: 'left', style: 'primary', size: 'md' } };
    case 'divider':  return { id, type, divider:  { lineStyle: 'solid', color: '#3A3D4C', weight: 1 } };
    case 'spacer':   return { id, type, spacer:   { height: 40 } };
    case 'icon-box': return { id, type, iconBox:  { icon: 'Star', title: 'Icon Box', description: 'Описание блока с иконкой.', iconColor: '#00FFCC', layout: 'top' } };
    case 'cta':      return { id, type, cta:      { headline: 'Призыв к действию', description: 'Опишите ваше предложение кратко.', buttonText: 'Узнать больше', align: 'center' } };
    case 'image':    return { id, type, image: {} };
  }
}

function newSection(cols: number): Section {
  const span = Math.floor(12 / cols);
  return {
    id: uid(),
    padding: '40px 24px',
    columns: Array.from({ length: cols }, () => ({ id: uid(), span, elements: [] })),
  };
}

/** Позиционирование floating-панели: не вылезаем за viewport. */
function computePanelPos(e: React.MouseEvent): { x: number; y: number } {
  const margin = 16;
  const panelW = 300;
  const panelH = 460;
  let x = e.clientX + 10;
  let y = e.clientY - 10;
  if (x + panelW > window.innerWidth - margin) x = e.clientX - panelW - 10;
  if (y + panelH > window.innerHeight - margin) y = window.innerHeight - panelH - margin;
  if (y < 60) y = 60;
  return { x, y };
}

/** Парсит CSS-shorthand padding ("40px 24px" / "8px 32px 56px" / "10px") в [t,r,b,l]. */
function parsePadding(s: string): [number, number, number, number] {
  const parts = s.trim().split(/\s+/).map((p) => parseInt(p, 10) || 0);
  if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
  if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
  if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]];
  return [parts[0], parts[1], parts[2], parts[3]];
}

// ─── Widget data ──────────────────────────────────────────────────────────────

interface WidgetDef { type: WidgetType; icon: keyof typeof LucideIcons; name: string; }

const categoriesData: Record<CategoryKey, { title: string; icon: keyof typeof LucideIcons; items: WidgetDef[] }> = {
  textual:     { title: 'Текстовые элементы', icon: 'Text',              items: [{ type: 'heading', icon: 'Heading', name: 'Heading' }, { type: 'text', icon: 'Text', name: 'Text' }] },
  buttons:     { title: 'Кнопки и CTA',       icon: 'MousePointerClick', items: [{ type: 'button',  icon: 'MousePointerClick', name: 'Button' }, { type: 'cta', icon: 'Megaphone', name: 'CTA' }] },
  media:       { title: 'Медиа',              icon: 'Image',             items: [{ type: 'image',   icon: 'Image', name: 'Image' }] },
  icons:       { title: 'Иконки и боксы',     icon: 'Star',              items: [{ type: 'icon-box', icon: 'Package', name: 'Icon Box' }] },
  structure:   { title: 'Структура',          icon: 'LayoutDashboard',   items: [{ type: 'divider', icon: 'Minus', name: 'Divider' }, { type: 'spacer', icon: 'ArrowUpDown', name: 'Spacer' }] },
  interactive: { title: 'Интерактив',         icon: 'RotateCw',          items: [] },
};

const toolTiles: { key: CategoryKey; icon: keyof typeof LucideIcons; name: string }[] = [
  { key: 'textual',     icon: 'Text',              name: 'Текст'    },
  { key: 'buttons',     icon: 'MousePointerClick', name: 'Кнопки'   },
  { key: 'media',       icon: 'Image',             name: 'Медиа'    },
  { key: 'icons',       icon: 'Star',              name: 'Иконки'   },
  { key: 'structure',   icon: 'LayoutDashboard',   name: 'Структура'},
  { key: 'interactive', icon: 'RotateCw',          name: 'Интерактив'},
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = { width: '100%', background: C.bg, border: `1px solid ${C.line}`, borderRadius: 6, color: C.text, padding: '7px 10px', fontSize: 13, boxSizing: 'border-box' };
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

const topBtnStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: C.textDim, cursor: 'pointer', padding: '6px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s' };

const tbBtn: React.CSSProperties = {
  width: 32, height: 32,
  background: 'transparent',
  border: '1px solid transparent',
  borderRadius: 7,
  color: C.textMute,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.12s',
  flexShrink: 0,
  padding: 0,
};

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, color: C.textMute, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 5 }}>{children}</div>;
}

// ─── Widget Renderer ──────────────────────────────────────────────────────────
// WidgetView вынесен в ./WidgetView (общий рендерер виджета: редактор +
// публичный EdRenderer). Импортируется выше; режим по умолчанию — 'editor'.

// ─── Icon Picker ──────────────────────────────────────────────────────────────
// Компактный выбор lucide-иконки: превью текущей + фильтр-поиск + сетка.
// Object.keys(LucideIcons) фильтруется до PascalCase-имён без суффикса 'Icon'
// (исключаем алиасы и не-компонентные экспорты). Список режется до 48.

function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  const [q, setQ] = useState('');
  const Current = LucideIcons[value as keyof typeof LucideIcons] as
    | React.ComponentType<{ size?: number }>
    | undefined;
  const ql = q.trim().toLowerCase();
  const names = Object.keys(LucideIcons)
    .filter((k) => /^[A-Z]/.test(k) && !k.endsWith('Icon'))
    .filter((n) => (ql ? n.toLowerCase().includes(ql) : true))
    .slice(0, 48);
  return (
    <div>
      <Label>Иконка</Label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ width: 34, height: 34, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, border: `1px solid ${C.line}`, borderRadius: 6, color: C.accent }}>
          {Current && <Current size={18} />}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={value || 'поиск иконки…'} style={inputStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4, maxHeight: 132, overflowY: 'auto', padding: 4, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 6 }}>
        {names.map((n) => {
          const I = LucideIcons[n as keyof typeof LucideIcons] as React.ComponentType<{ size?: number }>;
          const sel = n === value;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              title={n}
              style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: sel ? C.accentSoft : 'transparent', border: `1px solid ${sel ? C.accentLine : 'transparent'}`, borderRadius: 5, color: sel ? C.accent : C.textDim, cursor: 'pointer' }}
            >
              {I && <I size={15} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Properties Panel ─────────────────────────────────────────────────────────

function PropertiesPanel({ el, onChange, onOpenMediaPicker }: { el: CanvasElement; onChange: (u: CanvasElement) => void; onOpenMediaPicker?: () => void }) {
  if (el.type === 'heading' && el.heading) {
    const p = el.heading;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><Label>Текст</Label><input value={p.text} onChange={e => onChange({ ...el, heading: { ...p, text: e.target.value } })} style={inputStyle} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><Label>Тег</Label>
            <select value={p.tag} onChange={e => onChange({ ...el, heading: { ...p, tag: e.target.value as any } })} style={selectStyle}>
              {['h1','h2','h3','h4'].map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
          </div>
          <div><Label>Выравнивание</Label>
            <select value={p.align} onChange={e => onChange({ ...el, heading: { ...p, align: e.target.value as any } })} style={selectStyle}>
              <option value="left">Левое</option><option value="center">Центр</option><option value="right">Правое</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><Label>Размер (px)</Label><input type="number" value={p.fontSize} min={12} max={120} onChange={e => onChange({ ...el, heading: { ...p, fontSize: +e.target.value } })} style={inputStyle} /></div>
          <div><Label>Цвет</Label><input type="color" value={p.color} onChange={e => onChange({ ...el, heading: { ...p, color: e.target.value } })} style={{ ...inputStyle, padding: 2, height: 36 }} /></div>
        </div>
      </div>
    );
  }

  if (el.type === 'text' && el.text) {
    const p = el.text;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><Label>Содержимое</Label><textarea value={p.content} rows={5} onChange={e => onChange({ ...el, text: { ...p, content: e.target.value } })} style={{ ...inputStyle, resize: 'vertical' }} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><Label>Выравнивание</Label>
            <select value={p.align} onChange={e => onChange({ ...el, text: { ...p, align: e.target.value as any } })} style={selectStyle}>
              <option value="left">Левое</option><option value="center">Центр</option><option value="right">Правое</option>
            </select>
          </div>
          <div><Label>Цвет</Label><input type="color" value={p.color} onChange={e => onChange({ ...el, text: { ...p, color: e.target.value } })} style={{ ...inputStyle, padding: 2, height: 36 }} /></div>
        </div>
      </div>
    );
  }

  if (el.type === 'button' && el.button) {
    const p = el.button;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><Label>Текст кнопки</Label><input value={p.label} onChange={e => onChange({ ...el, button: { ...p, label: e.target.value } })} style={inputStyle} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><Label>Стиль</Label>
            <select value={p.style} onChange={e => onChange({ ...el, button: { ...p, style: e.target.value as any } })} style={selectStyle}>
              <option value="primary">Primary</option><option value="secondary">Secondary</option><option value="outline">Outline</option>
            </select>
          </div>
          <div><Label>Размер</Label>
            <select value={p.size} onChange={e => onChange({ ...el, button: { ...p, size: e.target.value as any } })} style={selectStyle}>
              <option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option>
            </select>
          </div>
        </div>
        <div><Label>Выравнивание</Label>
          <select value={p.align} onChange={e => onChange({ ...el, button: { ...p, align: e.target.value as any } })} style={selectStyle}>
            <option value="left">Левое</option><option value="center">Центр</option><option value="right">Правое</option>
          </select>
        </div>
      </div>
    );
  }

  if (el.type === 'divider' && el.divider) {
    const p = el.divider;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><Label>Стиль</Label>
            <select value={p.lineStyle} onChange={e => onChange({ ...el, divider: { ...p, lineStyle: e.target.value as any } })} style={selectStyle}>
              <option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option>
            </select>
          </div>
          <div><Label>Толщина (px)</Label><input type="number" value={p.weight} min={1} max={10} onChange={e => onChange({ ...el, divider: { ...p, weight: +e.target.value } })} style={inputStyle} /></div>
        </div>
        <div><Label>Цвет</Label><input type="color" value={p.color} onChange={e => onChange({ ...el, divider: { ...p, color: e.target.value } })} style={{ ...inputStyle, padding: 2, height: 36 }} /></div>
      </div>
    );
  }

  if (el.type === 'spacer' && el.spacer) {
    const p = el.spacer;
    return <div><Label>Высота (px)</Label><input type="number" value={p.height} min={10} max={500} onChange={e => onChange({ ...el, spacer: { ...p, height: +e.target.value } })} style={inputStyle} /></div>;
  }

  if (el.type === 'icon-box' && el.iconBox) {
    const p = el.iconBox;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><Label>Заголовок</Label><input value={p.title} onChange={e => onChange({ ...el, iconBox: { ...p, title: e.target.value } })} style={inputStyle} /></div>
        <div><Label>Описание</Label><textarea value={p.description} rows={3} onChange={e => onChange({ ...el, iconBox: { ...p, description: e.target.value } })} style={{ ...inputStyle, resize: 'vertical' }} /></div>
        <IconPicker
          value={p.icon}
          onChange={(icon) => onChange({ ...el, iconBox: { ...p, icon: icon as keyof typeof LucideIcons } })}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><Label>Расположение</Label>
            <select value={p.layout} onChange={e => onChange({ ...el, iconBox: { ...p, layout: e.target.value as any } })} style={selectStyle}>
              <option value="top">Сверху</option><option value="left">Слева</option>
            </select>
          </div>
          <div><Label>Цвет иконки</Label><input type="color" value={p.iconColor} onChange={e => onChange({ ...el, iconBox: { ...p, iconColor: e.target.value } })} style={{ ...inputStyle, padding: 2, height: 36 }} /></div>
        </div>
      </div>
    );
  }

  if (el.type === 'cta' && el.cta) {
    const p = el.cta;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><Label>Заголовок</Label><input value={p.headline} onChange={e => onChange({ ...el, cta: { ...p, headline: e.target.value } })} style={inputStyle} /></div>
        <div><Label>Описание</Label><textarea value={p.description} rows={3} onChange={e => onChange({ ...el, cta: { ...p, description: e.target.value } })} style={{ ...inputStyle, resize: 'vertical' }} /></div>
        <div><Label>Текст кнопки</Label><input value={p.buttonText} onChange={e => onChange({ ...el, cta: { ...p, buttonText: e.target.value } })} style={inputStyle} /></div>
        <div><Label>Выравнивание</Label>
          <select value={p.align} onChange={e => onChange({ ...el, cta: { ...p, align: e.target.value as any } })} style={selectStyle}>
            <option value="left">Левое</option><option value="center">Центр</option><option value="right">Правое</option>
          </select>
        </div>
      </div>
    );
  }

  if (el.type === 'image') {
    const p = el.image ?? {};
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {p.url ? (
          <div>
            <img src={p.url} alt={p.alt || ''} style={{ width: '100%', borderRadius: 6, marginBottom: 8, display: 'block' }} />
            <button onClick={onOpenMediaPicker} style={{ width: '100%', background: C.surface2, border: `1px solid ${C.line}`, color: C.textDim, borderRadius: 6, padding: '7px 0', cursor: 'pointer', fontSize: 12 }}>
              Заменить изображение
            </button>
          </div>
        ) : (
          <button onClick={onOpenMediaPicker} style={{ width: '100%', background: C.surface2, border: `2px dashed ${C.line}`, color: C.textDim, borderRadius: 8, padding: '16px 0', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <LucideIcons.Image size={16} /> Выбрать из медиатеки
          </button>
        )}
        <div>
          <Label>Alt текст</Label>
          <input value={p.alt || ''} onChange={e => onChange({ ...el, image: { ...p, alt: e.target.value } })} style={inputStyle} placeholder="Описание изображения" />
        </div>
      </div>
    );
  }

  return <div style={{ color: C.textMute, fontSize: 12, textAlign: 'center', padding: 20 }}>Нет свойств</div>;
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────

function DropZone({ isActive, isEmpty, onDragOver, onDrop }: {
  isActive?: boolean; isEmpty?: boolean;
  onDragOver: (e: React.DragEvent) => void; onDrop: (e: React.DragEvent) => void;
}) {
  return (
    <div onDragOver={onDragOver} onDrop={onDrop} style={{
      height: isActive ? 44 : isEmpty ? 64 : 6,
      background: isActive ? 'rgb(var(--accent-2) / 0.12)' : 'transparent',
      border: isActive ? `2px dashed ${C.accent}` : isEmpty ? `2px dashed ${C.line}` : 'none',
      borderRadius: 6, margin: '2px 0', display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.12s', color: isActive ? C.accent : C.textMute, fontSize: 12,
    }}>
      {isEmpty && !isActive && '+ перетащи виджет'}
      {isActive && '↓ отпустить здесь'}
    </div>
  );
}

// ─── Element View ─────────────────────────────────────────────────────────────

function ElementView({ el, selected, onSelect, onRightClick }: {
  el: CanvasElement; selected: boolean;
  onSelect: () => void;
  onRightClick: (e: React.MouseEvent) => void;
}) {
  const [hov, setHov] = useState(false);
  const s = el.elStyle ?? defaultElStyle();
  return (
    <div
      onClick={e => { e.stopPropagation(); onSelect(); }}
      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); onSelect(); onRightClick(e); }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative',
        outline: selected ? `2px solid ${C.accent}` : hov ? `2px dashed ${C.textMute}` : '2px solid transparent',
        borderRadius: s.borderRadius || 6, margin: '2px 0', cursor: 'pointer', transition: 'outline 0.1s',
        background: selected ? `${s.background || 'rgb(var(--accent-2) / 0.04)'}` : s.background || 'transparent',
        padding: `${s.paddingTop}px ${s.paddingRight}px ${s.paddingBottom}px ${s.paddingLeft}px`,
        opacity: s.opacity / 100,
      }}
    >
      {selected && (
        <div style={{ position: 'absolute', top: -20, left: 0, background: C.accent, color: C.bg, fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: '4px 4px 0 0', zIndex: 5, textTransform: 'uppercase', letterSpacing: 1 }}>
          {el.type}
        </div>
      )}
      <WidgetView el={el} />
    </div>
  );
}

// ─── Column View ──────────────────────────────────────────────────────────────

function ColumnView({ column, section, selectedId, dropTarget, isDragging, onSelect, onRightClick, onDragOver, onDrop }: {
  column: Column; section: Section; selectedId: string | null;
  dropTarget: DropTarget | null; isDragging: boolean;
  onSelect: (id: string) => void;
  onRightClick: (e: React.MouseEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, s: string, c: string, i: number) => void;
  onDrop: (e: React.DragEvent, s: string, c: string, i: number) => void;
}) {
  const isTarget = dropTarget?.columnId === column.id;
  return (
    <div style={{ flex: column.span, minHeight: 80, border: isDragging ? `2px dashed ${C.line}` : '2px solid transparent', borderRadius: 8, transition: 'border-color 0.15s' }}>
      {column.elements.map((el, idx) => (
        <React.Fragment key={el.id}>
          <DropZone isActive={isTarget && dropTarget?.index === idx} onDragOver={e => onDragOver(e, section.id, column.id, idx)} onDrop={e => onDrop(e, section.id, column.id, idx)} />
          <ElementView el={el} selected={selectedId === el.id} onSelect={() => onSelect(el.id)} onRightClick={e => onRightClick(e, el.id)} />
        </React.Fragment>
      ))}
      <DropZone isActive={isTarget && dropTarget?.index === column.elements.length} isEmpty={column.elements.length === 0} onDragOver={e => onDragOver(e, section.id, column.id, column.elements.length)} onDrop={e => onDrop(e, section.id, column.id, column.elements.length)} />
    </div>
  );
}

// ─── Section View ─────────────────────────────────────────────────────────────

function SectionView({ section, selectedId, dropTarget, isDragging, onSelect, onRightClick, onSectionContext, onDragOver, onDrop, onDelete }: {
  section: Section; selectedId: string | null; dropTarget: DropTarget | null; isDragging: boolean;
  onSelect: (id: string) => void;
  onRightClick: (e: React.MouseEvent, id: string) => void;
  onSectionContext: (e: React.MouseEvent, sectionId: string) => void;
  onDragOver: (e: React.DragEvent, s: string, c: string, i: number) => void;
  onDrop: (e: React.DragEvent, s: string, c: string, i: number) => void;
  onDelete: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onSectionContext(e, section.id); }}
      style={{ position: 'relative', padding: section.padding, borderTop: `1px solid ${C.line}`, outline: hov ? `2px dashed ${C.textMute}` : '2px solid transparent', outlineOffset: '-2px', transition: 'outline-color 0.12s' }}>
      {hov && (
        <div style={{ position: 'absolute', top: 6, right: 10, display: 'flex', gap: 4, zIndex: 10 }}>
          <div style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 6, padding: '3px 10px', fontSize: 10, color: C.textDim, display: 'flex', alignItems: 'center', gap: 4 }}>
            <LucideIcons.LayoutTemplate size={10} /> Секция · ПКМ — свойства
          </div>
          <button onClick={onDelete} style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textMute, cursor: 'pointer', padding: '3px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <LucideIcons.Trash2 size={11} />
          </button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 16 }}>
        {section.columns.map(col => (
          <ColumnView key={col.id} column={col} section={section} selectedId={selectedId} dropTarget={dropTarget} isDragging={isDragging} onSelect={onSelect} onRightClick={onRightClick} onDragOver={onDragOver} onDrop={onDrop} />
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
// Controlled mode для deviceMode (через deviceMode + onDeviceModeChange).
// Imperative handle для undo/redo (через ref).
// onHistoryChange — callback к родителю с актуальными canUndo/canRedo.

export const SandboxEditor = forwardRef<SandboxEditorHandle, {
  embedded?: boolean;
  initialSections?: Section[];
  onChange?: (sections: Section[]) => void;
  deviceMode?: DeviceMode;
  onDeviceModeChange?: (mode: DeviceMode) => void;
  onHistoryChange?: (state: { canUndo: boolean; canRedo: boolean }) => void;
}>(function SandboxEditor({ embedded, initialSections, onChange, deviceMode: deviceModeProp, onDeviceModeChange, onHistoryChange }, ref) {
  const [sections, setSections] = useState<Section[]>(initialSections ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);
  const [internalDeviceMode, setInternalDeviceMode] = useState<DeviceMode>('desktop');
  const deviceMode = deviceModeProp ?? internalDeviceMode;
  const [draggingWidget, setDraggingWidget] = useState<WidgetType | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [history, setHistory] = useState<Section[][]>([[]]);
  const [histIdx, setHistIdx] = useState(0);
  const [floatingPanel, setFloatingPanel] = useState<FloatingPanel | null>(null);
  const [panelTab, setPanelTab] = useState<PanelTab>('content');
  const [hoveredPanelTab, setHoveredPanelTab] = useState<PanelTab | null>(null);
  const [flyoutAnchor, setFlyoutAnchor] = useState<{ left: number; top: number } | null>(null);
  const [lastUsedByCategory, setLastUsedByCategory] = useState<Partial<Record<CategoryKey, WidgetType>>>({});
  const [mediaPickerTarget, setMediaPickerTarget] = useState<string | null>(null);

  const floatingRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      if (!isDraggingRef.current) setActiveCategory(null);
    }, 220);
  }, [cancelClose]);

  const pushHistory = useCallback((next: Section[]) => {
    setSections(next);
    setHistory(h => [...h.slice(0, histIdx + 1), next]);
    setHistIdx(i => i + 1);
    onChange?.(next);
  }, [histIdx, onChange]);

  const undo = useCallback(() => {
    if (histIdx > 0) {
      const target = history[histIdx - 1];
      setSections(target);
      setHistIdx(i => i - 1);
      onChange?.(target);
    }
  }, [history, histIdx, onChange]);

  const redo = useCallback(() => {
    if (histIdx < history.length - 1) {
      const target = history[histIdx + 1];
      setSections(target);
      setHistIdx(i => i + 1);
      onChange?.(target);
    }
  }, [history, histIdx, onChange]);

  // Expose imperative API for external top-bar undo/redo
  useImperativeHandle(ref, () => ({ undo, redo }), [undo, redo]);

  // Emit history state changes upstream
  useEffect(() => {
    onHistoryChange?.({ canUndo: histIdx > 0, canRedo: histIdx < history.length - 1 });
  }, [histIdx, history.length, onHistoryChange]);

  const deleteEl = useCallback((id: string) => {
    pushHistory(sections.map(s => ({ ...s, columns: s.columns.map(c => ({ ...c, elements: c.elements.filter(e => e.id !== id) })) })));
    setSelectedId(null);
  }, [sections, pushHistory]);

  const updateEl = useCallback((updated: CanvasElement) => {
    const next = sections.map(s => ({ ...s, columns: s.columns.map(c => ({ ...c, elements: c.elements.map(e => e.id === updated.id ? updated : e) })) }));
    setSections(next);
    onChange?.(next);
  }, [sections, onChange]);

  const openPanel = useCallback((e: React.MouseEvent, id: string) => {
    setFloatingPanel({ ...computePanelPos(e), kind: 'element', id });
    setPanelTab('content');
  }, []);
  const openSectionPanel = useCallback((e: React.MouseEvent, id: string) => {
    setFloatingPanel({ ...computePanelPos(e), kind: 'section', id });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveCategory(null); setSelectedId(null); setFloatingPanel(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
      if (e.key === 'Delete' && selectedId && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) { deleteEl(selectedId); setFloatingPanel(null); }
    };
    const onMouseDown = (e: MouseEvent) => {
      if (floatingRef.current && !floatingRef.current.contains(e.target as Node)) setFloatingPanel(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onMouseDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onMouseDown); };
  }, [undo, redo, selectedId, deleteEl]);

  const selectedEl = selectedId ? sections.flatMap(s => s.columns.flatMap(c => c.elements)).find(e => e.id === selectedId) : null;

  const openFlyout = useCallback((key: CategoryKey, btn: HTMLElement) => {
    cancelClose();
    setActiveCategory(key);
    const r = btn.getBoundingClientRect();
    // Палитра теперь горизонтальная — флаут открывается ПОД тайлом, не справа.
    setFlyoutAnchor({ left: r.left, top: r.bottom + 4 });
  }, [cancelClose]);

  const handleDragOver = useCallback((e: React.DragEvent, sId: string, cId: string, idx: number) => {
    e.preventDefault();
    setDropTarget({ sectionId: sId, columnId: cId, index: idx });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, sId: string, cId: string, idx: number) => {
    e.preventDefault();
    if (!draggingWidget) return;
    const el = newElement(draggingWidget);
    const next = sections.map(s => s.id !== sId ? s : {
      ...s, columns: s.columns.map(c => c.id !== cId ? c : { ...c, elements: (() => { const arr = [...c.elements]; arr.splice(idx, 0, el); return arr; })() }),
    });
    pushHistory(next);
    isDraggingRef.current = false;
    setDraggingWidget(null);
    setDropTarget(null);
    setSelectedId(el.id);
    if (activeCategory) setLastUsedByCategory(prev => ({ ...prev, [activeCategory]: draggingWidget }));
  }, [draggingWidget, activeCategory, sections, pushHistory]);

  const activeData = activeCategory ? categoriesData[activeCategory] : null;
  const deviceWidths: Record<DeviceMode, string> = { desktop: '100%', tablet: '768px', mobile: '390px' };
  const allElements = sections.flatMap(s => s.columns.flatMap(c => c.elements));

  function setDeviceMode(mode: DeviceMode) {
    if (deviceModeProp === undefined) setInternalDeviceMode(mode);
    onDeviceModeChange?.(mode);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: embedded ? '100%' : '100vh', overflow: 'hidden', background: C.bgElev, color: C.text }}>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

        {/* ── Horizontal Toolbar (logo + widget palette + stats) ─────────── */}
        <div style={{
          height: 42,
          background: C.bg,
          borderBottom: `1px solid ${C.line}`,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 10,
          paddingRight: 12,
          gap: 4,
          flexShrink: 0,
          zIndex: 100,
        }}>

          {/* Logo */}
          <div style={{ width: 28, height: 28, background: C.accent, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0, userSelect: 'none' }}>
            <span style={{ color: C.bg, fontWeight: 900, fontSize: 12, letterSpacing: -1 }}>ED</span>
          </div>

          {/* Widget categories */}
          {toolTiles.map(tile => {
            const lastType = lastUsedByCategory[tile.key];
            const lastWidget = lastType ? Object.values(categoriesData).flatMap(c => c.items).find(i => i.type === lastType) : null;
            const displayIcon = (lastWidget?.icon ?? tile.icon) as keyof typeof LucideIcons;
            const displayName = lastWidget?.name ?? tile.name;
            const IconComp = LucideIcons[displayIcon] as React.ComponentType<{ size?: number }>;
            const isActive = activeCategory === tile.key;
            const dragType = (lastWidget?.type ?? categoriesData[tile.key].items[0]?.type) as WidgetType | undefined;
            return (
              <div key={tile.key}
                draggable={!!dragType}
                onDragStart={() => { if (dragType) { isDraggingRef.current = true; setDraggingWidget(dragType); cancelClose(); } }}
                onDragEnd={() => { isDraggingRef.current = false; setDraggingWidget(null); setDropTarget(null); }}
                onMouseEnter={e => openFlyout(tile.key, e.currentTarget)}
                onMouseLeave={scheduleClose}
                title={`${displayName}${dragType ? ' · перетащи на холст' : ''}`}
                style={{
                  width: 30, height: 30,
                  background: isActive ? C.accentSoft : 'transparent',
                  border: `1px solid ${isActive ? C.accentLine : 'transparent'}`,
                  borderRadius: 6,
                  color: isActive ? C.accent : C.textMute,
                  cursor: dragType ? 'grab' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.12s', flexShrink: 0,
                }}
              >
                {IconComp && <IconComp size={15} />}
              </div>
            );
          })}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Stats */}
          <div style={{ fontSize: 11, color: C.textMute, userSelect: 'none', fontFamily: 'ui-monospace, monospace' }}>
            {sections.length}s · {allElements.length}e
          </div>
        </div>

        {/* ── Widget flyout ─────────────────────────────────────────────── */}
        {activeData && flyoutAnchor && (
          <div className="flyout-panel"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            style={{
              position: 'fixed',
              left: flyoutAnchor.left,
              top: Math.min(flyoutAnchor.top, window.innerHeight - 300),
              background: C.surface, border: `1px solid ${C.lineStr}`, borderRadius: 12,
              boxShadow: '8px 12px 30px rgba(0,0,0,0.6)', padding: 14,
              display: 'flex', flexDirection: 'column', gap: 10,
              zIndex: 500, maxHeight: '75vh', overflowY: 'auto', minWidth: 210,
            }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, paddingBottom: 10, borderBottom: `1px solid ${C.line}` }}>{activeData.title}</div>
            {activeData.items.length === 0
              ? <div style={{ color: C.textMute, fontSize: 12, textAlign: 'center', padding: '16px 0' }}>Скоро…</div>
              : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
                  {activeData.items.map((item, idx) => {
                    const ItemIcon = LucideIcons[item.icon] as React.ComponentType<{ size?: number }>;
                    return (
                      <div key={idx} draggable
                        onDragStart={() => { isDraggingRef.current = true; setDraggingWidget(item.type); cancelClose(); }}
                        onDragEnd={() => { isDraggingRef.current = false; setDraggingWidget(null); setDropTarget(null); }}
                        style={{ background: C.surface2, borderRadius: 10, aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'grab', padding: 8, border: '2px solid transparent', transition: 'all 0.12s', color: C.textDim }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.accent; (e.currentTarget as HTMLElement).style.color = C.bg; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = C.surface2; (e.currentTarget as HTMLElement).style.color = C.textDim; }}
                        title="Перетащи на холст"
                      >
                        {ItemIcon && <ItemIcon size={24} />}
                        <div style={{ fontSize: 10, textAlign: 'center', lineHeight: 1.2, fontWeight: 500 }}>{item.name}</div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        )}

        {/* ── Canvas ───────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 0 40px' }}
          onClick={e => { if ((e.target as HTMLElement).dataset.canvasBg) { setSelectedId(null); setActiveCategory(null); } }}>
          <div data-canvas-bg="1" style={{ width: deviceWidths[deviceMode], maxWidth: '100%', minHeight: '100%', background: C.bgElev, transition: 'width 0.3s', boxShadow: deviceMode !== 'desktop' ? '0 0 60px rgba(0,0,0,0.6)' : 'none' }}>
            {sections.length === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 360, color: C.textMute, flexDirection: 'column', gap: 14 }}>
                <LucideIcons.LayoutTemplate size={52} strokeWidth={1} />
                <div style={{ fontSize: 15 }}>Холст пуст — добавь секцию ниже</div>
              </div>
            )}

            {sections.map(section => (
              <SectionView key={section.id} section={section} selectedId={selectedId} dropTarget={dropTarget} isDragging={!!draggingWidget}
                onSelect={setSelectedId}
                onRightClick={openPanel}
                onSectionContext={openSectionPanel}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDelete={() => { pushHistory(sections.filter(s => s.id !== section.id)); setSelectedId(null); setFloatingPanel(null); }}
              />
            ))}

            {/* Add section */}
            <div style={{ padding: '20px 24px' }}>
              {showAddSection ? (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {[1, 2, 3].map(n => (
                    <div key={n} onClick={() => { pushHistory([...sections, newSection(n)]); setShowAddSection(false); }}
                      style={{ background: C.surface, border: `2px dashed ${C.line}`, borderRadius: 12, padding: '14px 22px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 90, transition: 'border-color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = C.accent}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = C.line}
                    >
                      <div style={{ display: 'flex', gap: 4 }}>
                        {Array.from({ length: n }, (_, i) => <div key={i} style={{ width: 22, height: 34, background: C.surface2, borderRadius: 3 }} />)}
                      </div>
                      <div style={{ fontSize: 11, color: C.textDim }}>{n} {n === 1 ? 'колонка' : 'колонки'}</div>
                    </div>
                  ))}
                  <div onClick={() => setShowAddSection(false)} style={{ border: `2px dashed ${C.line}`, borderRadius: 12, padding: '14px 22px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: C.textMute, fontSize: 12 }}>Отмена</div>
                </div>
              ) : (
                <button onClick={() => setShowAddSection(true)}
                  style={{ width: '100%', background: 'transparent', border: `2px dashed ${C.line}`, color: C.textMute, borderRadius: 10, padding: '12px 0', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.accent; (e.currentTarget as HTMLElement).style.color = C.accent; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.line; (e.currentTarget as HTMLElement).style.color = C.textMute; }}
                >
                  <LucideIcons.Plus size={16} /> Добавить секцию
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── Status bar (только в standalone) ─────────────────────────────── */}
      {!embedded && <div style={{ height: 26, background: C.bgElev, borderTop: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', padding: '0 14px', justifyContent: 'space-between', fontSize: 11, color: C.textMute, flexShrink: 0 }}>
        <div>NAS · ED</div>
        <div>{deviceMode} • {selectedId ? `выбран: ${allElements.find(e => e.id === selectedId)?.type ?? ''}` : 'ПКМ по элементу → свойства'} • Ctrl+Z • Del</div>
      </div>}

      {/* ── Floating properties panel ─────────────────────────────────────────── */}
      {floatingPanel?.kind === 'element' && (() => {
        const panelEl = allElements.find(e => e.id === floatingPanel.id);
        if (!panelEl) return null;
        const s = panelEl.elStyle ?? defaultElStyle();

        const tabs: { id: PanelTab; icon: keyof typeof LucideIcons; label: string }[] = [
          { id: 'content', icon: 'FileEdit',          label: 'Содержимое'   },
          { id: 'style',   icon: 'SlidersHorizontal', label: 'Свойства'     },
          { id: 'css',     icon: 'Code2',             label: 'CSS элемента' },
        ];

        const generatedCss = [
          `padding: ${s.paddingTop}px ${s.paddingRight}px ${s.paddingBottom}px ${s.paddingLeft}px;`,
          s.background && s.background !== 'transparent' ? `background: ${s.background};` : '',
          s.borderRadius ? `border-radius: ${s.borderRadius}px;` : '',
          s.opacity !== 100 ? `opacity: ${s.opacity / 100};` : '',
        ].filter(Boolean).join('\n');

        return (
          <div ref={floatingRef} style={{ position: 'fixed', left: floatingPanel.x, top: floatingPanel.y, width: 300, background: C.surface, border: `1px solid ${C.lineStr}`, borderRadius: 12, boxShadow: '0 16px 48px rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: 1 }}>{panelEl.type}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => { deleteEl(panelEl.id); setFloatingPanel(null); }} style={{ ...topBtnStyle, color: C.red, padding: '3px 6px' }} title="Удалить (Delete)"><LucideIcons.Trash2 size={13} /></button>
                <button onClick={() => setFloatingPanel(null)} style={{ ...topBtnStyle, padding: '3px 6px' }} title="Закрыть (Esc)"><LucideIcons.X size={13} /></button>
              </div>
            </div>

            <div style={{ display: 'flex', borderBottom: `1px solid ${C.line}`, flexShrink: 0 }}>
              {tabs.map(tab => {
                const Icon = LucideIcons[tab.icon] as React.ComponentType<{ size?: number }>;
                const isActive = panelTab === tab.id;
                const isHovered = hoveredPanelTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setPanelTab(tab.id)} title={tab.label}
                    style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: isActive ? `2px solid ${C.accent}` : '2px solid transparent', color: isActive ? C.accent : C.textMute, cursor: 'pointer', padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 11, fontWeight: isActive ? 600 : 400, transition: 'all 0.15s' }}
                    onMouseEnter={e => { setHoveredPanelTab(tab.id); if (!isActive) (e.currentTarget as HTMLElement).style.color = C.textDim; }}
                    onMouseLeave={e => { setHoveredPanelTab(null); if (!isActive) (e.currentTarget as HTMLElement).style.color = C.textMute; }}
                  >
                    {Icon && <Icon size={14} />}
                    {isHovered && <span style={{ fontSize: 9, whiteSpace: 'nowrap' }}>{tab.label}</span>}
                  </button>
                );
              })}
            </div>

            <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
              {panelTab === 'content' && <PropertiesPanel el={panelEl} onChange={updateEl} onOpenMediaPicker={panelEl.type === 'image' ? () => setMediaPickerTarget(panelEl.id) : undefined} />}

              {panelTab === 'style' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <Label>Отступы (px)</Label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {(['paddingTop','paddingRight','paddingBottom','paddingLeft'] as const).map(k => (
                        <div key={k}>
                          <div style={{ fontSize: 9, color: C.textMute, marginBottom: 3 }}>{({ paddingTop:'Сверху', paddingRight:'Справа', paddingBottom:'Снизу', paddingLeft:'Слева' })[k]}</div>
                          <input type="number" value={s[k]} min={0} max={200}
                            onChange={e => updateEl({ ...panelEl, elStyle: { ...s, [k]: +e.target.value } })}
                            style={inputStyle} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <Label>Фон</Label>
                      <input type="color" value={s.background === 'transparent' ? '#0E0F12' : s.background}
                        onChange={e => updateEl({ ...panelEl, elStyle: { ...s, background: e.target.value } })}
                        style={{ ...inputStyle, padding: 2, height: 36 }} />
                    </div>
                    <div>
                      <Label>Радиус (px)</Label>
                      <input type="number" value={s.borderRadius} min={0} max={100}
                        onChange={e => updateEl({ ...panelEl, elStyle: { ...s, borderRadius: +e.target.value } })}
                        style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <Label>Прозрачность: {s.opacity}%</Label>
                    <input type="range" value={s.opacity} min={10} max={100}
                      onChange={e => updateEl({ ...panelEl, elStyle: { ...s, opacity: +e.target.value } })}
                      style={{ width: '100%', accentColor: C.accent }} />
                  </div>
                </div>
              )}

              {panelTab === 'css' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <Label>Сгенерированный CSS</Label>
                    <pre style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 6, padding: 10, fontSize: 11, color: C.green, margin: 0, overflowX: 'auto', lineHeight: 1.6 }}>
                      {generatedCss || '/* нет стилей */'}
                    </pre>
                  </div>
                  <div>
                    <Label>Кастомный CSS</Label>
                    <textarea value={s.customCss} rows={6} placeholder="color: red;&#10;font-size: 18px;"
                      onChange={e => updateEl({ ...panelEl, elStyle: { ...s, customCss: e.target.value } })}
                      style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6 }} />
                    <div style={{ fontSize: 10, color: C.textMute, marginTop: 4 }}>Применяется inline к элементу</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {floatingPanel?.kind === 'section' && (() => {
        const sec = sections.find(s => s.id === floatingPanel.id);
        if (!sec) return null;
        const [t, r, b, l] = parsePadding(sec.padding);
        const updateEdge = (i: 0 | 1 | 2 | 3, v: number) => {
          const vals: [number, number, number, number] = [t, r, b, l];
          vals[i] = v;
          const next = sections.map(s =>
            s.id === sec.id
              ? { ...s, padding: `${vals[0]}px ${vals[1]}px ${vals[2]}px ${vals[3]}px` }
              : s,
          );
          pushHistory(next);
        };
        return (
          <div ref={floatingRef} style={{ position: 'fixed', left: floatingPanel.x, top: floatingPanel.y, width: 300, background: C.surface, border: `1px solid ${C.lineStr}`, borderRadius: 12, boxShadow: '0 16px 48px rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: 1 }}>section</div>
              <button onClick={() => setFloatingPanel(null)} style={{ ...topBtnStyle, padding: '3px 6px' }} title="Закрыть (Esc)"><LucideIcons.X size={13} /></button>
            </div>
            <div style={{ padding: 16 }}>
              <Label>Отступы секции (px)</Label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {(['Сверху', 'Справа', 'Снизу', 'Слева'] as const).map((name, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 9, color: C.textMute, marginBottom: 3 }}>{name}</div>
                    <input
                      type="number"
                      min={0}
                      max={500}
                      value={[t, r, b, l][i]}
                      onChange={(e) => updateEdge(i as 0 | 1 | 2 | 3, +e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Media Picker Modal ───────────────────────────────────────────────── */}
      <MediaPickerModal
        open={mediaPickerTarget !== null}
        onClose={() => setMediaPickerTarget(null)}
        onSelect={(url: string) => {
          if (!mediaPickerTarget) return;
          const el = allElements.find(e => e.id === mediaPickerTarget);
          if (el) updateEl({ ...el, image: { ...(el.image ?? {}), url } });
          setMediaPickerTarget(null);
        }}
      />

    </div>
  );
});
