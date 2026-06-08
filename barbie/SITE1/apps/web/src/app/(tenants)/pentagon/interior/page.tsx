import { PentagonShell } from '@/components/tenant-sites/pentagon/PentagonShell';

export const metadata = {
  title: 'Интерьер — PENTAGON spa salon',
  description:
    'Интерьер салона PENTAGON — дизайнерский ремонт, джакузи в каждой комнате, брутальный минимализм.',
};

export default function Page() {
  return (
    <PentagonShell>
      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <span className="kicker">PENTAGON</span>
            <h2>Наши интерьеры</h2>
            <p>
              Дизайнерский ремонт, качественные материалы, мебель под заказ —
              каждый квадратный метр нашего салона наполнен заботой о вас!
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2,1fr)',
              gap: 16,
            }}
          >
            <div className="girl">
              <img src="/tenants/pentagon-clone/photo_2024-01-04_17-28-02.webp" alt="" />
            </div>
            <div className="girl">
              <img src="/tenants/pentagon-clone/photo_2024-01-04_17-38-12.webp" alt="" />
            </div>
            <div className="girl">
              <img src="/tenants/pentagon-clone/photo_2024-01-10_12-39-54.webp" alt="" />
            </div>
            <div className="girl">
              <img src="/tenants/pentagon-clone/photo_2024-01-04_17-28-01.webp" alt="" />
            </div>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <span className="kicker">Мужское пространство</span>
            <h2>Брутальный минимализм</h2>
          </div>

          <p>
            Эротический салон — место, куда мужчина приходит реализовывать свои
            фантазии. Чтобы делать это было комфортно, окружающая обстановка
            должна соответствовать. Поэтому мы обустроили апартаменты не только
            функционально, но и стильно.
          </p>
          <p>
            Просторные кровати, удобные душевые, джакузи в каждой комнате — всё
            это делает наш салон привлекательным. Приходите и расслабляйтесь в
            приятной обстановке!
          </p>

          <p>
            <a className="btn btn-accent" href="/pentagon/contacts">
              Записаться
            </a>
          </p>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <span className="kicker">Контакты</span>
            <h2>Запишитесь на визит</h2>
            <p>Старопетровский проезд, 2, стр. 1 · м. Войковская</p>
          </div>
          <p>
            <a className="btn btn-accent" href="tel:+79120769749">
              +7 (912) 076-97-49
            </a>
          </p>
        </div>
      </section>
    </PentagonShell>
  );
}
