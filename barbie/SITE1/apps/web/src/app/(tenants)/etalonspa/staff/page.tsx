import { asset } from '@/lib/asset';
import { EtalonShell } from '@/components/tenant-sites/etalon/EtalonShell';

export const metadata = {
  title: 'Мастера — Etalon',
  description: 'Массажистки салона эротического массажа Etalon в центре Москвы.',
};

export default function Page() {
  return (
    <EtalonShell>
      <section className="page-hero">
        <div className="wrap">
          <span className="hero-tag">Очаровательные</span>
          <h1>Наши <em>мастера</em></h1>
          <p>Массажистки Etalon обладают не только прекрасными внешними данными, но и в совершенстве владеют восточными и западными техниками.</p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="masters">
            <div className="master"><div className="ph"><img src={asset("/tenants/etalonspa/photo_2026-01-28_14-23-42-270x400.webp")} alt="Лана" /></div><div className="m-in"><h3>Лана, 21</h3><div className="params">Рост 165 · Вес 50 · Грудь 1</div></div></div>
            <div className="master"><div className="ph"><img src={asset("/tenants/etalonspa/img_0302-1-270x400.webp")} alt="Даниэлла" /></div><div className="m-in"><h3>Даниэлла, 23</h3><div className="params">Рост 166 · Вес 51 · Грудь 1.5</div></div></div>
            <div className="master"><div className="ph"><img src={asset("/tenants/etalonspa/590ded8f-3f7d-4916-926e-219517bd2055-270x400.webp")} alt="Кортни" /></div><div className="m-in"><h3>Кортни, 25</h3><div className="params">Рост 167 · Вес 56 · Грудь 3</div></div></div>
            <div className="master"><div className="ph"><img src={asset("/tenants/etalonspa/photo_2026-01-20_19-05-06-270x400.webp")} alt="Агния" /></div><div className="m-in"><h3>Агния, 25</h3><div className="params">Рост 165 · Вес 48 · Грудь 3</div></div></div>
            <div className="master"><div className="ph"><img src={asset("/tenants/etalonspa/photo_2026-01-20_19-06-31-270x400.webp")} alt="Шанель" /></div><div className="m-in"><h3>Шанель, 26</h3><div className="params">Рост 165 · Вес 49 · Грудь 3.5</div></div></div>
            <div className="master"><div className="ph"><img src={asset("/tenants/etalonspa/img_4191-1-1-1-270x400.webp")} alt="Элизабет" /></div><div className="m-in"><h3>Элизабет, 20</h3><div className="params">Рост 158 · Вес 52 · Грудь 1.5</div></div></div>
            <div className="master"><div className="ph"><img src={asset("/tenants/etalonspa/dsc_0625-1-270x400.webp")} alt="Наоми" /></div><div className="m-in"><h3>Наоми, 28</h3><div className="params">Рост 169 · Вес 55 · Грудь 2</div></div></div>
            <div className="master"><div className="ph"><img src={asset("/tenants/etalonspa/img_4607-270x400.webp")} alt="Вера" /></div><div className="m-in"><h3>Вера, 23</h3><div className="params">Рост 178 · Вес 58 · Грудь 2</div></div></div>
            <div className="master"><div className="ph"><img src={asset("/tenants/etalonspa/photo_2024-11-14_17-24-41-270x400.webp")} alt="Габриэль" /></div><div className="m-in"><h3>Габриэль, 29</h3><div className="params">Рост 168 · Вес 49 · Грудь 1</div></div></div>
            <div className="master"><div className="ph"><img src={asset("/tenants/etalonspa/anabel_5-e1716211221103-270x400.webp")} alt="Анабель" /></div><div className="m-in"><h3>Анабель, 25</h3><div className="params">Рост 170 · Вес 54 · Грудь 3.5</div></div></div>
            <div className="master"><div className="ph"><img src={asset("/tenants/etalonspa/shakira_4-1-e1714653602292-270x400.webp")} alt="Шакира" /></div><div className="m-in"><h3>Шакира, 29</h3><div className="params">Рост 175 · Вес 68 · Грудь 5</div></div></div>
            <div className="master"><div className="ph"><img src={asset("/tenants/etalonspa/elina_3-e1717502909947-270x400.webp")} alt="Элина" /></div><div className="m-in"><h3>Элина, 25</h3><div className="params">Рост 160 · Вес 60 · Грудь 4</div></div></div>
            <div className="master"><div className="ph"><img src={asset("/tenants/etalonspa/snezhana_2-1-e1722257509493-270x400.webp")} alt="Снежана" /></div><div className="m-in"><h3>Снежана, 29</h3><div className="params">Рост 160 · Вес 52 · Грудь 1.5</div></div></div>
            <div className="master"><div className="ph"><img src={asset("/tenants/etalonspa/arina_6-e1711624488301-270x400.webp")} alt="Арина" /></div><div className="m-in"><h3>Арина, 19</h3><div className="params">Рост 165 · Вес 50 · Грудь 2.5</div></div></div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '46px' }}><a href="/etalonspa/contacts" className="btn">Записаться на массаж</a></div>
        </div>
      </section>
    </EtalonShell>
  );
}
