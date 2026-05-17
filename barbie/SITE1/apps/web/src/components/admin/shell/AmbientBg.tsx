/**
 * AmbientBg — фиксированный слой с radial-gradient'ами и scanlines.
 * Кладётся внутрь admin layout до основного контента (children).
 * Сам по себе невидимый: всю «магию» делают CSS-классы в globals.css (.nas-ambient).
 */
export function AmbientBg() {
  return <div aria-hidden="true" className="nas-ambient" />;
}
