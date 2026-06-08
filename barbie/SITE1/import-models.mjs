// Импорт чистых (без лого) фото из `модели/<Имя>` в model-library/<slug>.
// node import-models.mjs            — только подтверждённые (16)
// node import-models.mjs --with-ambiguous  — + 5 спорных
// Заменяет существующие NN.webp (видео в подпапке video/ не трогает).
import sharp from 'sharp';
import { readdirSync, statSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve('.');
const SRC = resolve(ROOT, 'модели');
const LIB = resolve(ROOT, 'apps/web/public/model-library');

const CONFIRMED = {
  Августина: 'avgustina', Астра: 'astra', Вера: 'vera', Дейзи: 'dayzi',
  Джиджи: 'jiji', Дора: 'dora', Злата: 'zlata', Кайли: 'kylie',
  Келли: 'kelli', лея: 'leya', Лиза: 'liza', Малина: 'malina',
  Трейси: 'treyci', Шакира: 'shakira', Шейла: 'sheyla', Шерил: 'sharil',
};
const AMBIGUOUS = {
  Аля: 'alya', Лола: 'lolita', Монтана: 'montal', Ариан: 'arina', Мадлен: 'marlen',
};

const map = { ...CONFIRMED, ...(process.argv.includes('--with-ambiguous') ? AMBIGUOUS : {}) };
const SRC_RE = /\.(jpe?g|png|webp)$/i;

async function run() {
  let total = 0;
  for (const [name, slug] of Object.entries(map)) {
    const srcDir = join(SRC, name);
    if (!existsSync(srcDir)) { console.warn(`  ⚠ нет папки источника: ${name}`); continue; }
    const sources = readdirSync(srcDir)
      .filter((f) => SRC_RE.test(f) && statSync(join(srcDir, f)).isFile())
      .sort();
    if (!sources.length) { console.warn(`  ⚠ ${name}: нет фото`); continue; }

    const dstDir = join(LIB, slug);
    mkdirSync(dstDir, { recursive: true });
    // удалить старые NN.webp (видео и прочее не трогаем)
    for (const f of readdirSync(dstDir)) {
      if (/^\d+\.webp$/i.test(f) && statSync(join(dstDir, f)).isFile()) rmSync(join(dstDir, f));
    }
    let n = 0;
    for (const f of sources) {
      n++;
      const out = join(dstDir, String(n).padStart(2, '0') + '.webp');
      await sharp(join(srcDir, f))
        .rotate() // учесть EXIF-ориентацию
        .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 84 })
        .toFile(out);
    }
    total += n;
    console.log(`  ✓ ${name} → ${slug}: ${n} webp`);
  }
  console.log(`Готово: ${Object.keys(map).length} моделей, ${total} фото.`);
}
run().catch((e) => { console.error(e); process.exit(1); });
