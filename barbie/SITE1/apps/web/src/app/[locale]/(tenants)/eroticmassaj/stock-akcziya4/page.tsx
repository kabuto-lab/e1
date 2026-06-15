import { asset } from '@/lib/asset';
import { EroticmassajShell } from '@/components/tenant-sites/eroticmassaj/EroticmassajShell';

export const metadata = { title: 'Днём с огнём — PODIUM SPA' };

export default function Page() {
  return (
    <EroticmassajShell>
      <section className="art-hero">
        <div className="container">
          <a className="hdr-link" href={asset("/eroticmassaj/stocks")} style={{ display: 'inline-block', marginBottom: '14px' }}>← Все акции</a>
          <span className="tagline">Акция · Podium SPA</span>
          <h1>Днём с огнём!</h1>
          <div className="art-meta">Опубликовано: 25 октября 2021</div>
        </div>
      </section>
      <section style={{ paddingTop: '14px' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '34px', alignItems: 'start' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/tenants/eroticmassaj/vip-programmy.webp")} alt="Днём с огнём!" style={{ width: '100%', borderRadius: '16px', border: '1px solid var(--line)', objectFit: 'cover' }} />
          <div className="prose">
            <p>Скидка <b>10% на VIP-программы</b> (от 15 000 руб) с 13:00 до 18:00.</p>
            <p>Посетителю в рамках акции в подарок — порция виски!</p>
            <a className="btn" href={asset("/eroticmassaj/contacts")} style={{ marginTop: '10px' }}>Записаться</a>
          </div>
        </div>
      </section>
    </EroticmassajShell>
  );
}
