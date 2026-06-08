import { PentagonShell } from '@/components/tenant-sites/pentagon/PentagonShell';

export const metadata = {
  title: 'Контакты — PENTAGON spa salon',
  description: 'Контакты салона эротического массажа PENTAGON в Москве — телефон, адрес, метро Войковская.',
};

export default function Page() {
  return (
    <PentagonShell>
      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <span className="kicker">PENTAGON</span>
            <h2>Контакты</h2>
            <p>
              Мы всегда рады гостям. Свяжитесь с нами удобным способом —
              администратор подберёт программу и мастера.
            </p>
          </div>

          <div className="progs">
            <div className="prog">
              <div className="ic">❖</div>
              <h3>Телефон</h3>
              <p>
                <a href="tel:+79120769749">+7 (912) 076-97-49</a>
              </p>
            </div>
            <div className="prog">
              <div className="ic">❖</div>
              <h3>Адрес</h3>
              <p>Москва, Старопетровский проезд, 2, стр. 1</p>
            </div>
            <div className="prog">
              <div className="ic">❖</div>
              <h3>Метро</h3>
              <p>Войковская / Балтийская</p>
            </div>
            <div className="prog">
              <div className="ic">❖</div>
              <h3>Часы работы</h3>
              <p>Ежедневно, круглосуточно</p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 16,
              marginTop: 28,
            }}
          >
            <img
              src="/tenants/pentagon-clone/photo_2024-01-04_17-28-02.webp"
              alt="Салон PENTAGON"
              style={{ width: '100%', borderRadius: 12 }}
            />
            <div>
              <h3>+30 минут массажа в подарок</h3>
              <p>
                Отправьте заявку на подбор мастера и получите дополнительные
                30 минут бесплатно. Салон не оказывает услуги интим характера.
              </p>
              <a className="btn btn-accent" href="tel:+79120769749">
                Позвонить
              </a>
            </div>
          </div>
        </div>
      </section>
    </PentagonShell>
  );
}
