/**
 * Все URL стоков, которые используются на фронте (демо-галерея + hero).
 * Скрипт ingest-stock-media.ts выкачивает их в MinIO и пишет media_files.
 *
 * Picsum и иногда Unsplash режут скрипты (403 / таймаут). У каждого источника есть
 * fallbackUrls (pravatar / randomuser) — без API-ключей, обычно проходят с браузерным UA.
 */

/** ID снимков Unsplash (как в apps/web/lib/demo-photos.ts) + доп. портреты для разнообразия */
export const UNSPLASH_PHOTO_IDS = [
  'photo-1534528741775-53994a69daeb',
  'photo-1529626455594-4ff0802cfb7e',
  'photo-1544005313-94ddf0286df2',
  'photo-1531746020798-e6953c6e8e04',
  'photo-1488426862026-3ee34a7d66df',
  'photo-1524504388940-b1c1722653e1',
  'photo-1545912452-8b7760508a11',
  'photo-1552053831-715f03e92548',
  'photo-1554151285-5d3dc8065915',
  'photo-1551893478-d726eaf0442c',
  'photo-1552664730-d307ca884978',
  'photo-1534759846116-5799c33ce22a',
  'photo-1507003211169-0a1dd7228f2d',
  'photo-1494790108377-be9c29b29330',
  'photo-1517841905240-472988babdf9',
  'photo-1539571696357-5a69c17a67c6',
  'photo-1515886657613-9f3515b0c78f',
  'photo-1529139574466-a303027c1d8b',
  'photo-1502823403499-6ccfcf4fb453',
  'photo-1504703395950-b89145a5425b',
  'photo-1438761681033-6461ffad8d80',
  'photo-1508214751196-bcfd4ca60fea',
  'photo-1506794778202-cad84cf45f1d',
  'photo-1531123897727-8f129e1688ce',
  'photo-1580489944761-15fc19d0ff4e',
  'photo-1573496359142-b8d87734a5a2',
  'photo-1502685104226-ee32379fefbe',
  'photo-1594744803329-e58b31de8bf5',
  'photo-1479936343636-73cd5bb0fe44',
  'photo-1489427871083-5d675cc46ae7',
  'photo-1487412720507-e76ed49fdc46',
  'photo-1519345182560-3f2917c472ef',
  'photo-1504593811423-6dd8f866998b',
  'photo-1519085360753-af0119f7cbe7',
  'photo-1463457077085-2f0cfa4609dd',
];

export function unsplashImportUrl(photoId: string): string {
  return `https://images.unsplash.com/${photoId}?ixlib=rb-4.1.0&auto=format&fit=crop&w=1600&q=85`;
}

function hashToRange(s: string, max: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % max) + 1;
}

function unsplashFallbacks(photoId: string): string[] {
  const pr = hashToRange(photoId, 70);
  const ru = hashToRange(photoId, 98);
  const gender = hashToRange(photoId, 2) === 1 ? 'women' : 'men';
  return [
    `https://randomuser.me/api/portraits/${gender}/${ru}.jpg`,
    `https://i.pravatar.cc/1200?img=${pr}`,
  ];
}

/** Picsum seeds с главной (hero) */
export const PICSUM_SEEDS = [
  'lovnge-h01',
  'lovnge-h02',
  'lovnge-h03',
  'lovnge-h04',
  'lovnge-h05',
  'lovnge-h06',
  'lovnge-h07',
  'lovnge-h08',
  'lovnge-h09',
  'lovnge-h10',
];

export function picsumImportUrl(seed: string): string {
  return `https://picsum.photos/seed/${seed}/1920/1080`;
}

function picsumFallbacks(seed: string, index: number): string[] {
  const pr = ((index + hashToRange(seed, 60)) % 70) + 1;
  const w = ((index * 3 + 1) % 98) + 1;
  const m = ((index * 5 + 11) % 98) + 1;
  return [
    `https://randomuser.me/api/portraits/women/${w}.jpg`,
    `https://randomuser.me/api/portraits/men/${m}.jpg`,
    `https://i.pravatar.cc/1200?img=${pr}`,
  ];
}

export type StockSource = {
  key: string;
  url: string;
  /** Пробуются по порядку, если основной url не скачался */
  fallbackUrls?: string[];
  mime: string;
  ext: string;
};

export function allStockSources(): StockSource[] {
  const out: StockSource[] = [];
  for (const id of UNSPLASH_PHOTO_IDS) {
    out.push({
      key: `unsplash-${id.replace(/[^a-zA-Z0-9-]/g, '_')}`,
      url: unsplashImportUrl(id),
      fallbackUrls: unsplashFallbacks(id),
      mime: 'image/jpeg',
      ext: 'jpg',
    });
  }
  PICSUM_SEEDS.forEach((seed, index) => {
    out.push({
      key: `picsum-${seed}`,
      url: picsumImportUrl(seed),
      fallbackUrls: picsumFallbacks(seed, index),
      mime: 'image/jpeg',
      ext: 'jpg',
    });
  });
  return out;
}

function modelIdHash(modelId: string): number {
  let h = 2166136261;
  for (let i = 0; i < modelId.length; i++) {
    h ^= modelId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Уникальные абстрактные кадры на профиль (Picsum seed = id модели + индекс). */
const PER_MODEL_UNIQUE_PICSUM = 8;

/**
 * Набор стоков для одной модели: общий пул ротируется по modelId (другая «главная» и порядок),
 * плюс снимки с уникальным seed — не копируются между анкетами.
 */
export function sourcesForModelProfile(modelId: string): StockSource[] {
  const base = allStockSources();
  const n = base.length;
  if (n === 0) return [];
  const rotate = modelIdHash(modelId) % n;
  const rotated = [...base.slice(rotate), ...base.slice(0, rotate)];

  const safe = modelId.replace(/[^a-zA-Z0-9]/g, '') || 'model';
  const extras: StockSource[] = [];
  for (let i = 0; i < PER_MODEL_UNIQUE_PICSUM; i++) {
    const seed = `mod-${safe.slice(0, 32)}-x${i}`;
    extras.push({
      key: `picsum-${seed}`,
      url: picsumImportUrl(seed),
      fallbackUrls: picsumFallbacks(seed, i + hashToRange(modelId, 500)),
      mime: 'image/jpeg',
      ext: 'jpg',
    });
  }
  return [...rotated, ...extras];
}
