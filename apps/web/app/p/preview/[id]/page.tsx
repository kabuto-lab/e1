'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  status: string;
  visibility: string;
  publishedAt?: string | null;
  updatedAt: string;
}

const VISIBILITY_LABEL: Record<string, string> = {
  public: 'Публичная',
  members: 'Только участники',
  private: 'Приватная',
};

export default function CmsPreviewPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const [page, setPage] = useState<CmsPageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const raw = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const token = raw ? raw.replace(/^"|"$/g, '') : null;
    if (!token) {
      router.replace('/login');
      return;
    }

    fetch(apiUrl(`/cms/pages/${id}/preview`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401 || r.status === 403) throw new Error('no-access');
        if (!r.ok) throw new Error('not-found');
        return r.json() as Promise<CmsPageData>;
      })
      .then(setPage)
      .catch((e: Error) => {
        if (e.message === 'no-access') router.replace('/login');
        else setError('Страница не найдена');
      });
  }, [id, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <p className="text-white/40">{error}</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#d4af37]/30 border-t-[#d4af37]" />
      </div>
    );
  }

  const isSandbox = page.content && typeof page.content === 'object' && '_type' in page.content && (page.content as { _type: unknown })._type === 'sandbox';
  const html = !isSandbox && page.content ? tiptapJsonToHtml(page.content as TipTapNode) : '';
  const isDraft = page.status !== 'published';

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a]">
      {/* Preview banner */}
      <div className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-[#1a1000] px-6 py-2.5 text-xs border-b border-[#d4af37]/20">
        <div className="flex items-center gap-3">
          <span className="rounded bg-[#d4af37] px-2 py-0.5 font-bold text-[10px] uppercase tracking-wider text-black">
            {isDraft ? 'Черновик' : 'Опубликовано'}
          </span>
          <span className="text-[#d4af37]/70">
            Видимость: {VISIBILITY_LABEL[page.visibility] ?? page.visibility}
          </span>
          <span className="text-white/30">— Это превью, гости не видят эту страницу</span>
        </div>
        <a
          href={`/dashboard/pages/${page.id}/edit`}
          className="text-[#d4af37] hover:underline"
        >
          ← Редактировать
        </a>
      </div>

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
              <div className="cms-public-content" dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
              <p className="text-white/30">Содержимое отсутствует.</p>
            )}
          </article>
        </main>
      )}
    </div>
  );
}
