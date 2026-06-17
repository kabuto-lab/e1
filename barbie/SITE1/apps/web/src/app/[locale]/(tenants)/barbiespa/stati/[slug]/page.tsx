import { notFound } from 'next/navigation';
import { asset } from '@/lib/asset';
import articles from '@/components/tenant-sites/barbiespa/articles.json';
import { BarbieArticleShell } from '@/components/tenant-sites/barbiespa/BarbieArticleShell';
import type { BarbieArticle } from '@/components/tenant-sites/barbiespa/BarbieArticles';

const ALL = articles as BarbieArticle[];

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

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = ALL.find((x) => x.slug === slug);
  if (!a) notFound();

  // basePath для картинок внутри html (dangerouslySetInnerHTML мимо asset()).
  const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const html = BASE ? a.html.replace(/(src|href)="\/tenants\//g, `$1="${BASE}/tenants/`) : a.html;

  return (
    <BarbieArticleShell>
      <article className="wrap bs-art-article">
        <a className="bs-art-crumb" href={asset('/barbiespa/stati')}>
          ← Все статьи
        </a>
        <h1 className="bs-art-title">{a.title}</h1>
        {a.hero && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="bs-art-hero" src={asset(a.hero)} alt={a.title} />
        )}
        <div className="bs-art-body" dangerouslySetInnerHTML={{ __html: html }} />
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
