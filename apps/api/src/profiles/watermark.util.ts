/**
 * Водяной знак «My Muse» на фото моделей — накладывается после того, как файл уже
 * загружен в MinIO напрямую по presigned-ссылке (см. ProfilesService.confirmUpload,
 * единственная точка, где API вообще узнаёт о готовом файле).
 *
 * Позиция/размер подобраны на макете (согласовано с пользователем): белый текст,
 * 50% непрозрачности, правый нижний угол, лёгкая тёмная подложка для читаемости
 * на любом по яркости фото. Все размеры — в долях от ширины/высоты самого фото,
 * чтобы одинаково смотрелось на разных разрешениях и пропорциях кадра.
 */

import sharp = require('sharp');

const WATERMARK_TEXT = 'My Muse';
const MIN_FONT_SIZE = 16;

function buildWatermarkSvg(width: number, height: number): string {
  const fontSize = Math.max(MIN_FONT_SIZE, Math.round(width * 0.0227));
  const scrimWidth = Math.round(width * 0.3);
  const scrimHeight = Math.round(height * 0.21);
  const rightPad = Math.round(width * 0.02);
  const bottomPad = Math.round(height * 0.03);

  const textX = width - rightPad;
  const textY = height - bottomPad;
  const scrimX = width - scrimWidth;
  const scrimY = height - scrimHeight;

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="scrim" cx="100%" cy="100%" r="55%">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.55"/>
        <stop offset="60%" stop-color="#000000" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect x="${scrimX}" y="${scrimY}" width="${scrimWidth}" height="${scrimHeight}" fill="url(#scrim)"/>
    <text x="${textX}" y="${textY}" text-anchor="end"
          font-family="Arial, 'Segoe UI', sans-serif" font-weight="800"
          font-size="${fontSize}" letter-spacing="0.5" fill="#ffffff" fill-opacity="0.5">${WATERMARK_TEXT}</text>
  </svg>`;
}

/**
 * Наложить водяной знак на изображение. Формат вывода совпадает с форматом входа
 * (jpeg/png/webp) — определяется автоматически sharp по самим байтам, не по mimeType
 * из БД, чтобы не разъехаться, если файл на самом деле не тот, что заявлен.
 */
export async function applyWatermark(buffer: Buffer): Promise<Buffer> {
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const width = metadata.width ?? 1200;
  const height = metadata.height ?? 800;

  const svg = buildWatermarkSvg(width, height);
  const composed = image.composite([{ input: Buffer.from(svg) }]);

  switch (metadata.format) {
    case 'png':
      return composed.png().toBuffer();
    case 'webp':
      return composed.webp().toBuffer();
    default:
      return composed.jpeg({ quality: 90 }).toBuffer();
  }
}
