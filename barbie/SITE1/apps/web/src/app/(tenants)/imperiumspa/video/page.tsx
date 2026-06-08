import { ImperiumShell } from '@/components/tenant-sites/imperiumspa/ImperiumShell';

export const metadata = {
  title: 'Видео салона Imperium',
  description: 'Атмосфера салона IMPERIUM в движении — интерьеры и настроение пространства.',
};

export default function Page() {
  return (
    <ImperiumShell active="video">
      <div className="pagehead">
        <div className="wrap">
          <h1>Видео</h1>
          <div className="crumb">Главная / Видео</div>
        </div>
      </div>
      <section>
        <div className="wrap">
          <div className="prose" style={{ textAlign: 'center', marginBottom: '40px' }}>
            <p>Атмосфера салона IMPERIUM в движении — взгляните на интерьеры и настроение нашего пространства.</p>
          </div>
          <div style={{ maxWidth: '880px', margin: '0 auto', borderRadius: '18px', overflow: 'hidden', border: '1px solid var(--line)' }}>
            <video controls poster="/tenants/imperiumspa/imperium-1-1.webp" style={{ width: '100%', display: 'block' }}>
              <source src="/tenants/imperiumspa/hero.mp4" type="video/mp4" />
            </video>
          </div>
          <div className="gallery" style={{ marginTop: '34px' }}>
            <a href="/imperiumspa/interiors"><img src="/tenants/imperiumspa/imperium-1-1.webp" alt="Интерьер" loading="lazy" /></a>
            <a href="/imperiumspa/interiors"><img src="/tenants/imperiumspa/imperium-2-1.webp" alt="Интерьер" loading="lazy" /></a>
            <a href="/imperiumspa/interiors"><img src="/tenants/imperiumspa/imperium-3-1.webp" alt="Интерьер" loading="lazy" /></a>
            <a href="/imperiumspa/interiors"><img src="/tenants/imperiumspa/imperium-4-1.webp" alt="Интерьер" loading="lazy" /></a>
            <a href="/imperiumspa/interiors"><img src="/tenants/imperiumspa/imperium-5-1.webp" alt="Интерьер" loading="lazy" /></a>
            <a href="/imperiumspa/interiors"><img src="/tenants/imperiumspa/imperium-6-1.webp" alt="Интерьер" loading="lazy" /></a>
          </div>
        </div>
      </section>
    </ImperiumShell>
  );
}
