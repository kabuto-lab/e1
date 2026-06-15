/**
 * (tenants)/imperiumspa/models/[girl] — профиль модели салона SalonMassage.
 * Реплика статической /models/{slug}/ (фото во всю ширину + миниатюры + лайтбокс).
 * Данные по slug из общего пула NAS (GET /v1/public/girls/:slug).
 */
import '@/styles/salonmassage.css';
import { notFound } from 'next/navigation';
import { fetchPublicGirl } from '@/lib/public-girls-api';
import { SmHeader } from '@/components/tenant-sites/salonmassage/SmHeader';
import { SmFooter } from '@/components/tenant-sites/salonmassage/SmFooter';
import { SmAgeGate } from '@/components/tenant-sites/salonmassage/SmAgeGate';
import { SmProfileStage } from '@/components/tenant-sites/salonmassage/SmProfileStage';

export async function generateMetadata({ params }: { params: Promise<{ girl: string }> }) {
  const { girl } = await params;
  const g = await fetchPublicGirl(girl).catch(() => null);
  return { title: g ? `${g.name} — Salon Massage` : 'Анкета — Salon Massage' };
}

export default async function SalonMassageProfilePage({ params }: { params: Promise<{ girl: string }> }) {
  const { girl } = await params;
  const g = await fetchPublicGirl(girl).catch(() => null);
  if (!g) notFound();

  return (
    <div className="sm-site" id="top">
      <SmAgeGate />
      <SmHeader />
      <SmProfileStage girl={g} />
      <SmFooter />
    </div>
  );
}
