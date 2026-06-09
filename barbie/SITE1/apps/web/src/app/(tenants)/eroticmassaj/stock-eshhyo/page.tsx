import { asset } from '@/lib/asset';
import { EroticmassajShell } from '@/components/tenant-sites/eroticmassaj/EroticmassajShell';

export const metadata = { title: 'Двойной экстаз — PODIUM SPA' };

export default function Page() {
  return (
    <EroticmassajShell>
      <section className="art-hero">
        <div className="container">
          <a className="hdr-link" href="/eroticmassaj/stocks" style={{ display: 'inline-block', marginBottom: '14px' }}>← Все акции</a>
          <span className="tagline">Акция · Podium SPA</span>
          <h1>Двойной экстаз</h1>
          <div className="art-meta">Опубликовано: 7 октября 2021</div>
        </div>
      </section>
      <section style={{ paddingTop: '14px' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '34px', alignItems: 'start' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/tenants/eroticmassaj/lesbi.webp")} alt="Двойной экстаз" style={{ width: '100%', borderRadius: '16px', border: '1px solid var(--line)', objectFit: 'cover' }} />
          <div className="prose">
            <p>Специально для наших мужчин — <b>массаж в 4 руки в подарок!</b></p>
            <p>До 18:00 действует на программы от 10 000 ₽, после 18:00 — на программы от 15 000 ₽. Успейте поймать возможность!</p>
            <p><i>*Массаж в 4 руки будут делать 2 красавицы только в классической части, а на эротический массаж остаётся 1 девушка, вторая удаляется. Кто это будет? Решать Вам!</i></p>
            <a className="btn" href="/eroticmassaj/contacts" style={{ marginTop: '10px' }}>Записаться</a>
          </div>
        </div>
      </section>
    </EroticmassajShell>
  );
}
