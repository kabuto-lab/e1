/**
 * Фиксированный список городов — единый источник для кнопок городов в каталоге
 * и селекта «Город» в анкете модели. Значение = подпись = то, что пишется в базу
 * (`physicalAttributes.city`) и уходит параметром `city=` в `GET /models`.
 * Бэкенд фильтрует точным совпадением, поэтому написание менять только здесь.
 */
export const CITIES = ['Москва', 'Санкт-Петербург', 'Казань', 'Сочи'] as const;

export type City = (typeof CITIES)[number];

/**
 * Опции селекта города в анкете: «Не указан» (город необязателен) + города из `CITIES`.
 * Если текущее значение анкеты непустое и не из списка (например, «СПб» из бота),
 * добавляется пункт «<значение> (не из списка)», чтобы сохранение без правки его не теряло.
 * Сравнение строгое (без trim и регистра) — как точное совпадение в фильтре бэкенда.
 */
export function buildCityOptions(
  current: string | null | undefined,
): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [
    { value: '', label: 'Не указан' },
    ...CITIES.map((city) => ({ value: city, label: city })),
  ];
  if (current && !(CITIES as readonly string[]).includes(current)) {
    options.push({ value: current, label: `${current} (не из списка)` });
  }
  return options;
}
