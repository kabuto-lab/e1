// Похожие статьи (внутренняя перелинковка, ENTITY.md §13).
// Детерминированно (без random/Date) — безопасно для SSG.
import type { BarbieArticle } from './BarbieArticles';

// Тематический тег по slug — порядок важен (специфичные раньше общих).
const TOPIC_RULES: [string, RegExp][] = [
  ['lingam', /lingam/],
  ['prostata', /prostat/],
  ['urolog', /urolog/],
  ['sakura', /sakur/],
  ['tantra', /tantr/],
  ['thai', /tajsk/],
  ['fetish', /bdsm|gospozh|strapon|femdom|fut|fetish/],
  ['pary', /par|semej|supruzh|muzha-i-zhen/],
  ['women', /zhensh|dam/],
  ['bodi', /bodi/],
  ['stop', /-stop/],
];

function topic(slug: string): string {
  for (const [t, re] of TOPIC_RULES) if (re.test(slug)) return t;
  return 'general';
}

// Slug'и, на которые статья уже ссылается в теле (контекстные «Читайте также»)
// — чтобы не дублировать их в авто-блоке.
function linkedInHtml(html: string): Set<string> {
  const s = new Set<string>();
  const re = /\/barbiespa\/stati\/([a-z0-9-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) s.add(m[1]);
  return s;
}

/** До `limit` похожих статей: сначала по теме, затем по интенту, затем прочие. */
export function relatedArticles(current: BarbieArticle, all: BarbieArticle[], limit = 3): BarbieArticle[] {
  const already = linkedInHtml(current.html);
  const pool = all.filter((a) => a.slug !== current.slug && !already.has(a.slug));
  const ct = topic(current.slug);
  const sameTopic = pool.filter((a) => topic(a.slug) === ct);
  const sameIntent = pool.filter((a) => topic(a.slug) !== ct && a.intent && a.intent === current.intent);
  const rest = pool.filter((a) => topic(a.slug) !== ct && a.intent !== current.intent);
  return [...sameTopic, ...sameIntent, ...rest].slice(0, limit);
}
