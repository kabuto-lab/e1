'use client';
import React, { useState, useCallback, forwardRef } from 'react';
import * as LucideIcons from 'lucide-react';
import { useEditorStore } from './store';
import { C, inputStyle, selectStyle, topBtnStyle } from './editor-constants';
import { Label, parsePadding, PANEL_MAX_H_VH, PANEL_MAX_H_CAP, PANEL_WIDTH } from './editor-helpers';
import { defaultElStyle, type CanvasElement } from '../ed-types';
import type { PanelTab } from './editor-types';

// ─── Section-preset enum prop keys ────────────────────────────────────────────
// Когда section preset имеет prop с одним из этих ключей — рендерим <select>
// вместо <input>. Иначе пользователь введёт мусор, и WidgetView не сможет
// сматчить значение с CSS-классом / variant'ом.
// При добавлении нового enum-prop'а в preset-схему — добавь сюда ключ + список
// допустимых значений.
const PRESET_ENUM_KEYS: Record<string, readonly string[]> = {
  align: ['left', 'center', 'right'],
  textAlign: ['left', 'center', 'right'],
  verticalAlign: ['top', 'middle', 'bottom'],
  size: ['sm', 'md', 'lg'],
  variant: ['primary', 'secondary', 'outline'],
  layout: ['top', 'left', 'right', 'bottom'],
  aspectRatio: ['16/9', '4/3', '1/1', '21/9', '9/16'],
};

// Ключи props, которые мы РЕНДЕРИМ В STYLE-ТАБЕ, а не в Content. Используется
// в section-preset entries map чтобы НЕ дублировать UI.
const STYLE_TAB_KEYS = new Set(['align']);

// ─── Common style-tab bindings ───────────────────────────────────────────────
// Align — общий для всех типов виджетов, у которых он есть. Хранится в разных
// nested-полях (heading.align, text.align, button.align, cta.align,
// sectionPreset.props.align). Вынесли в Style tab чтобы Content tab был
// короче и однообразнее.

type AlignVal = 'left' | 'center' | 'right';

function getElementAlignBinding(
  el: CanvasElement,
): { value: AlignVal; set: (v: AlignVal) => CanvasElement } | null {
  if (el.type === 'heading' && el.heading) {
    const p = el.heading;
    return { value: p.align, set: (v) => ({ ...el, heading: { ...p, align: v } }) };
  }
  if (el.type === 'text' && el.text) {
    const p = el.text;
    return { value: p.align, set: (v) => ({ ...el, text: { ...p, align: v } }) };
  }
  if (el.type === 'button' && el.button) {
    const p = el.button;
    return { value: p.align, set: (v) => ({ ...el, button: { ...p, align: v } }) };
  }
  if (el.type === 'cta' && el.cta) {
    const p = el.cta;
    return { value: p.align, set: (v) => ({ ...el, cta: { ...p, align: v } }) };
  }
  if (
    el.type === 'section-preset' &&
    el.sectionPreset &&
    typeof el.sectionPreset.props.align === 'string'
  ) {
    const sp = el.sectionPreset;
    const v = sp.props.align as AlignVal;
    return {
      value: v,
      set: (next) => ({ ...el, sectionPreset: { ...sp, props: { ...sp.props, align: next } } }),
    };
  }
  return null;
}

// ─── Icon Picker ──────────────────────────────────────────────────────────────

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
        <div
          style={{
            width: 34,
            height: 34,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: C.bg,
            border: `1px solid ${C.line}`,
            borderRadius: 6,
            color: C.accent,
          }}
        >
          {Current && <Current size={18} />}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={value || 'поиск иконки…'}
          style={inputStyle}
        />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: 4,
          maxHeight: 132,
          overflowY: 'auto',
          padding: 4,
          background: C.bg,
          border: `1px solid ${C.line}`,
          borderRadius: 6,
        }}
      >
        {names.map((n) => {
          const I = LucideIcons[n as keyof typeof LucideIcons] as React.ComponentType<{ size?: number }>;
          const sel = n === value;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              title={n}
              style={{
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: sel ? C.accentSoft : 'transparent',
                border: `1px solid ${sel ? C.accentLine : 'transparent'}`,
                borderRadius: 5,
                color: sel ? C.accent : C.textDim,
                cursor: 'pointer',
              }}
            >
              {I && <I size={15} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Content tab — per-widget property form ───────────────────────────────────

function PropertiesContent({
  el,
  onChange,
  onOpenMediaPicker,
}: {
  el: CanvasElement;
  onChange: (u: CanvasElement) => void;
  onOpenMediaPicker?: () => void;
}) {
  if (el.type === 'heading' && el.heading) {
    const p = el.heading;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <Label>Текст</Label>
          <input
            value={p.text}
            onChange={(e) => onChange({ ...el, heading: { ...p, text: e.target.value } })}
            style={inputStyle}
          />
        </div>
        <div>
          <Label>Тег</Label>
          <select
            value={p.tag}
            onChange={(e) => onChange({ ...el, heading: { ...p, tag: e.target.value as any } })}
            style={selectStyle}
          >
            {['h1', 'h2', 'h3', 'h4'].map((t) => (
              <option key={t} value={t}>
                {t.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <Label>Размер (px)</Label>
            <input
              type="number"
              value={p.fontSize}
              min={12}
              max={120}
              onChange={(e) => onChange({ ...el, heading: { ...p, fontSize: +e.target.value } })}
              style={inputStyle}
            />
          </div>
          <div>
            <Label>Цвет</Label>
            <input
              type="color"
              value={p.color}
              onChange={(e) => onChange({ ...el, heading: { ...p, color: e.target.value } })}
              style={{ ...inputStyle, padding: 2, height: 36 }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (el.type === 'text' && el.text) {
    const p = el.text;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <Label>Содержимое</Label>
          <textarea
            value={p.content}
            rows={5}
            onChange={(e) => onChange({ ...el, text: { ...p, content: e.target.value } })}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
        <div>
          <Label>Цвет</Label>
          <input
            type="color"
            value={p.color}
            onChange={(e) => onChange({ ...el, text: { ...p, color: e.target.value } })}
            style={{ ...inputStyle, padding: 2, height: 36 }}
          />
        </div>
      </div>
    );
  }

  if (el.type === 'button' && el.button) {
    const p = el.button;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <Label>Текст кнопки</Label>
          <input
            value={p.label}
            onChange={(e) => onChange({ ...el, button: { ...p, label: e.target.value } })}
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <Label>Стиль</Label>
            <select
              value={p.style}
              onChange={(e) => onChange({ ...el, button: { ...p, style: e.target.value as any } })}
              style={selectStyle}
            >
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="outline">Outline</option>
            </select>
          </div>
          <div>
            <Label>Размер</Label>
            <select
              value={p.size}
              onChange={(e) => onChange({ ...el, button: { ...p, size: e.target.value as any } })}
              style={selectStyle}
            >
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  if (el.type === 'divider' && el.divider) {
    const p = el.divider;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <Label>Стиль</Label>
            <select
              value={p.lineStyle}
              onChange={(e) => onChange({ ...el, divider: { ...p, lineStyle: e.target.value as any } })}
              style={selectStyle}
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </div>
          <div>
            <Label>Толщина (px)</Label>
            <input
              type="number"
              value={p.weight}
              min={1}
              max={10}
              onChange={(e) => onChange({ ...el, divider: { ...p, weight: +e.target.value } })}
              style={inputStyle}
            />
          </div>
        </div>
        <div>
          <Label>Цвет</Label>
          <input
            type="color"
            value={p.color}
            onChange={(e) => onChange({ ...el, divider: { ...p, color: e.target.value } })}
            style={{ ...inputStyle, padding: 2, height: 36 }}
          />
        </div>
      </div>
    );
  }

  if (el.type === 'spacer' && el.spacer) {
    const p = el.spacer;
    return (
      <div>
        <Label>Высота (px)</Label>
        <input
          type="number"
          value={p.height}
          min={10}
          max={500}
          onChange={(e) => onChange({ ...el, spacer: { ...p, height: +e.target.value } })}
          style={inputStyle}
        />
      </div>
    );
  }

  if (el.type === 'icon-box' && el.iconBox) {
    const p = el.iconBox;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <Label>Заголовок</Label>
          <input
            value={p.title}
            onChange={(e) => onChange({ ...el, iconBox: { ...p, title: e.target.value } })}
            style={inputStyle}
          />
        </div>
        <div>
          <Label>Описание</Label>
          <textarea
            value={p.description}
            rows={3}
            onChange={(e) => onChange({ ...el, iconBox: { ...p, description: e.target.value } })}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
        <IconPicker
          value={p.icon}
          onChange={(icon) =>
            onChange({ ...el, iconBox: { ...p, icon: icon as keyof typeof LucideIcons } })
          }
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <Label>Расположение</Label>
            <select
              value={p.layout}
              onChange={(e) => onChange({ ...el, iconBox: { ...p, layout: e.target.value as any } })}
              style={selectStyle}
            >
              <option value="top">Сверху</option>
              <option value="left">Слева</option>
            </select>
          </div>
          <div>
            <Label>Цвет иконки</Label>
            <input
              type="color"
              value={p.iconColor}
              onChange={(e) => onChange({ ...el, iconBox: { ...p, iconColor: e.target.value } })}
              style={{ ...inputStyle, padding: 2, height: 36 }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (el.type === 'cta' && el.cta) {
    const p = el.cta;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <Label>Заголовок</Label>
          <input
            value={p.headline}
            onChange={(e) => onChange({ ...el, cta: { ...p, headline: e.target.value } })}
            style={inputStyle}
          />
        </div>
        <div>
          <Label>Описание</Label>
          <textarea
            value={p.description}
            rows={3}
            onChange={(e) => onChange({ ...el, cta: { ...p, description: e.target.value } })}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
        <div>
          <Label>Текст кнопки</Label>
          <input
            value={p.buttonText}
            onChange={(e) => onChange({ ...el, cta: { ...p, buttonText: e.target.value } })}
            style={inputStyle}
          />
        </div>
      </div>
    );
  }

  if (el.type === 'video-embed' && el.videoEmbed) {
    const p = el.videoEmbed;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <Label>URL (YouTube / Vimeo / mp4)</Label>
          <input
            value={p.url}
            onChange={(e) => onChange({ ...el, videoEmbed: { ...p, url: e.target.value } })}
            placeholder="https://www.youtube.com/watch?v=..."
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textDim, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={p.autoplay}
              onChange={(e) => onChange({ ...el, videoEmbed: { ...p, autoplay: e.target.checked } })}
            />
            Autoplay
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textDim, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={p.loop}
              onChange={(e) => onChange({ ...el, videoEmbed: { ...p, loop: e.target.checked } })}
            />
            Loop
          </label>
        </div>
        <div>
          <Label>Aspect ratio</Label>
          <select
            value={p.aspectRatio}
            onChange={(e) => onChange({ ...el, videoEmbed: { ...p, aspectRatio: e.target.value } })}
            style={selectStyle}
          >
            <option value="16/9">16:9</option>
            <option value="4/3">4:3</option>
            <option value="1/1">1:1</option>
            <option value="21/9">21:9 (cinemascope)</option>
            <option value="9/16">9:16 (vertical)</option>
          </select>
        </div>
      </div>
    );
  }

  if (el.type === 'section-preset' && el.sectionPreset) {
    const sp = el.sectionPreset;
    const entries = Object.entries(sp.props);
    // 2-column grid: компактные поля (enum/number/boolean/short string) — 1 кол,
    // длинные (textarea, JSON) — span 2. Сокращает высоту панели вдвое для
    // preset'ов с 6+ props и убирает scrollbar.
    const SPAN2: React.CSSProperties = { gridColumn: 'span 2' };
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <div style={SPAN2}>
          <Label>Preset</Label>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: C.accent, marginBottom: 4 }}>{sp.presetId}</div>
        </div>
        {entries.length === 0 && (
          <div style={{ ...SPAN2, fontSize: 12, color: C.textMute, padding: 12, textAlign: 'center', border: `1px dashed ${C.line}`, borderRadius: 6 }}>
            Tenant-coupled preset · данные берутся из tenant-context при рендере
          </div>
        )}
        {entries.map(([key, value]) => {
          // Пропускаем props, которые рендерятся в Style tab (align и т.п.) —
          // не дублируем UI.
          if (STYLE_TAB_KEYS.has(key)) return null;
          const updateKey = (next: unknown) =>
            onChange({ ...el, sectionPreset: { ...sp, props: { ...sp.props, [key]: next } } });
          // Known enum keys for section-preset props — render as <select>, not <input>.
          // Иначе пользователь введёт что угодно ("leftt", "цэнтр") и сломает рендер.
          const enumOptions = PRESET_ENUM_KEYS[key];
          if (enumOptions && typeof value === 'string') {
            return (
              <div key={key}>
                <Label>{key}</Label>
                <select
                  value={value}
                  onChange={(e) => updateKey(e.target.value)}
                  style={selectStyle}
                >
                  {enumOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            );
          }
          if (typeof value === 'string') {
            const isLong = value.length > 40;
            return (
              <div key={key} style={isLong ? SPAN2 : undefined}>
                <Label>{key}</Label>
                {isLong ? (
                  <textarea
                    value={value}
                    rows={3}
                    onChange={(e) => updateKey(e.target.value)}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                ) : (
                  <input value={value} onChange={(e) => updateKey(e.target.value)} style={inputStyle} />
                )}
              </div>
            );
          }
          if (typeof value === 'number') {
            return (
              <div key={key}>
                <Label>{key}</Label>
                <input type="number" value={value} onChange={(e) => updateKey(+e.target.value)} style={inputStyle} />
              </div>
            );
          }
          if (typeof value === 'boolean') {
            return (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.textDim, cursor: 'pointer', paddingTop: 18 }}>
                <input type="checkbox" checked={value} onChange={(e) => updateKey(e.target.checked)} />
                {key}
              </label>
            );
          }
          if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
            return (
              <div key={key} style={SPAN2}>
                <Label>{key} (JSON)</Label>
                <textarea
                  defaultValue={JSON.stringify(value, null, 2)}
                  rows={6}
                  onBlur={(e) => {
                    try {
                      updateKey(JSON.parse(e.target.value));
                    } catch {
                      // ignore — оставляем старое значение
                    }
                  }}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: 11 }}
                />
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  }

  if (el.type === 'image') {
    const p = el.image ?? {};
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {p.url ? (
          <div>
            <img
              src={p.url}
              alt={p.alt || ''}
              style={{ width: '100%', borderRadius: 6, marginBottom: 8, display: 'block' }}
            />
            <button
              onClick={onOpenMediaPicker}
              style={{
                width: '100%',
                background: C.surface2,
                border: `1px solid ${C.line}`,
                color: C.textDim,
                borderRadius: 6,
                padding: '7px 0',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Заменить изображение
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenMediaPicker}
            style={{
              width: '100%',
              background: C.surface2,
              border: `2px dashed ${C.line}`,
              color: C.textDim,
              borderRadius: 8,
              padding: '16px 0',
              cursor: 'pointer',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <LucideIcons.Image size={16} /> Выбрать из медиатеки
          </button>
        )}
        <div>
          <Label>Alt текст</Label>
          <input
            value={p.alt || ''}
            onChange={(e) => onChange({ ...el, image: { ...p, alt: e.target.value } })}
            style={inputStyle}
            placeholder="Описание изображения"
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ color: C.textMute, fontSize: 12, textAlign: 'center', padding: 20 }}>
      Нет свойств
    </div>
  );
}

// ─── Floating panel — element / section variants ──────────────────────────────

// Header drag handler — позволяет таскать панель за заголовок. Hooks-free
// (использует document listeners), state идёт через store напрямую.
function startHeaderDrag(e: React.MouseEvent): void {
  // Не запускаем drag при клике по кнопке внутри хедера (Trash / Close).
  if ((e.target as HTMLElement).closest('button')) return;
  e.preventDefault();
  const startMouseX = e.clientX;
  const startMouseY = e.clientY;
  const initial = useEditorStore.getState().floatingPanel;
  if (!initial) return;
  const startPanelX = initial.x;
  const startPanelY = initial.y;
  document.body.style.cursor = 'grabbing';
  document.body.style.userSelect = 'none';
  const onMove = (mv: MouseEvent) => {
    const fp = useEditorStore.getState().floatingPanel;
    if (!fp) return;
    useEditorStore.getState().setFloatingPanel({
      ...fp,
      x: startPanelX + (mv.clientX - startMouseX),
      y: startPanelY + (mv.clientY - startMouseY),
    });
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

export const FloatingPropsPanel = forwardRef<HTMLDivElement>(function FloatingPropsPanel(_props, ref) {
  const floatingPanel = useEditorStore((s) => s.floatingPanel);
  const sections = useEditorStore((s) => s.sections);
  const panelTab = useEditorStore((s) => s.panelTab);
  const hoveredPanelTab = useEditorStore((s) => s.hoveredPanelTab);
  const setFloatingPanel = useEditorStore((s) => s.setFloatingPanel);
  const setPanelTab = useEditorStore((s) => s.setPanelTab);
  const setHoveredPanelTab = useEditorStore((s) => s.setHoveredPanelTab);
  const setMediaPickerTarget = useEditorStore((s) => s.setMediaPickerTarget);
  const deleteElement = useEditorStore((s) => s.deleteElement);
  const updateElement = useEditorStore((s) => s.updateElement);
  const updateSectionPadding = useEditorStore((s) => s.updateSectionPadding);

  // Save-button state — кратковременный визуальный фидбек (галочка вместо
  // дискеты на 1.2s). handleSave блюрит активный input → срабатывают onBlur
  // хендлеры (в section-preset JSON-поля применяются ТОЛЬКО на blur, иначе
  // изменения теряются если пользователь не Tab'нул из поля перед закрытием).
  const [savedFlash, setSavedFlash] = useState(false);
  const handleSave = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  }, []);

  if (!floatingPanel) return null;

  const allElements = sections.flatMap((s) => s.columns.flatMap((c) => c.elements));

  if (floatingPanel.kind === 'element') {
    const panelEl = allElements.find((e) => e.id === floatingPanel.id);
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
    ]
      .filter(Boolean)
      .join('\n');

    return (
      <div
        ref={ref}
        style={{
          position: 'fixed',
          left: floatingPanel.x,
          top: floatingPanel.y,
          width: PANEL_WIDTH,
          background: C.surface,
          border: `1px solid ${C.lineStr}`,
          borderRadius: 12,
          boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: `min(${PANEL_MAX_H_VH * 100}vh, ${PANEL_MAX_H_CAP}px)`,
        }}
      >
        <div
          onMouseDown={startHeaderDrag}
          title="Перетащи за эту полоску чтобы переместить панель"
          style={{
            padding: '10px 14px',
            borderBottom: `1px solid ${C.line}`,
            background: C.surface2,
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: C.accent,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              {panelEl.type}
            </div>
            <button
              onClick={handleSave}
              style={{
                ...topBtnStyle,
                padding: '3px 6px',
                color: savedFlash ? C.green : C.textDim,
                transition: 'color 150ms',
              }}
              title="Сохранить правки (blur активного поля + apply)"
            >
              {savedFlash ? <LucideIcons.Check size={13} /> : <LucideIcons.Save size={13} />}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => {
                deleteElement(panelEl.id);
                setFloatingPanel(null);
              }}
              style={{ ...topBtnStyle, color: C.red, padding: '3px 6px' }}
              title="Удалить (Delete)"
            >
              <LucideIcons.Trash2 size={13} />
            </button>
            <button
              onClick={() => setFloatingPanel(null)}
              style={{ ...topBtnStyle, padding: '3px 6px' }}
              title="Закрыть (Esc)"
            >
              <LucideIcons.X size={13} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: `1px solid ${C.line}`, flexShrink: 0 }}>
          {tabs.map((tab) => {
            const Icon = LucideIcons[tab.icon] as React.ComponentType<{ size?: number }>;
            const isActive = panelTab === tab.id;
            const isHovered = hoveredPanelTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setPanelTab(tab.id)}
                title={tab.label}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? `2px solid ${C.accent}` : '2px solid transparent',
                  color: isActive ? C.accent : C.textMute,
                  cursor: 'pointer',
                  padding: '10px 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  setHoveredPanelTab(tab.id);
                  if (!isActive) (e.currentTarget as HTMLElement).style.color = C.textDim;
                }}
                onMouseLeave={(e) => {
                  setHoveredPanelTab(null);
                  if (!isActive) (e.currentTarget as HTMLElement).style.color = C.textMute;
                }}
              >
                {Icon && <Icon size={14} />}
                {isHovered && <span style={{ fontSize: 9, whiteSpace: 'nowrap' }}>{tab.label}</span>}
              </button>
            );
          })}
        </div>

        <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
          {panelTab === 'content' && (
            <PropertiesContent
              el={panelEl}
              onChange={updateElement}
              onOpenMediaPicker={panelEl.type === 'image' ? () => setMediaPickerTarget(panelEl.id) : undefined}
            />
          )}

          {panelTab === 'style' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {(() => {
                // Align рендерится здесь (а не в Content) — общий контрол для
                // всех виджетов у которых есть выравнивание (heading/text/
                // button/cta/section-preset.props.align).
                const align = getElementAlignBinding(panelEl);
                if (!align) return null;
                return (
                  <div>
                    <Label>Выравнивание</Label>
                    <select
                      value={align.value}
                      onChange={(e) => updateElement(align.set(e.target.value as AlignVal))}
                      style={selectStyle}
                    >
                      <option value="left">Левое</option>
                      <option value="center">Центр</option>
                      <option value="right">Правое</option>
                    </select>
                  </div>
                );
              })()}
              <div>
                <Label>Отступы (px)</Label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {(['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const).map((k) => (
                    <div key={k}>
                      <div style={{ fontSize: 9, color: C.textMute, marginBottom: 3 }}>
                        {
                          ({
                            paddingTop: 'Сверху',
                            paddingRight: 'Справа',
                            paddingBottom: 'Снизу',
                            paddingLeft: 'Слева',
                          } as const)[k]
                        }
                      </div>
                      <input
                        type="number"
                        value={s[k]}
                        min={0}
                        max={200}
                        onChange={(e) =>
                          updateElement({ ...panelEl, elStyle: { ...s, [k]: +e.target.value } })
                        }
                        style={inputStyle}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <Label>Фон</Label>
                  <input
                    type="color"
                    value={s.background === 'transparent' ? '#0E0F12' : s.background}
                    onChange={(e) =>
                      updateElement({ ...panelEl, elStyle: { ...s, background: e.target.value } })
                    }
                    style={{ ...inputStyle, padding: 2, height: 36 }}
                  />
                </div>
                <div>
                  <Label>Радиус (px)</Label>
                  <input
                    type="number"
                    value={s.borderRadius}
                    min={0}
                    max={100}
                    onChange={(e) =>
                      updateElement({ ...panelEl, elStyle: { ...s, borderRadius: +e.target.value } })
                    }
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <Label>Прозрачность: {s.opacity}%</Label>
                <input
                  type="range"
                  value={s.opacity}
                  min={10}
                  max={100}
                  onChange={(e) =>
                    updateElement({ ...panelEl, elStyle: { ...s, opacity: +e.target.value } })
                  }
                  style={{ width: '100%', accentColor: C.accent }}
                />
              </div>
            </div>
          )}

          {panelTab === 'css' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <Label>Сгенерированный CSS</Label>
                <pre
                  style={{
                    background: C.bg,
                    border: `1px solid ${C.line}`,
                    borderRadius: 6,
                    padding: 10,
                    fontSize: 11,
                    color: C.green,
                    margin: 0,
                    overflowX: 'auto',
                    lineHeight: 1.6,
                  }}
                >
                  {generatedCss || '/* нет стилей */'}
                </pre>
              </div>
              <div>
                <Label>Кастомный CSS</Label>
                <textarea
                  value={s.customCss}
                  rows={6}
                  placeholder="color: red;&#10;font-size: 18px;"
                  onChange={(e) =>
                    updateElement({ ...panelEl, elStyle: { ...s, customCss: e.target.value } })
                  }
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    fontFamily: 'monospace',
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                />
                <div style={{ fontSize: 10, color: C.textMute, marginTop: 4 }}>
                  Применяется inline к элементу
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // section variant
  const sec = sections.find((s) => s.id === floatingPanel.id);
  if (!sec) return null;
  const [t, r, b, l] = parsePadding(sec.padding);
  const updateEdge = (i: 0 | 1 | 2 | 3, v: number) => {
    const vals: [number, number, number, number] = [t, r, b, l];
    vals[i] = v;
    updateSectionPadding(sec.id, `${vals[0]}px ${vals[1]}px ${vals[2]}px ${vals[3]}px`);
  };
  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: floatingPanel.x,
        top: floatingPanel.y,
        width: 300,
        background: C.surface,
        border: `1px solid ${C.lineStr}`,
        borderRadius: 12,
        boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '80vh',
      }}
    >
      <div
        onMouseDown={startHeaderDrag}
        title="Перетащи за эту полоску чтобы переместить панель"
        style={{
          padding: '10px 14px',
          borderBottom: `1px solid ${C.line}`,
          background: C.surface2,
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: C.accent,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            section
          </div>
          <button
            onClick={handleSave}
            style={{
              ...topBtnStyle,
              padding: '3px 6px',
              color: savedFlash ? C.green : C.textDim,
              transition: 'color 150ms',
            }}
            title="Сохранить правки (blur активного поля + apply)"
          >
            {savedFlash ? <LucideIcons.Check size={13} /> : <LucideIcons.Save size={13} />}
          </button>
        </div>
        <button
          onClick={() => setFloatingPanel(null)}
          style={{ ...topBtnStyle, padding: '3px 6px' }}
          title="Закрыть (Esc)"
        >
          <LucideIcons.X size={13} />
        </button>
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
});
