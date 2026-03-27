const STORAGE_KEY = 'lovnge_hero_slider';
const SLOGAN_KEY = 'lovnge_hero_slogan';
export const SLOGAN_MAX_LENGTH = 15;

const DEFAULT_IMAGES = [
  '/slider/s01.jpg',
  '/slider/s02.jpg',
  '/slider/s03.jpg',
  '/slider/s04.jpg',
  '/slider/s05.jpg',
  '/slider/s06.jpg',
  '/slider/s07.jpg',
  '/slider/s08.jpg',
  '/slider/s09.jpg',
  '/slider/s10.jpg',
];

export interface HeroSlogan {
  line1: string;
  line2: string;
  subtitle: string;
}

export const DEFAULT_SLOGAN: HeroSlogan = {
  line1: 'Элитное',
  line2: 'сопровождение',
  subtitle: 'Приватная платформа с верифицированными моделями премиум-класса',
};

export function getHeroImages(): string[] {
  if (typeof window === 'undefined') return DEFAULT_IMAGES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_IMAGES;
}

export function setHeroImages(images: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
}

export function getHeroSlogan(): HeroSlogan {
  if (typeof window === 'undefined') return DEFAULT_SLOGAN;
  try {
    const stored = localStorage.getItem(SLOGAN_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed.line1 === 'string') return { ...DEFAULT_SLOGAN, ...parsed };
    }
  } catch {}
  return DEFAULT_SLOGAN;
}

export function setHeroSlogan(slogan: HeroSlogan) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SLOGAN_KEY, JSON.stringify({
    line1: slogan.line1.slice(0, SLOGAN_MAX_LENGTH),
    line2: slogan.line2.slice(0, SLOGAN_MAX_LENGTH),
    subtitle: slogan.subtitle,
  }));
}

export { DEFAULT_IMAGES };
