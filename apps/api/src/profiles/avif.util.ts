/**
 * Канон хранения фото моделей — AVIF (sharp).
 * Используется при confirm upload и в scripts/ingest-drive-avif.mjs.
 */
import sharp = require('sharp');

export const AVIF_MIME = 'image/avif' as const;

export type AvifConvertOptions = {
  /** Max long-edge (inside fit). Default 1600. */
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  effort?: number;
};

/**
 * JPEG/PNG/WebP/HEIC/… → AVIF. EXIF-ориентацию учитывает rotate().
 */
export async function convertToAvif(
  buffer: Buffer,
  opts: AvifConvertOptions = {},
): Promise<Buffer> {
  const maxWidth = opts.maxWidth ?? 1600;
  const maxHeight = opts.maxHeight ?? 2400;
  const quality = opts.quality ?? 55;
  const effort = opts.effort ?? 4;

  return sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize({
      width: maxWidth,
      height: maxHeight,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .avif({ quality, effort, chromaSubsampling: '4:2:0' })
    .toBuffer();
}

/** storageKey с расширением → *.avif (путь без расширения тоже ок). */
export function toAvifStorageKey(storageKey: string): string {
  const cleaned = storageKey.replace(/\.[a-z0-9]+$/i, '');
  return `${cleaned}.avif`;
}
