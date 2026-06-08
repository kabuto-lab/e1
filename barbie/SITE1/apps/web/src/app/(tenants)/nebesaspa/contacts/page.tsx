import { NebesaShell } from '@/components/tenant-sites/nebesa/NebesaShell';

export const metadata = {
  title: 'Контакты — НЕБОСВОД · спа-салон',
  description:
    'Контакты салона эротического массажа НЕБОСВОД в Москве: телефон, адрес, метро, график работы.',
};

/**
 * (tenants)/nebesaspa/contacts — внутренняя страница тенанта nebesaspa в едином
 * стиле с главной (NebesaShell + nebesa.css). Полные реквизиты — в футере Shell;
 * здесь короткий блок с записью и CTA.
 */
export default function Page() {
  return (
    <NebesaShell>
      <section className="progs">
        <div className="wrap">
          <h2 className="h2">Контакты</h2>
          <p>
            Работаем по предварительной записи. Пишите и звоните в любое время — администратор на
            связи.
          </p>

          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginTop: 20 }}
          >
            <article className="pcard">
              <div className="nm">Номер телефона</div>
              <div className="price">
                <a className="btn btn-blue" href="tel:+79120767814">
                  +7 912 076-78-14
                </a>
              </div>
              <p>Telegram · WhatsApp — пишите в любое время.</p>
            </article>

            <article className="pcard">
              <div className="nm">Адрес</div>
              <div className="price">
                улица Фридриха Энгельса, 19 <span>М. Бауманская</span>
              </div>
              <p>Уютные интерьеры в центре Москвы.</p>
            </article>

            <article className="pcard">
              <div className="nm">График работы</div>
              <div className="price">Круглосуточно</div>
              <p>
                пн – чт: 21:00 – 7:00
                <br />
                пт – вс: круглосуточно. Работаем по предварительной записи.
              </p>
            </article>

            <article className="pcard">
              <div className="nm">Связь</div>
              <div className="price">
                <a className="btn btn-blue" href="tel:+79120767814">
                  Позвонить
                </a>
              </div>
              <p>Подпишитесь на наш Telegram-канал — новости и акции.</p>
            </article>
          </div>

          <div style={{ marginTop: 34, textAlign: 'center' }}>
            <h2 className="h2">Записаться на сеанс</h2>
            <p>Свяжитесь с нами — подберём девушку и программу под ваше настроение.</p>
            <a className="btn btn-blue" href="tel:+79120767814">
              Позвонить сейчас
            </a>
          </div>
        </div>
      </section>
    </NebesaShell>
  );
}
