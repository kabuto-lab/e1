import { asset } from '@/lib/asset';

export type BarbieArticle = { slug: string; title: string; hero: string | null; html: string; excerpt: string };

/** Сетка карточек раздела «Статьи» barbiespa. */
export function BarbieArticles({ articles }: { articles: BarbieArticle[] }) {
  return (
    <section className="wrap bs-art-listwrap">
      <h1 className="bs-art-pagetitle">Статьи</h1>
      <p className="bs-art-pagesub">Полезное об эротическом массаже — от салона Barbie Spa</p>
      <div className="bs-art-grid">
        {articles.map((a) => (
          <a key={a.slug} className="bs-art-card" href={asset(`/barbiespa/stati/${a.slug}`)}>
            {a.hero && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="bs-art-card-img" src={asset(a.hero)} alt={a.title} loading="lazy" />
            )}
            <div className="bs-art-card-body">
              <h2 className="bs-art-card-title">{a.title}</h2>
              <p className="bs-art-card-ex">{a.excerpt}</p>
              <span className="bs-art-card-more">Читать →</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
