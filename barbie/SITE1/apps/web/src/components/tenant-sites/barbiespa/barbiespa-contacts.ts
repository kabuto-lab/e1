import type { PublicTouchpoint } from '@/lib/public-touchpoints-api';

/**
 * Контакты barbiespa для плавающего виджета (SiteTouchpoints).
 *
 * Передаём ЯВНО как `tp`-проп: в БД у тенанта точки касания не заведены
 * (API отдаёт []), а клиентский фетч зашит на внутренний API → виджет был
 * пустой и не показывался. Жёсткие бренд-ссылки (те же, что в меню) делают
 * виджет рабочим. Значения — с донора barbiespa.ru. См. [[nebesa-touchpoints-widget-dead-on-domain]].
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

export const BARBIESPA_TOUCHPOINTS: Record<string, PublicTouchpoint> = {
  whatsapp: tp('whatsapp', 'WhatsApp', 'https://wa.me/79289084389'),
  telegram: tp('telegram', 'Telegram', 'https://t.me/Barbie_Spa'),
  callWidget: tp('callWidget', 'Позвонить', '+7 (499) 520-03-10'),
  route: tp(
    'route',
    'Москва, Каланчевская 32/58 с1',
    `https://yandex.ru/maps/?text=${encodeURIComponent('Москва, Каланчевская 32/58 строение 1')}`,
  ),
};
