import { EtalonShell } from '@/components/tenant-sites/etalon/EtalonShell';

export const metadata = {
  title: 'Интерьер — Etalon',
  description: 'Интерьер салона эротического массажа Etalon в Москве — уютные апартаменты с приглушённым светом.',
};

export default function Page() {
  return (
    <EtalonShell>
      <section className="page-hero">
        <div className="wrap">
          <span className="hero-tag">Атмосфера</span>
          <h1>
            Наш <em>интерьер</em>
          </h1>
          <p>
            Приглушённый свет, расслабляющая музыка и возбуждающие ароматы. Уютные апартаменты, где вы почувствуете себя
            желанным гостем.
          </p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="gallery">
            <img src="/tenants/etalonspa/photo_2020-09-30_14-32-01-1024x576.webp" alt="Интерьер салона Etalon" />
            <img src="/tenants/etalonspa/photo_2020-09-30_14-32-02-1024x576.webp" alt="Интерьер салона Etalon" />
            <img src="/tenants/etalonspa/photo_2020-09-30_14-32-04-1024x576.webp" alt="Интерьер салона Etalon" />
            <img src="/tenants/etalonspa/photo_2020-09-30_14-32-05-1024x576.webp" alt="Интерьер салона Etalon" />
            <img src="/tenants/etalonspa/photo_2020-09-30_14-32-06-1024x576.webp" alt="Интерьер салона Etalon" />
            <img src="/tenants/etalonspa/photo_2020-09-30_14-32-10-1024x576.webp" alt="Интерьер салона Etalon" />
          </div>
          <div style={{ textAlign: 'center', marginTop: '46px' }}>
            <a href="/etalonspa/contacts" className="btn">
              Записаться на массаж
            </a>
          </div>
        </div>
      </section>
    </EtalonShell>
  );
}
