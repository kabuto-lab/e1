import { asset } from '@/lib/asset';
import type { PublicGirl } from '@/lib/public-girls-api';
import { photoUrl } from '@/lib/public-girls-api';

/**
 * SmModelCard — карточка модели реплики SalonMassage (классы .mcard из
 * _style.css): фото 3/4 + всплывающий на hover блок «имя + возраст/рост/вес».
 * Hover-раскрытие чисто на CSS, JS не нужен. Ссылка → профиль модели.
 */
export function SmModelCard({ girl }: { girl: PublicGirl }) {
  const cover = girl.photos[0];
  return (
    <a
      className="mcard"
      href={asset(`/imperiumspa/models/${girl.slug}`)}
      data-age={girl.age ?? ''}
      data-height={girl.height ?? ''}
      data-breast={girl.breast ?? ''}
    >
      <div className="mcard-ph">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="mcard-img" src={photoUrl(cover)} alt={girl.name} loading="lazy" decoding="async" />
        )}
        <span className="mcard-cnt">
          {girl.photos.length} <span>фото</span>
        </span>
        <div className="mcard-grad" />
        <div className="mcard-reveal">
          <div className="mcard-nm">{girl.name}</div>
          <div className="mcard-stats">
            <span className="mcard-stat"><b>{girl.age ?? '—'}</b><span>возраст</span></span>
            <span className="mcard-stat"><b>{girl.height ?? '—'}</b><span>рост</span></span>
            <span className="mcard-stat"><b>{girl.weight ?? '—'}</b><span>вес</span></span>
          </div>
        </div>
      </div>
    </a>
  );
}
