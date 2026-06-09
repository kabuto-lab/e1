import { asset } from '@/lib/asset';
import { ImperiumShell } from '@/components/tenant-sites/imperiumspa/ImperiumShell';

export const metadata = {
  title: 'Программы эротического массажа — Imperium',
  description:
    'Тематические программы эротического массажа салона IMPERIUM, вдохновлённые культурой Древней Греции и Рима.',
};

export default function Page() {
  return (
    <ImperiumShell active="services">
      <div className="pagehead">
        <div className="wrap">
          <h1>Программы</h1>
          <div className="crumb">Главная / Программы</div>
        </div>
      </div>
      <section>
        <div className="wrap">
          <div className="prose" style={{ textAlign: 'center', marginBottom: '46px' }}>
            <p>
              Салон эротического массажа IMPERIUM предлагает целый ряд тематических программ, каждая
              из которых вдохновлена культурой Древней Греции и Рима. Эксклюзивные, основные программы
              и массаж для пар — выбирайте сценарий своего вечера.
            </p>
          </div>
          <div className="grid g4">
            <div className="pcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/photo_2023-03-14_12-57-21-2.webp")} alt="Легион" loading="lazy" />
              </div>
              <div className="pb">
                <h3>Легион</h3>
                <p className="desc">Программа для тех, кто ценит своё время — концентрат удовольствия.</p>
                <div className="meta">
                  <span className="price">5 000 ₽</span>
                  <span className="dur">30 мин</span>
                </div>
              </div>
            </div>
            <div className="pcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/img_0695-e1678788487649-1024x1024.webp")} alt="Аурелий" loading="lazy" />
              </div>
              <div className="pb">
                <h3>Аурелий</h3>
                <p className="desc">Классическое расслабление тела с лёгкими чувственными акцентами.</p>
                <div className="meta">
                  <span className="price">5 000 ₽</span>
                  <span className="dur">60 мин</span>
                </div>
              </div>
            </div>
            <div className="pcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/photo_2023-03-14_12-57-21.webp")} alt="Дионис" loading="lazy" />
              </div>
              <div className="pb">
                <h3>Дионис</h3>
                <p className="desc">Тёплая, обволакивающая программа в честь бога вина и наслаждений.</p>
                <div className="meta">
                  <span className="price">6 000 ₽</span>
                  <span className="dur">60 мин</span>
                </div>
              </div>
            </div>
            <div className="pcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/hf_20260505_114452_791bd424-736d-49fe-9d94-81afae529946.webp")} alt="Запретное удовольствие" loading="lazy" />
              </div>
              <div className="pb">
                <h3>Запретное удовольствие</h3>
                <p className="desc">Для любителей более реалистичных и насыщенных впечатлений.</p>
                <div className="meta">
                  <span className="price">8 000 ₽</span>
                  <span className="dur">60 мин</span>
                </div>
              </div>
            </div>
            <div className="pcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/photo_2022-10-12_15-41-45.webp")} alt="Олимп" loading="lazy" />
              </div>
              <div className="pb">
                <h3>Олимп</h3>
                <p className="desc">Одна из самых популярных программ — вершина чувственного массажа.</p>
                <div className="meta">
                  <span className="price">9 000 ₽</span>
                  <span className="dur">60 мин</span>
                </div>
              </div>
            </div>
            <div className="pcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/hf_20260505_120035_2485886c-df50-4ad6-846b-02fa0aafda56.webp")} alt="Lady's Relax" loading="lazy" />
              </div>
              <div className="pb">
                <h3>Lady's Relax</h3>
                <p className="desc">Мягкая, чувственная программа для расслабления и наслаждения телом.</p>
                <div className="meta">
                  <span className="price">10 000 ₽</span>
                  <span className="dur">60 мин</span>
                </div>
              </div>
            </div>
            <div className="pcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/screenshot_3.webp")} alt="Личное желание" loading="lazy" />
              </div>
              <div className="pb">
                <h3>Личное желание</h3>
                <p className="desc">Индивидуальный сценарий, где главный режиссёр — вы.</p>
                <div className="meta">
                  <span className="price">12 000 ₽</span>
                  <span className="dur">90 мин</span>
                </div>
              </div>
            </div>
            <div className="pcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/hf_20260505_122821_8889e25a-0ea4-4045-9140-99de62d4011d.webp")} alt="Рай для избранных" loading="lazy" />
              </div>
              <div className="pb">
                <h3>Рай для избранных</h3>
                <p className="desc">Расширенный набор техник для самых требовательных гостей.</p>
                <div className="meta">
                  <span className="price">13 000 ₽</span>
                  <span className="dur">60 мин</span>
                </div>
              </div>
            </div>
            <div className="pcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/hf_20260505_143443_cd98c1f1-28ca-40b8-8fa9-de81ef5412b5.webp")} alt="Йони массаж" loading="lazy" />
              </div>
              <div className="pb">
                <h3>Йони массаж</h3>
                <p className="desc">Глубокая практика для женского тела и расслабления.</p>
                <div className="meta">
                  <span className="price">13 000 ₽</span>
                  <span className="dur">75 мин</span>
                </div>
              </div>
            </div>
            <div className="pcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/hf_20260505_123132_96f7baac-d7df-4509-a347-e3489f4cb746.webp")} alt="Гипноз" loading="lazy" />
              </div>
              <div className="pb">
                <h3>Гипноз</h3>
                <p className="desc">Погружение в состояние полного блаженства и невесомости.</p>
                <div className="meta">
                  <span className="price">17 000 ₽</span>
                  <span className="dur">70 мин</span>
                </div>
              </div>
            </div>
            <div className="pcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/photo_2023-03-14_12-57-21-2.webp")} alt="Арес" loading="lazy" />
              </div>
              <div className="pb">
                <h3>Арес</h3>
                <p className="desc">Мощная программа для тех, кто хочет испытать всё и сразу.</p>
                <div className="meta">
                  <span className="price">18 000 ₽</span>
                  <span className="dur">60 мин</span>
                </div>
              </div>
            </div>
            <div className="pcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/img_0695-e1678788487649-1024x1024.webp")} alt="Двойное искушение" loading="lazy" />
              </div>
              <div className="pb">
                <h3>Двойное искушение</h3>
                <p className="desc">Программа на двоих массажисток — двойное наслаждение.</p>
                <div className="meta">
                  <span className="price">18 000 ₽</span>
                  <span className="dur">90 мин</span>
                </div>
              </div>
            </div>
            <div className="pcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/photo_2023-03-14_12-57-21.webp")} alt="Личное пламя" loading="lazy" />
              </div>
              <div className="pb">
                <h3>Личное пламя</h3>
                <p className="desc">Премиальный сценарий с расширенным набором дополнений.</p>
                <div className="meta">
                  <span className="price">24 000 ₽</span>
                  <span className="dur">90 мин</span>
                </div>
              </div>
            </div>
            <div className="pcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/hf_20260505_114452_791bd424-736d-49fe-9d94-81afae529946.webp")} alt="Тёплый поцелуй" loading="lazy" />
              </div>
              <div className="pb">
                <h3>Тёплый поцелуй</h3>
                <p className="desc">Два часа нежности, эстетики тела и максимальной чувственности.</p>
                <div className="meta">
                  <span className="price">25 000 ₽</span>
                  <span className="dur">120 мин</span>
                </div>
              </div>
            </div>
            <div className="pcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/photo_2022-10-12_15-41-45.webp")} alt="Ритуал Зевса" loading="lazy" />
              </div>
              <div className="pb">
                <h3>Ритуал Зевса</h3>
                <p className="desc">Эпическая программа для истинных ценителей роскоши.</p>
                <div className="meta">
                  <span className="price">28 000 ₽</span>
                  <span className="dur">120 мин</span>
                </div>
              </div>
            </div>
            <div className="pcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/hf_20260505_120035_2485886c-df50-4ad6-846b-02fa0aafda56.webp")} alt="Церемония Богини" loading="lazy" />
              </div>
              <div className="pb">
                <h3>Церемония Богини</h3>
                <p className="desc">Многоступенчатая программа, где гостья — в центре внимания.</p>
                <div className="meta">
                  <span className="price">35 000 ₽</span>
                  <span className="dur">150 мин</span>
                </div>
              </div>
            </div>
            <div className="pcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/screenshot_3.webp")} alt="Тайная гостья" loading="lazy" />
              </div>
              <div className="pb">
                <h3>Тайная гостья</h3>
                <p className="desc">Эксклюзивный сценарий с индивидуальным подходом.</p>
                <div className="meta">
                  <span className="price">40 000 ₽</span>
                  <span className="dur">90 мин</span>
                </div>
              </div>
            </div>
            <div className="pcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/hf_20260505_122821_8889e25a-0ea4-4045-9140-99de62d4011d.webp")} alt="Император" loading="lazy" />
              </div>
              <div className="pb">
                <h3>Император</h3>
                <p className="desc">Флагманская deluxe-программа Vanilia. Медленное погружение и максимум.</p>
                <div className="meta">
                  <span className="price">45 000 ₽</span>
                  <span className="dur">180 мин</span>
                </div>
              </div>
            </div>
            <div className="pcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/hf_20260505_143443_cd98c1f1-28ca-40b8-8fa9-de81ef5412b5.webp")} alt="Императорская ночь" loading="lazy" />
              </div>
              <div className="pb">
                <h3>Императорская ночь</h3>
                <p className="desc">Высшая программа салона — целая ночь императорских наслаждений.</p>
                <div className="meta">
                  <span className="price">80 000 ₽</span>
                  <span className="dur">180 мин</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </ImperiumShell>
  );
}
