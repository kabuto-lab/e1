import { createStream as createSaxStream, type SAXStream } from 'sax';
import type { Readable } from 'node:stream';
import type { CanonicalContent, CanonicalSiteMeta } from './manifest';

/**
 * WXR XML streaming parser. Harvested from the Replikant migrator.
 *
 * Defence-in-depth against the XXE class:
 *   1. sax library (strict mode) does NOT implement <!ENTITY> resolution — XXE
 *      external entities silently become literal text. We additionally REJECT
 *      any `<!DOCTYPE>` block that contains the `ENTITY` keyword as a safeguard.
 *   2. Depth limit (50) — defeats billion-laughs depth attacks even if sax
 *      somehow expanded entities.
 *   3. Attribute length cap (10 KB) — defeats unbounded attribute DoS.
 *   4. Text node accumulator cap (10 MB per node) — defeats single-tag flood.
 *   5. Total size cap (500 MB default, override) — defeats stream-bomb.
 *
 * Output: canonical content + media manifest (without bytes — media download
 * is a later phase). Menus and taxonomies parsed minimally.
 */

export interface WxrParserLimits {
  maxTotalBytes: number;
  maxDepth: number;
  maxAttrLength: number;
  maxTextBytes: number;
}

export const DEFAULT_WXR_LIMITS: WxrParserLimits = {
  maxTotalBytes: 524_288_000, // 500 MB
  maxDepth: 50,
  maxAttrLength: 10_240,
  maxTextBytes: 10_485_760, // 10 MB
};

export interface WxrParserResult {
  siteMeta: CanonicalSiteMeta;
  content: CanonicalContent[];
  /** Media URLs only (a later phase downloads + writes to object storage). */
  mediaUrlsToFetch: Array<{
    id: string;
    url: string;
    mimeType: string;
    alt: string | null;
    width: number | null;
    height: number | null;
    bytes: number;
  }>;
  stats: {
    posts: number;
    pages: number;
    cptItems: number;
    attachments: number;
    bytesProcessed: number;
  };
}

export class WxrParseError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'XXE_DOCTYPE'
      | 'DEPTH_EXCEEDED'
      | 'ATTR_TOO_LONG'
      | 'TEXT_TOO_LARGE'
      | 'SIZE_EXCEEDED'
      | 'MALFORMED'
      | 'NOT_WXR',
  ) {
    super(message);
  }
}

interface ItemAccumulator {
  postId: string | null;
  postType: string;
  postStatus: string;
  postTitle: string;
  postName: string; // slug
  postContent: string;
  postExcerpt: string;
  postDate: string | null; // gmt
  postModified: string | null; // gmt
  attachmentUrl: string | null;
  attachmentMime: string;
  postParent: string;
  authorLogin: string;
  authorName: string;
  /** Current text-accumulating field name (e.g. 'wp:post_title'). */
  currentField: string | null;
  /** Accumulating text since open-tag. */
  textBuf: string[];
  textBytes: number;
  taxonomies: Record<string, string[]>;
  customFields: Record<string, unknown>;
}

const newItemAccumulator = (): ItemAccumulator => ({
  postId: null,
  postType: 'post',
  postStatus: 'publish',
  postTitle: '',
  postName: '',
  postContent: '',
  postExcerpt: '',
  postDate: null,
  postModified: null,
  attachmentUrl: null,
  attachmentMime: 'application/octet-stream',
  postParent: '0',
  authorLogin: '',
  authorName: '',
  currentField: null,
  textBuf: [],
  textBytes: 0,
  taxonomies: {},
  customFields: {},
});

export async function parseWxr(
  source: Readable,
  jobId: string,
  limits: Partial<WxrParserLimits> = {},
): Promise<WxrParserResult> {
  const lim = { ...DEFAULT_WXR_LIMITS, ...limits };

  return new Promise<WxrParserResult>((resolve, reject) => {
    const stream: SAXStream = createSaxStream(true, {
      lowercase: true,
      trim: false,
      normalize: false,
      xmlns: false,
    });

    // Channel-level state
    let channelTitle = '';
    let channelLink = '';
    let channelDescription = '';
    let channelLanguage = '';
    let channelField: 'title' | 'link' | 'description' | 'language' | null = null;
    let inItem = false;
    let depth = 0;
    let bytesProcessed = 0;
    let resolved = false;
    let item: ItemAccumulator = newItemAccumulator();

    const content: CanonicalContent[] = [];
    const mediaUrlsToFetch: WxrParserResult['mediaUrlsToFetch'] = [];
    let postsCount = 0;
    let pagesCount = 0;
    let cptCount = 0;
    let attachmentsCount = 0;

    const fail = (err: Error): void => {
      if (resolved) return;
      resolved = true;
      stream.destroy?.();
      source.unpipe?.(stream);
      reject(err);
    };

    stream.on('error', (err) => fail(err instanceof Error ? err : new Error(String(err))));

    stream.on('doctype', (doctype: string) => {
      // sax does not expand entities in strict mode, but we also refuse any
      // DOCTYPE that mentions ENTITY just to be defensive (XXE_DOCTYPE).
      if (/ENTITY/i.test(doctype)) {
        fail(
          new WxrParseError(
            `WXR file contains DOCTYPE with ENTITY declaration — refused (XXE)`,
            'XXE_DOCTYPE',
          ),
        );
      }
    });

    stream.on('opentag', (tag) => {
      depth += 1;
      if (depth > lim.maxDepth) {
        return fail(
          new WxrParseError(`XML depth exceeded ${lim.maxDepth} (XXE depth)`, 'DEPTH_EXCEEDED'),
        );
      }

      for (const [name, value] of Object.entries(tag.attributes)) {
        const len = typeof value === 'string' ? value.length : 0;
        if (len > lim.maxAttrLength) {
          return fail(
            new WxrParseError(
              `Attribute "${name}" length ${len} exceeds ${lim.maxAttrLength}`,
              'ATTR_TOO_LONG',
            ),
          );
        }
      }

      const tagName = tag.name; // lowercased

      if (!inItem) {
        if (tagName === 'item') {
          inItem = true;
          item = newItemAccumulator();
        } else if (tagName === 'title' && depth === 3) {
          // <rss><channel><title>
          channelField = 'title';
        } else if (tagName === 'link' && depth === 3) {
          channelField = 'link';
        } else if (tagName === 'description' && depth === 3) {
          channelField = 'description';
        } else if (tagName === 'language' && depth === 3) {
          channelField = 'language';
        }
        return;
      }

      // Inside <item>:
      item.currentField = tagName;
      item.textBuf = [];
      item.textBytes = 0;
    });

    stream.on('text', (text: string) => {
      // Cheap size accumulator — sax does NOT emit single-shot accumulated text;
      // it emits chunks. We track per-field accumulation.
      bytesProcessed += text.length;
      if (bytesProcessed > lim.maxTotalBytes) {
        return fail(
          new WxrParseError(
            `Total bytes ${bytesProcessed} exceeded cap ${lim.maxTotalBytes}`,
            'SIZE_EXCEEDED',
          ),
        );
      }

      if (!inItem) {
        if (channelField === 'title') channelTitle += text;
        else if (channelField === 'link') channelLink += text;
        else if (channelField === 'description') channelDescription += text;
        else if (channelField === 'language') channelLanguage += text;
        return;
      }

      if (!item.currentField) return;
      item.textBuf.push(text);
      item.textBytes += text.length;
      if (item.textBytes > lim.maxTextBytes) {
        return fail(
          new WxrParseError(
            `Text node "${item.currentField}" exceeded ${lim.maxTextBytes} bytes`,
            'TEXT_TOO_LARGE',
          ),
        );
      }
    });

    stream.on('cdata', (text: string) => {
      bytesProcessed += text.length;
      if (bytesProcessed > lim.maxTotalBytes) {
        return fail(
          new WxrParseError('Total CDATA bytes exceeded cap', 'SIZE_EXCEEDED'),
        );
      }
      if (inItem && item.currentField) {
        item.textBuf.push(text);
        item.textBytes += text.length;
        if (item.textBytes > lim.maxTextBytes) {
          return fail(
            new WxrParseError(
              `CDATA in "${item.currentField}" exceeded ${lim.maxTextBytes} bytes`,
              'TEXT_TOO_LARGE',
            ),
          );
        }
      }
    });

    stream.on('closetag', (tagName: string) => {
      depth -= 1;

      if (!inItem) {
        if (channelField !== null && tagName === channelField) channelField = null;
        else if (channelField === 'title' && tagName === 'title') channelField = null;
        else if (channelField === 'link' && tagName === 'link') channelField = null;
        else if (channelField === 'description' && tagName === 'description') channelField = null;
        else if (channelField === 'language' && tagName === 'language') channelField = null;
        return;
      }

      if (tagName === 'item') {
        commitItem(item, content, mediaUrlsToFetch, () => {
          if (item.postType === 'attachment') attachmentsCount += 1;
          else if (item.postType === 'post') postsCount += 1;
          else if (item.postType === 'page') pagesCount += 1;
          else cptCount += 1;
        });
        inItem = false;
        item.currentField = null;
        return;
      }

      // Commit current field text into accumulator
      if (item.currentField) {
        const text = item.textBuf.join('');
        switch (item.currentField) {
          case 'wp:post_id':
            item.postId = text.trim();
            break;
          case 'wp:post_type':
            item.postType = text.trim() || 'post';
            break;
          case 'wp:status':
            item.postStatus = text.trim() || 'publish';
            break;
          case 'title':
            item.postTitle = text;
            break;
          case 'wp:post_name':
            item.postName = text.trim();
            break;
          case 'content:encoded':
            item.postContent = text;
            break;
          case 'excerpt:encoded':
            item.postExcerpt = text;
            break;
          case 'wp:post_date_gmt':
            item.postDate = text.trim();
            break;
          case 'wp:post_modified_gmt':
            item.postModified = text.trim();
            break;
          case 'wp:attachment_url':
            item.attachmentUrl = text.trim();
            break;
          case 'wp:post_parent':
            item.postParent = text.trim() || '0';
            break;
          case 'dc:creator':
            item.authorLogin = text.trim();
            break;
          case 'category': {
            // <category domain="..." nicename="..."> text </category>
            const text2 = text.trim();
            if (text2) {
              const list = item.taxonomies['category'] ?? [];
              list.push(text2);
              item.taxonomies['category'] = list;
            }
            break;
          }
          default:
            // Unknown WXR field — skip silently.
            break;
        }
        item.textBuf = [];
        item.textBytes = 0;
        item.currentField = null;
      }
    });

    stream.on('end', () => {
      if (resolved) return;
      resolved = true;
      const siteMeta: CanonicalSiteMeta = {
        title: channelTitle.trim() || channelLink.trim() || 'WXR import',
        description: channelDescription.trim() || null,
        language: channelLanguage.trim() || null,
        designTokensKey: null,
        sourceLabel: channelLink.trim() || `wxr:${jobId}`,
      };
      resolve({
        siteMeta,
        content,
        mediaUrlsToFetch,
        stats: {
          posts: postsCount,
          pages: pagesCount,
          cptItems: cptCount,
          attachments: attachmentsCount,
          bytesProcessed,
        },
      });
    });

    source.on('error', (err) => fail(err));
    source.pipe(stream);
  });
}

function commitItem(
  item: ItemAccumulator,
  content: CanonicalContent[],
  mediaUrlsToFetch: WxrParserResult['mediaUrlsToFetch'],
  onTypeCounted: () => void,
): void {
  // Attachments → media manifest
  if (item.postType === 'attachment' && item.attachmentUrl) {
    mediaUrlsToFetch.push({
      id: item.postId ? `m${item.postId}` : `m${hashCode(item.attachmentUrl)}`,
      url: item.attachmentUrl,
      mimeType: item.attachmentMime,
      alt: item.postTitle.trim() || null,
      width: null,
      height: null,
      bytes: 0,
    });
    onTypeCounted();
    return;
  }

  // Posts / pages / CPT → canonical content
  const type: CanonicalContent['type'] =
    item.postType === 'post' ? 'post' : item.postType === 'page' ? 'page' : 'cpt';

  const status: CanonicalContent['status'] =
    item.postStatus === 'publish'
      ? 'publish'
      : item.postStatus === 'draft'
        ? 'draft'
        : item.postStatus === 'private'
          ? 'private'
          : item.postStatus === 'pending'
            ? 'pending'
            : item.postStatus === 'future'
              ? 'future'
              : item.postStatus === 'trash'
                ? 'trash'
                : 'publish';

  content.push({
    sourceId: `wxr-${item.postId ?? hashCode(item.postName + item.postTitle).toString()}`,
    type,
    cptName: type === 'cpt' ? item.postType : null,
    slug: item.postName,
    title: item.postTitle,
    excerpt: item.postExcerpt || null,
    contentHtml: item.postContent,
    status,
    authorName: item.authorName || item.authorLogin || null,
    publishedAt: item.postDate ? toIsoFromGmt(item.postDate) : null,
    updatedAt: item.postModified ? toIsoFromGmt(item.postModified) : null,
    featuredMediaId: null,
    taxonomies: item.taxonomies,
    customFields: item.customFields,
  });
  onTypeCounted();
}

function toIsoFromGmt(gmt: string): string | null {
  // WXR format: "2024-01-15 12:34:56"
  const m = gmt.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}.000Z`;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
