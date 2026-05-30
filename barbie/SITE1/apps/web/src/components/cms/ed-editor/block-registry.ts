/**
 * Block Registry — центральный реестр всех ED-блоков выше Atom-уровня.
 *
 * Φ3: 6 Section preset'ов — обёртки existing `tenant-site/sections/*`.
 *
 * Atoms (heading/text/button/...) НЕ регистрируются здесь — они обрабатываются
 * напрямую в `WidgetView` через switch по type. Registry нужен для блоков,
 * которые добавляются позже разработчиком без расширения core-switch.
 *
 * Будущие категории (планируются в Φ6):
 *  - 'data-block' — виджет, привязанный к таблице БД (ModelGrid, ServicesList).
 *
 * Палитра в ED читает registry и фильтрует по `tenant.siteType` (Φ4+).
 */
import type { ComponentType } from 'react';
import type { Tenant } from '@/lib/tenants';
import { HeroPreset } from './presets/HeroPreset';
import { StaffPreset } from './presets/StaffPreset';
import { ProgramsPreset } from './presets/ProgramsPreset';
import { RoomsPreset } from './presets/RoomsPreset';
import { ContactsPreset } from './presets/ContactsPreset';
import { FooterPreset } from './presets/FooterPreset';
import { HeroVideoBackgroundPreset, heroVideoBackgroundDefaults } from './presets/HeroVideoBackgroundPreset';
import { FourColIconBoxesPreset, fourColIconBoxesDefaults } from './presets/FourColIconBoxesPreset';
import { ContactFormPreset, contactFormDefaults } from './presets/ContactFormPreset';

export type BlockCategory = 'atom' | 'section-preset' | 'data-block';

export interface BlockRenderProps {
  props: Record<string, unknown>;
  mode?: 'editor' | 'render';
  /** Tenant-данные пробрасываются из контейнера (EdRenderer/SandboxEditor). */
  tenant?: Tenant;
}

export interface BlockDef {
  id: string;
  name: string;
  category: BlockCategory;
  description?: string;
  /** Иконка lucide для палитры. */
  iconName?: string;
  /** Тип сайта, где блок имеет смысл (Φ4+). Пусто = везде. */
  siteTypes?: string[];
  RenderComponent: ComponentType<BlockRenderProps>;
  /**
   * Φ6: дефолтные props при дропе preset'а на канвас. Standalone-блоки
   * (HeroVideoBackground, FourColIconBoxes, ContactForm) приходят с
   * предзаполненными значениями — тенант-coupled (Hero/Staff/…) живут на
   * пустых props и читают `tenant` из контекста.
   */
  defaultProps?: Record<string, unknown>;
}

export const BLOCK_REGISTRY: Record<string, BlockDef> = {
  hero: {
    id: 'hero',
    name: 'Hero',
    category: 'section-preset',
    description: 'Главный экран: бренд + tagline + CTA',
    iconName: 'LayoutPanelTop',
    RenderComponent: HeroPreset,
  },
  staff: {
    id: 'staff',
    name: 'Staff',
    category: 'section-preset',
    description: 'Сетка анкет: имя · тэг · возраст',
    iconName: 'Users',
    RenderComponent: StaffPreset,
  },
  programs: {
    id: 'programs',
    name: 'Programs',
    category: 'section-preset',
    description: 'Список услуг с длительностью и ценой',
    iconName: 'ListChecks',
    RenderComponent: ProgramsPreset,
  },
  rooms: {
    id: 'rooms',
    name: 'Rooms',
    category: 'section-preset',
    description: 'Интерьеры — имя + описание',
    iconName: 'DoorOpen',
    RenderComponent: RoomsPreset,
  },
  contacts: {
    id: 'contacts',
    name: 'Contacts',
    category: 'section-preset',
    description: 'Адрес, телефон, часы, соцсети',
    iconName: 'Phone',
    RenderComponent: ContactsPreset,
  },
  footer: {
    id: 'footer',
    name: 'Footer',
    category: 'section-preset',
    description: 'Подвал — бренд + копирайт',
    iconName: 'Minus',
    RenderComponent: FooterPreset,
  },
  // Φ6 — standalone Section presets (props-driven, не tenant-coupled).
  'hero-video-bg': {
    id: 'hero-video-bg',
    name: 'Hero Video',
    category: 'section-preset',
    description: 'Fullscreen hero с видео-фоном + CTA',
    iconName: 'PlayCircle',
    RenderComponent: HeroVideoBackgroundPreset,
    defaultProps: heroVideoBackgroundDefaults,
  },
  'four-col-icon-boxes': {
    id: 'four-col-icon-boxes',
    name: '4 IconBoxes',
    category: 'section-preset',
    description: '4 колонки с иконками и нумерацией',
    iconName: 'LayoutGrid',
    RenderComponent: FourColIconBoxesPreset,
    defaultProps: fourColIconBoxesDefaults,
  },
  'contact-form': {
    id: 'contact-form',
    name: 'Contact Form',
    category: 'section-preset',
    description: 'Форма записи: имя · телефон · услуга · сообщение',
    iconName: 'FormInput',
    RenderComponent: ContactFormPreset,
    defaultProps: contactFormDefaults,
  },
};

export function getBlockDef(presetId: string): BlockDef | null {
  return BLOCK_REGISTRY[presetId] ?? null;
}

export function listBlocks(category?: BlockCategory): BlockDef[] {
  const all = Object.values(BLOCK_REGISTRY);
  return category ? all.filter((b) => b.category === category) : all;
}
