/**
 * ED-editor constants — NAS chrome palette, widget categories, shared input styles.
 * Pure data only. Content-side defaults (newElement) live in editor-helpers.
 */
import type * as LucideIcons from 'lucide-react';
import type React from 'react';
import type { CategoryKey, WidgetDef } from './editor-types';

export const C = {
  bg:         'rgb(var(--bg))',
  bgElev:     'rgb(var(--bg-elev))',
  surface:    'rgb(var(--surface))',
  surface2:   'rgb(var(--surface-2))',
  line:       'rgb(var(--line))',
  lineStr:    'rgb(var(--line-strong))',
  text:       'rgb(var(--text))',
  textDim:    'rgb(var(--text-dim))',
  textMute:   'rgb(var(--text-mute))',
  gold:       'rgb(var(--gold))',
  accent:     'rgb(var(--accent-2))',
  accentSoft: 'rgb(var(--accent-2) / 0.15)',
  accentLine: 'rgb(var(--accent-2) / 0.33)',
  red:        'rgb(var(--red))',
  green:      'rgb(var(--green))',
} as const;

export const categoriesData: Record<
  CategoryKey,
  { title: string; icon: keyof typeof LucideIcons; items: WidgetDef[] }
> = {
  sections: {
    title: 'Готовые секции',
    icon: 'LayoutTemplate',
    items: [
      // Φ6 — standalone (props-driven, не зависят от tenant-данных):
      { type: 'section-preset', icon: 'PlayCircle',     name: 'Hero Video',  presetId: 'hero-video-bg' },
      { type: 'section-preset', icon: 'LayoutGrid',     name: '4 Boxes',     presetId: 'four-col-icon-boxes' },
      { type: 'section-preset', icon: 'FormInput',      name: 'Contact',     presetId: 'contact-form' },
      // Φ3 — tenant-coupled (читают tenant из контекста):
      { type: 'section-preset', icon: 'LayoutPanelTop', name: 'Hero',     presetId: 'hero'     },
      { type: 'section-preset', icon: 'Users',          name: 'Staff',    presetId: 'staff'    },
      { type: 'section-preset', icon: 'ListChecks',     name: 'Programs', presetId: 'programs' },
      { type: 'section-preset', icon: 'DoorOpen',       name: 'Rooms',    presetId: 'rooms'    },
      { type: 'section-preset', icon: 'Phone',          name: 'Contacts', presetId: 'contacts' },
      { type: 'section-preset', icon: 'Minus',          name: 'Footer',   presetId: 'footer'   },
    ],
  },
  textual: {
    title: 'Текстовые элементы',
    icon: 'Text',
    items: [
      { type: 'heading', icon: 'Heading', name: 'Heading' },
      { type: 'text',    icon: 'Text',    name: 'Text' },
    ],
  },
  buttons: {
    title: 'Кнопки и CTA',
    icon: 'MousePointerClick',
    items: [
      { type: 'button', icon: 'MousePointerClick', name: 'Button' },
      { type: 'cta',    icon: 'Megaphone',         name: 'CTA' },
    ],
  },
  media: {
    title: 'Медиа',
    icon: 'Image',
    items: [
      { type: 'image',       icon: 'Image', name: 'Image' },
      { type: 'video-embed', icon: 'Youtube', name: 'Video' },
    ],
  },
  icons: {
    title: 'Иконки и боксы',
    icon: 'Star',
    items: [{ type: 'icon-box', icon: 'Package', name: 'Icon Box' }],
  },
  structure: {
    title: 'Структура',
    icon: 'LayoutDashboard',
    items: [
      { type: 'divider', icon: 'Minus',       name: 'Divider' },
      { type: 'spacer',  icon: 'ArrowUpDown', name: 'Spacer' },
    ],
  },
  interactive: {
    title: 'Интерактив',
    icon: 'RotateCw',
    items: [],
  },
};

export const toolTiles: { key: CategoryKey; icon: keyof typeof LucideIcons; name: string }[] = [
  { key: 'sections',    icon: 'LayoutTemplate',    name: 'Секции'     },
  { key: 'textual',     icon: 'Text',              name: 'Текст'      },
  { key: 'buttons',     icon: 'MousePointerClick', name: 'Кнопки'     },
  { key: 'media',       icon: 'Image',             name: 'Медиа'      },
  { key: 'icons',       icon: 'Star',              name: 'Иконки'     },
  { key: 'structure',   icon: 'LayoutDashboard',   name: 'Структура'  },
  { key: 'interactive', icon: 'RotateCw',          name: 'Интерактив' },
];

export const inputStyle: React.CSSProperties = {
  width: '100%',
  background: C.bg,
  border: `1px solid ${C.line}`,
  borderRadius: 6,
  color: C.text,
  padding: '7px 10px',
  fontSize: 13,
  boxSizing: 'border-box',
};

export const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

export const topBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: C.textDim,
  cursor: 'pointer',
  padding: '6px 8px',
  borderRadius: 6,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  transition: 'all 0.15s',
};
