import { asset } from '@/lib/asset';
import { BarbieArticleShell } from '@/components/tenant-sites/barbiespa/BarbieArticleShell';

export const metadata = {
  title: 'Интерьер салона эротического массажа в Москве — BARBIE SPA',
  description:
    'Интерьер салона Barbie Spa: изысканные апартаменты, 3 VIP-комнаты с джакузи, сауной и хаммамом и 8 уютных комнат с душевыми. Атмосфера релакса в центре Москвы.',
};

const PHOTOS = [
  'photo_2024-07-19_13-53-48.webp',
  'photo_2024-07-19_14-31-23.webp',
  'photo_2026-02-13_16-19-57.webp',
  'photo_2026-02-13_16-19-59.webp',
  'photo_2026-02-13_16-20-02.webp',
  'photo_2026-02-28_11-24-55-768x1024.webp',
  'photo_2026-02-28_11-24-56-768x1024.webp',
  'photo_2026-02-28_11-24-58-768x1024.webp',
  'photo_2026-02-28_11-25-00-768x1024.webp',
];

export default function InteriorPage() {
  return (
    <BarbieArticleShell>
      <article className="wrap bs-art-article">
        <h1 className="bs-art-title">Интерьер салона Barbie Spa</h1>
        <div className="bs-art-body">
          <p className="bs-art-lead">
            Перешагнув порог салона эротического массажа Barbie Spa, вы окажетесь в атмосфере абсолютной релаксации и
            блаженства. Изысканные апартаменты и продуманный дизайн позволят полностью погрузиться в мир наслаждений.
          </p>
          <p>
            К вашим услугам — <b>3 VIP-комнаты</b> с джакузи, сауной и хаммамом и <b>8 уютных комнат</b> с душевыми
            кабинами. В каждой комнате кондиционер, приглушённый свет и всё для уединённого отдыха: гости не пересекаются
            внутри салона, конфиденциальность гарантирована.
          </p>

          <div className="bs-art-gallery">
            {PHOTOS.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p} src={asset(`/tenants/barbiespa/${p}`)} alt="Интерьер салона Barbie Spa в Москве" loading="lazy" />
            ))}
          </div>

          <h2>Как нас найти</h2>
          <p>
            Москва, Каланчевская 32/58 с1 — рядом с метро <b>Комсомольская</b>, <b>Красные Ворота</b> и
            <b> Проспект Мира</b>. Каждую неделю с воскресенья по четверг — «счастливые часы»: приходите с 13:00 до 20:00
            и выберите один из подарков.
          </p>

          <p className="bs-art-cta-inline">
            Хотите увидеть всё вживую? <a href={asset('/barbiespa#contacts')}>Запишитесь</a> — администратор согласует
            удобное время визита.
          </p>
        </div>

        <div className="bs-art-ctarow">
          <a className="btn-fill" href={asset('/barbiespa#contacts')}>Записаться</a>
          <a className="btn-out" href={asset('/barbiespa/programmy')}>Программы</a>
        </div>
      </article>
    </BarbieArticleShell>
  );
}
