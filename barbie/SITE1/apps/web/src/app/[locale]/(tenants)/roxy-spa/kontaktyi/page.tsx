import { RoxyShell } from '@/components/tenant-sites/roxy/RoxyShell';

export const metadata = {
  title: 'Контакты — ROXY Men`s Relax Club',
  description:
    'Контакты ROXY: Москва, Каланчевская 32/58. Круглосуточно, 24/7. Запись по телефону 8 (499) 757-2501.',
};

/**
 * (tenants)/roxy-spa/kontaktyi — внутренняя страница тенанта roxy-spa в едином
 * стиле с главной (RoxyShell + roxy.css, тёмный циан). Серверный компонент.
 */
export default function Page() {
  return (
    <RoxyShell>
      <section className="rose-bg">
        <div className="wrap">
          <h2 className="sec-title">Контакты</h2>
          <p className="sec-sub">
            Дорогие наши мужчины! Записаться можно по телефону круглосуточно. Администратор свяжется
            с вами в течение 5 минут для уточнения времени посещения студии.
          </p>

          <div className="adv-grid" style={{ marginTop: 60 }}>
            <div className="adv">
              <h3>Телефон · 24/7</h3>
              <div className="bar" />
              <p>
                <a href="tel:+74997572501" style={{ color: 'var(--cyan)' }}>
                  8 (499) 757-2501
                </a>
              </p>
            </div>
            <div className="adv">
              <h3>Адрес</h3>
              <div className="bar" />
              <p>Москва, Каланчевская 32/58</p>
            </div>
            <div className="adv">
              <h3>Метро</h3>
              <div className="bar" />
              <p>Проспект Мира · Комсомольская</p>
            </div>
            <div className="adv">
              <h3>Режим работы</h3>
              <div className="bar" />
              <p>Круглосуточно, 24/7</p>
            </div>
            <div className="adv">
              <h3>E-mail</h3>
              <div className="bar" />
              <p>
                <a href="mailto:gift.time@bk.ru" style={{ color: 'var(--cyan)' }}>
                  gift.time@bk.ru
                </a>
              </p>
            </div>
            <div className="adv">
              <h3>Telegram</h3>
              <div className="bar" />
              <p>@roxy_spa</p>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <a className="btn-outline" href="tel:+74997572501">
              Записаться
            </a>
          </div>

          <div className="about" style={{ margin: '64px auto 0' }}>
            <p style={{ fontSize: 13, opacity: 0.7 }}>
              Салон не оказывает услуг интимного характера. Посещая наш салон, вы соглашаетесь с
              правилами нашего заведения.
            </p>
          </div>
        </div>
      </section>
    </RoxyShell>
  );
}
