const STORAGE_KEY = 'lovnge_hero_slider_v4';
const SLOGAN_KEY = 'lovnge_hero_slogan';
export const SLOGAN_MAX_LENGTH = 15;

/**
 * Те же картинки picsum, но через same-origin rewrite `/pic-proxy/*` → picsum
 * Через same-origin `/pic-proxy/*` картинки не упираются в CORS/403 у picsum.
 */
const DEFAULT_IMAGES = [
  '/pic-proxy/seed/lovnge-h01/1920/1080',
  '/pic-proxy/seed/lovnge-h02/1920/1080',
  '/pic-proxy/seed/lovnge-h03/1920/1080',
  '/pic-proxy/seed/lovnge-h04/1920/1080',
  '/pic-proxy/seed/lovnge-h05/1920/1080',
  '/pic-proxy/seed/lovnge-h06/1920/1080',
  '/pic-proxy/seed/lovnge-h07/1920/1080',
  '/pic-proxy/seed/lovnge-h08/1920/1080',
  '/pic-proxy/seed/lovnge-h09/1920/1080',
  '/pic-proxy/seed/lovnge-h10/1920/1080',
];

/** Старые localStorage / внешние URL → same-origin прокси (WebGL + CORS). */
function normalizeHeroImageUrl(url: string): string {
  if (url.startsWith('/pic-proxy/') || url.startsWith('/img-proxy/')) return url;
  try {
    const u = new URL(url);
    if (u.hostname === 'picsum.photos') {
      return `/pic-proxy${u.pathname}${u.search}`;
    }
    if (u.hostname === 'images.unsplash.com') {
      return `/img-proxy${u.pathname}${u.search}`;
    }
  } catch {
    // относительный или невалидный URL
  }
  return url;
}

/**
 * http://127.0.0.1:3001/foo и http://localhost:3001/foo — разные origin.
 * Абсолютный URL того же хоста, что и страница, приводим к path+query, чтобы Image/canvas не были «чужими».
 */
export function sameHostToRelativePath(url: string): string {
  if (typeof window === 'undefined') return url;
  try {
    const u = new URL(url, window.location.href);
    if (u.origin === window.location.origin) {
      return `${u.pathname}${u.search}${u.hash}`;
    }
  } catch {
    /* keep */
  }
  return url;
}

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

function isPersistableImageUrl(url: string): boolean {
  if (typeof url !== 'string' || url.length === 0) return false;
  // blob: URLs are session-only; they break after reload or navigation.
  if (url.startsWith('blob:')) return false;
  return true;
}

export function getHeroImages(): string[] {
  if (typeof window === 'undefined') return DEFAULT_IMAGES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = parsed
          .filter((u: unknown) => isPersistableImageUrl(String(u)))
          .map((u: unknown) => sameHostToRelativePath(normalizeHeroImageUrl(String(u))));
        if (cleaned.length > 0) return cleaned;
      }
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
