import { asset } from '@/lib/asset';
import { VaniliaShell } from '@/components/tenant-sites/vanilia/VaniliaShell';

export const metadata = {
  title: 'Интерьер — Vanilia · салон эротического массажа',
  description:
    'Интерьер салона Vanilia в центре Москвы: просторные комнаты, хаммам, джакузи и VIP-зоны для чувственного отдыха.',
};

export default function Page() {
  return (
    <VaniliaShell>
      <section>
        <div className="wrap">
          <div className="panel-sec">
            <h2 className="center">Интерьер</h2>
            <p style={{ textAlign: 'center' }}>
              Изысканное пространство в центре Москвы, созданное для чувственного отдыха.
            </p>
            <p style={{ textAlign: 'center' }}>
              Просторные комнаты, хаммам, джакузи и VIP-зоны. Каждая деталь продумана для вашего
              комфорта, расслабления и полного погружения в атмосферу удовольствия.
            </p>

            <div className="girls">
              <div className="girl">
                <div className="ph">
                  <img src={asset("/tenants/5massage/int1.webp")} alt="Интерьер 1" />
                </div>
              </div>
              <div className="girl">
                <div className="ph">
                  <img src={asset("/tenants/5massage/int2.webp")} alt="Интерьер 2" />
                </div>
              </div>
              <div className="girl">
                <div className="ph">
                  <img src={asset("/tenants/5massage/int3.webp")} alt="Интерьер 3" />
                </div>
              </div>
              <div className="girl">
                <div className="ph">
                  <img src={asset("/tenants/5massage/int4.webp")} alt="Интерьер 4" />
                </div>
              </div>
              <div className="girl">
                <div className="ph">
                  <img src={asset("/tenants/5massage/int5.webp")} alt="Интерьер 5" />
                </div>
              </div>
              <div className="girl">
                <div className="ph">
                  <img src={asset("/tenants/5massage/int6.webp")} alt="Интерьер 6" />
                </div>
              </div>
            </div>

            <p style={{ textAlign: 'center' }}>
              Приходите в гости — Москва, Лучников переулок, 7/4с5 · М. Лубянка / Китай-город.
            </p>
            <p style={{ textAlign: 'center' }}>
              <a className="btn" href={asset("/5massage/contacts")}>
                Как добраться
              </a>
            </p>
          </div>
        </div>
      </section>
    </VaniliaShell>
  );
}
