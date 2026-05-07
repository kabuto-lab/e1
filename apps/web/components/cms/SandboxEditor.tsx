'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as LucideIcons from 'lucide-react';
import { MediaPickerModal } from '@/components/cms/MediaPickerModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type CategoryKey = 'textual' | 'buttons' | 'media' | 'icons' | 'structure' | 'interactive';
type DeviceMode = 'desktop' | 'tablet' | 'mobile';
type WidgetType = 'heading' | 'text' | 'button' | 'divider' | 'spacer' | 'icon-box' | 'cta' | 'image';

interface HeadingProps { text: string; tag: 'h1'|'h2'|'h3'|'h4'; align: 'left'|'center'|'right'; color: string; fontSize: number; }
interface TextProps { content: string; align: 'left'|'center'|'right'; color: string; }
interface ButtonProps { label: string; align: 'left'|'center'|'right'; style: 'primary'|'secondary'|'outline'; size: 'sm'|'md'|'lg'; }
interface DividerProps { lineStyle: 'solid'|'dashed'|'dotted'; color: string; weight: number; }
interface SpacerProps { height: number; }
interface IconBoxProps { icon: keyof typeof LucideIcons; title: string; description: string; iconColor: string; layout: 'top'|'left'; }
interface CtaProps { headline: string; description: string; buttonText: string; align: 'left'|'center'|'right'; }
interface ImageProps { url?: string; alt?: string; }

interface ElStyle {
  paddingTop: number; paddingRight: number; paddingBottom: number; paddingLeft: number;
  background: string; borderRadius: number; opacity: number; customCss: string;
}

const defaultElStyle = (): ElStyle => ({ paddingTop: 12, paddingRight: 12, paddingBottom: 12, paddingLeft: 12, background: 'transparent', borderRadius: 0, opacity: 100, customCss: '' });

interface CanvasElement {
  id: string;
  type: WidgetType;
  heading?: HeadingProps;
  text?: TextProps;
  button?: ButtonProps;
  divider?: DividerProps;
  spacer?: SpacerProps;
  iconBox?: IconBoxProps;
  cta?: CtaProps;
  image?: ImageProps;
  elStyle?: ElStyle;
}

type PanelTab = 'content' | 'style' | 'css';
interface FloatingPanel { x: number; y: number; elementId: string; }

interface Column { id: string; span: number; elements: CanvasElement[]; }
interface Section { id: string; columns: Column[]; padding: string; }
interface DropTarget { sectionId: string; columnId: string; index: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

function newElement(type: WidgetType): CanvasElement {
  const id = uid();
  switch (type) {
    case 'heading':  return { id, type, heading:  { text: 'Заголовок', tag: 'h2', align: 'left', color: '#ffffff', fontSize: 32 } };
    case 'text':     return { id, type, text:     { content: 'Введите текст здесь. Нажмите чтобы редактировать.', align: 'left', color: '#cccccc' } };
    case 'button':   return { id, type, button:   { label: 'Нажми меня', align: 'left', style: 'primary', size: 'md' } };
    case 'divider':  return { id, type, divider:  { lineStyle: 'solid', color: '#444444', weight: 1 } };
    case 'spacer':   return { id, type, spacer:   { height: 40 } };
    case 'icon-box': return { id, type, iconBox:  { icon: 'Star', title: 'Icon Box', description: 'Описание блока с иконкой.', iconColor: '#00ffcc', layout: 'top' } };
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

const DEVICE_ICONS: Record<DeviceMode, keyof typeof LucideIcons> = {
  desktop: 'Monitor',
  tablet:  'Tablet',
  mobile:  'Smartphone',
};
const DEVICE_LABELS: Record<DeviceMode, string> = {
  desktop: 'Desktop',
  tablet:  'Tablet',
  mobile:  'Mobile',
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = { width: '100%', background: '#333', border: '1px solid #555', borderRadius: 6, color: '#eee', padding: '7px 10px', fontSize: 13, boxSizing: 'border-box' };
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

const topBtnStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', padding: '6px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s' };

const tbBtn: React.CSSProperties = {
  width: 32, height: 32,
  background: 'transparent',
  border: '1px solid transparent',
  borderRadius: 7,
  color: '#888',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.12s',
  flexShrink: 0,
  padding: 0,
};

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, color: '#888', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 5 }}>{children}</div>;
}

// ─── Widget Renderer ──────────────────────────────────────────────────────────

function WidgetView({ el }: { el: CanvasElement }) {
  switch (el.type) {
    case 'heading': {
      const p = el.heading!;
      const style: React.CSSProperties = { textAlign: p.align, color: p.color, fontSize: p.fontSize, margin: 0, fontWeight: 700, lineHeight: 1.2 };
      if (p.tag === 'h1') return <h1 style={style}>{p.text}</h1>;
      if (p.tag === 'h3') return <h3 style={style}>{p.text}</h3>;
      if (p.tag === 'h4') return <h4 style={style}>{p.text}</h4>;
      return <h2 style={style}>{p.text}</h2>;
    }
    case 'text': {
      const p = el.text!;
      return <p style={{ textAlign: p.align, color: p.color, margin: 0, lineHeight: 1.7, fontSize: 15 }}>{p.content}</p>;
    }
    case 'button': {
      const p = el.button!;
      const pad = { sm: '6px 14px', md: '10px 22px', lg: '14px 30px' };
      const fs  = { sm: 13, md: 15, lg: 17 };
      const styles: Record<string, React.CSSProperties> = {
        primary:   { background: '#00ffcc', color: '#1e1e1e', border: 'none' },
        secondary: { background: '#555', color: '#fff', border: 'none' },
        outline:   { background: 'transparent', color: '#00ffcc', border: '2px solid #00ffcc' },
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
      return (
        <div style={{ height: p.height, display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%', borderTop: '1px dashed #444', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: -9, background: '#222', padding: '0 8px', fontSize: 10, color: '#666' }}>{p.height}px</span>
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
            <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 4 }}>{p.title}</div>
            <div style={{ color: '#aaa', fontSize: 14, lineHeight: 1.5 }}>{p.description}</div>
          </div>
        </div>
      );
    }
    case 'cta': {
      const p = el.cta!;
      return (
        <div style={{ textAlign: p.align, padding: '16px 0' }}>
          <h3 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 8, marginTop: 0 }}>{p.headline}</h3>
          <p style={{ color: '#aaa', fontSize: 14, marginBottom: 18, marginTop: 0 }}>{p.description}</p>
          <button style={{ background: '#00ffcc', color: '#1e1e1e', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>{p.buttonText}</button>
        </div>
      );
    }
    case 'image': {
      const p = el.image;
      if (p?.url) {
        return <img src={p.url} alt={p.alt || ''} style={{ width: '100%', borderRadius: 8, display: 'block' }} />;
      }
      return (
        <div style={{ background: '#2a2a2a', borderRadius: 8, aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', gap: 8, border: '2px dashed #444', cursor: 'pointer' }}>
          <LucideIcons.Image size={28} />
          <span style={{ fontSize: 13 }}>Нажмите ПКМ → выбрать изображение</span>
        </div>
      );
    }
  }
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
            <button onClick={onOpenMediaPicker} style={{ width: '100%', background: '#333', border: '1px solid #555', color: '#ccc', borderRadius: 6, padding: '7px 0', cursor: 'pointer', fontSize: 12 }}>
              Заменить изображение
            </button>
          </div>
        ) : (
          <button onClick={onOpenMediaPicker} style={{ width: '100%', background: '#333', border: '2px dashed #555', color: '#aaa', borderRadius: 8, padding: '16px 0', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
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

  return <div style={{ color: '#666', fontSize: 12, textAlign: 'center', padding: 20 }}>Нет свойств</div>;
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────

function DropZone({ isActive, isEmpty, onDragOver, onDrop }: {
  isActive?: boolean; isEmpty?: boolean;
  onDragOver: (e: React.DragEvent) => void; onDrop: (e: React.DragEvent) => void;
}) {
  return (
    <div onDragOver={onDragOver} onDrop={onDrop} style={{
      height: isActive ? 44 : isEmpty ? 64 : 6,
      background: isActive ? 'rgba(0,255,204,0.12)' : 'transparent',
      border: isActive ? '2px dashed #00ffcc' : isEmpty ? '2px dashed #333' : 'none',
      borderRadius: 6, margin: '2px 0', display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.12s', color: isActive ? '#00ffcc' : '#444', fontSize: 12,
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
        outline: selected ? '2px solid #00ffcc' : hov ? '2px dashed #555' : '2px solid transparent',
        borderRadius: s.borderRadius || 6, margin: '2px 0', cursor: 'pointer', transition: 'outline 0.1s',
        background: selected ? `${s.background || 'rgba(0,255,204,0.03)'}` : s.background || 'transparent',
        padding: `${s.paddingTop}px ${s.paddingRight}px ${s.paddingBottom}px ${s.paddingLeft}px`,
        opacity: s.opacity / 100,
      }}
    >
      {selected && (
        <div style={{ position: 'absolute', top: -20, left: 0, background: '#00ffcc', color: '#1e1e1e', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: '4px 4px 0 0', zIndex: 5, textTransform: 'uppercase', letterSpacing: 1 }}>
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
    <div style={{ flex: column.span, minHeight: 80, border: isDragging ? '2px dashed #3a3a3a' : '2px solid transparent', borderRadius: 8, transition: 'border-color 0.15s' }}>
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

function SectionView({ section, selectedId, dropTarget, isDragging, onSelect, onRightClick, onDragOver, onDrop, onDelete }: {
  section: Section; selectedId: string | null; dropTarget: DropTarget | null; isDragging: boolean;
  onSelect: (id: string) => void;
  onRightClick: (e: React.MouseEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, s: string, c: string, i: number) => void;
  onDrop: (e: React.DragEvent, s: string, c: string, i: number) => void;
  onDelete: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ position: 'relative', padding: section.padding, borderTop: '1px solid #2a2a2a' }}>
      {hov && (
        <div style={{ position: 'absolute', top: 6, right: 10, display: 'flex', gap: 4, zIndex: 10 }}>
          <div style={{ background: '#2d2d2d', border: '1px solid #444', borderRadius: 6, padding: '3px 10px', fontSize: 10, color: '#777', display: 'flex', alignItems: 'center', gap: 4 }}>
            <LucideIcons.LayoutTemplate size={10} /> Секция
          </div>
          <button onClick={onDelete} style={{ background: '#2d2d2d', border: '1px solid #444', borderRadius: 6, color: '#888', cursor: 'pointer', padding: '3px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
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

export function SandboxEditor({ embedded, initialSections, onChange, deviceMode: deviceModeProp, onDeviceModeChange }: {
  embedded?: boolean;
  initialSections?: Section[];
  onChange?: (sections: Section[]) => void;
  deviceMode?: DeviceMode;
  onDeviceModeChange?: (mode: DeviceMode) => void;
}) {
  const [sections, setSections] = useState<Section[]>(initialSections ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>(deviceModeProp ?? 'desktop');
  const [draggingWidget, setDraggingWidget] = useState<WidgetType | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [history, setHistory] = useState<Section[][]>([[]]);
  const [histIdx, setHistIdx] = useState(0);
  const [floatingPanel, setFloatingPanel] = useState<FloatingPanel | null>(null);
  const [panelTab, setPanelTab] = useState<PanelTab>('content');
  const [flyoutAnchor, setFlyoutAnchor] = useState<{ left: number; top: number } | null>(null);
  const [lastUsedByCategory, setLastUsedByCategory] = useState<Partial<Record<CategoryKey, WidgetType>>>({});
  const [deviceMenuAnchor, setDeviceMenuAnchor] = useState<{ left: number; top: number } | null>(null);
  const [undoHov, setUndoHov] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<string | null>(null);

  const floatingRef = useRef<HTMLDivElement>(null);
  const deviceBtnRef = useRef<HTMLButtonElement>(null);
  const deviceMenuRef = useRef<HTMLDivElement>(null);
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
    if (histIdx > 0) { setSections(history[histIdx - 1]); setHistIdx(i => i - 1); }
  }, [history, histIdx]);

  const redo = useCallback(() => {
    if (histIdx < history.length - 1) { setSections(history[histIdx + 1]); setHistIdx(i => i + 1); }
  }, [history, histIdx]);

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
    const margin = 16;
    const panelW = 300;
    const panelH = 460;
    let x = e.clientX + 10;
    let y = e.clientY - 10;
    if (x + panelW > window.innerWidth - margin) x = e.clientX - panelW - 10;
    if (y + panelH > window.innerHeight - margin) y = window.innerHeight - panelH - margin;
    if (y < 60) y = 60;
    setFloatingPanel({ x, y, elementId: id });
    setPanelTab('content');
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveCategory(null); setSelectedId(null); setFloatingPanel(null); setDeviceMenuAnchor(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
      if (e.key === 'Delete' && selectedId && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) { deleteEl(selectedId); setFloatingPanel(null); }
    };
    const onMouseDown = (e: MouseEvent) => {
      if (floatingRef.current && !floatingRef.current.contains(e.target as Node)) setFloatingPanel(null);
      if (
        deviceMenuRef.current &&
        !deviceMenuRef.current.contains(e.target as Node) &&
        !(deviceBtnRef.current && deviceBtnRef.current.contains(e.target as Node))
      ) {
        setDeviceMenuAnchor(null);
      }
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
    setFlyoutAnchor({ left: r.right + 4, top: r.top });
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

  const ActiveDeviceIcon = LucideIcons[DEVICE_ICONS[deviceMode]] as React.ComponentType<{ size?: number }>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: embedded ? '100%' : '100vh', overflow: 'hidden', background: '#1e1e1e', color: '#eee', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Vertical Toolbar ─────────────────────────────────────────────── */}
        <div style={{
          width: 52,
          background: '#2a2a2a',
          borderRight: '1px solid #3a3a3a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 12,
          paddingBottom: 10,
          gap: 2,
          flexShrink: 0,
          zIndex: 100,
        }}>

          {/* Logo */}
          <div style={{ width: 32, height: 32, background: '#00ffcc', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, flexShrink: 0, userSelect: 'none' }}>
            <span style={{ color: '#1e1e1e', fontWeight: 900, fontSize: 13, letterSpacing: -1 }}>ED</span>
          </div>

          {/* Undo / Redo */}
          <div onMouseEnter={() => setUndoHov(true)} onMouseLeave={() => setUndoHov(false)} style={{ display: 'flex', flexDirection: 'column', gap: undoHov ? 2 : 0 }}>
            <button onClick={undo} disabled={histIdx <= 0}
              style={{ ...tbBtn, opacity: histIdx <= 0 ? 0.3 : 1 }}
              title="Undo (Ctrl+Z)">
              <LucideIcons.Undo2 size={15} />
            </button>
            <button onClick={redo} disabled={histIdx >= history.length - 1}
              style={{ ...tbBtn, height: undoHov ? 32 : 0, opacity: undoHov ? (histIdx >= history.length - 1 ? 0.3 : 1) : 0, overflow: 'hidden', pointerEvents: undoHov ? 'auto' : 'none', transition: 'height 0.15s, opacity 0.15s' }}
              title="Redo (Ctrl+Y)">
              <LucideIcons.Redo2 size={15} />
            </button>
          </div>

          {/* Divider */}
          <div style={{ width: 22, height: 1, background: '#444', margin: '6px 0' }} />

          {/* Device mode */}
          <button
            ref={deviceBtnRef}
            onClick={e => {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setDeviceMenuAnchor(prev => prev ? null : { left: r.right + 4, top: r.top });
            }}
            style={{
              ...tbBtn,
              background: deviceMenuAnchor ? 'rgba(0,255,204,0.15)' : 'transparent',
              border: `1px solid ${deviceMenuAnchor ? '#00ffcc55' : 'transparent'}`,
              color: '#00ffcc',
            }}
            title={`Брейкпойнт: ${DEVICE_LABELS[deviceMode]}`}
          >
            <ActiveDeviceIcon size={15} />
          </button>

          {/* Divider */}
          <div style={{ width: 22, height: 1, background: '#444', margin: '6px 0' }} />

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
                  width: 32, height: 32,
                  background: isActive ? 'rgba(0,255,204,0.15)' : 'transparent',
                  border: `1px solid ${isActive ? '#00ffcc55' : 'transparent'}`,
                  borderRadius: 7,
                  color: isActive ? '#00ffcc' : '#888',
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
          <div style={{
            fontSize: 9, color: '#555', writingMode: 'vertical-rl', transform: 'rotate(180deg)',
            marginBottom: 6, lineHeight: 1.5, textAlign: 'center', userSelect: 'none',
          }}>
            {sections.length}s · {allElements.length}e
          </div>

          {/* Preview */}
          <button style={{ ...tbBtn }} title="Preview">
            <LucideIcons.Eye size={15} />
          </button>

          {/* Publish */}
          <button
            style={{ width: 32, height: 32, background: '#00ffcc', color: '#1e1e1e', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4, flexShrink: 0 }}
            title="Publish"
          >
            <LucideIcons.Send size={14} />
          </button>
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
              background: '#252525', border: '1px solid #484848', borderRadius: 12,
              boxShadow: '8px 12px 30px rgba(0,0,0,0.6)', padding: 14,
              display: 'flex', flexDirection: 'column', gap: 10,
              zIndex: 500, maxHeight: '75vh', overflowY: 'auto', minWidth: 210,
            }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#00ffcc', paddingBottom: 10, borderBottom: '1px solid #3a3a3a' }}>{activeData.title}</div>
            {activeData.items.length === 0
              ? <div style={{ color: '#555', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>Скоро…</div>
              : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
                  {activeData.items.map((item, idx) => {
                    const ItemIcon = LucideIcons[item.icon] as React.ComponentType<{ size?: number }>;
                    return (
                      <div key={idx} draggable
                        onDragStart={() => { isDraggingRef.current = true; setDraggingWidget(item.type); cancelClose(); }}
                        onDragEnd={() => { isDraggingRef.current = false; setDraggingWidget(null); setDropTarget(null); }}
                        style={{ background: '#333', borderRadius: 10, aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'grab', padding: 8, border: '2px solid transparent', transition: 'all 0.12s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#00ffcc'; (e.currentTarget as HTMLElement).style.color = '#1e1e1e'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#333'; (e.currentTarget as HTMLElement).style.color = ''; }}
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
        <div style={{ flex: 1, overflowY: 'auto', background: '#161616', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 0 40px' }}
          onClick={e => { if ((e.target as HTMLElement).dataset.canvasBg) { setSelectedId(null); setActiveCategory(null); } }}>
          <div data-canvas-bg="1" style={{ width: deviceWidths[deviceMode], maxWidth: '100%', minHeight: '100%', background: '#1a1a1a', transition: 'width 0.3s', boxShadow: deviceMode !== 'desktop' ? '0 0 60px rgba(0,0,0,0.6)' : 'none' }}>
            {sections.length === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 360, color: '#444', flexDirection: 'column', gap: 14 }}>
                <LucideIcons.LayoutTemplate size={52} strokeWidth={1} />
                <div style={{ fontSize: 15 }}>Холст пуст — добавь секцию ниже</div>
              </div>
            )}

            {sections.map(section => (
              <SectionView key={section.id} section={section} selectedId={selectedId} dropTarget={dropTarget} isDragging={!!draggingWidget}
                onSelect={setSelectedId}
                onRightClick={openPanel}
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
                      style={{ background: '#252525', border: '2px dashed #444', borderRadius: 12, padding: '14px 22px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 90, transition: 'border-color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#00ffcc'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#444'}
                    >
                      <div style={{ display: 'flex', gap: 4 }}>
                        {Array.from({ length: n }, (_, i) => <div key={i} style={{ width: 22, height: 34, background: '#3a3a3a', borderRadius: 3 }} />)}
                      </div>
                      <div style={{ fontSize: 11, color: '#999' }}>{n} {n === 1 ? 'колонка' : 'колонки'}</div>
                    </div>
                  ))}
                  <div onClick={() => setShowAddSection(false)} style={{ border: '2px dashed #333', borderRadius: 12, padding: '14px 22px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#555', fontSize: 12 }}>Отмена</div>
                </div>
              ) : (
                <button onClick={() => setShowAddSection(true)}
                  style={{ width: '100%', background: 'transparent', border: '2px dashed #333', color: '#555', borderRadius: 10, padding: '12px 0', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#00ffcc'; (e.currentTarget as HTMLElement).style.color = '#00ffcc'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#333'; (e.currentTarget as HTMLElement).style.color = '#555'; }}
                >
                  <LucideIcons.Plus size={16} /> Добавить секцию
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── Status bar ───────────────────────────────────────────────────────── */}
      {!embedded && <div style={{ height: 26, background: '#1a1a1a', borderTop: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', padding: '0 14px', justifyContent: 'space-between', fontSize: 11, color: '#555', flexShrink: 0 }}>
        <div>Escort Platform • Page Editor</div>
        <div>{deviceMode} • {selectedId ? `выбран: ${allElements.find(e => e.id === selectedId)?.type ?? ''}` : 'ПКМ по элементу → свойства'} • Ctrl+Z • Del</div>
      </div>}

      {/* ── Device breakpoint dropdown ───────────────────────────────────────── */}
      {deviceMenuAnchor && (
        <div ref={deviceMenuRef} style={{
          position: 'fixed',
          left: deviceMenuAnchor.left,
          top: Math.min(deviceMenuAnchor.top, window.innerHeight - 140),
          background: '#252525',
          border: '1px solid #484848',
          borderRadius: 8,
          padding: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          zIndex: 600,
          boxShadow: '4px 8px 24px rgba(0,0,0,0.6)',
        }}>
          {(['desktop', 'tablet', 'mobile'] as DeviceMode[]).map(mode => {
            const Icon = LucideIcons[DEVICE_ICONS[mode]] as React.ComponentType<{ size?: number }>;
            const isActive = deviceMode === mode;
            return (
              <button key={mode}
                onClick={() => { setDeviceMode(mode); onDeviceModeChange?.(mode); setDeviceMenuAnchor(null); }}
                style={{
                  background: isActive ? 'rgba(0,255,204,0.15)' : 'transparent',
                  border: `1px solid ${isActive ? '#00ffcc44' : 'transparent'}`,
                  borderRadius: 6,
                  color: isActive ? '#00ffcc' : '#aaa',
                  cursor: 'pointer',
                  padding: '7px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                  transition: 'color 0.12s',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = '#eee'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = '#aaa'; }}
              >
                <Icon size={14} />
                {DEVICE_LABELS[mode]}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Floating properties panel ─────────────────────────────────────────── */}
      {floatingPanel && (() => {
        const panelEl = allElements.find(e => e.id === floatingPanel.elementId);
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
          <div ref={floatingRef} style={{ position: 'fixed', left: floatingPanel.x, top: floatingPanel.y, width: 300, background: '#242424', border: '1px solid #484848', borderRadius: 12, boxShadow: '0 16px 48px rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#00ffcc', textTransform: 'uppercase', letterSpacing: 1 }}>{panelEl.type}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => { deleteEl(panelEl.id); setFloatingPanel(null); }} style={{ ...topBtnStyle, color: '#c0392b', padding: '3px 6px' }} title="Удалить (Delete)"><LucideIcons.Trash2 size={13} /></button>
                <button onClick={() => setFloatingPanel(null)} style={{ ...topBtnStyle, padding: '3px 6px' }} title="Закрыть (Esc)"><LucideIcons.X size={13} /></button>
              </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #333', flexShrink: 0 }}>
              {tabs.map(tab => {
                const Icon = LucideIcons[tab.icon] as React.ComponentType<{ size?: number }>;
                const isActive = panelTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setPanelTab(tab.id)} title={tab.label}
                    style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: isActive ? '2px solid #00ffcc' : '2px solid transparent', color: isActive ? '#00ffcc' : '#666', cursor: 'pointer', padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, fontWeight: isActive ? 600 : 400, transition: 'all 0.15s' }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = '#aaa'; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = '#666'; }}
                  >
                    {Icon && <Icon size={14} />}
                    <span style={{ fontSize: 10 }}>{tab.label}</span>
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
                          <div style={{ fontSize: 9, color: '#666', marginBottom: 3 }}>{({ paddingTop:'Сверху', paddingRight:'Справа', paddingBottom:'Снизу', paddingLeft:'Слева' })[k]}</div>
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
                      <input type="color" value={s.background === 'transparent' ? '#1a1a1a' : s.background}
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
                      style={{ width: '100%', accentColor: '#00ffcc' }} />
                  </div>
                </div>
              )}

              {panelTab === 'css' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <Label>Сгенерированный CSS</Label>
                    <pre style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: 10, fontSize: 11, color: '#7ec8a0', margin: 0, overflowX: 'auto', lineHeight: 1.6 }}>
                      {generatedCss || '/* нет стилей */'}
                    </pre>
                  </div>
                  <div>
                    <Label>Кастомный CSS</Label>
                    <textarea value={s.customCss} rows={6} placeholder="color: red;&#10;font-size: 18px;"
                      onChange={e => updateEl({ ...panelEl, elStyle: { ...s, customCss: e.target.value } })}
                      style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6 }} />
                    <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>Применяется inline к элементу</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Media Picker Modal ───────────────────────────────────────────────── */}
      <MediaPickerModal
        open={mediaPickerTarget !== null}
        onClose={() => setMediaPickerTarget(null)}
        onSelect={(url) => {
          if (!mediaPickerTarget) return;
          const el = allElements.find(e => e.id === mediaPickerTarget);
          if (el) updateEl({ ...el, image: { ...(el.image ?? {}), url } });
          setMediaPickerTarget(null);
        }}
      />

    </div>
  );
}
