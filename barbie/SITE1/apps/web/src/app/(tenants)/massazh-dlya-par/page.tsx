import { asset } from '@/lib/asset';
import { MdpShell } from '@/components/tenant-sites/mdp/MdpShell';

export const metadata = {
  title: 'Эротический массаж для пар в Москве — Barbie Spa',
  description:
    'Эротический массаж для пар наполнит ваши отношения ярким и новым сексуальным возбуждением. Программы для двоих в салонах сети Barbie в Москве.',
};

const A = asset('/tenants/massazh-dlya-par');

const GIRLS: [string, string, string][] = [
  ['Dakota_1', 'Dakota', 'мастер релакса'],
  ['Megan_1', 'Megan', 'тайский боди'],
  ['Phenelopa_1', 'Phenelopa', 'стоун-терапия'],
  ['Louisa_1', 'Louisa', 'массаж для пар'],
  ['Lara_1', 'Lara', 'классический'],
  ['Leisan_1', 'Leisan', 'лингам-массаж'],
  ['Vera', 'Vera', 'премиум'],
  ['Barbara_1', 'Barbara', 'spa-ритуалы'],
];

const PROGRAMS = [
  {
    h: 'Рай для двоих',
    tag: '1 девушка',
    lead: 'Программа, нацеленная на то, чтобы помочь паре определиться, готовы ли они впустить «незнакомку» в свои игры.',
    incl: 'Классический массаж тела, массаж стоп с горячими полотенцами, массаж головы и лица, тайский боди, нежные прикосновения к девушке, массаж Лингама, совместный душ.',
    dur: '120 минут',
    price: '16 000 ₽',
  },
  {
    h: 'Искушение',
    tag: '1 девушка',
    lead: 'Предложение для тех пар, которые уже знают, что любят.',
    incl: 'Классический массаж тела, массаж стоп с горячими полотенцами, массаж головы и лица, тайский боди, нежные прикосновения к девушке, массаж Лингама, совместный душ.',
    dur: '60 минут',
    price: '18 000 ₽',
  },
  {
    h: 'You and I',
    tag: '2 девушки',
    lead: 'Проведите время вместе после невероятной программы!',
    incl: 'Классический массаж тела, массаж стоп с горячими полотенцами, тайский боди, массаж Лингама, выбор поз, совместный душ + 2 услуги на выбор (горячие апельсины, «Клубничка», кисточки, «Ветка сакуры»).',
    dur: '120 минут',
    price: '24 000 ₽',
  },
  {
    h: 'Содом и Гоморра',
    tag: '2 девушки',
    lead: 'Поддайтесь соблазну нарушить единение близости.',
    incl: 'Классический массаж тела, массаж стоп с горячими полотенцами, тайский боди, массаж Лингама, выбор поз, совместный душ + 2 услуги на выбор (горячие апельсины, «Клубничка», кисточки, «Ветка сакуры»).',
    dur: '90 минут',
    price: '55 000 ₽',
  },
];

const SALONS: [string, string, string, string, string][] = [
  ['logo-barbie1-2', 'Barbie Spa', 'Салон Barbie приглашает замечательно провести время, полноценно расслабиться и отдохнуть, забыть обо всех заботах. Комфортные локации с уютным интерьером и чудесная атмосфера.', 'Москва, центр', '+7 (916) 007-32-59'],
  ['vanilia-logo', 'Vanilia — spa salon', 'Трёхэтажное заведение с апартаментами от стандартных до VIP. 3 индивидуальных хаммама и 1 большой для весёлой компании (до 15 человек). Вкусные кальяны и непередаваемая атмосфера.', 'м. Проспект Мира', '+7 (903) 271-94-55'],
  ['podium-logo', 'Podium', 'Выбор избирательных джентльменов. 2 зала в разных стилях, VIP-апартаменты с 4 индивидуальными саунами и 4 саунами для компании (до 4 человек), джакузи, просторными татами.', 'Москва, центр', '+7 (903) 271-00-26'],
  ['soho-logo', 'SOHO SPA — Men’s club', 'Мужской клуб релакс-массажа в самом центре Москвы. Ждём со всем гостеприимством в удобных апартаментах нашей студии.', 'Малый Харитоньевский пер. 9/13 с5 · м. Красные Ворота', '+7 (966) 167-14-93'],
  ['logo-imperium', 'Imperium', 'Трёхэтажные апартаменты с джакузи, 3 саунами и 3 хаммамами в греческом стиле. Девушки встретят в нарядах греческих жриц. Современный олимп в районе Чистых Прудов.', 'м. Чистые Пруды / Тургеневская', '+7 (916) 007-32-59'],
  ['logo-barbie1-2', 'Dacha', 'Индивидуальный подход — даже самые смелые желания будут исполнены. Наше кредо: всё, что было в салоне, остаётся в салоне. DACHA сохранит все ваши секреты.', 'Крылатская 30 к.1 · м. Мневники', '+7 (968) 725-44-74'],
];

export default function Page() {
  return (
    <MdpShell>
      <section className="hero" id="hero">
        <div className="wrap hero-in">
          <span className="upper">Салон эротического массажа · Москва</span>
          <h1>
            Эротический массаж
            <br />
            для пар
          </h1>
          <p>
            Наполнит ваши отношения ярким и новым сексуальным возбуждением. Уникальная программа, способная разжечь
            былую страсть и подарить незабываемое блаженство.
          </p>
          <div>
            <a className="btn btn-solid" href={asset("/massazh-dlya-par/zabronirovat")}>
              Забронировать
            </a>
            <a className="btn btn-ghost" href="#programs">
              Программы
            </a>
          </div>
        </div>
      </section>

      <section className="programs" id="programs">
        <div className="wrap">
          <div className="sec-head">
            <span className="upper">Программы для двоих</span>
            <h2>Выберите своё искушение</h2>
            <p>
              Каждая программа создана для пар — от нежного знакомства с новыми ощущениями до полного погружения в
              наслаждение.
            </p>
          </div>
          <div className="prog-grid">
            {PROGRAMS.map((p) => (
              <div className="prog" key={p.h}>
                <h3>{p.h}</h3>
                <div className="girls-tag">{p.tag}</div>
                <div className="lead">{p.lead}</div>
                <div className="incl">{p.incl}</div>
                <div className="meta">
                  <span className="dur">{p.dur}</span>
                  <span className="price">{p.price}</span>
                </div>
                <a className="btn btn-ghost cta" href={asset("/massazh-dlya-par/zabronirovat")}>
                  Заказать программу
                </a>
              </div>
            ))}
            <div className="prog" style={{ gridColumn: '1/-1' }}>
              <h3>1000 и 1 наслаждение</h3>
              <div className="girls-tag">Премиум · для пар</div>
              <div className="lead">
                Незабываемая программа, в которой вы и ваша вторая половинка буквально погрузитесь в удовольствие.
              </div>
              <div className="incl">
                Классический массаж, стоун-терапия, массаж стоп с горячими полотенцами, обоюдные нежные поцелуи по
                телу, обоюдные ласки всех участников, тайский боди-массаж, совместный душ, пип-шоу, смена поз, ласки и
                стимуляция игрушками на пульте.
              </div>
              <div className="meta">
                <span className="dur">Индивидуально</span>
                <span className="price">по запросу</span>
              </div>
              <a className="btn btn-ghost cta" href={asset("/massazh-dlya-par/zabronirovat")}>
                Заказать программу
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="girls" id="girls">
        <div className="wrap">
          <div className="sec-head">
            <span className="upper">Наши девушки</span>
            <h2>Те, кто подарит наслаждение</h2>
            <p>
              Профессиональные мастерицы, владеющие различными техниками массажа. Каждая встреча — это атмосфера
              доверия и заботы.
            </p>
          </div>
          <div className="girl-grid">
            {GIRLS.map(([file, name, role]) => (
              <div className="girl" key={file}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${A}/${file}.webp`} alt={name} />
                <div className="cap">
                  <b>{name}</b>
                  <span>{role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="adv">
        <div className="wrap">
          <div className="adv-grid">
            <div className="adv-item">
              <div className="n">24/7</div>
              <div className="t">Работаем круглосуточно</div>
            </div>
            <div className="adv-item">
              <div className="n">6</div>
              <div className="t">Салонов в Москве</div>
            </div>
            <div className="adv-item">
              <div className="n">100%</div>
              <div className="t">Конфиденциальность</div>
            </div>
            <div className="adv-item">
              <div className="n">VIP</div>
              <div className="t">Уютные апартаменты</div>
            </div>
          </div>
        </div>
      </section>

      <section className="salons" id="salons">
        <div className="wrap">
          <div className="sec-head">
            <span className="upper">Наши салоны</span>
            <h2>Сеть салонов в центре Москвы</h2>
            <p>
              Комфортные локации с уютным интерьером, чудесная атмосфера и профессиональный подход в каждом заведении
              сети.
            </p>
          </div>
          <div className="salon-grid">
            {SALONS.map(([logo, h, p, addr, ph], i) => (
              <div className="salon" key={`${h}-${i}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="logo" src={`${A}/${logo}.webp`} alt={h} />
                <h3>{h}</h3>
                <p>{p}</p>
                <div className="addr">
                  {addr}
                  <span className="ph">{ph}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="wrap">
          <h2>Подарите себе вечер наслаждения</h2>
          <p>Забронируйте программу прямо сейчас — мы перезвоним и подберём удобное время и салон.</p>
          <a className="btn btn-solid" href={asset("/massazh-dlya-par/zabronirovat")}>
            Забронировать
          </a>
        </div>
      </section>
    </MdpShell>
  );
}
