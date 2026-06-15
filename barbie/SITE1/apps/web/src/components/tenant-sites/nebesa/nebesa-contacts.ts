import type { PublicTouchpoint } from '@/lib/public-touchpoints-api';

/**
 * Контакты тенанта NEBOSVOD для плавающего виджета (SiteTouchpoints/FloatingChat).
 *
 * Передаём ЯВНО как `tp`-проп, а не тянем с API: сайт на боевом домене —
 * статический снимок, а клиентский фетч точек касания зашит на внутренний
 * `http://127.0.0.1:5110` (недостижим из браузера посетителя) → виджет был
 * пустой. Жёсткие бренд-ссылки (те же, что в шапке/футере/бургере) делают
 * виджет рабочим и на снимке, и локально. См. memory: nebesa-touchpoints-widget-dead-on-domain.
 */
const tp = (key: string, label: string, value: string): PublicTouchpoint => ({
  key,
  enabled: true,
  label,
  value,
  imageKey: null,
  imageUrl: null,
  color: null,
});

export const NEBESA_TOUCHPOINTS: Record<string, PublicTouchpoint> = {
  whatsapp: tp('whatsapp', 'WhatsApp', 'https://wa.me/79120767814'),
  telegram: tp('telegram', 'Telegram', 'https://t.me/NebosvodSpa'),
  callWidget: tp('callWidget', 'Позвонить', '+7 912 076-78-14'),
};
