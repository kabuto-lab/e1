/* eslint-disable no-console */
/**
 * transcode-girl-videos.ts — перекодировать ВСЕ видео каталога моделей в
 * универсальный веб-профиль (H.264/yuv420p/faststart, ≤1280, CRF27) + poster.
 * Тот же util, что и upload-эндпоинт (один источник правды профиля).
 *
 * Идемпотентно по содержимому: перекодирует каждый model-library/<slug>/video/
 * NN.mp4 на месте (через temp) и кладёт poster NN.webp рядом.
 *
 * Usage (from apps/api):
 *   npx ts-node -r tsconfig-paths/register src/scripts/transcode-girl-videos.ts
 */
import { copyFileSync, existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { modelLibraryDir } from '../girls/model-library.util';
import { extractPoster, posterName, transcodeToWebMp4 } from '../girls/video-transcode.util';

async function main(): Promise<void> {
  const root = modelLibraryDir();
  if (!existsSync(root)) {
    console.error(`model-library not found at ${root}`);
    process.exit(1);
  }
  const slugs = readdirSync(root).filter((s) => existsSync(resolve(root, s, 'video')));
  let nVid = 0;
  let beforeTotal = 0;
  let afterTotal = 0;

  for (const slug of slugs) {
    const dir = resolve(root, slug, 'video');
    const vids = readdirSync(dir).filter((f) => /^\d+\.(mp4|webm|mov)$/i.test(f)).sort();
    for (const f of vids) {
      const src = resolve(dir, f);
      const before = statSync(src).size;
      const tmp = mkdtempSync(join(tmpdir(), 'vidtc-'));
      const out = join(tmp, 'out.mp4');
      try {
        await transcodeToWebMp4(src, out);
        copyFileSync(out, src); // replace in place
        await extractPoster(src, resolve(dir, posterName(f))).catch(() => undefined);
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
      const after = statSync(src).size;
      beforeTotal += before;
      afterTotal += after;
      nVid += 1;
      console.log(`  ${slug}/${f}: ${(before / 1e6).toFixed(1)} → ${(after / 1e6).toFixed(1)} MB`);
    }
  }
  console.log(
    `done: ${nVid} videos · ${(beforeTotal / 1e6).toFixed(0)} → ${(afterTotal / 1e6).toFixed(0)} MB ` +
      `(−${(100 * (1 - afterTotal / Math.max(beforeTotal, 1))).toFixed(0)}%)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
