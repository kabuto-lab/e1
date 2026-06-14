/**
 * Данные каталога тенанта НЕБОСВОД (nebesaspa): категории, программы и карта
 * принадлежности (категория → программы) — спарсено с nebesaspa.com (страницы
 * программ + WP REST таксономии programs-category). Единый источник для:
 *   - /nebesaspa/programs                 (каталог: категории + все программы)
 *   - /nebesaspa/programs-category/[slug] (программы одной категории)
 *   - /nebesaspa/program/[slug]           (детальная карточка программы)
 *
 * slug программы = слаг её страницы на доноре (/program/<slug>/); картинка —
 * prog-<slug>.webp в /tenants/nebesaspa-clone (спарсенный og:image).
 */

export type NebProgram = { slug: string; nm: string; price: number; dur: number; desc: string };
export type NebCategory = { slug: string; nm: string; price: number; desc: string; img: string };

export const ASSET_DIR = '/tenants/nebesaspa-clone';
export const programImg = (slug: string) => `prog-${slug}`;

export const CATEGORIES: NebCategory[] = [
  { slug: 'deluxe-programmy', nm: 'DELUXE программы', price: 18000, img: 'hf_20260424_003235_dc656067-7565-45b8-b26b-b9dadca9c20d-1024x768', desc: 'Программы свободы выбора: вы сами решаете, что и в какой последовательности будет происходить — ради ярких эмоций и блаженства.' },
  { slug: 'vip-programmy', nm: 'VIP программы', price: 13000, img: 'hf_20260423_213812_54336675-8a06-4ce6-b880-6a55e640e0c1-1024x768', desc: 'Услуги для самых требовательных мужчин — полная отдача профессиональных мастериц и премиальный уровень сервиса.' },
  { slug: 'osnovnye-programmy', nm: 'Основные программы', price: 5000, img: 'hf_20260423_222840_a375d69f-e5a6-47ba-9642-2a92ed206d83-1024x768', desc: 'Для тех, кто начинает знакомство с эротическим массажем: классический формат без лишнего, баланс расслабления и наслаждения.' },
  { slug: 'programmy-dlya-devushek', nm: 'Программы для девушек', price: 10000, img: 'molodye-zensiny-v-kupal-nyh-kostumah-smotrat-drug-na-druga-i-poziruut-1-scaled-1-1024x682', desc: 'Новые эмоции и сценарии для женщин, которые предпочитают качественный и чувственный отдых.' },
  { slug: 'dlya-companiy', nm: 'Программы для компаний', price: 60001, img: 'hf_20260423_215405_fe5fd311-f577-4445-9e48-aa4ccef63ea2-1024x768', desc: 'Развлечение большой компанией — напитки, атмосфера и безупречный сервис в окружении соблазнительных красоток.' },
  { slug: 'programmy-s-2mya-devushkami', nm: 'Программы с 2-мя девушками', price: 26000, img: 'hf_20260423_125533_357775de-6ff0-4285-8601-b19e78a9824b-e1776949185454-1024x768', desc: 'Эротический массаж с двумя мастерицами — воплощение одной из самых популярных фантазий.' },
  { slug: 'eksklyuzivnye-programmy', nm: 'Эксклюзивные программы', price: 45000, img: 'hf_20260424_002651_8dcbd41f-dd59-4885-bac8-ce76b21de654-1024x768', desc: 'Особые услуги для полного погружения и премиального обслуживания — высший пилотаж.' },
  { slug: 'eroticheskij-massazh-dlya-par', nm: 'Эротический массаж для пар', price: 10000, img: 'hf_20260423_211635_ef3f305e-6b26-4385-9921-4e635f0da498-1024x768', desc: 'Программа с участием или наблюдением партнёра — новые грани близости и разнообразие в отношениях.' },
];

export const PROGRAMS: NebProgram[] = [
  { slug: 'legkoe-zabvenie', nm: 'Облачное Прикосновение', price: 5000, dur: 60, desc: 'Глубокий расслабляющий массаж всего тела с мягким погружением в чувственную атмосферу.' },
  { slug: 'ladys-relax', nm: 'Первая Звезда', price: 5000, dur: 30, desc: 'Идеальный первый шаг в мир эротического массажа.' },
  { slug: 'firmennaya', nm: 'Слёзы небес', price: 6000, dur: 60, desc: 'Баланс телесного расслабления и эротического наслаждения: глубокая проработка мышц плавно переходит в чувственные техники.' },
  { slug: 'joni-massazh', nm: 'Повелитель Неба', price: 8000, dur: 60, desc: 'Программа для тех, кто любит контроль, подчинение и игру ролей.' },
  { slug: 'soblazn-po-vyzovu', nm: 'Клубничный закат', price: 9000, dur: 60, desc: 'Максимум эротики, смена ритмов и ощущений.' },
  { slug: 'polnoe-pogruzhenie-vip', nm: 'Созвездие Кассиопеи', price: 10000, dur: 60, desc: 'Мягкая и комфортная программа для первого знакомства с форматом «для двоих».' },
  { slug: 'shyolkovoe-oblako', nm: 'Шёлковое облако', price: 10000, dur: 60, desc: 'Мягкая, чувственная программа для расслабления и наслаждения своим телом.' },
  { slug: 'erotic-time', nm: 'Первый Свет', price: 10000, dur: 60, desc: 'Лёгкий формат для первого знакомства с выездным массажем.' },
  { slug: 'podruzhki', nm: 'Затмение', price: 12000, dur: 90, desc: 'Более глубокий формат для пар, которые хотят не спешить и продолжить вечер в своём ритме.' },
  { slug: 'lunnyj-rasczvet', nm: 'Лунный расцвет', price: 13000, dur: 75, desc: 'Глубокая и интимная программа, направленная на раскрытие чувствительности и телесного наслаждения.' },
  { slug: 'dyhanie-strasti', nm: 'Бархатное Небо', price: 13000, dur: 60, desc: 'Глубокая VIP-программа, направленная на полное телесное и эмоциональное расслабление.' },
  { slug: 'otkrovenie', nm: 'Поцелуй Кометы', price: 13000, dur: 75, desc: 'Яркая VIP-программа с элементами игры, экзотических техник и усиленного телесного контакта.' },
  { slug: 'massazh-dlya-par', nm: 'Жемчужный Горизонт', price: 13000, dur: 75, desc: 'Программа с одной девушкой: массаж делается либо мужчине, либо женщине.' },
  { slug: 'polet-zhelanij', nm: 'Звёздный контакт', price: 15000, dur: 75, desc: 'Усиленный часовой формат с более насыщенной эротической частью и расширенным сценарием.' },
  { slug: 'ekzotika', nm: 'Невесомость', price: 17000, dur: 70, desc: 'Интерактивная VIP-программа с элементами управления и доверия.' },
  { slug: 'bezdna-naslazhdenij', nm: 'Солнце и Луна', price: 18000, dur: 60, desc: 'Яркий формат с двумя мастерами: синхронная работа, визуальные впечатления и усиленные ощущения.' },
  { slug: '886', nm: 'Тёмная орбита', price: 18000, dur: 90, desc: 'Оптимальный формат для полноценного отдыха: больше времени, ощущений и более глубокая работа с телом.' },
  { slug: 'sladkaya-prihot', nm: 'Звёздный', price: 18000, dur: 90, desc: 'Флагманская deluxe-программа: медленное погружение, эстетика тела, расширенные техники и максимальная чувственность.' },
  { slug: 'lunnyj-ekstaz', nm: 'Пылающая орбита', price: 24000, dur: 90, desc: 'Продолжительный формат для пар, которые хотят получить максимум эмоций и затем остаться вдвоём.' },
  { slug: 'solnechnaya-laska', nm: 'Солнечная ласка', price: 25000, dur: 120, desc: 'Длительная чувственная программа с атмосферой заботы, тепла и романтики.' },
  { slug: 'sliyanie', nm: 'Двойной звездопад', price: 26000, dur: 75, desc: 'Deluxe-шоу с двумя девушками: эстетика, синхронность, визуальное и телесное удовольствие.' },
  { slug: 'dont-stop', nm: 'Открытый космос', price: 27000, dur: 120, desc: 'Максимум свободы в рамках одного сценария: гость сам выбирает, какие элементы повторять.' },
  { slug: 'rajskie-grezy', nm: 'Ритуал Звёздного Света', price: 28000, dur: 120, desc: 'Deluxe-ритуал с максимальным набором техник: тело, вода, тепло и эротика в одном сценарии.' },
  { slug: 'padenie-zvezd', nm: 'Одно дыхание на двоих', price: 28000, dur: 120, desc: 'Ритуал сближения и перезагрузки для пары — заново почувствовать телесную и эмоциональную связь.' },
  { slug: 'boginya-avrory', nm: 'Богиня Авроры', price: 35000, dur: 150, desc: 'Эксклюзивный ритуал поклонения женскому телу и удовольствию.' },
  { slug: 'galaktika-naslazhdenij', nm: 'Галактика наслаждений', price: 39999, dur: 180, desc: 'Полноценный выездной ритуал без спешки — для тех, кто хочет отключиться от внешнего мира.' },
  { slug: 'polunochnyj-sekret', nm: 'Полуночный секрет', price: 40000, dur: 90, desc: 'Эксклюзивная программа для смелых и уверенных в себе.' },
  { slug: 'erotic-terapiya', nm: 'Дуэт Туманности', price: 40000, dur: 90, desc: 'Расширенная версия шоу-программы с акцентом на откровенность и телесный контакт.' },
  { slug: 'nebesnaya-simfoniya', nm: 'Небесная симфония', price: 40000, dur: 90, desc: 'Формат для тех, кто хочет максимум визуала и синхронной работы двух девушек.' },
  { slug: 'podruzhki-lux', nm: 'Горизонт событий', price: 40000, dur: 120, desc: 'Максимально насыщенная программа для пар, ориентированная на чувственность и новые впечатления.' },
  { slug: 'shelest-nebes', nm: 'Открытое Небо', price: 45000, dur: 300, desc: 'Многочасовой SPA-ритуал премиум-уровня: медленное, роскошное наслаждение без ограничений.' },
  { slug: 'neznakomka', nm: 'Седьмые Небеса', price: 45000, dur: 180, desc: 'Эксклюзивная программа без ограничений: максимум техник и персональный сценарий.' },
  { slug: 'angely-nochi', nm: 'Полуночный дуэт', price: 53000, dur: 120, desc: 'Длительный сценарий с разделением на расслабляющую и эротическую части.' },
  { slug: 'zvyozdnaya-gostinaya', nm: 'Звёздная гостиная', price: 60000, dur: 180, desc: 'Комфортный групповой формат для отдыха, общения и расслабляющего массажа.' },
  { slug: 'mlechnyj-put', nm: 'Созвездие', price: 80000, dur: 180, desc: 'Вечеринка с продолжением: масштаб, шоу и персональный финал.' },
  { slug: 'nebesnyj-krug', nm: 'Небесный круг', price: 90000, dur: 210, desc: 'Три мастера для троих гостей — расширенный групповой формат с элементами SPA.' },
  { slug: 'galakticheskij-ritual', nm: 'Галактический ритуал', price: 126000, dur: 240, desc: 'Три мастера для троих гостей — самый масштабный ритуал салона.' },
];

// Категория → слаги программ (с nebesaspa.com, WP-таксономия programs-category).
// Некоторые программы принадлежат сразу двум категориям — как на доноре.
export const CATEGORY_PROGRAMS: Record<string, string[]> = {
  'deluxe-programmy': ['sladkaya-prihot', 'sliyanie', 'rajskie-grezy', 'erotic-terapiya'],
  'vip-programmy': ['dyhanie-strasti', 'otkrovenie', 'massazh-dlya-par', 'ekzotika'],
  'osnovnye-programmy': ['legkoe-zabvenie', 'ladys-relax', 'firmennaya', 'joni-massazh', 'soblazn-po-vyzovu'],
  'programmy-dlya-devushek': ['shyolkovoe-oblako', 'lunnyj-rasczvet', 'solnechnaya-laska', 'boginya-avrory', 'polunochnyj-sekret'],
  'dlya-companiy': ['zvyozdnaya-gostinaya', 'nebesnyj-krug', 'galakticheskij-ritual'],
  'programmy-s-2mya-devushkami': ['sliyanie', 'padenie-zvezd'],
  'eksklyuzivnye-programmy': ['shelest-nebes', 'neznakomka', 'mlechnyj-put'],
  'eroticheskij-massazh-dlya-par': ['polnoe-pogruzhenie-vip', 'podruzhki', 'bezdna-naslazhdenij', 'lunnyj-ekstaz', 'padenie-zvezd', 'podruzhki-lux'],
};

const PROG_BY_SLUG = new Map(PROGRAMS.map((p) => [p.slug, p]));
const CAT_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

export const programBySlug = (slug: string): NebProgram | undefined => PROG_BY_SLUG.get(slug);
export const categoryBySlug = (slug: string): NebCategory | undefined => CAT_BY_SLUG.get(slug);

export const programsOfCategory = (catSlug: string): NebProgram[] =>
  (CATEGORY_PROGRAMS[catSlug] ?? []).map((s) => PROG_BY_SLUG.get(s)).filter((p): p is NebProgram => !!p);

export const categoriesOfProgram = (progSlug: string): NebCategory[] =>
  CATEGORIES.filter((c) => (CATEGORY_PROGRAMS[c.slug] ?? []).includes(progSlug));

// Форматирование (без зависимости от ICU/локали).
const spaced = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
export const fmtPrice = (n: number) => `от ${spaced(n)} ₽`;
export const fmtDur = (m: number) => {
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${h} ч ${mm} мин` : `${h} ч`;
};
