import { VaniliaShell } from '@/components/tenant-sites/vanilia/VaniliaShell';

export const metadata = {
  title: 'Контакты — Vanilia · салон эротического массажа',
  description:
    'Контакты салона Vanilia: Москва, Лучников переулок, 7/4с5. Работаем ежедневно, 24 часа, по предварительной записи. Телефон +7 912 076-72-23.',
};

export default function Page() {
  return (
    <VaniliaShell>
      <section>
        <div className="wrap">
          <div className="panel-sec">
            <h2 className="center">Контакты</h2>
            <p style={{ textAlign: 'center' }}>
              Москва, центр. Работаем ежедневно, 24 часа, по предварительной записи.
            </p>

            <div className="prog-grid">
              <div className="prog">
                <div className="nm">Адрес</div>
                <div className="desc">
                  Москва, Лучников переулок, 7/4с5. М. Лубянка · М. Китай-город.
                </div>
              </div>
              <div className="prog">
                <div className="nm">Телефон</div>
                <div className="desc">
                  Ежедневно, 24 часа · по записи. Звоните в любое время — мы всегда на связи.
                </div>
              </div>
              <div className="prog">
                <div className="nm">Режим работы</div>
                <div className="desc">
                  Ежедневно · 24 часа. По предварительной записи.
                </div>
              </div>
              <div className="prog">
                <div className="nm">Соцсети</div>
                <div className="desc">
                  Telegram · WhatsApp. Закрытый канал с секретными видео и анонсами новых девушек.
                </div>
              </div>
            </div>

            <p style={{ textAlign: 'center', marginTop: 28 }}>
              Позвоните, и мы подберём программу и время визита.
            </p>
            <p style={{ textAlign: 'center' }}>
              <a className="btn" href="tel:+79120767223">
                +7 912 076-72-23
              </a>
            </p>
          </div>
        </div>
      </section>
    </VaniliaShell>
  );
}
