import { asset } from '@/lib/asset';
import { M5cShell } from '@/components/tenant-sites/m5com/M5cShell';

export const metadata = {
  title: 'Салоны — 5·MASSAGE',
  description: 'Четыре премиальных салона-партнёра в разных районах Москвы. Сертификат действует в выбранной локации.',
};

export default function Page() {
  return (
    <M5cShell>
      <section className="blk">
        <div className="wrap">
          <div className="eyebrow">Локации</div>
          <h1 className="sec-title">Наши салоны-партнеры</h1>
          <p className="lead">Четыре премиальных салона в разных районах Москвы. Сертификат действует в выбранной локации.</p>
          <div className="salon-grid">
            <div className="salon-card">
              <div className="ph"><img src={asset("/tenants/5massage-com/Обложка-3.webp")} alt="Soho" /></div>
              <div className="body">
                <span className="tag">26 программ</span>
                <h3>Soho</h3>
                <div className="from">📍 Москва, ул. Малый Харитоньевский переулок 9/13 с5 (м. Красне Ворота)</div>
                <span className="min">Сертификаты от 5000 ₽</span>
                <div style={{ marginTop: '14px', display: 'flex', gap: '10px' }}><a href="/5massage-com/programmy" className="btn" style={{ padding: '10px 20px', fontSize: '13px' }}>Программы салона</a></div>
              </div>
            </div>
            <div className="salon-card">
              <div className="ph"><img src={asset("/tenants/5massage-com/Обложка-1.webp")} alt="Barbie" /></div>
              <div className="body">
                <span className="tag">27 программ</span>
                <h3>Barbie</h3>
                <div className="from">📍 Москва, Каланчевская 32/58 с1 (м. Проспект Мира)</div>
                <span className="min">Сертификаты от 5001 ₽</span>
                <div style={{ marginTop: '14px', display: 'flex', gap: '10px' }}><a href="/5massage-com/programmy" className="btn" style={{ padding: '10px 20px', fontSize: '13px' }}>Программы салона</a></div>
              </div>
            </div>
            <div className="salon-card">
              <div className="ph"><img src={asset("/tenants/5massage-com/Обложка-2.webp")} alt="Imperium" /></div>
              <div className="body">
                <span className="tag">28 программ</span>
                <h3>Imperium</h3>
                <div className="from">📍 Москва, ул. Мясницкая, 41В (м. Красные ворота)</div>
                <span className="min">Сертификаты от 5000 ₽</span>
                <div style={{ marginTop: '14px', display: 'flex', gap: '10px' }}><a href="/5massage-com/programmy" className="btn" style={{ padding: '10px 20px', fontSize: '13px' }}>Программы салона</a></div>
              </div>
            </div>
            <div className="salon-card">
              <div className="ph"><img src={asset("/tenants/5massage-com/3.webp")} alt="Vanilia" /></div>
              <div className="body">
                <span className="tag">28 программ</span>
                <h3>Vanilia</h3>
                <div className="from">📍 Москва, Лучников переулок 7/4 с5 (м. Лубянка)</div>
                <span className="min">Сертификаты от 5000 ₽</span>
                <div style={{ marginTop: '14px', display: 'flex', gap: '10px' }}><a href="/5massage-com/programmy" className="btn" style={{ padding: '10px 20px', fontSize: '13px' }}>Программы салона</a></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </M5cShell>
  );
}
