import type { ModelProfile } from '@/types/model';

export type AvailabilityStatus = ModelProfile['availabilityStatus'];

/**
 * Модель управляет своим статусом сама — короткие "технические" названия,
 * как в переключателе (см. /model, /model/status).
 */
export const AVAILABILITY_LABEL: Record<AvailabilityStatus, string> = {
  offline: 'Офлайн',
  online: 'Онлайн',
  in_shift: 'На смене',
  busy: 'Занята',
};

/**
 * Статус модели глазами клиента/модератора — формулировка естественнее
 * ("Свободна" вместо технического "Онлайн"). Используется в каталоге,
 * на публичном профиле и в дашборде модерации.
 */
export const AVAILABILITY_CLIENT_LABEL: Record<AvailabilityStatus, string> = {
  offline: 'Офлайн',
  online: 'Свободна',
  in_shift: 'На смене',
  busy: 'Занята',
};

export const AVAILABILITY_DOT_COLOR: Record<AvailabilityStatus, string> = {
  offline: 'bg-white/30',
  online: 'bg-emerald-400',
  in_shift: 'bg-sky-400',
  busy: 'bg-amber-400',
};

/**
 * Пояснение статуса для клиента (подсказка в каталоге и в фильтре «Доступность»).
 * Формулировки — про то, что модель отметила сама: платформа не заявляет «доступна сейчас»
 * без подтверждения, поэтому в тексте везде «отметила/работает сегодня».
 */
export const AVAILABILITY_CLIENT_HINT: Record<AvailabilityStatus, string> = {
  offline: 'Офлайн — модель отметила, что сейчас не принимает бронирования.',
  online: 'Свободна — модель отметила, что готова к бронированию сейчас.',
  in_shift: 'На смене — модель работает сегодня и принимает бронирования на свободное время.',
  busy: 'Занята — модель сейчас на встрече, можно выбрать другое время.',
};
