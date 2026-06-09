import { asset } from '@/lib/asset';
import { RoxyShell } from '@/components/tenant-sites/roxy/RoxyShell';

export const metadata = {
  title: 'Интерьеры — ROXY Men`s Relax Club',
  description:
    'Интерьеры ROXY: три VIP-комнаты с джакузи и восемь комнат с душевыми кабинками. Кондиционер, чистое бельё, полная конфиденциальность.',
};

const gallery = ['2101', '2102', '2103', '2104', '2105', '2106', '2107', '2111', '3'];

const advantages = [
  {
    title: 'VIP с джакузи',
    text: 'Три просторные VIP-комнаты с джакузи — для самого премиального отдыха.',
  },
  {
    title: 'Душевые кабинки',
    text: 'Восемь уютных комнат с собственными душевыми кабинками.',
  },
  {
    title: 'Конфиденциальность',
    text: 'Гости не пересекаются внутри салона. Фото- и видеосъёмка запрещена.',
  },
];

/**
 * (tenants)/roxy-spa/intereryi — внутренняя страница тенанта roxy-spa в едином
 * стиле с главной (RoxyShell + roxy.css). Контент портирован из прототипа.
 */
export default function Page() {
  return (
    <RoxyShell>
      <section className="rose-bg">
        <div className="wrap">
          <h2 className="sec-title">Интерьеры</h2>
          <p className="sec-sub">
            Три VIP-комнаты с джакузи и восемь комнат, оснащённых душевыми кабинками. В каждой
            комнате кондиционер. Махровые полотенца, одноразовое чистое бельё, гели для душа и
            тапочки — мы всё продумали.
          </p>

          <div className="gal-grid">
            {gallery.map((name) => (
              <div
                key={name}
                className="cell"
                style={{
                  backgroundImage: `url(${asset(`/tenants/roxy-spa/${name}.webp`)})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            ))}
          </div>

          <div className="adv-grid" style={{ marginTop: '40px' }}>
            {advantages.map((a) => (
              <div className="adv" key={a.title}>
                <h3>{a.title}</h3>
                <div className="bar" />
                <p>{a.text}</p>
              </div>
            ))}
          </div>

          <div className="about" style={{ marginTop: '40px' }}>
            <h2>Атмосфера и комфорт</h2>
            <p>
              Салон не оказывает услуг интимного характера. Посещая наш салон, вы соглашаетесь с
              правилами нашего заведения.
            </p>
            <a className="btn-outline" href="tel:+74997572501">
              8 (499) 757-2501
            </a>
          </div>
        </div>
      </section>
    </RoxyShell>
  );
}
