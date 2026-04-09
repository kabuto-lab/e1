/**
 * Типографика оверлея главного слайда (редактор + публичный профиль).
 */

export const HERO_SLIDER_FONT_KEYS = [
  'unbounded',
  'inter',
  'playfair',
  'space_grotesk',
  'system',
] as const;

export type HeroSliderFontKey = (typeof HERO_SLIDER_FONT_KEYS)[number];

export type HeroSliderTypography = {
  fontKey?: HeroSliderFontKey | string | null;
  textColor?: string | null;
  metaColor?: string | null;
};

export const HERO_SLIDER_FONT_LABELS: Record<HeroSliderFontKey, string> = {
  unbounded: 'Unbounded (заголовки по умолчанию)',
  inter: 'Inter (основной текст)',
  playfair: 'Playfair Display',
  space_grotesk: 'Space Grotesk',
  system: 'Системный UI',
};

const DEFAULT_TEXT = '#ffffff';
const DEFAULT_META = 'rgba(255,255,255,0.65)';

export function normalizeHeroFontKey(raw: string | null | undefined): HeroSliderFontKey {
  if (raw && HERO_SLIDER_FONT_KEYS.includes(raw as HeroSliderFontKey)) {
    return raw as HeroSliderFontKey;
  }
  return 'unbounded';
}

/** CSS font-family stack (переменные задаются в layout через next/font). */
export function heroSliderFontFamily(fontKey: HeroSliderFontKey): string {
  switch (fontKey) {
    case 'inter':
      return 'var(--font-inter), "Inter", sans-serif';
    case 'playfair':
      return 'var(--font-playfair), "Playfair Display", serif';
    case 'space_grotesk':
      return 'var(--font-space-grotesk), "Space Grotesk", sans-serif';
    case 'system':
      return 'system-ui, -apple-system, "Segoe UI", sans-serif';
    case 'unbounded':
    default:
      return 'var(--font-unbounded), "Unbounded", sans-serif';
  }
}

export function resolveHeroSliderTypography(raw?: HeroSliderTypography | null): {
  fontKey: HeroSliderFontKey;
  fontFamily: string;
  textColor: string;
  metaColor: string;
} {
  const fontKey = normalizeHeroFontKey(raw?.fontKey ?? undefined);
  const textColor = raw?.textColor?.trim() || DEFAULT_TEXT;
  const metaColor = raw?.metaColor?.trim() || DEFAULT_META;
  return {
    fontKey,
    fontFamily: heroSliderFontFamily(fontKey),
    textColor,
    metaColor,
  };
}
