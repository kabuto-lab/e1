import { VaniliaShell } from '@/components/tenant-sites/vanilia/VaniliaShell';

export const metadata = {
  title: 'Акции — Vanilia · салон эротического массажа',
  description:
    'Выгодные предложения, бонусы и подарки для гостей салона Vanilia — кэшбек, рефералы, подарки и закрытый Telegram-канал.',
};

const stocks = [
  {
    name: 'За отзыв +20 минут',
    desc: 'Оставьте честный отзыв о визите и получите 20 дополнительных минут к программе.',
  },
  {
    name: 'Два часа нежности',
    desc: 'Специальный двухчасовой формат по выгодной цене для самых неспешных гостей.',
  },
  {
    name: 'Горячие апельсины',
    desc: 'Сезонная программа с цитрусовыми ароматами и тёплыми камнями.',
  },
  {
    name: 'Кэшбек · Баллы = Рубли',
    desc: 'Накапливайте баллы за визиты и оплачивайте ими следующие программы.',
  },
  {
    name: 'Подарок на выезд',
    desc: 'Закажите выездную программу и получите приятный бонус в подарок.',
  },
  {
    name: 'Поздравление на День рождения',
    desc: 'Эксклюзивное поздравление и особые условия для именинников.',
  },
  {
    name: '+5 новых девочек каждый день',
    desc: 'Каждый день в салоне появляются новые девушки — всегда есть выбор.',
  },
  {
    name: 'Закрытый Telegram-канал',
    desc: 'Доступ к закрытому каналу с секретными видео для постоянных гостей.',
  },
  {
    name: 'Реферальная система',
    desc: 'Приводите друзей и получайте бонусы за каждого нового гостя.',
  },
];

export default function Page() {
  return (
    <VaniliaShell>
      <section>
        <div className="wrap">
          <div className="panel-sec">
            <h2 className="center">Акции</h2>
            <p className="center">
              Выгодные предложения, бонусы и подарки для гостей салона Vanilia.
            </p>

            <div className="prog-grid">
              {stocks.map((s) => (
                <div className="prog" key={s.name}>
                  <div className="nm">{s.name}</div>
                  <div className="desc">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-sec">
            <h2 className="center">Узнать об актуальных акциях</h2>
            <p className="center">
              Позвоните, и менеджер расскажет о действующих предложениях.
            </p>
            <p className="center">
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
