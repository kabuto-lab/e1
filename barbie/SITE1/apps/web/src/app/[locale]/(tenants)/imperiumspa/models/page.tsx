/**
 * (tenants)/imperiumspa/models — листинг анкет салона SalonMassage.
 * Реплика статической /models/ (фильтр-дропдауны + грид). Ростер из общего пула
 * NAS (GET /v1/public/girls?tenant=imperiumspa).
 */
import '@/styles/salonmassage.css';
import { fetchPublicGirls } from '@/lib/public-girls-api';
import { SmHeader } from '@/components/tenant-sites/salonmassage/SmHeader';
import { SmFooter } from '@/components/tenant-sites/salonmassage/SmFooter';
import { SmAgeGate } from '@/components/tenant-sites/salonmassage/SmAgeGate';
import { SmModelsListing } from '@/components/tenant-sites/salonmassage/SmModelsListing';

export const metadata = {
  title: 'Анкеты — Salon Massage',
  description: 'Анкеты девушек салона SalonMassage. Подберите по параметрам.',
};

export default async function SalonMassageModelsPage() {
  const { data: girls } = await fetchPublicGirls('imperiumspa').catch(() => ({ data: [], total: 0 }));

  return (
    <div className="sm-site" id="top">
      <SmAgeGate />
      <SmHeader />
      <main className="listing">
        <div className="wrap center">
          <div className="kicker">Наша команда</div>
          <div className="stitle">Анкеты девушек</div>
          <p className="lead">{girls.length} девушек. Подберите по параметрам.</p>
          <SmModelsListing girls={girls} />
        </div>
      </main>
      <SmFooter />
    </div>
  );
}
