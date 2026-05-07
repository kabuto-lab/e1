import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { tiptapJsonToHtml, type TipTapNode } from '@/lib/tiptap-to-html';
import { SandboxRenderer } from '@/components/cms/SandboxRenderer';
import { apiUrl } from '@/lib/api-url';

interface CmsPageData {
  id: string;
  type: string;
  title: string;
  slug: string;
  content?: object | null;
  excerpt?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  publishedAt?: string | null;
  updatedAt: string;
}

async function fetchPage(slug: string): Promise<CmsPageData | null> {
  try {
    const res = await fetch(apiUrl(`/cms/pages/by-slug/${encodeURIComponent(slug)}`), {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await fetchPage(slug);
  if (!page) return {};
  return {
    title: page.metaTitle ?? page.title,
    description: page.metaDescription ?? page.excerpt ?? undefined,
  };
}

export default async function PublicCmsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await fetchPage(slug);
  if (!page) notFound();

  const isSandbox = page.content && typeof page.content === 'object' && '_type' in page.content && (page.content as { _type: unknown })._type === 'sandbox';
  const html = !isSandbox && page.content ? tiptapJsonToHtml(page.content as TipTapNode) : '';

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] pt-[var(--site-header-height)]">
      <SiteHeader variant="page" segment={{ crumbs: [{ label: page.title }] }} />
      {isSandbox ? (
        <main className="w-full">
          <SandboxRenderer sections={(page.content as { sections: unknown[] }).sections} />
        </main>
      ) : (
        <main className="mx-auto w-full max-w-3xl px-6 py-12">
          <article>
            <h1 className="mb-8 font-display text-4xl font-bold text-white">{page.title}</h1>
            {page.publishedAt && (
              <time
                dateTime={page.publishedAt}
                className="mb-8 block font-body text-sm text-white/30"
              >
                {new Date(page.publishedAt).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </time>
            )}
            {html ? (
              <div
                className="cms-public-content"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <p className="text-white/30">Содержимое отсутствует.</p>
            )}
          </article>
        </main>
      )}
    </div>
  );
}
