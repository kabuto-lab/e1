import { getTranslations } from 'next-intl/server';
import type { PublicGirl } from '@/lib/public-girls-api';
import { NebesaGirlCard } from './NebesaGirlCard';

/**
 * NebesaGirls — фирменный листинг анкет тенанта nebesaspa (НЕБОСВОД) в едином
 * стиле сайта: секция .girls + карточки .gcard (NebesaGirlCard — слайдер по всем
 * фото + видео). Серверный компонент-обёртка; ростер передаётся пропсом.
 * Используется и на /nebesaspa/girls, и на /nebesaspa/models.
 */
export async function NebesaGirls({
  girls,
  titleKey = 'girls.title',
}: {
  girls: PublicGirl[];
  /** ключ перевода под nebesa.* (girls.title | girls.profiles) */
  titleKey?: string;
}) {
  const t = await getTranslations('nebesa');
  return (
    <section className="girls">
      <div className="wrap">
        <h1 className="h2">{t(titleKey)}</h1>
        {girls.length > 0 ? (
          <div className="girls-grid">
            {girls.map((g) => (
              <NebesaGirlCard key={g.slug} girl={g} />
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--muted)', marginTop: 24 }}>{t('girls.empty')}</p>
        )}
      </div>
    </section>
  );
}
