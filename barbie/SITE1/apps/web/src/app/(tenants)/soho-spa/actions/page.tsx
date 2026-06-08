import { SohoShell } from '@/components/tenant-sites/soho/SohoShell';

export const metadata = {
  title: 'Акции — Soho Spa',
  description: 'Акции на эротический массаж: больше удовольствия за меньшие деньги.',
};

export default function Page() {
  return (
    <SohoShell>
      <section className="sec" style={{ marginTop: '70px' }}>
        <div className="wrap">
          <div className="sec-head">
            <div className="kicker">Выгодно</div>
            <h2>Акции на эротический массаж</h2>
            <p>Дарим больше удовольствия за меньшие деньги. Уточняйте актуальные условия у администратора.</p>
          </div>
          <div className="grid g3">
            <div className="acard">
              <img src="/tenants/soho-spa/Soho-eshhe-30-minut-512x512.webp" alt="Ещё 30 минут" loading="lazy" referrerPolicy="no-referrer" />
              <div className="ab">
                <h3>⏳ Ещё 30 минут</h3>
                <p>Закажите подбор мастера и получите дополнительные 30 минут на массаж в подарок.</p>
              </div>
            </div>
            <div className="acard">
              <img src="/tenants/soho-spa/IMG_8497com-512x512.webp" alt="Счастливые часы" loading="lazy" referrerPolicy="no-referrer" />
              <div className="ab">
                <h3>Счастливые часы</h3>
                <p>Специальные цены на программы в определённые часы — отдых выгоднее.</p>
              </div>
            </div>
            <div className="acard">
              <img src="/tenants/soho-spa/women-model-long-hair-brunette-ass-in-bed-304215-wallhere.com_-512x512.webp" alt="Эксклюзивное поздравление" loading="lazy" referrerPolicy="no-referrer" />
              <div className="ab">
                <h3>Эксклюзивное поздравление</h3>
                <p>Особый сценарий на день рождения и важные даты.</p>
              </div>
            </div>
            <div className="acard">
              <img src="/tenants/soho-spa/scale_1200-512x512.webp" alt="Баллы = Рубли" loading="lazy" referrerPolicy="no-referrer" />
              <div className="ab">
                <h3>Баллы = Рубли</h3>
                <p>Накопительная система лояльности: бонусы за каждый визит конвертируются в рубли.</p>
              </div>
            </div>
            <div className="acard">
              <img src="/tenants/soho-spa/dlya-soho.webp" alt="Реферальная система" loading="lazy" referrerPolicy="no-referrer" />
              <div className="ab">
                <h3>Реферальная система</h3>
                <p>Приводите друзей — получайте приятные бонусы на следующий визит.</p>
              </div>
            </div>
            <div className="acard">
              <img src="/tenants/soho-spa/poczelui.webp" alt="Подарочный сертификат" loading="lazy" referrerPolicy="no-referrer" />
              <div className="ab">
                <h3>Подарочный сертификат</h3>
                <p>Идеальный подарок мечты на любую программу из прайса.</p>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <a href="/soho-spa/contacts" className="btn">Воспользоваться акцией</a>
          </div>
        </div>
      </section>
    </SohoShell>
  );
}
