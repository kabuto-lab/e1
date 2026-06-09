import { asset } from '@/lib/asset';
import { EroticmassajShell } from '@/components/tenant-sites/eroticmassaj/EroticmassajShell';

export const metadata = { title: 'Счастливый билет — PODIUM SPA' };

export default function Page() {
  return (
    <EroticmassajShell>
      <section className="art-hero">
        <div className="container">
          <a className="hdr-link" href={asset("/eroticmassaj/stocks")} style={{ display: 'inline-block', marginBottom: '14px' }}>← Все акции</a>
          <span className="tagline">Акция · Podium SPA</span>
          <h1>Счастливый билет</h1>
          <div className="art-meta">Опубликовано: 25 января 2023</div>
        </div>
      </section>
      <section style={{ paddingTop: '14px' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '34px', alignItems: 'start' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/tenants/eroticmassaj/oblozhka-1.webp")} alt="Счастливый билет" style={{ width: '100%', borderRadius: '16px', border: '1px solid var(--line)', objectFit: 'cover' }} />
          <div className="prose">
            <p>Беспроигрышная лотерея! Записывайтесь на программу, выбирайте билет и выигрывайте бесплатные бонусы!</p>
            <p>Что вы выберете сегодня? Подробности у администратора салона.</p>
            <a className="btn" href={asset("/eroticmassaj/contacts")} style={{ marginTop: '10px' }}>Записаться</a>
          </div>
        </div>
      </section>
    </EroticmassajShell>
  );
}
