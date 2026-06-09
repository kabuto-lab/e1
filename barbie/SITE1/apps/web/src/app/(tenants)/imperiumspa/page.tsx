import { asset } from '@/lib/asset';
import { ImperiumShell } from '@/components/tenant-sites/imperiumspa/ImperiumShell';

export const metadata = {
  title: 'Эротический массаж в салоне Imperium — Москва',
  description:
    'Салон эротического массажа Imperium в центре Москвы: тематические программы и лучшие массажистки столицы.',
};

export default function Page() {
  return (
    <ImperiumShell active="index">
      <section className="hero">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="hero-img"
          poster={asset("/tenants/imperiumspa/photo_2023-03-14_12-57-21-2.webp")}
        >
          <source src={asset("/tenants/imperiumspa/hero.mp4")} type="video/mp4" />
        </video>
        <div className="wrap">
          <div className="eyebrow">Салон эротического массажа в центре Москвы</div>
          <h1>
            Ваше приключение<br />начинается <span className="accent">здесь</span>
          </h1>
          <p className="lead">
            Уникальные программы в исполнении самых горячих девушек столицы. Мы устроим настоящий
            чувственный спектакль, где главным режиссёром будете именно вы.
          </p>
          <div className="cta">
            <a href="/imperiumspa/services" className="btn">Смотреть программы</a>
            <a href="/imperiumspa/staff" className="btn btn-ghost">Наши девушки</a>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow">Многообразие эротических программ</div>
            <h2>Популярные программы</h2>
            <p>Самые востребованные сценарии нашего салона. Смотрите, выбирайте, заказывайте!</p>
          </div>
          <div className="grid g4">
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
                <h3>Lady&apos;s Relax</h3>
                <p className="desc">Мягкая, чувственная программа для расслабления и наслаждения телом.</p>
                <div className="meta">
                  <span className="price">10 000 ₽</span>
                  <span className="dur">60 мин</span>
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
          </div>
          <div style={{ textAlign: 'center', marginTop: '36px' }}>
            <a href="/imperiumspa/services" className="btn btn-ghost">Все программы</a>
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--bg2)' }}>
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow">Не определились с выбором?</div>
            <h2>Девушки</h2>
            <p>
              На сайте представлены только оригинальные и реальные фотографии. Внешность наших
              массажисток разнообразна — каждый найдёт свою.
            </p>
          </div>
          <div className="grid g4">
            <div className="gcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/shakira_4-3.webp")} alt="Шакира" loading="lazy" />
              </div>
              <div className="gb">
                <h3>Шакира <span>29 лет</span></h3>
                <div className="params">
                  <span>Рост <b>175</b></span>
                  <span>Вес <b>68</b></span>
                  <span>Грудь <b>5</b></span>
                </div>
              </div>
            </div>
            <div className="gcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/kalibrie_2.webp")} alt="Слава" loading="lazy" />
              </div>
              <div className="gb">
                <h3>Слава <span>24 лет</span></h3>
                <div className="params">
                  <span>Рост <b>171</b></span>
                  <span>Вес <b>65</b></span>
                  <span>Грудь <b>1</b></span>
                </div>
              </div>
            </div>
            <div className="gcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/photo_2025-10-21_19-27-46.webp")} alt="Вика" loading="lazy" />
              </div>
              <div className="gb">
                <h3>Вика <span>26 лет</span></h3>
                <div className="params">
                  <span>Рост <b>167</b></span>
                  <span>Вес <b>63</b></span>
                  <span>Грудь <b>2</b></span>
                </div>
              </div>
            </div>
            <div className="gcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/img_7809-scaled.webp")} alt="Джейн" loading="lazy" />
              </div>
              <div className="gb">
                <h3>Джейн <span>30 лет</span></h3>
                <div className="params">
                  <span>Рост <b>160</b></span>
                  <span>Вес <b>49</b></span>
                  <span>Грудь <b>2</b></span>
                </div>
              </div>
            </div>
            <div className="gcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/photo_2025-10-14_03-07-46.webp")} alt="Мими" loading="lazy" />
              </div>
              <div className="gb">
                <h3>Мими <span>25 лет</span></h3>
                <div className="params">
                  <span>Рост <b>167</b></span>
                  <span>Вес <b>57</b></span>
                  <span>Грудь <b>1</b></span>
                </div>
              </div>
            </div>
            <div className="gcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/img_6778-scaled.webp")} alt="Лара" loading="lazy" />
              </div>
              <div className="gb">
                <h3>Лара <span>25 лет</span></h3>
                <div className="params">
                  <span>Рост <b>164</b></span>
                  <span>Вес <b>68</b></span>
                  <span>Грудь <b>2</b></span>
                </div>
              </div>
            </div>
            <div className="gcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/linda_3.webp")} alt="Линда" loading="lazy" />
              </div>
              <div className="gb">
                <h3>Линда <span>27 лет</span></h3>
                <div className="params">
                  <span>Рост <b>163</b></span>
                  <span>Вес <b>51</b></span>
                  <span>Грудь <b>2</b></span>
                </div>
              </div>
            </div>
            <div className="gcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/img_7784-scaled.webp")} alt="Жасмин" loading="lazy" />
              </div>
              <div className="gb">
                <h3>Жасмин <span>21 лет</span></h3>
                <div className="params">
                  <span>Рост <b>156</b></span>
                  <span>Вес <b>50</b></span>
                  <span>Грудь <b>2</b></span>
                </div>
              </div>
            </div>
            <div className="gcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/nana_4.webp")} alt="Нана" loading="lazy" />
              </div>
              <div className="gb">
                <h3>Нана <span>23 лет</span></h3>
                <div className="params">
                  <span>Рост <b>164</b></span>
                  <span>Вес <b>52</b></span>
                  <span>Грудь <b>3</b></span>
                </div>
              </div>
            </div>
            <div className="gcard">
              <div className="ph">
                <img src={asset("/tenants/imperiumspa/img_7796-scaled.webp")} alt="Элис" loading="lazy" />
              </div>
              <div className="gb">
                <h3>Элис <span>22 лет</span></h3>
                <div className="params">
                  <span>Рост <b>162</b></span>
                  <span>Вес <b>46</b></span>
                  <span>Грудь <b>2</b></span>
                </div>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '36px' }}>
            <a href="/imperiumspa/staff" className="btn btn-ghost">Все девушки</a>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="about">
            <div className="about-txt">
              <div className="eyebrow">О салоне</div>
              <h2>Салон эротического массажа</h2>
              <p>
                Эротический салон IMPERIUM — место, где ваши самые смелые желания станут реальностью.
                Если вы давно хотели попробовать что-то принципиально новое — это оно.
              </p>
              <p>
                Салон предлагает целый ряд тематических программ, каждая из которых вдохновлена
                культурой Древней Греции и Рима. Ощутите себя богом, которому подвластно самое
                главное стремление человека — наслаждение.
              </p>
              <p>
                В IMPERIUM также можно прийти со своей парой, чтобы разнообразить интимную жизнь,
                наполнив её новыми красками.
              </p>
              <a href="/imperiumspa/visit" className="btn" style={{ marginTop: '8px' }}>
                Массаж на выезд
              </a>
            </div>
            <div className="about-img">
              <img src={asset("/tenants/imperiumspa/imperium-1-1.webp")} alt="Интерьер салона Imperium" />
            </div>
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--bg2)' }}>
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow">Преимущества</div>
            <h2>Посетители салона IMPERIUM получат</h2>
          </div>
          <div className="grid g4">
            <div className="feat">
              <div className="ic">★</div>
              <h3>Реальные фото</h3>
              <p>Только оригинальные и реальные фотографии девушек — никаких сюрпризов.</p>
            </div>
            <div className="feat">
              <div className="ic">◆</div>
              <h3>Римский стиль</h3>
              <p>Наш интерьер выполнен исключительно в римском стиле. Приходите и убедитесь сами.</p>
            </div>
            <div className="feat">
              <div className="ic">♥</div>
              <h3>Забота администраторов</h3>
              <p>Наши администраторы помогут определиться с программой и предложат лучшие дополнения.</p>
            </div>
            <div className="feat">
              <div className="ic">☀</div>
              <h3>Доступно каждому</h3>
              <p>Эротический массаж доступен каждому — выбирайте программу по вкусу и бюджету.</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow">Атмосфера</div>
            <h2>Наши интерьеры</h2>
            <p>Каждый кабинет — отдельный мир в эстетике Древнего Рима.</p>
          </div>
          <div className="gallery">
            <a href="/imperiumspa/interiors">
              <img src={asset("/tenants/imperiumspa/imperium-1-1.webp")} alt="Интерьер" loading="lazy" />
            </a>
            <a href="/imperiumspa/interiors">
              <img src={asset("/tenants/imperiumspa/imperium-2-1.webp")} alt="Интерьер" loading="lazy" />
            </a>
            <a href="/imperiumspa/interiors">
              <img src={asset("/tenants/imperiumspa/imperium-3-1.webp")} alt="Интерьер" loading="lazy" />
            </a>
            <a href="/imperiumspa/interiors">
              <img src={asset("/tenants/imperiumspa/imperium-4-1.webp")} alt="Интерьер" loading="lazy" />
            </a>
            <a href="/imperiumspa/interiors">
              <img src={asset("/tenants/imperiumspa/imperium-5-1.webp")} alt="Интерьер" loading="lazy" />
            </a>
            <a href="/imperiumspa/interiors">
              <img src={asset("/tenants/imperiumspa/imperium-6-1.webp")} alt="Интерьер" loading="lazy" />
            </a>
          </div>
          <div style={{ textAlign: 'center', marginTop: '36px' }}>
            <a href="/imperiumspa/interiors" className="btn btn-ghost">Все интерьеры</a>
          </div>
        </div>
      </section>
    </ImperiumShell>
  );
}
