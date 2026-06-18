import type { PublicGirl } from './public-girls-api';

/**
 * Общая логика клиентского фильтра анкет по параметрам.
 * Возраст/рост — диапазоны [min,max] (дабл-слайдеры), грудь/силикон — точечно.
 * Презентация — shared/GirlsFilter (theme-agnostic, акцент пропсом).
 */

export type Tri = 'any' | 'yes' | 'no';

export interface GirlFilterState {
  /** [min,max] или null = без ограничения по возрасту */
  age: [number, number] | null;
  /** [min,max] или null = без ограничения по росту */
  height: [number, number] | null;
  breast: number | null;
  silicon: Tri;
}

export const emptyGirlFilter: GirlFilterState = { age: null, height: null, breast: null, silicon: 'any' };

export function girlFilterActive(f: GirlFilterState): boolean {
  return !!f.age || !!f.height || f.breast != null || f.silicon !== 'any';
}

export interface GirlBounds {
  age: [number, number];
  height: [number, number];
}

const DEFAULT_AGE: [number, number] = [18, 45];
const DEFAULT_HEIGHT: [number, number] = [150, 185];

/** Границы слайдеров из реального ростера (с запасными значениями). */
export function girlBounds(girls: PublicGirl[]): GirlBounds {
  const range = (vals: number[], def: [number, number]): [number, number] => {
    const xs = vals.filter((n): n is number => n != null && Number.isFinite(n));
    if (!xs.length) return def;
    let lo = Math.floor(Math.min(...xs));
    let hi = Math.ceil(Math.max(...xs));
    if (lo === hi) hi = lo + 1; // не вырожденный слайдер
    return [lo, hi];
  };
  return {
    age: range(girls.map((g) => g.age as number), DEFAULT_AGE),
    height: range(girls.map((g) => g.height as number), DEFAULT_HEIGHT),
  };
}

/** Уникальные размеры груди (целая часть) в ростере — для чипов фильтра. */
export function breastOptions(girls: PublicGirl[]): number[] {
  const set = new Set<number>();
  for (const g of girls) if (g.breast != null) set.add(Math.floor(g.breast));
  return [...set].sort((a, b) => a - b);
}

export function applyGirlFilter(girls: PublicGirl[], f: GirlFilterState): PublicGirl[] {
  return girls.filter((g) => {
    if (f.age) {
      if (g.age == null || g.age < f.age[0] || g.age > f.age[1]) return false;
    }
    if (f.height) {
      if (g.height == null || g.height < f.height[0] || g.height > f.height[1]) return false;
    }
    if (f.breast != null) {
      if (g.breast == null || Math.floor(g.breast) !== f.breast) return false;
    }
    if (f.silicon === 'yes' && !g.silicon) return false;
    if (f.silicon === 'no' && g.silicon) return false;
    return true;
  });
}
