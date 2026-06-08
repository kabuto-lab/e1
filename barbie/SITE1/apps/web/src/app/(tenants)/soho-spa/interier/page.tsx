import { SohoShell } from '@/components/tenant-sites/soho/SohoShell';

export const metadata = {
  title: 'Интерьер — Soho Spa',
  description: '7 просторных комнат с эксклюзивным интерьером и джакузи в каждой.',
};

export default function Page() {
  return (
    <SohoShell>
      <section className="sec" style={{ marginTop: '70px' }}>
        <div className="wrap">
          <div className="sec-head">
            <div className="kicker">Атмосфера</div>
            <h2>Интерьер салона</h2>
            <p>
              7 просторных комнат с эксклюзивным интерьером и джакузи в каждой. Продуманный свет,
              мягкий текстиль и приватность для полного расслабления.
            </p>
          </div>
          <div className="grid g3 gal">
            <a href="#"><img src="/tenants/soho-spa/IMG_7848-512x512.webp" alt="Интерьер" /></a>
            <a href="#"><img src="/tenants/soho-spa/IMG_7849-512x512.webp" alt="Интерьер" /></a>
            <a href="#"><img src="/tenants/soho-spa/IMG_7853-512x512.webp" alt="Интерьер" /></a>
            <a href="#"><img src="/tenants/soho-spa/IMG_7830-512x512.webp" alt="Интерьер" /></a>
            <a href="#"><img src="/tenants/soho-spa/IMG_7831-512x512.webp" alt="Интерьер" /></a>
            <a href="#"><img src="/tenants/soho-spa/IMG_7839-512x512.webp" alt="Интерьер" /></a>
            <a href="#"><img src="/tenants/soho-spa/IMG_7856-512x512.webp" alt="Интерьер" /></a>
            <a href="#"><img src="/tenants/soho-spa/IMG_7816-512x512.webp" alt="Интерьер" /></a>
          </div>
          <div style={{ marginTop: '30px' }} className="grid g2 gal">
            <a href="#">
              <img
                src="/tenants/soho-spa/IMG_7741-1024x683.webp"
                alt="Интерьер"
                style={{ aspectRatio: '1024/683' }}
              />
            </a>
            <a href="#">
              <img
                src="/tenants/soho-spa/IMG_7784-1024x683.webp"
                alt="Интерьер"
                style={{ aspectRatio: '1024/683' }}
              />
            </a>
          </div>
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <a href="/soho-spa/contacts" className="btn">Записаться в салон</a>
          </div>
        </div>
      </section>
    </SohoShell>
  );
}
