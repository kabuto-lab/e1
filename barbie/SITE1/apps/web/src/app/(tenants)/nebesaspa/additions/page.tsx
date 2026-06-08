import { NebesaShell } from '@/components/tenant-sites/nebesa/NebesaShell';

export const metadata = {
  title: 'Дополнения — НЕБОСВОД · спа-салон',
  description:
    'Дополнения к программам эротического массажа в салоне НЕБОСВОД: бар, поцелуи, контроль окончания, клубничка и другое.',
};

const ADDITIONS: { img: string; nm: string; desc: string }[] = [
  {
    img: '/tenants/nebesaspa-clone/hf_20260423_223324_280cdf77-ef7a-45fa-96fa-2583ed515e6b-300x225.webp',
    nm: 'Бар',
    desc: 'Мы не гонимся за градусом — мы гонимся за вкусом и атмосферой. От китайской чайной церемонии до изысканных напитков.',
  },
  {
    img: '/tenants/nebesaspa-clone/hf_20260423_224929_8a1822f6-d23d-41e1-b7be-819887e7f95c-300x225.webp',
    nm: 'Поцелуи',
    desc: 'Нежно и возбуждающе: одна из девушек осыпет всё ваше тело прикосновениями своих сочных губ.',
  },
  {
    img: '/tenants/nebesaspa-clone/hf_20260423_232711_874c484d-5ee6-4593-8809-691546416031-300x225.webp',
    nm: 'Контроль окончания',
    desc: 'Более яркие впечатления: девушки следят за реакциями, чтобы в нужный момент сделать паузу… и снова продолжить.',
  },
  {
    img: '/tenants/nebesaspa-clone/hf_20260423_233608_2f1bccf9-1ec9-4dfe-ac92-b1d065b2e39d-300x225.webp',
    nm: 'Клубничка',
    desc: 'Она пробует вас на вкус. Клубника имитирует кончик языка, но остаётся прохладной — дразнит и будоражит.',
  },
  {
    img: '/tenants/nebesaspa-clone/hf_20260423_234001_9c9037f3-d757-4d4c-9515-cd05c5669e4d-300x225.webp',
    nm: 'Высший пилотаж',
    desc: 'Это не просто массаж — это полёт, где каждое движение доведено до совершенства и полного эмоционального контакта.',
  },
  {
    img: '/tenants/nebesaspa-clone/hf_20260423_234817_d012facf-a23a-4666-ba0e-f4fab90364ab-300x225.webp',
    nm: 'Ролевые игры',
    desc: 'Чулки, строгий костюм или целый сценарий — превратите фантазию в реальность.',
  },
];

const FEATURES: { title: string; desc: string }[] = [
  {
    title: 'Конфиденциальность',
    desc: 'Всё, что происходит у нас, остаётся только между нами. Мы гарантируем полную приватность.',
  },
  {
    title: 'Атмосфера',
    desc: 'Мягкий свет, приятная музыка и продуманные детали — пространство полного расслабления.',
  },
  {
    title: 'Профессионализм',
    desc: 'Опытные мастерицы создадут уникальный сеанс под ваше настроение и желания.',
  },
];

export default function Page() {
  return (
    <NebesaShell>
      <section className="progs">
        <div className="wrap">
          <h2 className="h2">Дополнения</h2>
          <p>
            Приумножайте наслаждение! В «НЕБОСВОДЕ» всё строится вокруг ваших желаний — дополните
            любую программу яркими деталями. Выбор только за вами.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 18,
              marginTop: 28,
            }}
          >
            {ADDITIONS.map((a) => (
              <article className="pcard" key={a.nm}>
                <img
                  src={a.img}
                  alt={a.nm}
                  style={{ width: '100%', borderRadius: 12, marginBottom: 12 }}
                />
                <div className="nm">{a.nm}</div>
                <p>{a.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="progs">
        <div className="wrap">
          <h2 className="h2">Почему «НЕБОСВОД»</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 18,
              marginTop: 28,
            }}
          >
            {FEATURES.map((f) => (
              <article className="pcard" key={f.title}>
                <div className="nm">{f.title}</div>
                <p>{f.desc}</p>
              </article>
            ))}
          </div>

          <p style={{ marginTop: 28 }}>
            Готовы дополнить вашу программу? Запись круглосуточно по телефону{' '}
            <a href="tel:+79120767814">+7 912 076-78-14</a>.
          </p>
          <div style={{ marginTop: 16 }}>
            <a className="btn btn-blue" href="tel:+79120767814">
              Записаться
            </a>
          </div>
        </div>
      </section>
    </NebesaShell>
  );
}
