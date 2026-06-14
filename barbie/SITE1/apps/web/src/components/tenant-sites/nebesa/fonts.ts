import { Manrope, Playfair_Display, Cormorant } from 'next/font/google';

/**
 * Шрифты тенанта nebesa (НЕБОСВОД) через next/font/google:
 * самохостинг + автоматический preload + метрически подогнанный фолбэк
 * (size-adjust). Это убирает FOUT — мигание «жирный → нормальный» при загрузке,
 * которое было при ручном <link> на Google Fonts с display=swap.
 *
 * Переменные --font-manrope / --font-playfair вешаются на корень .nebesa-site
 * (см. NebesaShell / NebesaHome), а nebesa.css ссылается на них через var().
 * subsets включает cyrillic — сайт на русском.
 */
export const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-manrope',
  display: 'swap',
});

export const playfair = Playfair_Display({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-playfair',
  display: 'swap',
});

// Cormorant — тонкий (300) серив с кириллицей; для крупного «капительного»
// заголовка (small-caps задаётся в CSS) — легче, чем Playfair Display SC.
export const cormorant = Cormorant({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400'],
  variable: '--font-cormorant',
  display: 'swap',
});
