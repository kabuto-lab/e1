import { ImperiumShell } from '@/components/tenant-sites/imperiumspa/ImperiumShell';

export const metadata = {
  title: 'Интерьеры салона эротического массажа Imperium',
  description: 'Интерьеры салона Imperium в римском стиле — кабинеты разных форматов, включая тематическую БДСМ-комнату.',
};

export default function Page() {
  return (
    <ImperiumShell active="interiors">
      <div className="pagehead">
        <div className="wrap">
          <h1>Интерьеры</h1>
          <div className="crumb">Главная / Интерьеры</div>
        </div>
      </div>
      <section>
        <div className="wrap">
          <div className="prose" style={{ textAlign: 'center', marginBottom: '46px' }}>
            <p>Наш интерьер выполнен исключительно в римском стиле. Атмосфера роскоши Древнего Рима, мягкий свет и уединение — приходите и убедитесь сами. Доступны кабинеты разных форматов, включая тематическую БДСМ-комнату.</p>
          </div>
          <div className="gallery">
            <a href="#"><img src="/tenants/imperiumspa/imperium-1-1.webp" alt="Интерьер салона Imperium" loading="lazy" /></a>
            <a href="#"><img src="/tenants/imperiumspa/imperium-2-1.webp" alt="Интерьер салона Imperium" loading="lazy" /></a>
            <a href="#"><img src="/tenants/imperiumspa/imperium-3-1.webp" alt="Интерьер салона Imperium" loading="lazy" /></a>
            <a href="#"><img src="/tenants/imperiumspa/imperium-4-1.webp" alt="Интерьер салона Imperium" loading="lazy" /></a>
            <a href="#"><img src="/tenants/imperiumspa/imperium-5-1.webp" alt="Интерьер салона Imperium" loading="lazy" /></a>
            <a href="#"><img src="/tenants/imperiumspa/imperium-6-1.webp" alt="Интерьер салона Imperium" loading="lazy" /></a>
            <a href="#"><img src="/tenants/imperiumspa/imperium-7-1.webp" alt="Интерьер салона Imperium" loading="lazy" /></a>
            <a href="#"><img src="/tenants/imperiumspa/imperium-8-1.webp" alt="Интерьер салона Imperium" loading="lazy" /></a>
          </div>
        </div>
      </section>
    </ImperiumShell>
  );
}
