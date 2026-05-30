/**
 * Page Templates — заранее заготовленные дерева Section[] для быстрого старта.
 *
 * Φ7: тенант создаёт новую CMS-страницу и выбирает шаблон близкий к референсу
 * (e.g. для imperiumspa-style сайта — "Спа-салон · Главная"). Клон шаблона
 * грузится в редактор, тенант начинает редактировать пропсы, а не строить
 * с пустого канваса.
 *
 * Дерево использует тот же контракт `Section[]` что и cms_pages.body.ed —
 * можно дропнуть как `initialSections` в SandboxEditor.
 */
import type { Section, CanvasElement } from '@/components/cms/ed-editor/ed-types';
import {
  heroVideoBackgroundDefaults,
} from '@/components/cms/ed-editor/presets/HeroVideoBackgroundPreset';
import {
  fourColIconBoxesDefaults,
} from '@/components/cms/ed-editor/presets/FourColIconBoxesPreset';
import {
  contactFormDefaults,
} from '@/components/cms/ed-editor/presets/ContactFormPreset';

const uid = () => Math.random().toString(36).slice(2, 9);

function presetEl(presetId: string, props: Record<string, unknown> = {}): CanvasElement {
  return { id: uid(), type: 'section-preset', sectionPreset: { presetId, props } };
}

function singleColSection(...elements: CanvasElement[]): Section {
  return {
    id: uid(),
    padding: '0',
    columns: [{ id: uid(), span: 12, elements }],
  };
}

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  /** Иконка lucide (для модала выбора). */
  iconName: string;
  build: () => Section[];
}

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'spa-salon-home',
    name: 'Спа-салон · Главная',
    description:
      'Hero (видео) → 4 преимущества → Состав → Интерьеры → Программы → Контакты → Форма → Footer',
    iconName: 'Sparkles',
    build: () => [
      singleColSection(presetEl('hero-video-bg', { ...heroVideoBackgroundDefaults })),
      singleColSection(presetEl('four-col-icon-boxes', { ...fourColIconBoxesDefaults })),
      singleColSection(presetEl('staff')),
      singleColSection(presetEl('rooms')),
      singleColSection(presetEl('programs')),
      singleColSection(presetEl('contacts')),
      singleColSection(presetEl('contact-form', { ...contactFormDefaults })),
      singleColSection(presetEl('footer')),
    ],
  },
  {
    id: 'landing-service',
    name: 'Лендинг услуги',
    description: 'Hero (видео) → 4 преимущества → Программы → Форма → Footer',
    iconName: 'Megaphone',
    build: () => [
      singleColSection(
        presetEl('hero-video-bg', {
          ...heroVideoBackgroundDefaults,
          eyebrow: 'Услуга',
          headline: 'Название услуги',
          tagline: 'Краткое описание ценностного предложения.',
        }),
      ),
      singleColSection(presetEl('four-col-icon-boxes', { ...fourColIconBoxesDefaults })),
      singleColSection(presetEl('programs')),
      singleColSection(presetEl('contact-form', { ...contactFormDefaults })),
      singleColSection(presetEl('footer')),
    ],
  },
  {
    id: 'about-us',
    name: 'О нас',
    description: 'Hero (текстовый) → Состав → Интерьеры → Контакты',
    iconName: 'Info',
    build: () => [
      singleColSection(
        presetEl('hero-video-bg', {
          ...heroVideoBackgroundDefaults,
          videoUrl: '',
          eyebrow: 'About',
          headline: 'О нас',
          tagline: 'Кто мы и что мы делаем.',
          ctaLabel: '',
        }),
      ),
      singleColSection(presetEl('staff')),
      singleColSection(presetEl('rooms')),
      singleColSection(presetEl('contacts')),
      singleColSection(presetEl('footer')),
    ],
  },
];

export function getTemplate(id: string): PageTemplate | null {
  return PAGE_TEMPLATES.find((t) => t.id === id) ?? null;
}
