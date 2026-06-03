/* eslint-disable no-console */
/**
 * Seed: ED-главная тенанта sal-nmas (текущий slug тенанта — 'imperiumspa').
 *
 * Создаёт/обновляет строку `cms_pages` (slug='home', locale='ru') с телом
 * `[{ type:'custom', data:{ ed: Section[] } }]` — структурная реконструкция
 * главной salon-massage на виджетах ED. `status='published'`, чтобы
 * публичный роут `(tenants)/imperiumspa` сразу её отрисовал через EdRenderer.
 *
 * M1: модель-карточки/услуги — статичные виджеты (динамический Listing Grid —
 * это M2). Идемпотентно: upsert по (tenant_id, slug, locale).
 *
 * Запуск (из apps/api):
 *   npx ts-node -r tsconfig-paths/register src/scripts/seed-sal-nmas-home.ts
 */
import 'reflect-metadata';
import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { and, eq, sql } from 'drizzle-orm';
import { getDb, closeDb, tenants, cmsPages, type CmsBlocks } from '@barbie-site1/db';

// ── загрузить корневой .env SITE1 (подъём по дереву) ─────────────────────────
function loadEnv(): void {
  const cwd = process.cwd();
  for (let depth = 0; depth < 8; depth++) {
    const base = depth === 0 ? cwd : resolve(cwd, ...Array(depth).fill('..'));
    const envPath = resolve(base, '.env');
    if (existsSync(envPath)) {
      loadDotenv({ path: envPath, override: false });
      return;
    }
  }
}
loadEnv();

const TENANT_SLUG = 'imperiumspa';
const PAGE_SLUG = 'home';
const LOCALE = 'ru';

// ── билдеры дерева ED ─────────────────────────────────────────────────────────
// Форма зеркалит apps/web/src/components/cms/ed-editor/ed-types.ts.
// Скрипт в apps/api не может импортить web-пакет — типы продублированы локально.
interface EdElement {
  id: string;
  type: string;
  [k: string]: unknown;
}
interface EdColumn {
  id: string;
  span: number;
  elements: EdElement[];
}
interface EdSection {
  id: string;
  columns: EdColumn[];
  padding: string;
}

let _seq = 0;
const uid = (): string => `seed${(_seq++).toString(36).padStart(3, '0')}`;

function heading(
  text: string,
  opts: { tag?: string; fontSize?: number; color?: string; align?: string } = {},
): EdElement {
  return {
    id: uid(),
    type: 'heading',
    heading: {
      text,
      tag: opts.tag ?? 'h2',
      align: opts.align ?? 'center',
      color: opts.color ?? '#F2EBD9',
      fontSize: opts.fontSize ?? 32,
    },
  };
}

function paragraph(content: string, color = '#C9C2B0'): EdElement {
  return { id: uid(), type: 'text', text: { content, align: 'center', color } };
}

function cta(headline: string, description: string, buttonText: string): EdElement {
  return { id: uid(), type: 'cta', cta: { headline, description, buttonText, align: 'center' } };
}

function iconBox(icon: string, title: string, description: string): EdElement {
  return {
    id: uid(),
    type: 'icon-box',
    iconBox: { icon, title, description, iconColor: '#00FFCC', layout: 'top' },
  };
}

function column(span: number, elements: EdElement[]): EdColumn {
  return { id: uid(), span, elements };
}

function section(columns: EdColumn[], padding: string): EdSection {
  return { id: uid(), columns, padding };
}

// ── структура главной salon-massage ──────────────────────────────────────────
function buildHome(): EdSection[] {
  return [
    // Hero
    section(
      [
        column(12, [
          heading('Salon Massage', { tag: 'h1', fontSize: 52 }),
          heading('Искусство массажа для истинных ценителей', {
            tag: 'h3',
            fontSize: 22,
            color: '#9A958A',
          }),
          paragraph(
            'Закрытый салон для отдыха и восстановления. Уютные апартаменты, ' +
              'профессиональные мастера, безупречная конфиденциальность.',
          ),
          cta('Записаться на сеанс', 'Москва · с 2019 года', 'Записаться'),
        ]),
      ],
      '72px 32px',
    ),

    // Анкеты (M1 — без динамического грида; Listing Grid это M2)
    section(
      [
        column(12, [
          heading('Наши девушки', { fontSize: 34 }),
          paragraph('44 анкеты с фото и параметрами.'),
          cta('Смотреть анкеты', 'Полный каталог — фильтр по параметрам', 'Все анкеты'),
        ]),
      ],
      '56px 32px',
    ),

    // Услуги — заголовок
    section(
      [column(12, [heading('Наши услуги', { fontSize: 34 }), paragraph('Каждая программа — продуманный сценарий отдыха.')])],
      '56px 32px 12px',
    ),
    // Услуги — сетка 3×2
    section(
      [
        column(4, [
          iconBox('Sparkles', 'Классический массаж', 'Снятие напряжения. от 5 000 ₽ · 60 мин'),
          iconBox('Flower2', 'SPA-программа', 'Массаж, ароматерапия, забота о теле. от 8 000 ₽ · 90 мин'),
        ]),
        column(4, [
          iconBox('Users', 'Программа для двоих', 'Совместный сеанс в апартаментах. от 12 000 ₽ · 90 мин'),
          iconBox('Crown', 'VIP-программа', 'Индивидуальная программа премиум-уровня. от 15 000 ₽ · 120 мин'),
        ]),
        column(4, [
          iconBox('Hand', 'Тайский массаж', 'Традиционные техники глубокой проработки. от 6 000 ₽ · 75 мин'),
          iconBox('Star', 'Авторская программа', 'Сеанс по вашему сценарию. индивидуально'),
        ]),
      ],
      '8px 32px 56px',
    ),

    // Преимущества — 4 колонки
    section(
      [
        column(3, [iconBox('Lock', 'Конфиденциальность', 'Полная анонимность каждого визита.')]),
        column(3, [iconBox('Home', 'Уютные апартаменты', 'Девять номеров с авторским интерьером.')]),
        column(3, [iconBox('Award', 'Профессионализм', 'Только опытные сертифицированные мастера.')]),
        column(3, [iconBox('Clock', 'Круглосуточно', 'Принимаем гостей 24 часа, без выходных.')]),
      ],
      '56px 32px',
    ),

    // Контакты
    section(
      [
        column(12, [
          heading('Контакты и бронирование', { fontSize: 34 }),
          paragraph('Москва, м. Красные Ворота · +7 (495) 000-00-00 · круглосуточно, без выходных'),
          cta('Записаться на сеанс', 'Оставьте заявку — перезвоним', 'Отправить заявку'),
        ]),
      ],
      '56px 32px 72px',
    ),
  ];
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error('[seed] DATABASE_URL не задан — скопируй .env.example в .env');
    process.exit(1);
  }

  const db = getDb();

  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, TENANT_SLUG))
    .limit(1);

  if (!tenant) {
    console.error(`[seed] Тенант '${TENANT_SLUG}' не найден. Сначала: npm run seed:admin`);
    process.exit(1);
  }

  const body: CmsBlocks = [{ type: 'custom', data: { ed: buildHome() } }];

  const [existing] = await db
    .select({ id: cmsPages.id })
    .from(cmsPages)
    .where(
      and(
        eq(cmsPages.tenantId, tenant.id),
        eq(cmsPages.slug, PAGE_SLUG),
        eq(cmsPages.locale, LOCALE),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(cmsPages)
      .set({
        title: 'Salon Massage',
        body,
        status: 'published',
        publishedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(eq(cmsPages.id, existing.id));
    console.log(`[seed] ✓ cms_pages обновлена — id=${existing.id} (tenant=${TENANT_SLUG}, slug=${PAGE_SLUG})`);
  } else {
    const [created] = await db
      .insert(cmsPages)
      .values({
        tenantId: tenant.id,
        slug: PAGE_SLUG,
        locale: LOCALE,
        title: 'Salon Massage',
        body,
        status: 'published',
        publishedAt: sql`now()`,
      })
      .returning({ id: cmsPages.id });
    console.log(`[seed] ✓ cms_pages создана — id=${created.id} (tenant=${TENANT_SLUG}, slug=${PAGE_SLUG})`);
  }

  console.log('[seed] Готово. Открой публичную главную: http://localhost:5111/imperiumspa');
}

main()
  .catch((err) => {
    console.error('[seed] FAILED:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
