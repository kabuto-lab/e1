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
  | 'image'
  /** Φ6: встроенное видео (YouTube/Vimeo iframe или mp4 <video>). */
  | 'video-embed'
  /**
   * Φ3: section-preset — обёртка готовой высокоуровневой секции
   * (Hero/Staff/Programs/…). Конкретика — в `sectionPreset.presetId`,
   * lookup идёт через `block-registry.BLOCK_REGISTRY`.
   */
  | 'section-preset';

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

export interface VideoEmbedProps {
  /** YouTube/Vimeo URL или прямой mp4. Детектирование внутри рендерера. */
  url: string;
  autoplay: boolean;
  loop: boolean;
  /** Соотношение сторон рамки в формате '16/9' / '4/3' / '1/1'. */
  aspectRatio: string;
}

/**
 * Φ3 — Section preset slot.
 *
 * `presetId` указывает на entry в `block-registry.BLOCK_REGISTRY`.
 * `props` — конфигурация конкретной инстанции preset'а (опциональная,
 * пустая в Φ3 — пока презеты читают только tenant из контекста).
 */
export interface SectionPresetProps {
  presetId: string;
  props: Record<string, unknown>;
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
  videoEmbed?: VideoEmbedProps;
  sectionPreset?: SectionPresetProps;
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
