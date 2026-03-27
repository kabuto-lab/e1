/**
 * Postgres text[] often serializes in JSON as "{a,b}" instead of ["a","b"].
 */
export function parsePgTextArray(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.filter((x): x is string => typeof x === 'string' && x.length > 0);
  }
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return [];
    if (s.startsWith('{') && s.endsWith('}')) {
      const inner = s.slice(1, -1).trim();
      if (!inner) return [];
      return inner
        .split(',')
        .map((x) => x.trim().replace(/^"(.*)"$/, '$1'))
        .filter(Boolean);
    }
    try {
      const parsed = JSON.parse(s) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === 'string' && x.length > 0);
      }
    } catch {
      /* single raw string */
    }
    return [s];
  }
  return [];
}
