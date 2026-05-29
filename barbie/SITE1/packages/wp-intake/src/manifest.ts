import { z } from 'zod';

/**
 * Canonical content model — the contract every intake branch converges on.
 *
 * Harvested verbatim from the Replikant migrator (P3-normalize output). Three
 * input branches (URL / WXR / Duplicator) all emit shapes matching this
 * contract; downstream consumers (block classification, design derivation, and
 * — in NAS — tenant ingest) operate on these types without knowing the source.
 *
 * Stable across versions. Breaking changes require a Migrator ADR.
 */

// ────────── Media ──────────

export const CanonicalMediaSchema = z.object({
  /** Stable hash-derived id within a job (e.g. sha256 prefix of original URL or filename). */
  id: z.string().min(1),
  /** Where in object storage we stored it (source/<job_id>/media/<hash>.<ext>). */
  storageKey: z.string().min(1),
  originalUrl: z.string().nullable(),
  originalFilename: z.string().nullable(),
  mimeType: z.string(),
  bytes: z.number().int().nonnegative(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  altText: z.string().nullable(),
});
export type CanonicalMedia = z.infer<typeof CanonicalMediaSchema>;

// ────────── Blocks (raw — before classification) ──────────

export const CanonicalRawBlockSchema = z.object({
  /** Order within parent content. */
  order: z.number().int().nonnegative(),
  /** HTML fragment from the source. Classification turns these into typed blocks. */
  html: z.string(),
});
export type CanonicalRawBlock = z.infer<typeof CanonicalRawBlockSchema>;

// ────────── Content (posts / pages / custom post types) ──────────

export const CanonicalContentSchema = z.object({
  /** Stable id from source (WP post_id when available, else hash of slug). */
  sourceId: z.string().min(1),
  type: z.enum(['post', 'page', 'cpt']),
  cptName: z.string().nullable(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string().nullable(),
  /** Raw HTML; gets split into blocks by classification. */
  contentHtml: z.string(),
  status: z.enum(['publish', 'draft', 'private', 'pending', 'trash', 'future']),
  authorName: z.string().nullable(),
  publishedAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime().nullable(),
  featuredMediaId: z.string().nullable(),
  taxonomies: z.record(z.string(), z.array(z.string())),
  customFields: z.record(z.string(), z.unknown()),
});
export type CanonicalContent = z.infer<typeof CanonicalContentSchema>;

// ────────── Menus ──────────

export const CanonicalMenuItemSchema: z.ZodType<{
  label: string;
  url: string;
  target: string | null;
  contentRef: string | null;
  children: Array<{
    label: string;
    url: string;
    target: string | null;
    contentRef: string | null;
    children: Array<unknown>;
  }>;
}> = z.lazy(() =>
  z.object({
    label: z.string(),
    url: z.string(),
    target: z.string().nullable(),
    contentRef: z.string().nullable(),
    children: z.array(CanonicalMenuItemSchema),
  }),
);
export type CanonicalMenuItem = z.infer<typeof CanonicalMenuItemSchema>;

export const CanonicalMenuSchema = z.object({
  name: z.string(),
  location: z.string().nullable(),
  items: z.array(CanonicalMenuItemSchema),
});
export type CanonicalMenu = z.infer<typeof CanonicalMenuSchema>;

// ────────── Site-level metadata ──────────

export const CanonicalSiteMetaSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  language: z.string().nullable(),
  /** Resolved at design-derivation; null at normalize output. */
  designTokensKey: z.string().nullable(),
  /** The URL we crawled (URL branch) or filename we imported (WXR/Duplicator). */
  sourceLabel: z.string(),
});
export type CanonicalSiteMeta = z.infer<typeof CanonicalSiteMetaSchema>;

// ────────── Classified blocks (attached to content) ──────────
//
// Classification parses each CanonicalContent.contentHtml into a typed block
// array. Unrecognised content falls into rawHtml — preserved verbatim so the
// user's data is never lost; a review flag marks it downstream.

export const ClassifiedBlockSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('paragraph'), html: z.string() }),
  z.object({
    kind: z.literal('heading'),
    level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
    text: z.string(),
  }),
  z.object({
    kind: z.literal('image'),
    src: z.string(),
    alt: z.string().nullable(),
    mediaId: z.string().nullable(),
    caption: z.string().nullable(),
  }),
  z.object({
    kind: z.literal('gallery'),
    items: z.array(
      z.object({
        src: z.string(),
        alt: z.string().nullable(),
        mediaId: z.string().nullable(),
      }),
    ),
  }),
  z.object({
    kind: z.literal('list'),
    ordered: z.boolean(),
    items: z.array(z.string()),
  }),
  z.object({
    kind: z.literal('quote'),
    html: z.string(),
    citation: z.string().nullable(),
  }),
  z.object({
    kind: z.literal('code'),
    language: z.string().nullable(),
    text: z.string(),
  }),
  z.object({
    kind: z.literal('table'),
    rows: z.array(z.array(z.string())),
  }),
  z.object({
    kind: z.literal('cover'),
    src: z.string(),
    overlayText: z.string(),
  }),
  z.object({
    kind: z.literal('embed'),
    provider: z.string().nullable(),
    url: z.string(),
  }),
  z.object({
    kind: z.literal('rawHtml'),
    html: z.string(),
  }),
]);
export type ClassifiedBlock = z.infer<typeof ClassifiedBlockSchema>;

// ────────── Design tokens ──────────

export const DesignTokensSchema = z.object({
  palette: z.object({
    primary: z.string(),
    secondary: z.string(),
    accent: z.string(),
    bg: z.string(),
    fg: z.string(),
    fgDim: z.string(),
  }),
  fonts: z.object({
    sans: z.array(z.string()),
    serif: z.array(z.string()),
    mono: z.array(z.string()),
  }),
  spacing: z.object({
    /** Baseline unit in pixels (typical: 8). */
    unit: z.number().int().positive(),
  }),
  /** Source confidence: 'extracted' (from CSS) > 'sniffed' (from HTML) > 'default'. */
  confidence: z.enum(['extracted', 'sniffed', 'default']),
});
export type DesignTokens = z.infer<typeof DesignTokensSchema>;

// ────────── Canonical job manifest ──────────

export const CanonicalManifestSchema = z.object({
  version: z.literal('v1'),
  jobId: z.string().uuid(),
  sourceType: z.enum(['url', 'wxr', 'duplicator']),
  siteMeta: CanonicalSiteMetaSchema,
  content: z.array(CanonicalContentSchema),
  /** Keyed by content.sourceId — empty before classification. */
  classifiedBlocks: z.record(z.string(), z.array(ClassifiedBlockSchema)),
  media: z.array(CanonicalMediaSchema),
  menus: z.array(CanonicalMenuSchema),
  /** Null before design derivation. */
  designTokens: DesignTokensSchema.nullable(),
});
export type CanonicalManifest = z.infer<typeof CanonicalManifestSchema>;
