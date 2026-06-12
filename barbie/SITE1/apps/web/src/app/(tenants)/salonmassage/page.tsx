/**
 * (tenants)/salonmassage — главная сайта SalonMassage (реплика salonmassage.ru).
 * Отдельный тенант от imperiumspa (Imperium): тот же Sm-шелл, но slug='salonmassage'
 * (свой пул моделей и свои внутренние ссылки).
 */
import { SalonMassageHome } from '@/components/tenant-sites/salonmassage/SalonMassageHome';

export const metadata = {
  title: 'Salon Massage — премиальный салон массажа в Москве',
  description:
    'Закрытый салон массажа в центре Москвы: авторские программы, анкеты девушек, выезд. Круглосуточно, полная конфиденциальность.',
};

export default async function Page() {
  return <SalonMassageHome slug="salonmassage" />;
}
