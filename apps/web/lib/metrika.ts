/**
 * Яндекс.Метрика — счётчик и отправка целей (конверсионных событий).
 * Счётчик подключается только в production (см. app/layout.tsx) — вне прода
 * Новые цели отправляются параллельно старым; имена старых событий не меняются.
 */
export const YANDEX_METRIKA_ID = 111497387;

type Ym = ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };
const sentPayments = new Set<string>();
const paymentAttempts = new Map<string, number>();
const ATTEMPT_TTL = 24 * 60 * 60 * 1000;

function sendGoal(goal: string, params?: Record<string, unknown>): boolean {
  if (typeof window === 'undefined') return false;
  const browser = window as unknown as { ym?: Ym };
  if (typeof browser.ym !== 'function' && process.env.NODE_ENV === 'production') {
    // Same queue as the official loader: hydration may finish before next/script.
    const queue: Ym = (...args) => { (queue.a ||= []).push(args); };
    queue.l = Date.now();
    browser.ym = queue;
  }
  if (typeof browser.ym !== 'function') return false;
  try {
    browser.ym(YANDEX_METRIKA_ID, 'reachGoal', goal, params);
    return true;
  } catch { return false; } // Analytics must never turn a successful action into an error.
}

export function ymGoal(goal: string, params?: Record<string, unknown>): void {
  sendGoal(goal, params);
  if (goal === 'register' && params?.role === 'client') sendGoal('client_register_success', params);
  if (goal === 'register' && params?.role === 'model') sendGoal('model_register_success', params);
  if (goal === 'booking_created') sendGoal('client_booking_created', params);
}

export function markPaymentAttempt(bookingId: string): void {
  if (typeof window === 'undefined' || !bookingId) return;
  const now = Date.now();
  paymentAttempts.set(bookingId, now);
  try { window.sessionStorage.setItem('ym:payment-attempt:' + bookingId, String(now)); } catch { /* Memory fallback. */ }
}

export function hasPaymentAttempt(bookingId: string): boolean {
  if (typeof window === 'undefined' || !bookingId) return false;
  let timestamp = paymentAttempts.get(bookingId);
  try {
    const stored = Number(window.sessionStorage.getItem('ym:payment-attempt:' + bookingId));
    if (stored > 0) timestamp = stored;
  } catch { /* Memory fallback. */ }
  return typeof timestamp === 'number' && timestamp <= Date.now() && Date.now() - timestamp < ATTEMPT_TTL;
}

export function trackPaymentReserved(
  escrow: { id: string; bookingId: string; status: string; paymentProvider: string },
  eligible: boolean,
): void {
  if (typeof window === 'undefined' || !eligible || !escrow.id || !escrow.bookingId) return;
  if (!['funded', 'hold_period'].includes(escrow.status) || !['tbank', 'ton_usdt'].includes(escrow.paymentProvider)) return;
  const key = 'ym:client_payment_reserved:' + escrow.id;
  if (sentPayments.has(key)) return;
  try { if (window.localStorage.getItem(key)) return; } catch { /* Memory fallback. */ }
  if (!sendGoal('client_payment_reserved', { method: escrow.paymentProvider })) return;
  sentPayments.add(key);
  try { window.localStorage.setItem(key, '1'); } catch { /* Memory fallback. */ }
  paymentAttempts.delete(escrow.bookingId);
  try { window.sessionStorage.removeItem('ym:payment-attempt:' + escrow.bookingId); } catch { /* Memory fallback. */ }
}

/** Native link click lets Metrika's existing messenger goal recognize Telegram. */
export function openTelegramLink(value: string): boolean {
  if (typeof window === 'undefined') return false;
  let url: URL;
  try { url = new URL(value); } catch { return false; }
  if (url.username || url.password || !(
    (url.protocol === 'https:' && ['t.me', 'telegram.me'].includes(url.hostname)) || url.protocol === 'tg:'
  )) return false;
  let link: HTMLAnchorElement | undefined;
  try {
    link = document.createElement('a');
    link.href = url.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    return true;
  } catch { return false; }
  finally { try { link?.remove(); } catch { /* Cleanup remains best effort. */ } }
}
