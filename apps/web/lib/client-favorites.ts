const STORAGE_KEY = 'lovnge_client_favorites_v1';

export type FavoriteModel = {
  slug: string;
  displayName: string;
  addedAt: number;
};

function readAll(): FavoriteModel[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is FavoriteModel =>
          x &&
          typeof x === 'object' &&
          typeof (x as FavoriteModel).slug === 'string' &&
          typeof (x as FavoriteModel).displayName === 'string',
      )
      .map((x) => ({
        slug: x.slug.trim(),
        displayName: x.displayName.trim() || x.slug,
        addedAt: typeof x.addedAt === 'number' ? x.addedAt : Date.now(),
      }))
      .filter((x) => x.slug.length > 0);
  } catch {
    return [];
  }
}

function writeAll(items: FavoriteModel[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getFavoriteModels(): FavoriteModel[] {
  const list = readAll();
  const seen = new Set<string>();
  const out: FavoriteModel[] = [];
  for (const x of list) {
    const k = x.slug.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out.sort((a, b) => b.addedAt - a.addedAt);
}

export function isFavoriteSlug(slug: string): boolean {
  const s = slug.trim().toLowerCase();
  return readAll().some((x) => x.slug.toLowerCase() === s);
}

export function addFavoriteModel(slug: string, displayName: string) {
  const s = slug.trim();
  if (!s) return;
  const list = readAll().filter((x) => x.slug.toLowerCase() !== s.toLowerCase());
  list.push({ slug: s, displayName: displayName.trim() || s, addedAt: Date.now() });
  writeAll(list);
}

export function removeFavoriteModel(slug: string) {
  const s = slug.trim().toLowerCase();
  writeAll(readAll().filter((x) => x.slug.toLowerCase() !== s));
}

export function toggleFavoriteModel(slug: string, displayName: string): boolean {
  if (isFavoriteSlug(slug)) {
    removeFavoriteModel(slug);
    return false;
  }
  addFavoriteModel(slug, displayName);
  return true;
}
