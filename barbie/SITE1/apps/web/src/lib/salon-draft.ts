/**
 * Draft-персистентность для per-salon контента колонки на /admin/projects
 * (SEO главной + текст аккордеона «Услуги»).
 *
 * Пока — localStorage (страница работает в DRAFT MODE, как и design-tokens до
 * появления API). Когда подключим admin-эндпоинты:
 *   - SEO → `cms_pages(slug='home').meta_title / meta_description`
 *   - Услуги → таблица `services`
 * заменим load/save на API, сохранив сигнатуру.
 */

/** Настройки одной точки касания (CTA-элемента на сайте). */
export interface TouchpointConfig {
  /** активна ли точка на сайте */
  enabled: boolean;
  /** текст кнопки/ссылки (может варьироваться) */
  label: string;
  /** цель: ссылка / якорь / телефон / @username — зависит от типа */
  value: string;
}

/** Ключи точек касания: ряд 1 (CTA на сайте) + ряд 2 (интерактив). */
export type TouchpointKey =
  | 'booking'
  | 'operator'
  | 'footer'
  | 'callWidget'
  | 'telegram'
  | 'quiz'
  | 'popup';

export interface SalonDraft {
  /** SEO главной — meta title */
  seoTitle: string;
  /** SEO главной — meta description */
  seoDescription: string;
  /** Текст аккордеона «Услуги» (свободный многострочный) */
  services: string;
  /** Конфиг точек касания (per-key) */
  touchpoints: Partial<Record<TouchpointKey, TouchpointConfig>>;
}

export const EMPTY_DRAFT: SalonDraft = {
  seoTitle: '',
  seoDescription: '',
  services: '',
  touchpoints: {},
};

const KEY_PREFIX = 'salon-draft-';

function key(id: string): string {
  return KEY_PREFIX + id;
}

export function loadDraft(id: string): SalonDraft {
  if (typeof window === 'undefined') return { ...EMPTY_DRAFT };
  try {
    const raw = window.localStorage.getItem(key(id));
    if (!raw) return { ...EMPTY_DRAFT };
    const parsed = JSON.parse(raw) as Partial<SalonDraft>;
    return {
      seoTitle: typeof parsed.seoTitle === 'string' ? parsed.seoTitle : '',
      seoDescription: typeof parsed.seoDescription === 'string' ? parsed.seoDescription : '',
      services: typeof parsed.services === 'string' ? parsed.services : '',
      touchpoints:
        parsed.touchpoints && typeof parsed.touchpoints === 'object' ? parsed.touchpoints : {},
    };
  } catch {
    return { ...EMPTY_DRAFT };
  }
}

export function saveDraft(id: string, draft: SalonDraft): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key(id), JSON.stringify(draft));
  } catch {
    /* quota / disabled — ignore */
  }
}
