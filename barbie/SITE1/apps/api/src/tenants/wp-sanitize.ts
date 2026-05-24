/**
 * sanitizeWpHtml — очистка HTML из WordPress `content.rendered` перед записью
 * в `cms_pages.body`.
 *
 * WP сам filter'ит явные `<script>`, но защиты от XSS в нём недостаточно:
 *  - `on*` event-handlers могут пройти через user-content
 *  - `<iframe src="javascript:...">` / `<object>` / `<embed>` опасны
 *  - inline `<style>` может содержать CSS expressions / url(javascript:)
 *  - `href="javascript:..."` / `data:text/html` тоже исполняются
 *
 * Используем `sanitize-html` (декларативный allowlist) — без jsdom, без DOM,
 * fast и подходит для server-side WP-import потока.
 *
 * Стратегия: разрешаем семантические teги (заголовки, текст, списки, цитаты,
 * базовое форматирование, ссылки с safe-схемами, изображения). Запрещаем
 * `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>`, `<form>`,
 * `<input>` и все event-handler атрибуты. Из ссылок оставляем только
 * http/https/mailto/tel; data: и javascript: режутся.
 */
import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS: string[] = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr', 'blockquote', 'pre', 'code',
  'strong', 'b', 'em', 'i', 'u', 's', 'sup', 'sub', 'mark', 'small',
  'ul', 'ol', 'li',
  'a',
  'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'span', 'div',
];

const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
  th: ['scope', 'colspan', 'rowspan'],
  td: ['colspan', 'rowspan'],
  // class / id — намеренно НЕ разрешаем (могут таргетить CSS injection
  // на родительской странице). Если тенант захочет стили — через ED-editor.
};

const ALLOWED_SCHEMES = ['http', 'https', 'mailto', 'tel'];
const ALLOWED_SCHEMES_BY_TAG: Record<string, string[]> = {
  img: ['http', 'https'],
};

/**
 * Очищает HTML-фрагмент. Возвращает безопасную строку.
 * Пустой / undefined input → пустая строка.
 */
export function sanitizeWpHtml(html: string | undefined | null): string {
  if (!html) return '';
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    allowedSchemes: ALLOWED_SCHEMES,
    allowedSchemesByTag: ALLOWED_SCHEMES_BY_TAG,
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: false,
    // Безопасные дефолты sanitize-html: убирает все event-handlers
    // (onclick, onerror, ...), `<script>`, `<style>` (включая контент), и
    // не допускает `javascript:` / `vbscript:` / `data:` в href/src.
  });
}

/**
 * Title из WP может содержать HTML-entities (`&amp;`, `&#8217;`) и редко —
 * inline-теги (`<em>` итд). Для CMS title мы хотим plain-text — strip всего.
 * `sanitize-html` с пустым allowedTags оставит только текст + декодит entities.
 */
export function sanitizeWpTitle(title: string | undefined | null): string {
  if (!title) return '';
  return sanitizeHtml(title, { allowedTags: [], allowedAttributes: {} }).trim();
}
