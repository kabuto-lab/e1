import { asset } from '@/lib/asset';
import { NebesaShell } from '@/components/tenant-sites/nebesa/NebesaShell';

export const metadata = {
  title: 'Программы — НЕБОСВОД · спа-салон',
  description:
    'Программы эротического массажа в салоне Небосвод: основные, VIP, DELUXE, для пар и компаний.',
};

const ASSET = asset('/tenants/nebesaspa-clone');

const CATEGORIES: { img: string; nm: string; price: string; desc: string }[] = [
  {
    img: 'hf_20260424_003235_dc656067-7565-45b8-b26b-b9dadca9c20d-1024x768',
    nm: 'DELUXE программы',
    price: 'от 18 000 ₽',
    desc: 'Программы свободы выбора: вы сами решаете, что и в какой последовательности будет происходить.',
  },
  {
    img: 'hf_20260423_213812_54336675-8a06-4ce6-b880-6a55e640e0c1-1024x768',
    nm: 'VIP программы',
    price: 'от 13 000 ₽',
    desc: 'Премиальный уровень сервиса и максимум внимания для самых взыскательных гостей.',
  },
  {
    img: 'hf_20260423_222840_a375d69f-e5a6-47ba-9642-2a92ed206d83-1024x768',
    nm: 'Основные программы',
    price: 'от 5 000 ₽',
    desc: 'Классика жанра — баланс расслабления и чувственного наслаждения.',
  },
  {
    img: 'molodye-zensiny-v-kupal-nyh-kostumah-smotrat-drug-na-druga-i-poziruut-1-scaled-1-1024x682',
    nm: 'Программы для девушек',
    price: 'от 10 000 ₽',
    desc: 'Особое меню для наших гостий — нежность, забота и атмосфера доверия.',
  },
  {
    img: 'hf_20260423_215405_fe5fd311-f577-4445-9e48-aa4ccef63ea2-1024x768',
    nm: 'Программы для компаний',
    price: 'от 60 001 ₽',
    desc: 'Незабываемый отдых большой компанией в окружении соблазнительных красоток.',
  },
  {
    img: 'hf_20260423_125533_357775de-6ff0-4285-8601-b19e78a9824b-e1776949185454-1024x768',
    nm: 'Программы с 2-мя девушками',
    price: 'от 26 000 ₽',
    desc: 'Хотите оказаться в компании сразу нескольких красоток? Эти программы для вас!',
  },
  {
    img: 'hf_20260424_002651_8dcbd41f-dd59-4885-bac8-ce76b21de654-1024x768',
    nm: 'Эксклюзивные программы',
    price: 'от 45 000 ₽',
    desc: 'Высший пилотаж — полёт, где каждое движение доведено до совершенства.',
  },
  {
    img: 'hf_20260423_211635_ef3f305e-6b26-4385-9921-4e635f0da498-1024x768',
    nm: 'Эротический массаж для пар',
    price: 'от 10 000 ₽',
    desc: 'Чувственный ритуал для двоих — новые грани близости и удовольствия.',
  },
];

const PROGRAMS: { img: string; nm: string; desc: string; price: string; dur: string }[] = [
  {
    img: 'hf_20260423_154502_f03622d9-6e81-47bf-a87e-ea24d728605c-1024x768',
    nm: 'Слёзы небес',
    desc: 'Глубокая проработка мышц переходит в чувственные техники.',
    price: '6 000 ₽',
    dur: '60 мин',
  },
  {
    img: 'hf_20260423_222840_a375d69f-e5a6-47ba-9642-2a92ed206d83-1024x768',
    nm: 'Облачное Прикосновение',
    desc: 'Лёгкое забвение — нежный релакс для полного восстановления.',
    price: 'от 5 000 ₽',
    dur: '60 мин',
  },
  {
    img: 'hf_20260423_213812_54336675-8a06-4ce6-b880-6a55e640e0c1-1024x768',
    nm: 'Созвездие Кассиопеи',
    desc: 'VIP-погружение премиального уровня с максимумом внимания.',
    price: 'от 13 000 ₽',
    dur: '90 мин',
  },
  {
    img: 'hf_20260424_003235_dc656067-7565-45b8-b26b-b9dadca9c20d-1024x768',
    nm: 'Открытый космос',
    desc: 'DELUXE свободы выбора — сценарий пишете вы сами.',
    price: 'от 18 000 ₽',
    dur: '120 мин',
  },
  {
    img: 'hf_20260424_002651_8dcbd41f-dd59-4885-bac8-ce76b21de654-1024x768',
    nm: 'Ритуал Звёздного Света',
    desc: 'Эксклюзив — высший пилотаж и полный эмоциональный контакт.',
    price: 'от 45 000 ₽',
    dur: '120 мин',
  },
  {
    img: 'hf_20260423_125533_357775de-6ff0-4285-8601-b19e78a9824b-e1776949185454-1024x768',
    nm: 'Двойной звездопад',
    desc: 'Программа с двумя девушками — приумножайте наслаждение.',
    price: 'от 26 000 ₽',
    dur: '90 мин',
  },
  {
    img: 'hf_20260423_215405_fe5fd311-f577-4445-9e48-aa4ccef63ea2-1024x768',
    nm: 'Открытый космос (компания)',
    desc: 'Незабываемый отдых большой компанией.',
    price: 'от 60 001 ₽',
    dur: '180 мин',
  },
  {
    img: 'hf_20260423_211635_ef3f305e-6b26-4385-9921-4e635f0da498-1024x768',
    nm: 'Жемчужный Горизонт',
    desc: 'Эротический массаж для пар — новые грани близости.',
    price: 'от 10 000 ₽',
    dur: '90 мин',
  },
];

export default function Page() {
  return (
    <NebesaShell>
      <section className="progs">
        <div className="wrap">
          <h2 className="h2">Программы</h2>
          <p style={{ maxWidth: 720, color: '#3a3d44', fontSize: 16, lineHeight: 1.7, marginTop: 16 }}>
            Целый спектр программ эротического массажа — от лёгкого релакса до полного погружения.
            Выберите по настроению.
          </p>

          <h2 className="h2" style={{ fontSize: 'clamp(26px, 3.4vw, 40px)', marginTop: 48 }}>
            Категории программ
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 24,
              marginTop: 28,
            }}
          >
            {CATEGORIES.map((c) => (
              <article className="pcard" key={c.nm}>
                <div
                  className="pic"
                  style={{
                    backgroundImage: `url(${ASSET}/${c.img}.webp)`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <div className="price">
                  {c.price}
                </div>
                <div className="pttl">{c.nm}</div>
                <p className="pdesc">{c.desc}</p>
              </article>
            ))}
          </div>

          <h2 className="h2" style={{ fontSize: 'clamp(26px, 3.4vw, 40px)', marginTop: 56 }}>
            Наши программы
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 24,
              marginTop: 28,
            }}
          >
            {PROGRAMS.map((p) => (
              <article className="pcard" key={p.nm}>
                <div
                  className="pic"
                  style={{
                    backgroundImage: `url(${ASSET}/${p.img}.webp)`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <div className="price">
                  {p.price} <small>{p.dur}</small>
                </div>
                <div className="pttl">{p.nm}</div>
                <p className="pdesc">{p.desc}</p>
              </article>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
            <a className="btn btn-blue" href="tel:+79120767814">
              Записаться · +7 912 076-78-14
            </a>
          </div>
        </div>
      </section>
    </NebesaShell>
  );
}
