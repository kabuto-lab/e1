import Link from "next/link";

const SECTIONS = [
  {
    title: 'Каталог моделей',
    body: (
      <>
        На странице{' '}
        <Link href="/models" className="text-[#d4af37] underline-offset-2 hover:underline">
          Модели
        </Link>{' '}
        доступны фильтры по статусу, рейтингу и другим параметрам. Карточки в каталоге показывают только опубликованные и
        верифицированные анкеты.
      </>
    ),
  },
  {
    title: 'Аккаунт и панель',
    body: (
      <>
        Вход — через{' '}
        <Link href="/login" className="text-[#d4af37] underline-offset-2 hover:underline">
          страницу входа
        </Link>
        . Клиенты попадают в{' '}
        <Link href="/cabinet" className="text-[#d4af37] underline-offset-2 hover:underline">
          личный кабинет
        </Link>
        , администраторы и менеджеры — в{' '}
        <Link href="/dashboard" className="text-[#d4af37] underline-offset-2 hover:underline">
          панель управления
        </Link>
        .
      </>
    ),
  },
  {
    title: 'Связь с нами',
    body: (
      <>
        Вопросы и заявки — через форму на странице{' '}
        <Link href="/contacts" className="text-[#d4af37] underline-offset-2 hover:underline">
          Контакты
        </Link>
        .
      </>
    ),
  },
  {
    title: 'Конфиденциальность',
    body: (
      <>
        Мы обрабатываем персональные данные в рамках работы платформы согласно{' '}
        <a
          href="/legal/privacy-policy.pdf"
          download
          className="text-[#d4af37] underline-offset-2 hover:underline"
        >
          Политике обработки персональных данных
        </a>
        . Условия оказания услуг — в{' '}
        <a href="/legal/oferta.pdf" download className="text-[#d4af37] underline-offset-2 hover:underline">
          Публичной оферте
        </a>
        , согласие на обработку данных — в{' '}
        <a href="/legal/pd-consent.pdf" download className="text-[#d4af37] underline-offset-2 hover:underline">
          Согласии на обработку персональных данных
        </a>
        .
      </>
    ),
  },
];

export { SECTIONS };
