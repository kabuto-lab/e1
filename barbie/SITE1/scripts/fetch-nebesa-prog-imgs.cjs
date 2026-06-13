// One-off: pull each program's featured (og:image) from nebesaspa.com,
// convert png->webp, save as prog-<slug>.webp in the tenant asset dir.
const fs = require('fs');
const path = require('path');
const sharp = require(path.join(__dirname, '..', 'node_modules', 'sharp'));

const OUT = path.join(__dirname, '..', 'apps', 'web', 'public', 'tenants', 'nebesaspa-clone');

// slug -> displayed program name (from earlier parse). Order doesn't matter here.
const SLUGS = [
  'soblazn-po-vyzovu', 'dyhanie-strasti', 'massazh-dlya-par', 'legkoe-zabvenie', 'ladys-relax',
  'firmennaya', 'joni-massazh', 'ekzotika', 'sladkaya-prihot', 'shelest-nebes', 'rajskie-grezy',
  'erotic-terapiya', 'otkrovenie', 'neznakomka', 'erotic-time', 'polet-zhelanij', '886',
  'nebesnaya-simfoniya', 'angely-nochi', 'dont-stop', 'galaktika-naslazhdenij', 'polnoe-pogruzhenie-vip',
  'bezdna-naslazhdenij', 'lunnyj-ekstaz', 'podruzhki-lux', 'padenie-zvezd', 'shyolkovoe-oblako',
  'lunnyj-rasczvet', 'solnechnaya-laska', 'polunochnyj-sekret', 'boginya-avrory', 'zvyozdnaya-gostinaya',
  'nebesnyj-krug', 'galakticheskij-ritual', 'sliyanie', 'mlechnyj-put', 'podruzhki',
];

const UA = { headers: { 'user-agent': 'Mozilla/5.0' } };

async function ogImage(slug) {
  const res = await fetch(`https://nebesaspa.com/program/${slug}/`, UA);
  const html = await res.text();
  const m = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

(async () => {
  const map = {};
  const fails = [];
  for (const slug of SLUGS) {
    try {
      const url = await ogImage(slug);
      if (!url) { fails.push(slug + ' (no og:image)'); continue; }
      const img = await fetch(url, UA);
      if (!img.ok) { fails.push(slug + ' http ' + img.status); continue; }
      const buf = Buffer.from(await img.arrayBuffer());
      const out = path.join(OUT, `prog-${slug}.webp`);
      await sharp(buf).webp({ quality: 82 }).toFile(out);
      map[slug] = { src: url, file: `prog-${slug}.webp`, bytes: fs.statSync(out).size };
      console.log(`OK  ${slug}  <- ${path.basename(url)}  (${map[slug].bytes} b)`);
    } catch (e) {
      fails.push(slug + ' ERR ' + e.message);
    }
  }
  fs.writeFileSync(path.join(__dirname, 'nebesa-prog-imgs.map.json'), JSON.stringify(map, null, 2));
  console.log('\n--- done:', Object.keys(map).length, 'ok,', fails.length, 'failed ---');
  if (fails.length) console.log('FAILS:\n' + fails.join('\n'));
})();
