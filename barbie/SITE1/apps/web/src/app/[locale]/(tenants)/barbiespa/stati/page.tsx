import articles from '@/components/tenant-sites/barbiespa/articles.json';
import { BarbieArticleShell } from '@/components/tenant-sites/barbiespa/BarbieArticleShell';
import { BarbieArticles, type BarbieArticle } from '@/components/tenant-sites/barbiespa/BarbieArticles';

export const metadata = {
  title: 'Статьи — BARBIE SPA · эротический массаж в Москве',
  description: 'Статьи об эротическом массаже, техниках и программах салона Barbie Spa.',
};

export default function StatiPage() {
  return (
    <BarbieArticleShell>
      <BarbieArticles articles={articles as BarbieArticle[]} />
    </BarbieArticleShell>
  );
}
