// E-E-A-T автор статей barbiespa (ENTITY.md §13).
// Один автор на весь раздел «Статьи» тенанта barbiespa.

export type ArticleAuthor = {
  /** Отображаемое имя. */
  name: string;
  /** Должность / роль (schema jobTitle). */
  role: string;
  /** Био — рендерится в карточке автора и идёт в schema description. */
  bio: string;
  /**
   * true → автор размечается как schema.org/Person (сильнее E-E-A-T, но имя
   * должно быть РЕАЛЬНЫМ человеком — выдумывать персону нельзя).
   * false → честный редакционный блок от лица организации.
   */
  isPerson: boolean;
  /** Темы экспертизы (schema knowsAbout). */
  knowsAbout?: string[];
  /** Необязательное фото автора (asset-путь вида /tenants/barbiespa/...). */
  photo?: string;
};

/**
 * ТЕКУЩЕЕ ЗНАЧЕНИЕ — честный редакционный блок (isPerson:false): факты взяты с
 * сайта салона и не выдуманы. Чтобы усилить E-E-A-T до named-эксперта, замените
 * на реального человека: isPerson:true + настоящие name/role/bio (+ photo).
 */
export const BARBIESPA_AUTHOR: ArticleAuthor = {
  name: 'Виктория',
  role: 'Старший администратор Barbie Spa',
  bio: 'Виктория — старший администратор салона эротического массажа Barbie Spa в Москве. Ежедневно консультирует гостей по выбору программ и мастеров, помогает подобрать формат визита и отвечает на вопросы о процедурах, ценах и конфиденциальности.',
  isPerson: true,
  photo: '/tenants/barbiespa/author-victoria.webp',
  knowsAbout: [
    'эротический массаж',
    'спа-программы и релакс-массаж',
    'массаж для мужчин и пар',
    'выездной массаж',
  ],
};
