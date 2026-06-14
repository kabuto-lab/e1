#!/usr/bin/env node
// publish-snapshot.mjs — снимок тенанта в статику для боевого домена.
//
// Краулит root-режимный рендер тенанта (BASE_PATH='', тенант на /<slug>),
// ремапит ТОЛЬКО префикс маршрута /<slug> → / (корень домена), зеркалит все
// ассеты (/_next, /tenants, /media, /vendor, /model-library, /fonts) как есть
// (они уже корневые) и пишет самодостаточный статический сайт в --out.
//
// Почему root-режим: страница собрана с basePath='' → в HTML/JS нет /nas, и
// не нужно побайтово переписывать /nas (что ломает рантайм-basePath в _next).
// Остаётся одна чистая операция — снять префикс /<slug>.
//
// Запуск:
//   node scripts/publish-snapshot.mjs --origin http://127.0.0.1:5112 \
//        --tenant nebesaspa --out ./publish-out/nebesaspa.com
//
// Динамика (v1): каталог/контент вмораживаются в HTML на момент снимка.
// Интерактивные вызовы API (/v1, /api) НЕ зеркалятся — формы должны вести на
// живой API абсолютным URL (или быть «позвонить»).

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

// ---- args ----
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1]]);
    return acc;
  }, []),
);
const ORIGIN = (args.origin || 'http://127.0.0.1:5112').replace(/\/$/, '');
const TENANT = args.tenant || 'nebesaspa';
const OUT = args.out || `./publish-out/${TENANT}.com`;

const ROUTE_PREFIX = `/${TENANT}`;
// Ассеты — корневые префиксы, которые зеркалим как есть (без ремапа).
const ASSET_PREFIXES = ['/_next/', '/tenants/', '/vendor/', '/model-library/', '/fonts/', '/__nextjs_font/'];
// НЕ снимаем: /media (живьём проксируется vhost → MinIO), API-вызовы.
const SKIP_PREFIXES = ['/media/', '/v1/', '/api/', '/_next/image'];
const shouldSkip = (p) => SKIP_PREFIXES.some((pre) => p.startsWith(pre));
// Расширения, которые тоже считаем ассетами, если встретились корневым путём.
const ASSET_EXT = /\.(webp|jpe?g|png|svg|gif|ico|css|js|mjs|woff2?|ttf|otf|json|mp4|webm|lottie|txt|xml)(\?|$)/i;

const isAsset = (p) =>
  ASSET_PREFIXES.some((pre) => p.startsWith(pre)) || (p.startsWith('/') && ASSET_EXT.test(p));
const isPage = (p) => p === ROUTE_PREFIX || p.startsWith(`${ROUTE_PREFIX}/`) || p.startsWith(`${ROUTE_PREFIX}?`);

// /<slug>/girls -> /girls ; /<slug> -> / ; сохраняем как .../index.html для маршрутов.
function pageToFile(p) {
  let rel = p.replace(/[?#].*$/, ''); // отбросить query/hash
  rel = rel.slice(ROUTE_PREFIX.length) || '/'; // снять префикс
  if (rel.endsWith('/')) rel += 'index.html';
  else if (!/\.[a-z0-9]+$/i.test(rel)) rel += '/index.html';
  return rel.replace(/^\//, '');
}

// Переписать префикс маршрута /<slug> -> / (корень домена), НО только в начале
// URL-токена (после кавычки/скобки/=/пробела или экранированной кавычки), чтобы
// не задеть слаг в середине пути ассетов — напр. /tenants/<slug>/hero/... остаётся.
const RE_PREFIX_PATH = new RegExp(`(["'(=\\s]|\\\\")\\/${TENANT}\\/`, 'g'); // "/slug/...  -> "/...
const RE_PREFIX_HOME = new RegExp(`(["'(=\\s]|\\\\")\\/${TENANT}(?=["'?#)\\s]|\\\\")`, 'g'); // "/slug" -> "/"
function remap(text) {
  return text.replace(RE_PREFIX_PATH, '$1/').replace(RE_PREFIX_HOME, '$1/');
}

// Достать все ссылки/ассеты из текста (href/src/srcset/url()).
function extractRefs(text) {
  const refs = new Set();
  const re = /(?:href|src)\s*=\s*["']([^"']+)["']|url\(\s*["']?([^"')]+)["']?\s*\)|["'](\/[^"'\s]+\.[a-z0-9]+(?:\?[^"'\s]*)?)["']/gi;
  let m;
  while ((m = re.exec(text))) {
    const u = m[1] || m[2] || m[3];
    if (u) refs.add(u.trim());
    // srcset не покрыт href|src выше — добавим отдельно ниже
  }
  // srcset="a 1x, b 2x"
  const ss = /srcset\s*=\s*["']([^"']+)["']/gi;
  while ((m = ss.exec(text))) {
    for (const part of m[1].split(',')) {
      const u = part.trim().split(/\s+/)[0];
      if (u) refs.add(u);
    }
  }
  return [...refs];
}

const seenPages = new Set();
const seenAssets = new Set();
const queue = [];
let pageCount = 0;
let assetCount = 0;
let bytes = 0;
const missing = [];

function enqueuePage(p) {
  const clean = p.split('#')[0];
  if (!seenPages.has(clean)) {
    seenPages.add(clean);
    queue.push({ type: 'page', path: clean });
  }
}
function enqueueAsset(p) {
  const clean = p.split('#')[0];
  if (!seenAssets.has(clean)) {
    seenAssets.add(clean);
    queue.push({ type: 'asset', path: clean });
  }
}

async function write(rel, data) {
  const fp = join(OUT, rel);
  await mkdir(dirname(fp), { recursive: true });
  await writeFile(fp, data);
  bytes += data.length;
}

function normalize(u) {
  // оставляем только локальные абсолютные пути; внешние/мейлто/тел/data — пропуск
  if (!u || u.startsWith('//') || /^[a-z]+:/i.test(u) || u.startsWith('#') || u.startsWith('data:')) return null;
  if (!u.startsWith('/')) return null; // относительные не ожидаем (basePath='')
  return u;
}

async function processPage(path) {
  const res = await fetch(ORIGIN + path, { redirect: 'manual' });
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get('location');
    if (loc) enqueuePage(loc.replace(ORIGIN, ''));
    return;
  }
  if (!res.ok) { missing.push(`PAGE ${path} -> ${res.status}`); return; }
  let html = await res.text();
  for (const raw of extractRefs(html)) {
    const u = normalize(raw);
    if (!u) continue;
    if (isPage(u)) enqueuePage(u);
    else if (isAsset(u) && !shouldSkip(u)) enqueueAsset(u);
  }
  html = remap(html);
  await write(pageToFile(path), Buffer.from(html, 'utf8'));
  pageCount++;
}

async function processAsset(path) {
  const res = await fetch(ORIGIN + path);
  if (!res.ok) { missing.push(`ASSET ${path} -> ${res.status}`); return; }
  const ct = res.headers.get('content-type') || '';
  const isText = /text\/|javascript|json|svg|css/i.test(ct) || /\.(css|js|mjs|svg|json|txt|xml)(\?|$)/i.test(path);
  if (isText) {
    let txt = await res.text();
    // во вложенных css/js тоже могут быть ссылки на ассеты и префикс маршрута
    for (const raw of extractRefs(txt)) {
      const u = normalize(raw);
      if (u && isAsset(u) && !shouldSkip(u)) enqueueAsset(u);
    }
    txt = remap(txt);
    await write(path.replace(/^\//, '').replace(/[?].*$/, ''), Buffer.from(txt, 'utf8'));
  } else {
    const buf = Buffer.from(await res.arrayBuffer());
    await write(path.replace(/^\//, '').replace(/[?].*$/, ''), buf);
  }
  assetCount++;
}

async function main() {
  console.log(`[snapshot] origin=${ORIGIN} tenant=${TENANT} out=${OUT}`);
  enqueuePage(ROUTE_PREFIX);
  while (queue.length) {
    const item = queue.shift();
    try {
      if (item.type === 'page') await processPage(item.path);
      else await processAsset(item.path);
    } catch (e) {
      missing.push(`${item.type.toUpperCase()} ${item.path} -> ERR ${e.message}`);
    }
  }
  console.log(`[snapshot] pages=${pageCount} assets=${assetCount} bytes=${(bytes / 1024 / 1024).toFixed(1)}MB`);
  if (missing.length) {
    console.log(`[snapshot] MISSING (${missing.length}):`);
    for (const m of missing.slice(0, 40)) console.log('  ' + m);
    if (missing.length > 40) console.log(`  …+${missing.length - 40} more`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
