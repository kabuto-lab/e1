import { notFound } from 'next/navigation';
import { asset } from '@/lib/asset';
import articles from '@/components/tenant-sites/barbiespa/articles.json';
import { BarbieArticleShell } from '@/components/tenant-sites/barbiespa/BarbieArticleShell';
import type { BarbieArticle } from '@/components/tenant-sites/barbiespa/BarbieArticles';
import { BARBIESPA_AUTHOR } from '@/components/tenant-sites/barbiespa/author';
import { relatedArticles } from '@/components/tenant-sites/barbiespa/related';

const ALL = articles as BarbieArticle[];
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
// Канонический хост тенанта (для абсолютных URL в JSON-LD). Пусто → относительные пути.
const ORIGIN = process.env.NEXT_PUBLIC_SITE_ORIGIN || '';

export function generateStaticParams() {
  return ALL.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = ALL.find((x) => x.slug === slug);
  return {
    title: a ? `${a.title} — BARBIE SPA` : 'Статья — BARBIE SPA',
    description: a?.excerpt,
  };
}

const RU_MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
function ruDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${RU_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = ALL.find((x) => x.slug === slug);
  if (!a) notFound();

  // basePath для путей внутри html (dangerouslySetInnerHTML мимо asset()):
  // и для медиа (/tenants/...), и для внутренних ссылок (/barbiespa...).
  let html = a.html;
  if (BASE) {
    html = html
      .replace(/(src|href)="\/tenants\//g, `$1="${BASE}/tenants/`)
      .replace(/(href)="\/barbiespa/g, `$1="${BASE}/barbiespa`);
  }

  // --- JSON-LD: Article + (FAQPage) + BreadcrumbList (GEO/AEO, ENTITY.md §13) ---
  const pageUrl = `${ORIGIN}${BASE}/barbiespa/stati/${a.slug}`;
  const heroUrl = a.hero ? `${ORIGIN}${BASE}${a.hero}` : undefined;
  // Автор: Person (named-эксперт) → сильнее E-E-A-T; иначе Organization (редакция).
  const author = BARBIESPA_AUTHOR.isPerson
    ? {
        '@type': 'Person',
        name: BARBIESPA_AUTHOR.name,
        jobTitle: BARBIESPA_AUTHOR.role,
        description: BARBIESPA_AUTHOR.bio,
        ...(BARBIESPA_AUTHOR.knowsAbout ? { knowsAbout: BARBIESPA_AUTHOR.knowsAbout } : {}),
        worksFor: { '@type': 'Organization', name: 'Barbie Spa' },
      }
    : { '@type': 'Organization', name: 'Barbie Spa' };
  const ld: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: a.title,
      description: a.excerpt,
      inLanguage: 'ru',
      ...(heroUrl ? { image: [heroUrl] } : {}),
      ...(a.updated ? { datePublished: a.updated, dateModified: a.updated } : {}),
      author,
      publisher: { '@type': 'Organization', name: 'Barbie Spa' },
      mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Barbie Spa', item: `${ORIGIN}${BASE}/barbiespa` },
        { '@type': 'ListItem', position: 2, name: 'Статьи', item: `${ORIGIN}${BASE}/barbiespa/stati` },
        { '@type': 'ListItem', position: 3, name: a.title, item: pageUrl },
      ],
    },
  ];
  if (a.faq?.length) {
    ld.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: a.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }

  return (
    <BarbieArticleShell>
      {ld.map((obj, i) => (
        <script
          key={i}
          type="application/ld+json"
          // JSON-LD — статический объект из наших данных, не пользовательский ввод.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }}
        />
      ))}
      <article className="wrap bs-art-article">
        <a className="bs-art-crumb" href={asset('/barbiespa/stati')}>
          ← Все статьи
        </a>
        <h1 className="bs-art-title">{a.title}</h1>
        <p className="bs-art-meta">
          <span className="bs-art-author">{BARBIESPA_AUTHOR.name}</span>
          {a.updated && ' · '}
          {a.updated && <span className="bs-art-date">обновлено {ruDate(a.updated)}</span>}
        </p>
        {a.hero && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="bs-art-hero" src={asset(a.hero)} alt={a.imageAlt || a.title} />
        )}
        <div className="bs-art-body" dangerouslySetInnerHTML={{ __html: html }} />

        {a.faq?.length ? (
          <section className="bs-art-faq" aria-labelledby="faq-h">
            <h2 id="faq-h">Частые вопросы</h2>
            {a.faq.map((f, i) => (
              <details key={i} className="bs-art-faq-item">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </section>
        ) : null}

        {(() => {
          const rel = relatedArticles(a, ALL);
          return rel.length ? (
            <nav className="bs-art-more" aria-label="Ещё статьи по теме">
              <h2>Ещё статьи по теме</h2>
              <ul>
                {rel.map((r) => (
                  <li key={r.slug}>
                    <a href={asset(`/barbiespa/stati/${r.slug}`)}>{r.title}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null;
        })()}

        <aside className="bs-art-author-box">
          {BARBIESPA_AUTHOR.photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="bs-art-author-photo" src={asset(BARBIESPA_AUTHOR.photo)} alt={BARBIESPA_AUTHOR.name} />
          )}
          <div className="bs-art-author-info">
            <p className="bs-art-author-name">{BARBIESPA_AUTHOR.name}</p>
            <p className="bs-art-author-role">{BARBIESPA_AUTHOR.role}</p>
            <p className="bs-art-author-bio">{BARBIESPA_AUTHOR.bio}</p>
          </div>
        </aside>

        <div className="bs-art-ctarow">
          <a className="btn-fill" href={asset('/barbiespa#contacts')}>
            Записаться
          </a>
          <a className="btn-out" href={asset('/barbiespa/stati')}>
            Ещё статьи
          </a>
        </div>
      </article>
    </BarbieArticleShell>
  );
}
