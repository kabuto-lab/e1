import { EroticmassajShell } from '@/components/tenant-sites/eroticmassaj/EroticmassajShell';

export const metadata = { title: 'Коктейльная вечеринка — PODIUM SPA' };

export default function Page() {
  return (
    <EroticmassajShell>
      <section className="art-hero">
        <div className="container">
          <a className="hdr-link" href="/eroticmassaj/stocks" style={{ display: 'inline-block', marginBottom: '14px' }}>← Все акции</a>
          <span className="tagline">Акция · Podium SPA</span>
          <h1>Коктейльная вечеринка!</h1>
          <div className="art-meta">Опубликовано: 18 июля 2022</div>
        </div>
      </section>
      <section style={{ paddingTop: '14px' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '34px', alignItems: 'start' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/tenants/eroticmassaj/vecherinka-koktejlnaya-1.webp" alt="Коктейльная вечеринка!" style={{ width: '100%', borderRadius: '16px', border: '1px solid var(--line)', objectFit: 'cover' }} />
          <div className="prose">
            <p>Каждый четверг в стенах нашего заведения проводится коктейльная вечеринка. При посещении — каждому гостю порция фирменного коктейля в подарок!</p>
            <p>Напиток выдаётся на ресепшене или на показе. Уточняйте у администратора салона.</p>
            <a className="btn" href="/eroticmassaj/contacts" style={{ marginTop: '10px' }}>Записаться</a>
          </div>
        </div>
      </section>
    </EroticmassajShell>
  );
}
