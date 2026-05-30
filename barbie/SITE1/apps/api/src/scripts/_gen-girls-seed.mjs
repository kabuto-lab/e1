/**
 * One-off: parse the salonmassage source model HTMLs → girls-seed-data.json
 * (slug, name, params). Photo lists are NOT stored here — seed-girls.ts derives
 * mediaKeys by scanning apps/web/public/model-library/<slug> (the copied assets),
 * so they stay in sync with what's actually in the project.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const SRC = resolve(process.cwd(), '../../../imperiumSpa/salonmassage-site/models');
const OUT = resolve(process.cwd(), 'src/scripts/girls-seed-data.json');

const dirs = readdirSync(SRC).filter((f) => {
  try { return statSync(`${SRC}/${f}`).isDirectory(); } catch { return false; }
}).sort();

const rows = [];
for (const slug of dirs) {
  let h;
  try { h = readFileSync(`${SRC}/${slug}/index.html`, 'utf8'); } catch { continue; }
  const nm = h.match(/class="pname">\s*<span[^>]*>([^<]+)<\/span>\s*<em>(\d+)<\/em>/);
  if (!nm) continue;
  const p = {};
  const re = /<div class="prm-v">([^<]+)<\/div><div class="prm-k"><span data-i18n="pr_(\w+)"/g;
  let m;
  while ((m = re.exec(h))) p[m[2]] = m[1].trim();
  const params = {
    age: Number(nm[2]),
    height: p.height ? parseFloat(p.height) : null,
    weight: p.weight ? parseFloat(p.weight) : null,
    breast: p.breast ? parseFloat(p.breast) : null,
    silicon: 'silicon' in p,
  };
  rows.push({ slug, name: nm[1].trim(), params });
}

writeFileSync(OUT, JSON.stringify(rows, null, 2), 'utf8');
console.log(`WROTE ${OUT} · ${rows.length} girls`);
