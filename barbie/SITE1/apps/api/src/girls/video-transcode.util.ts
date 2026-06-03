/**
 * Транскод видео в универсальный веб-профиль (один источник правды для upload-
 * эндпоинта и батч-скрипта).
 *
 * Профиль — максимальная совместимость + малый размер + быстрый старт:
 *   • H.264 (libx264) High, `-pix_fmt yuv420p` — играет на iOS/Safari/Android/
 *     десктопе во всех браузерах (yuv420p обязателен для Safari).
 *   • CRF 27 + preset slow — сильное сжатие без видимой потери (часто 5–10×).
 *   • Cap длинной стороны ≤ 1280, чётные размеры.
 *   • AAC 128k — аудио сохраняется (на сайте плеер стартует muted, юзер может
 *     включить звук); файл при этом небольшой.
 *   • `-movflags +faststart` — moov-атом в начало → прогрессивное проигрывание
 *     (старт до полной загрузки).
 * Плюс poster-кадр (webp) для мгновенной отрисовки в `<video poster>`.
 *
 * Кроссплатформенно: бинарь из `@ffmpeg-installer/ffmpeg` (win32/linux/… через
 * optionalDependencies — на проде подтянется linux-x64).
 */
import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
// eslint-disable-next-line @typescript-eslint/no-var-requires
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);
const FFMPEG = ffmpegInstaller.path;

const VF_SCALE =
  "scale=w='min(1280,iw)':h='min(1280,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2";

/** Перекодировать `src` → `destMp4` в веб-профиль. Бросает при ошибке ffmpeg. */
export async function transcodeToWebMp4(src: string, destMp4: string): Promise<void> {
  await execFileAsync(
    FFMPEG,
    [
      '-y', '-i', src,
      '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '27',
      '-vf', VF_SCALE,
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
      destMp4,
    ],
    { maxBuffer: 64 * 1024 * 1024 },
  );
}

/** Извлечь poster-кадр (≈1с) → webp в `destWebp`. Best-effort: ошибки не фатальны. */
export async function extractPoster(src: string, destWebp: string): Promise<void> {
  const tmp = mkdtempSync(join(tmpdir(), 'poster-'));
  const jpg = join(tmp, 'frame.jpg');
  try {
    await execFileAsync(FFMPEG, ['-y', '-ss', '00:00:01', '-i', src, '-frames:v', '1', '-q:v', '3', jpg], {
      maxBuffer: 32 * 1024 * 1024,
    });
    await sharp(readFileSync(jpg))
      .resize({ width: 720, height: 720, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(destWebp);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** Имя poster-файла из имени видео: `NN.mp4` → `NN.webp`. */
export function posterName(videoFile: string): string {
  return videoFile.replace(/\.(mp4|webm|mov)$/i, '.webp');
}
