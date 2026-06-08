// One-shot: конвертирует все jpg/jpeg/png в указанных папках → webp, удаляет оригиналы.
// Правило: все растровые картинки в системе — только webp. sharp из root node_modules.
import sharp from 'sharp';
import { readdirSync, statSync, unlinkSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIRS = [
  'apps/web/public/tenants/barbiespa',
  'apps/web/public/tenant/5massage',
  'apps/web/public/tenants/nebesaspa/gallery',
];
const RASTER = new Set(['.jpg', '.jpeg', '.png']);

let converted = 0, bytesIn = 0, bytesOut = 0;
for (const dir of DIRS) {
  let files;
  try { files = readdirSync(dir); } catch { console.log(`skip (absent): ${dir}`); continue; }
  for (const f of files) {
    const ext = extname(f).toLowerCase();
    if (!RASTER.has(ext)) continue;
    const src = join(dir, f);
    const out = join(dir, f.slice(0, -ext.length) + '.webp');
    const inSz = statSync(src).size;
    const hasAlpha = ext === '.png';
    await sharp(src)
      .webp({ quality: hasAlpha ? 90 : 82, alphaQuality: 100, effort: 4 })
      .toFile(out);
    const outSz = statSync(out).size;
    unlinkSync(src);
    converted++; bytesIn += inSz; bytesOut += outSz;
  }
  console.log(`done: ${dir}`);
}
console.log(`\nconverted ${converted} files · ${(bytesIn / 1048576).toFixed(1)}MB → ${(bytesOut / 1048576).toFixed(1)}MB`);
