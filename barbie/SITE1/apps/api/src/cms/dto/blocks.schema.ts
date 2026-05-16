/**
 * Zod-схемы для валидации блочного `body` CMS-страницы.
 *
 * Источник правды для блочных типов — `cms-pages.ts` schema (CmsBlocks).
 * Эти Zod-схемы используются в CmsService при write-операциях, потому что
 * class-validator плохо умеет discriminated unions с jsonb.
 *
 * Phase 0: блочные типы — hero, text, gallery, services, cta, custom.
 * Phase 1: добавим columns, embed, spacer, image; sanitization для text.html.
 */
import { z } from 'zod';

const uuidLike = z.string().uuid();
const hrefLike = z
  .string()
  .max(2000)
  .refine((v) => v.startsWith('/') || /^https?:\/\//.test(v), {
    message: 'href должен быть внутренним путём (/...) или абсолютным URL (https://...)',
  });

export const HeroBlock = z.object({
  type: z.literal('hero'),
  data: z.object({
    title: z.string().min(1).max(500),
    subtitle: z.string().max(2000).optional(),
    imageKey: z.string().max(500).optional(),
  }),
});

export const TextBlock = z.object({
  type: z.literal('text'),
  data: z.object({
    // ВНИМАНИЕ: Phase 0 НЕ санитизирует HTML — assume admin trusted.
    // Phase 1: DOMPurify в API или sandbox-renderer в UI.
    html: z.string().max(100_000),
  }),
});

export const GalleryBlock = z.object({
  type: z.literal('gallery'),
  data: z.object({
    mediaIds: z.array(uuidLike).min(1).max(50),
  }),
});

export const ServicesBlock = z.object({
  type: z.literal('services'),
  data: z.object({
    categoryFilter: z.string().max(64).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }),
});

export const CtaBlock = z.object({
  type: z.literal('cta'),
  data: z.object({
    label: z.string().min(1).max(200),
    href: hrefLike,
    style: z.enum(['primary', 'secondary']).optional(),
  }),
});

export const CustomBlock = z.object({
  type: z.literal('custom'),
  data: z.record(z.unknown()),
});

export const Block = z.discriminatedUnion('type', [
  HeroBlock,
  TextBlock,
  GalleryBlock,
  ServicesBlock,
  CtaBlock,
  CustomBlock,
]);

export const PageBody = z.array(Block).max(200);

export type PageBodyT = z.infer<typeof PageBody>;
