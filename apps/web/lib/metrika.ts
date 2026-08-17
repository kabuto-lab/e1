/**
 * Яндекс.Метрика — счётчик и отправка целей (конверсионных событий).
 * Счётчик подключается только в production (см. app/layout.tsx) — вне прода
 * window.ym не существует, ymGoal() в этом случае просто ничего не делает.
 */
export const YANDEX_METRIKA_ID = 111497387;

export function ymGoal(goal: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const ym = (window as unknown as { ym?: (...args: unknown[]) => void }).ym;
  if (typeof ym !== 'function') return;
  ym(YANDEX_METRIKA_ID, 'reachGoal', goal, params);
}
