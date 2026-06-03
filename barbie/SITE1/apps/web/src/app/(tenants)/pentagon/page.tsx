/**
 * (tenants)/pentagon — публичная главная салона Pentagon.
 *
 * Рендерит реплику лендинга pentagon.ru (`PentagonHome`) средствами NAS:
 * веерная видео-карусель из моделей каталога (у кого есть видео), блок
 * «Интерьер» из фото бэкапа, девушки из общего пула NAS
 * (GET /v1/public/girls?tenant=pentagon). CSS заскоуплен под .pg-site.
 */
import { PentagonHome } from '@/components/tenant-sites/pentagon/PentagonHome';

export const metadata = {
  title: 'PENTAGON — спа-салон эротического массажа в Москве',
  description: 'Спа-салон эротического массажа Pentagon. Уютные апартаменты, дизайнерский интерьер, профессиональные мастера. Работаем по предварительной записи.',
};

export default function PentagonPage() {
  return <PentagonHome />;
}
