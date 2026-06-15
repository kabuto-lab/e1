/**
 * (tenants)/salonmassage/models/[girl] — профиль модели салона SalonMassage.
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

export default async function Page({ params }: { params: Promise<{ girl: string }> }) {
  const { girl } = await params;
  const g = await fetchPublicGirl(girl).catch(() => null);
  if (!g) notFound();

  return (
    <div className="sm-site" id="top">
      <SmAgeGate />
      <SmHeader base="salonmassage" />
      <SmProfileStage girl={g} base="salonmassage" />
      <SmFooter base="salonmassage" />
    </div>
  );
}
