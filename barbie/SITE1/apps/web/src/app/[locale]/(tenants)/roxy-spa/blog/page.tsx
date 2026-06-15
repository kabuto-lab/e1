import { RoxyShell } from '@/components/tenant-sites/roxy/RoxyShell';

export const metadata = {
  title: 'Блог — ROXY Men`s Relax Club',
  description: 'Статьи об эротическом массаже, техниках и культуре релакса от салона ROXY.',
};

/**
 * (tenants)/roxy-spa/blog — внутренняя страница тенанта roxy-spa в едином стиле
 * с главной (RoxyShell + roxy.css). Контент перенесён из прототипа blog.html.
 */
export default function Page() {
  const posts = [
    {
      title: 'Что представляет собой эротический массаж?',
      text: 'Достойная альтернатива половому акту: неземное наслаждение от ласковых рук и умелых движений профессиональной массажистки.',
      href: '/roxy-spa/programmyi',
    },
    {
      title: 'Японская техника «ветка сакуры»',
      text: 'Воздействие обнажённого тела гейши с использованием большого количества аромамасла — особый интерес для мужчин.',
      href: '/roxy-spa/programmyi',
    },
    {
      title: 'Тайские и японские техники',
      text: 'Комбинации разных техник способны довести до экстаза даже «холодных» мужчин и поддержать мужское здоровье.',
      href: '/roxy-spa/programmyi',
    },
    {
      title: 'Массаж с выездом на дом',
      text: 'Новая услуга салона: пригласите очаровательную массажистку к себе домой или в гостиничный номер.',
      href: '/roxy-spa/massazh-i-vyiezd-na-dom',
    },
    {
      title: 'Атмосфера салона ROXY',
      text: 'Три VIP-комнаты с джакузи и восемь комнат с душевыми кабинками — мы продумали каждую деталь.',
      href: '/roxy-spa/intereryi',
    },
    {
      title: 'Как получить максимум выгоды',
      text: 'Отдыхайте в удовольствии и с выгодой — обзор актуальных акций салона.',
      href: '/roxy-spa/akczii',
    },
  ];

  return (
    <RoxyShell>
      <section className="rose-bg">
        <div className="wrap">
          <h2 className="sec-title">Блог</h2>
          <p className="sec-sub">
            О техниках эротического массажа, искусстве релакса и культуре наслаждения.
          </p>

          <div className="prog-grid">
            {posts.map((p) => (
              <div className="prog" key={p.title}>
                <div className="body">
                  <div className="name">{p.title}</div>
                  <p className="desc">{p.text}</p>
                  <a className="btn-outline" href={p.href}>
                    Читать →
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="about" style={{ marginTop: 40 }}>
            <p>
              Салон не оказывает услуг интимного характера. Посещая наш салон, вы соглашаетесь
              с правилами нашего заведения.
            </p>
            <a className="btn-outline" href="tel:+74997572501">
              Записаться · 8 (499) 757-2501
            </a>
          </div>
        </div>
      </section>
    </RoxyShell>
  );
}
