/**
 * sanitizeWpHtml / sanitizeWpTitle — security-критические тесты для WP-import.
 *
 * Каждый кейс — реальный известный XSS-вектор. Если sanitize-html выкинет
 * что-то из allowlist'а, эти тесты сразу сообщат — лучше fail в CI, чем
 * найти на проде.
 */
import { sanitizeWpHtml, sanitizeWpTitle } from './wp-sanitize';

describe('sanitizeWpHtml · XSS guard', () => {
  it('убирает <script> блок целиком (включая контент)', () => {
    const out = sanitizeWpHtml('<p>safe</p><script>alert(1)</script><p>after</p>');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('alert');
    expect(out).toContain('<p>safe</p>');
    expect(out).toContain('<p>after</p>');
  });

  it('убирает on* event-handlers', () => {
    const out = sanitizeWpHtml('<a href="https://x" onclick="alert(1)" onmouseover="x()">x</a>');
    expect(out).not.toMatch(/onclick|onmouseover/i);
    expect(out).toContain('href="https://x"');
  });

  it('убирает javascript: URL из href', () => {
    const out = sanitizeWpHtml('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain('javascript:');
  });

  it('убирает <iframe>', () => {
    const out = sanitizeWpHtml('<iframe src="https://evil"></iframe>');
    expect(out).not.toContain('<iframe');
  });

  it('убирает <style> с CSS expression', () => {
    const out = sanitizeWpHtml('<style>body{background:url(javascript:alert(1))}</style><p>x</p>');
    expect(out).not.toContain('<style');
    expect(out).not.toContain('javascript:');
    expect(out).toContain('<p>x</p>');
  });

  it('убирает <object> / <embed>', () => {
    const out = sanitizeWpHtml('<object data="x.swf"></object><embed src="y.swf">');
    expect(out).not.toContain('<object');
    expect(out).not.toContain('<embed');
  });

  it('убирает data: URL из img src (только http/https)', () => {
    const out = sanitizeWpHtml('<img src="data:text/html,<script>alert(1)</script>">');
    expect(out).not.toContain('data:');
  });

  it('сохраняет semantic markup (h1-h6, ul/ol/li, blockquote, strong/em)', () => {
    const html =
      '<h1>T</h1><h2>U</h2><ul><li>a</li><li>b</li></ul><blockquote>q</blockquote><strong>s</strong><em>e</em>';
    const out = sanitizeWpHtml(html);
    expect(out).toContain('<h1>T</h1>');
    expect(out).toContain('<h2>U</h2>');
    expect(out).toContain('<ul>');
    expect(out).toContain('<blockquote>q</blockquote>');
    expect(out).toContain('<strong>s</strong>');
    expect(out).toContain('<em>e</em>');
  });

  it('сохраняет img с http(s) src + alt', () => {
    const out = sanitizeWpHtml('<img src="https://cdn.x/img.png" alt="hi">');
    expect(out).toContain('src="https://cdn.x/img.png"');
    expect(out).toContain('alt="hi"');
  });

  it('пустой / null input → пустая строка', () => {
    expect(sanitizeWpHtml('')).toBe('');
    expect(sanitizeWpHtml(undefined)).toBe('');
    expect(sanitizeWpHtml(null)).toBe('');
  });

  it('убирает class/id атрибуты (CSS-injection guard)', () => {
    const out = sanitizeWpHtml('<p class="evil" id="x">x</p>');
    expect(out).not.toContain('class=');
    expect(out).not.toContain('id=');
    expect(out).toContain('<p>x</p>');
  });
});

describe('sanitizeWpTitle · plain-text', () => {
  it('сохраняет HTML entities encoded (без decode — sanitize-html re-encodes)', () => {
    // WP отдаёт title в encoded виде; sanitize-html сохраняет это как есть.
    // Decoded форму получает frontend при рендере в DOM. Это устраивает CMS-
    // dashboard list тоже — браузер декодит при выводе в текстовом узле.
    expect(sanitizeWpTitle('Tom &amp; Jerry')).toBe('Tom &amp; Jerry');
  });

  it('strip всех тегов', () => {
    expect(sanitizeWpTitle('<em>cool</em> <script>x</script>page')).toBe('cool page');
  });

  it('script-payload в title не выживает', () => {
    expect(sanitizeWpTitle('<script>alert(1)</script>safe')).toBe('safe');
  });

  it('пустой / null → пустая строка', () => {
    expect(sanitizeWpTitle('')).toBe('');
    expect(sanitizeWpTitle(undefined)).toBe('');
  });
});
