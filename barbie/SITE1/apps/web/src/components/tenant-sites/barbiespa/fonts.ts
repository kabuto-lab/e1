import { Montserrat, Manrope } from 'next/font/google';

/**
 * Шрифты тенанта barbiespa через next/font/google (паттерн nebesa/fonts.ts):
 * самохостинг + автоматический preload + метрически подогнанный фолбэк
 * (size-adjust) → нет FOUT. До этого barbiespa.css ссылался на 'Montserrat' /
 * 'Manrope' по имени, но шрифты нигде не грузились → рендер шёл системным
 * фолбэком. Теперь переменные --font-montserrat / --font-manrope вешаются на
 * корень .bs-site (см. BarbieSpaHome), а barbiespa.css ссылается через var().
 * subsets включает cyrillic — сайт на русском. Оба семейства variable, поэтому
 * weight не фиксируем (CSS задаёт font-weight как раньше: 600/700).
 */
export const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-manrope',
  display: 'swap',
});
