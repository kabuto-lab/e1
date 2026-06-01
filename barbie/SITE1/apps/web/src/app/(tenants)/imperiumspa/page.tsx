/**
 * (tenants)/imperiumspa — публичная главная салона SalonMassage.
 *
 * Рендерит бесшовную реплику статического сайта imperiumSpa/salonmassage
 * (`SalonMassageHome`) средствами стека NAS. Ростер девушек тянется из общего
 * пула NAS (раздел «Модели»), остальная вёрстка 1:1 со статикой.
 *
 * ED-редактор/CMS-страницы для этого салона НЕ используются — реплика
 * самодостаточна (свой CSS-скоуп .sm-site, свой age-gate, свой fetch girls).
 * Поэтому черновые CMS-страницы «home» на показ не влияют.
 */
import { SalonMassageHome } from '@/components/tenant-sites/salonmassage/SalonMassageHome';

export const metadata = {
  title: 'Salon Massage — премиальный массаж в Москве',
  description: 'Премиальный салон массажа в центре Москвы. Уютные апартаменты, профессиональные мастера, безупречная конфиденциальность.',
};

export default function ImperiumspaPage() {
  return <SalonMassageHome />;
}
