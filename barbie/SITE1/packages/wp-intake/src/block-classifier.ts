import * as cheerio from 'cheerio';
import type { AnyNode, Element as DomElement } from 'domhandler';
import type { ClassifiedBlock } from './manifest';

/**
 * Block classifier (deterministic). Harvested from the Replikant migrator.
 *
 * Takes raw post HTML and classifies each top-level element into one of the
 * structured block types. Unrecognised elements fall into `rawHtml` — the
 * user's content is never lost, only flagged for manual review.
 *
 * Future enhancement: LLM fallback when a `rawHtml` block contains complex
 * structure (cost-capped). Out of scope for the harvest.
 */

export function classifyHtml(html: string): ClassifiedBlock[] {
  if (!html || !html.trim()) return [];

  const $ = cheerio.load(html, {}, false);
  const root = $.root();
  const blocks: ClassifiedBlock[] = [];

  root.children().each((_, el) => {
    const block = classifyElement($, el);
    if (block) blocks.push(block);
  });

  // If the HTML had no block-level structure (e.g. just inline text), wrap
  // the whole thing in a single paragraph.
  if (blocks.length === 0) {
    blocks.push({ kind: 'paragraph', html: html.trim() });
  }

  return blocks;
}

function classifyElement(
  $: cheerio.CheerioAPI,
  el: AnyNode,
): ClassifiedBlock | null {
  if (el.type !== 'tag') {
    // Text/comment at top level — skip (whitespace, WP block comments).
    return null;
  }
  const element = el as DomElement;
  const tag = element.tagName.toLowerCase();
  const $el = $(element);

  switch (tag) {
    case 'p':
      return classifyParagraph($, $el);
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return classifyHeading($el, Number(tag[1]) as 1 | 2 | 3 | 4 | 5 | 6);
    case 'img':
      return classifyImage($el);
    case 'figure':
      return classifyFigure($, $el);
    case 'ul':
    case 'ol':
      return classifyList($, $el, tag === 'ol');
    case 'blockquote':
      return classifyQuote($, $el);
    case 'pre':
      return classifyCode($, $el);
    case 'table':
      return classifyTable($, $el);
    case 'iframe':
      return classifyEmbed($el);
    case 'div':
    case 'section':
    case 'article':
      // Generic wrappers — try to classify children, else raw.
      return classifyWrapper($, $el);
    default:
      return { kind: 'rawHtml', html: $.html($el) ?? '' };
  }
}

// ────────── 1. paragraph ──────────
function classifyParagraph(_: cheerio.CheerioAPI, $el: cheerio.Cheerio<AnyNode>): ClassifiedBlock {
  const inner = $el.html() ?? '';
  return { kind: 'paragraph', html: inner.trim() };
}

// ────────── 2. heading ──────────
function classifyHeading(
  $el: cheerio.Cheerio<AnyNode>,
  level: 1 | 2 | 3 | 4 | 5 | 6,
): ClassifiedBlock {
  return { kind: 'heading', level, text: $el.text().trim() };
}

// ────────── 3. image (bare <img>) ──────────
function classifyImage($el: cheerio.Cheerio<AnyNode>): ClassifiedBlock {
  return {
    kind: 'image',
    src: $el.attr('src') ?? '',
    alt: $el.attr('alt') || null,
    mediaId: extractMediaId($el),
    caption: null,
  };
}

// ────────── figure (image or gallery) ──────────
function classifyFigure(
  $: cheerio.CheerioAPI,
  $el: cheerio.Cheerio<AnyNode>,
): ClassifiedBlock {
  const imgs = $el.find('img');
  if (imgs.length === 0) {
    return { kind: 'rawHtml', html: $.html($el) ?? '' };
  }

  // ────────── 4. gallery (figure with > 1 img, or .wp-block-gallery class) ──────────
  const isGallery =
    imgs.length > 1 ||
    ($el.attr('class') ?? '').toLowerCase().includes('gallery');
  if (isGallery) {
    const items: Array<{ src: string; alt: string | null; mediaId: string | null }> = [];
    imgs.each((_, imgEl) => {
      const $img = $(imgEl);
      items.push({
        src: $img.attr('src') ?? '',
        alt: $img.attr('alt') || null,
        mediaId: extractMediaId($img),
      });
    });
    return { kind: 'gallery', items };
  }

  // Single img inside figure — extract caption from <figcaption>.
  const $img = imgs.first();
  const caption = $el.find('figcaption').text().trim() || null;
  return {
    kind: 'image',
    src: $img.attr('src') ?? '',
    alt: $img.attr('alt') || null,
    mediaId: extractMediaId($img),
    caption,
  };
}

// ────────── 5. list ──────────
function classifyList(
  $: cheerio.CheerioAPI,
  $el: cheerio.Cheerio<AnyNode>,
  ordered: boolean,
): ClassifiedBlock {
  const items: string[] = [];
  $el.children('li').each((_, li) => {
    items.push($(li).html()?.trim() ?? '');
  });
  return { kind: 'list', ordered, items };
}

// ────────── 6. quote ──────────
function classifyQuote(
  _$: cheerio.CheerioAPI,
  $el: cheerio.Cheerio<AnyNode>,
): ClassifiedBlock {
  const cite = $el.find('cite').first().text().trim() || null;
  // Remove cite from html copy so it isn't duplicated in the rendered quote.
  const $clone = $el.clone();
  $clone.find('cite').remove();
  return {
    kind: 'quote',
    html: $clone.html()?.trim() ?? '',
    citation: cite,
  };
}

// ────────── 7. code (pre/code) ──────────
function classifyCode(
  _$: cheerio.CheerioAPI,
  $el: cheerio.Cheerio<AnyNode>,
): ClassifiedBlock {
  const $code = $el.find('code').first();
  const $target = $code.length > 0 ? $code : $el;
  const text = $target.text();
  // language from class="language-xxx" or "lang-xxx"
  const cls = $target.attr('class') ?? '';
  const langMatch = cls.match(/(?:language|lang)-([a-zA-Z0-9]+)/);
  return {
    kind: 'code',
    language: langMatch?.[1]?.toLowerCase() ?? null,
    text,
  };
}

// ────────── 8. table ──────────
function classifyTable(
  $: cheerio.CheerioAPI,
  $el: cheerio.Cheerio<AnyNode>,
): ClassifiedBlock {
  const rows: string[][] = [];
  $el.find('tr').each((_, tr) => {
    const cells: string[] = [];
    $(tr)
      .find('td, th')
      .each((_, c) => {
        cells.push($(c).text().trim());
      });
    if (cells.length > 0) rows.push(cells);
  });
  return { kind: 'table', rows };
}

// ────────── 9. cover (div with bg-image + overlay text) ──────────
// We detect the classic .wp-block-cover pattern.
function classifyCover(
  _$: cheerio.CheerioAPI,
  $el: cheerio.Cheerio<AnyNode>,
): ClassifiedBlock | null {
  const cls = ($el.attr('class') ?? '').toLowerCase();
  if (!cls.includes('cover')) return null;

  const $img = $el.find('img').first();
  const src = $img.attr('src');
  if (!src) {
    // Inline background-image style?
    const style = $el.attr('style') ?? '';
    const bgMatch = style.match(/background-image:\s*url\(['"]?([^'")]+)/);
    if (!bgMatch) return null;
    return {
      kind: 'cover',
      src: bgMatch[1] ?? '',
      overlayText: $el.text().trim(),
    };
  }

  return {
    kind: 'cover',
    src,
    overlayText: $el.text().trim(),
  };
}

// ────────── 10. embed (iframe) ──────────
function classifyEmbed($el: cheerio.Cheerio<AnyNode>): ClassifiedBlock {
  const url = $el.attr('src') ?? '';
  let provider: string | null = null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('youtube') || host.includes('youtu.be')) provider = 'youtube';
    else if (host.includes('vimeo')) provider = 'vimeo';
    else if (host.includes('twitter') || host.includes('x.com')) provider = 'twitter';
    else if (host.includes('instagram')) provider = 'instagram';
    else if (host.includes('soundcloud')) provider = 'soundcloud';
  } catch {
    /* ignore */
  }
  return { kind: 'embed', provider, url };
}

// ────────── wrapper (div/section/article) ──────────
function classifyWrapper(
  $: cheerio.CheerioAPI,
  $el: cheerio.Cheerio<AnyNode>,
): ClassifiedBlock {
  // Check cover first.
  const cover = classifyCover($, $el);
  if (cover) return cover;

  // Try children — if exactly one classifiable, hoist it.
  const children = $el.children();
  if (children.length === 1) {
    const block = classifyElement($, children[0]!);
    if (block) return block;
  }

  // Fall back to raw HTML.
  return { kind: 'rawHtml', html: $.html($el) ?? '' };
}

// ────────── helpers ──────────

function extractMediaId($el: cheerio.Cheerio<AnyNode>): string | null {
  // WP attaches `data-id`, `wp-image-{id}` in class, or id="attachment_NN".
  const dataId = $el.attr('data-id');
  if (dataId) return `m${dataId}`;
  const cls = $el.attr('class') ?? '';
  const m = cls.match(/wp-image-(\d+)/);
  if (m) return `m${m[1]}`;
  const idAttr = $el.attr('id') ?? '';
  const m2 = idAttr.match(/attachment_(\d+)/);
  if (m2) return `m${m2[1]}`;
  return null;
}
