/**
 * ED-editor — общая модель документа.
 *
 * Персистентный контракт страницы, собранной в ED: дерево
 * `Section → Column → CanvasElement`. Сохраняется в `cms_pages.body`
 * внутри блока `custom` (`data.ed`).
 *
 * Единственный источник этих типов. Импортируется и редактором
 * (`SandboxEditor.tsx`), и публичным рендерером (`WidgetView.tsx`,
 * `EdRenderer.tsx`) — чтобы модель не разъехалась между ними.
 *
 * Здесь — только то, что персистится. UI-состояние редактора
 * (категории палитры, drop-target, floating-panel, device-mode)
 * остаётся приватным в `SandboxEditor.tsx`.
 */
import type * as LucideIcons from 'lucide-react';

// ─── Виджеты ──────────────────────────────────────────────────────────────────

export type WidgetType =
  | 'heading'
  | 'text'
  | 'button'
  | 'divider'
  | 'spacer'
  | 'icon-box'
  | 'cta'
  | 'image';

export interface HeadingProps {
  text: string;
  tag: 'h1' | 'h2' | 'h3' | 'h4';
  align: 'left' | 'center' | 'right';
  color: string;
  fontSize: number;
}

export interface TextProps {
  content: string;
  align: 'left' | 'center' | 'right';
  color: string;
}

export interface ButtonProps {
  label: string;
  align: 'left' | 'center' | 'right';
  style: 'primary' | 'secondary' | 'outline';
  size: 'sm' | 'md' | 'lg';
}

export interface DividerProps {
  lineStyle: 'solid' | 'dashed' | 'dotted';
  color: string;
  weight: number;
}

export interface SpacerProps {
  height: number;
}

export interface IconBoxProps {
  icon: keyof typeof LucideIcons;
  title: string;
  description: string;
  iconColor: string;
  layout: 'top' | 'left';
}

export interface CtaProps {
  headline: string;
  description: string;
  buttonText: string;
  align: 'left' | 'center' | 'right';
}

export interface ImageProps {
  url?: string;
  alt?: string;
}

// ─── Стиль элемента ───────────────────────────────────────────────────────────

export interface ElStyle {
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  background: string;
  borderRadius: number;
  opacity: number;
  /**
   * Произвольный CSS элемента. Редактор поле хранит, но НЕ применяет;
   * публичный рендерер в M1 его тоже игнорирует (решение Level 1 #5).
   */
  customCss: string;
}

export const defaultElStyle = (): ElStyle => ({
  paddingTop: 12,
  paddingRight: 12,
  paddingBottom: 12,
  paddingLeft: 12,
  background: 'transparent',
  borderRadius: 0,
  opacity: 100,
  customCss: '',
});

// ─── Дерево документа ─────────────────────────────────────────────────────────

export interface CanvasElement {
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

export interface Column {
  id: string;
  span: number;
  elements: CanvasElement[];
}

export interface Section {
  id: string;
  columns: Column[];
  padding: string;
}
