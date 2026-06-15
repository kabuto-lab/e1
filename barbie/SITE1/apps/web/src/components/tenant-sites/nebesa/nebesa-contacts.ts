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

/** Маршрут до салона (Яндекс.Навигатор deep-link). Открывается в приложении
 *  Яндекс.Навигатор/Карты на телефоне. Та же ссылка — в футере и в «Контактах». */
export const NEBESA_ROUTE = {
  href: 'yandexnavi://build_route_on_map?lat_to=55.7708&lon_to=37.5642',
  label: 'Наш адрес: Москва, Пресня-Сити 25 этаж',
};

export const NEBESA_TOUCHPOINTS: Record<string, PublicTouchpoint> = {
  whatsapp: tp('whatsapp', 'WhatsApp', 'https://wa.me/79120767814'),
  telegram: tp('telegram', 'Telegram', 'https://t.me/NebosvodSpa'),
  callWidget: tp('callWidget', 'Позвонить', '+7 912 076-78-14'),
  route: tp('route', NEBESA_ROUTE.label, NEBESA_ROUTE.href),
};
