// Конвертер каталога: node convert-dir.mjs <dir> — все jpg/jpeg/png → webp, удаляет оригиналы.
import sharp from 'sharp';
import { readdirSync, statSync, unlinkSync } from 'node:fs';
import { join, extname } from 'node:path';

const dir = process.argv[2];
if (!dir) { console.error('usage: node convert-dir.mjs <dir>'); process.exit(1); }
const RASTER = new Set(['.jpg', '.jpeg', '.png']);
let n = 0, bin = 0, bout = 0;
for (const f of readdirSync(dir)) {
  const ext = extname(f).toLowerCase();
  if (!RASTER.has(ext)) continue;
  const src = join(dir, f);
  const out = join(dir, f.slice(0, -ext.length) + '.webp');
  const inSz = statSync(src).size;
  await sharp(src).webp({ quality: ext === '.png' ? 90 : 82, alphaQuality: 100, effort: 4 }).toFile(out);
  bout += statSync(out).size; bin += inSz; unlinkSync(src); n++;
}
console.log(`converted ${n} files · ${(bin / 1048576).toFixed(1)}MB → ${(bout / 1048576).toFixed(1)}MB in ${dir}`);
