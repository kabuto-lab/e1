import type { PublicGirl } from './public-girls-api';

/**
 * Общая логика клиентского фильтра анкет по параметрам (возраст/рост/грудь/силикон).
 * Те же диапазоны, что в дженерик-ModelsGrid — единый UX на всех сайтах.
 * Презентация — в shared/GirlsFilter (theme-agnostic, акцент пропсом).
 */

export const GIRL_AGE_RANGES: ReadonlyArray<{ label: string; min: number; max: number }> = [
  { label: '18–22', min: 18, max: 22 },
  { label: '23–27', min: 23, max: 27 },
  { label: '28–34', min: 28, max: 34 },
  { label: '35+', min: 35, max: 200 },
];

export const GIRL_HEIGHT_RANGES: ReadonlyArray<{ label: string; min: number; max: number }> = [
  { label: 'до 165', min: 0, max: 164 },
  { label: '165–172', min: 165, max: 172 },
  { label: '173+', min: 173, max: 300 },
];

export type Tri = 'any' | 'yes' | 'no';

export interface GirlFilterState {
  ageIdx: number | null;
  heightIdx: number | null;
  breast: number | null;
  silicon: Tri;
}

export const emptyGirlFilter: GirlFilterState = { ageIdx: null, heightIdx: null, breast: null, silicon: 'any' };

export function girlFilterActive(f: GirlFilterState): boolean {
  return f.ageIdx != null || f.heightIdx != null || f.breast != null || f.silicon !== 'any';
}

/** Уникальные размеры груди (целая часть) в ростере — для чипов фильтра. */
export function breastOptions(girls: PublicGirl[]): number[] {
  const set = new Set<number>();
  for (const g of girls) if (g.breast != null) set.add(Math.floor(g.breast));
  return [...set].sort((a, b) => a - b);
}

export function applyGirlFilter(girls: PublicGirl[], f: GirlFilterState): PublicGirl[] {
  return girls.filter((g) => {
    if (f.ageIdx != null) {
      const r = GIRL_AGE_RANGES[f.ageIdx];
      if (g.age == null || g.age < r.min || g.age > r.max) return false;
    }
    if (f.heightIdx != null) {
      const r = GIRL_HEIGHT_RANGES[f.heightIdx];
      if (g.height == null || g.height < r.min || g.height > r.max) return false;
    }
    if (f.breast != null) {
      if (g.breast == null || Math.floor(g.breast) !== f.breast) return false;
    }
    if (f.silicon === 'yes' && !g.silicon) return false;
    if (f.silicon === 'no' && g.silicon) return false;
    return true;
  });
}
