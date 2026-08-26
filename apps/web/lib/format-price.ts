export function formatPrice(value: number | string | null | undefined): string {
  if (value == null) return '';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(n) ? String(Math.round(n)) : '';
};
