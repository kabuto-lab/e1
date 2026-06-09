import { asset } from '@/lib/asset';
import { SohoShell } from '@/components/tenant-sites/soho/SohoShell';

export const metadata = {
  title: 'Видео — Soho Spa',
  description: 'Видео с нашими соблазнительными массажистками Soho Spa.',
};

const vcardCss = `
.vcard{position:relative;border-radius:14px;overflow:hidden;border:1px solid var(--line);background:var(--bg-2)}
.vcard img{aspect-ratio:340/404;object-fit:cover;width:100%;filter:brightness(.75)}
.vcard .play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.vcard .play span{width:64px;height:64px;border-radius:50%;background:rgba(194,168,108,.92);color:#0a0a0c;
  display:flex;align-items:center;justify-content:center;font-size:24px;padding-left:5px}
.vcard:hover .play span{transform:scale(1.1)}
.vcard .cap{position:absolute;left:0;right:0;bottom:0;padding:14px 16px;font-weight:600;
  background:linear-gradient(transparent,rgba(0,0,0,.85))}
`;

const VIDEOS = [
  { img: 'photo_2026-01-28_14-25-47-2-340x404.webp', cap: 'Лейзи' },
  { img: 'photo_2026-01-28_14-24-40-340x404.webp', cap: 'Лана' },
  { img: 'IMG_4191-1-340x404.webp', cap: 'Элизабет' },
  { img: 'DSC_0625-1-340x404.webp', cap: 'Наоми' },
  { img: 'IMG_0302-340x404.webp', cap: 'Даниэлла' },
  { img: '590DED8F-3F7D-4916-926E-219517BD2055-340x404.webp', cap: 'Кортни' },
  { img: 'photo_2026-01-20_19-05-06-340x404.webp', cap: 'Агния' },
  { img: 'photo_2026-01-20_19-06-31-340x404.webp', cap: 'Шанель' },
];

export default function Page() {
  return (
    <SohoShell>
      <style dangerouslySetInnerHTML={{ __html: vcardCss }} />
      <section className="sec" style={{ marginTop: '70px' }}>
        <div className="wrap">
          <div className="sec-head">
            <div className="kicker">Галерея 18+</div>
            <h2>Видео</h2>
            <p>
              Видео с нашими соблазнительными массажистками. Подписывайтесь на наш
              Telegram-канал, чтобы первыми видеть новинки.
            </p>
          </div>
          <div className="grid g4">
            {VIDEOS.map((v) => (
              <div className="vcard" key={v.cap}>
                <img src={asset(`/tenants/soho-spa/${v.img}`)} alt="Видео" />
                <div className="play">
                  <span>▶</span>
                </div>
                <div className="cap">{v.cap}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <a href="/soho-spa/girls" className="btn btn-ghost">Все девушки</a>
          </div>
        </div>
      </section>
    </SohoShell>
  );
}
