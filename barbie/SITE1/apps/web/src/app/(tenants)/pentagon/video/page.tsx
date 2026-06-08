import { PentagonShell } from '@/components/tenant-sites/pentagon/PentagonShell';

export const metadata = {
  title: 'Видео — PENTAGON spa salon',
  description: 'Видео салона эротического массажа PENTAGON — атмосфера, девушки, интерьеры.',
};

/**
 * (tenants)/pentagon/video — внутренняя страница тенанта pentagon в едином стиле
 * с главной (PentagonShell + pentagon.css). Серверный компонент.
 */
export default function Page() {
  return (
    <PentagonShell>
      <section className="sec" id="video">
        <div className="wrap">
          <div className="sec-head">
            <span className="kicker">PENTAGON</span>
            <h2>Видео</h2>
            <p>
              Эротический массаж позволит мужчине получить массу новых эмоций. Атмосфера салона,
              наши девушки и интерьеры — в видеоформате.
            </p>
          </div>

          <div className="girls">
            <div className="girl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/tenants/pentagon-clone/photo_2024-01-04_17-38-12.webp"
                alt="Атмосфера салона PENTAGON"
                loading="lazy"
              />
              <div className="meta">
                <h3>▶ Атмосфера салона</h3>
                <span>PENTAGON · обзор</span>
              </div>
            </div>
            <div className="girl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/tenants/pentagon-clone/1111-kopiya-scaled.webp"
                alt="Вечеринки и мальчишники PENTAGON"
                loading="lazy"
              />
              <div className="meta">
                <h3>▶ Наши вечеринки</h3>
                <span>PENTAGON · мальчишник</span>
              </div>
            </div>
          </div>

          <p style={{ maxWidth: 760, marginTop: 34 }}>
            У нас работают профессиональные мастерицы, которые без труда находят подход даже к самым
            требовательным гостям. Благодаря своим навыкам они раскрепощают и расслабляют, а также
            дарят незабываемые эмоции. Если вы давно хотели посетить наш салон — самое время это
            сделать!
          </p>

          <div style={{ marginTop: 28 }}>
            <a href="/pentagon/program" className="btn btn-accent">
              Выбрать программу
            </a>
          </div>
        </div>
      </section>
    </PentagonShell>
  );
}
