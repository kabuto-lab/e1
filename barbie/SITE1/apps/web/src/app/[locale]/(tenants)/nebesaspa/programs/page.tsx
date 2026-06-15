import { NebesaShell } from '@/components/tenant-sites/nebesa/NebesaShell';
import { NebesaProgramsCatalog } from '@/components/tenant-sites/nebesa/NebesaProgramsCatalog';

export const metadata = {
  title: 'Программы эротического массажа в Москве — НЕБОСВОД · спа-салон',
  description:
    'Полный каталог программ салона эротического массажа НЕБОСВОД: основные, VIP, DELUXE, для пар, для девушек, для компаний и эксклюзивные. Цены и запись.',
};

export default function Page() {
  return (
    <NebesaShell>
      <section className="progs" style={{ paddingTop: 18 }}>
        <div className="wrap">
          <h1
            className="h2"
            style={{
              fontFamily: 'var(--font-cormorant), "Playfair Display", Georgia, serif',
              fontWeight: 300,
              fontVariant: 'small-caps',
              letterSpacing: '0.02em',
              fontSize: 'clamp(26px, 3.4vw, 42px)',
              lineHeight: 1.05,
              margin: 0,
            }}
          >
            Категории программ эротического массажа в Москве
          </h1>
          <p style={{ color: '#3a3d44', fontSize: 15, lineHeight: 1.45, marginTop: 6 }}>
            Выберите категорию по настроению и бюджету — точную стоимость и детали подскажет администратор.
          </p>

          {/* Каталог с клиентским фильтром: 8 категорий-квадратов фильтруют список ниже */}
          <NebesaProgramsCatalog />

          {/* О САЛОНЕ */}
          <div
            style={{
              marginTop: 64,
              background: '#fff',
              borderRadius: 'var(--r)',
              padding: 'clamp(24px, 4vw, 44px)',
              boxShadow: '0 14px 40px rgba(20, 25, 40, 0.06)',
            }}
          >
            <h2 className="h2" style={{ fontSize: 'clamp(26px, 3.4vw, 40px)' }}>
              О салоне
            </h2>
            <div style={{ color: '#3a3d44', fontSize: 16, lineHeight: 1.75, marginTop: 18 }}>
              <p>
                Добро пожаловать в место, где собраны все составляющие идеального отдыха: красивые
                девушки, роскошная атмосфера, высокий сервис и возможность провести время именно так,
                как давно хотелось. Именно так можно описать салон эротического массажа NEBOSVOD в
                Москве.
              </p>
              <p style={{ marginTop: 14 }}>
                Для каждого гостя мы подбираем программу под его настроение — от мягкого релакса до
                ярких эксклюзивных сценариев. Наши мастерицы создают атмосферу комфорта и доверия, а
                всё, что происходит у нас, остаётся только между нами: полная конфиденциальность
                гарантирована.
              </p>
            </div>
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
