import { asset } from '@/lib/asset';
import { NebesaShell } from '@/components/tenant-sites/nebesa/NebesaShell';

export const metadata = {
  title: 'Интерьеры — НЕБОСВОД · спа-салон',
  description:
    'Интерьеры спа-салона эротического массажа НЕБОСВОД в Москве — комфорт, приватность и премиальный сервис.',
};

const GALLERY: [string, string][] = [
  [asset('/tenants/nebesaspa-clone/img_1727-hdr-683x1024.webp'), 'Интерьер 1'],
  [asset('/tenants/nebesaspa-clone/img_1820-hdr-683x1024.webp'), 'Интерьер 2'],
  [asset('/tenants/nebesaspa-clone/img_1932-hdr-1024x683.webp'), 'Интерьер 3'],
  [asset('/tenants/nebesaspa-clone/img_1984-hdr-1024x683.webp'), 'Интерьер 4'],
  [asset('/tenants/nebesaspa-clone/img_2103-hdr-1024x683.webp'), 'Интерьер 5'],
  [
    asset('/tenants/nebesaspa-clone/hf_20260423_154502_f03622d9-6e81-47bf-a87e-ea24d728605c-1024x768.webp'),
    'Интерьер 6',
  ],
];

export default function Page() {
  return (
    <NebesaShell>
      <section className="progs">
        <div className="wrap">
          <h2 className="h2">Интерьеры</h2>
          <p>
            Пространство, оформленное для мужчин, которые ценят комфорт, приватность и высокий
            уровень сервиса.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: 14,
              marginTop: 24,
            }}
          >
            {GALLERY.map(([src, alt]) => (
              <img key={src} src={src} alt={alt} style={{ width: '100%', borderRadius: 12 }} />
            ))}
          </div>

          <h2 className="h2" style={{ marginTop: 48 }}>
            Эстетика, удобство и премиальный подход
          </h2>
          <p>
            Интерьер нашего салона создан для мужчин, которые ценят комфорт, приватность и высокий
            уровень сервиса. Пространство оформлено в современном стиле: мягкий свет, спокойные
            оттенки, продуманные детали и атмосфера полного расслабления. Каждая комната подготовлена
            для качественного отдыха, а уютная обстановка помогает переключиться от повседневных
            забот. Наш салон эротического массажа в Москве сочетает эстетику, удобство и
            премиальный подход к каждому гостю.
          </p>
          <p>
            Внутри вас ждут стильные номера, чистота, приятная музыка и атмосфера уединения. Мы
            уделили внимание каждой детали, чтобы посещение стало особенным и запоминающимся.
            Эротический салон для мужчин предлагает не просто отдых, а пространство, где можно
            восстановить силы, получить новые впечатления и насладиться приватной атмосферой. Если
            вы ищете красивый салон эротического массажа с современным интерьером в Москве — вы по
            адресу.
          </p>

          <p style={{ marginTop: 24 }}>
            <a className="btn btn-blue" href="tel:+79120767814">
              Записаться
            </a>
          </p>
        </div>
      </section>
    </NebesaShell>
  );
}
