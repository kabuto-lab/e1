/* eslint-disable no-console */
/**
 * seed-wfy-tenant.ts — Phase B work4u → NAS content migration.
 *
 * Bootstraps the `work-for-you` tenant in NAS-Postgres and seeds it with
 * content extracted from `barbie/work4u/packages/migrator/parsed/*.json`
 * (already produced by the legacy work4u migrator's `parse` step).
 *
 * Idempotent: re-running the script reconciles the DB with the source JSON.
 *
 * What lands in this run (Phase B / v1):
 *  - `tenants` row: slug='work-for-you', site_type='wfy-city-dir'
 *  - `wfy_city_pages` — upsert per (tenant_id, slug) from wxr.json
 *  - `partner_salons` — replace-all per tenant from acf.json
 *  - `wfy_opportunities` — replace-all per tenant from acf.json
 *  - `wfy_vacancies` — upsert by (tenant_id, code) from theme constants
 *  - `wfy_advantages` — replace-all per tenant from theme constants
 *
 * What is DEFERRED:
 *  - `lead_applications` — runtime-populated; nothing to seed.
 *  - WP attachment → NAS `media` mapping — Phase B.2. v1 leaves `logo_media_id`
 *    and `cover_image_key` as NULL.
 *  - `cms_pages` (static pages: «Главная», «Политика») — Phase C, after the
 *    renderer at `(tenants)/work-for-you/` is in place.
 *  - Telegram bot token from acf.json — DELIBERATELY NOT WRITTEN; the token
 *    is leaked in source (memory `project_work4u`) and must be rotated by
 *    the operator before any production deploy.
 *
 * Refs:
 *  - `NON_PROJECT/MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md §8 Phase B`
 *  - `governance/adr/ADR-003-wp-import-ssrf-allowlist.md` (gates Phase B.2)
 *  - Session-plan `2026-05-26-1245-AVTONOM-phase-B-content-migration.md`
 *
 * Usage (from `barbie/SITE1/apps/api`):
 *   npx ts-node -r tsconfig-paths/register src/scripts/seed-wfy-tenant.ts
 */
import 'reflect-metadata';
import { config as loadDotenv } from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { eq, sql } from 'drizzle-orm';
import {
  getDb,
  closeDb,
  tenants,
  partnerSalons,
  wfyCityPages,
  wfyOpportunities,
  wfyVacancies,
  wfyAdvantages,
  type Database,
} from '@barbie-site1/db';

// ── env bootstrap (climb the tree for SITE1 .env) ─────────────────────────

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

// ── constants ─────────────────────────────────────────────────────────────

export const TENANT_SLUG = 'work-for-you';
const TENANT_NAME = 'Work-for-You';
const TENANT_CONTACT_EMAIL = 'noreply@work-for-you.ru';
const TENANT_PRIMARY_DOMAIN = 'work-for-you.ru';

/** Default project root → parsed JSONs in work4u repo. */
const DEFAULT_PARSED_DIR = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '..',
  'work4u',
  'packages',
  'migrator',
  'parsed',
);

// ── shape mirrors from work4u/packages/migrator/src/types.ts ──────────────
// Mirrored locally so this script does NOT import from the legacy package
// (which will be deleted in Phase C). The wxr.json + acf.json files are the
// stable contract.

export interface ParsedCity {
  wpId: number;
  slug: string;
  title: string;
  cityName: string;
  metaTitle?: string;
  metaDescription?: string;
  ord: number;
}

export interface ParsedStaticPage {
  wpId: number;
  slug: string;
  title: string;
  contentHtml: string;
  metaTitle?: string;
  metaDescription?: string;
}

export interface ParsedAttachment {
  wpId: number;
  url: string;
  title: string;
  filename: string;
}

export interface ParsedWxr {
  cities: ParsedCity[];
  staticPages: ParsedStaticPage[];
  attachments: ParsedAttachment[];
}

export interface AcfSalon {
  ord: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  link?: string;
  description?: string;
  logoWpId?: number;
}

export interface AcfOpportunity {
  ord: number;
  title: string;
  text?: string;
  imageWpId?: number;
}

export interface AcfOptions {
  opportunitiesTitle?: string;
  salonsTitle?: string;
  btnEnrollLabel?: string;
  videoAdvantagesWpId?: number;
  /**
   * SECURITY: present in source JSON but DELIBERATELY NOT consumed here.
   * Token must be rotated by operator before any prod deploy.
   */
  telegramChatId?: string;
  telegramToken?: string;
  whatsappLink?: string;
  salons: AcfSalon[];
  opportunities: AcfOpportunity[];
}

// ── theme constants (hard-coded in WP-theme PHP, migrated to DB) ──────────
// Source: `barbie/work4u/source/theme-wg/template-parts/sections/job-openings.php`.
// Mirrored from legacy `work4u/packages/migrator/src/seed.ts` constants.

interface VacancySeed {
  code: string;
  title: string;
  ord: number;
  conditions: string[];
}

export const VACANCIES_FROM_THEME: VacancySeed[] = [
  {
    code: 'admin',
    title: 'Администратор',
    ord: 1,
    conditions: [
      'Выдача зарплаты ежедневная',
      'Заработная плата: % от 3.000 до 7.000 рублей в день.',
      'Официальное оформление',
      'График работы: 1 (рабочий) / 2 (выходных).',
      'Рабочий день с 13.00 до 06.00 утра.',
      'Возможно предоставление бесплатного проживания.',
    ],
  },
  {
    code: 'masseuse',
    title: 'Массажистка',
    ord: 2,
    conditions: [
      'Строго БЕЗ интима;',
      'З/п 200.000–300.000 руб. и более;',
      'Выплаты производятся ежедневно;',
      'График работы обсуждается индивидуально.',
      'Салон работает 24 часа.',
      'Иногородним предоставляется жильё, условия хорошие.',
      'Бесплатное обучение.',
      'Официальный салон, НЕ апартаменты.',
    ],
  },
  {
    code: 'hostess',
    title: 'Хостес',
    ord: 3,
    conditions: [
      'Требуемый опыт работы: не требуется',
      'от 70 000 до 100 000 руб. на руки',
      'Свободный график работы.',
      'Рабочие смены выбираете самостоятельно.',
      'Возможные смены: 13:00–22:00 / 22:00–07:00 / 18:00–06:00.',
      'Оплата ежедневная.',
    ],
  },
];

interface AdvantageSeed {
  title: string;
  description: string;
}

export const ADVANTAGES_FROM_THEME: AdvantageSeed[] = [
  { title: 'Высокая Зарплата', description: '150 000 – 250 000 руб. в месяц. Ежедневные выплаты.' },
  { title: 'Официальный салон', description: 'Элитный салон с современным интерьером и оборудованием.' },
  { title: 'Бесплатное проживание', description: 'В центре города в комфортных условиях.' },
  { title: 'Свободный график', description: 'Можно работать в любые дни и время.' },
  { title: 'Деньги каждый день', description: 'Ежедневная выплата з/п в конце рабочего дня.' },
  { title: 'Дружный коллектив', description: 'Берём только самых хороших девочек.' },
];

// ── seed sections (exported for unit testability) ─────────────────────────

export async function upsertTenant(db: Database): Promise<string> {
  const [row] = await db
    .insert(tenants)
    .values({
      slug: TENANT_SLUG,
      name: TENANT_NAME,
      contactEmail: TENANT_CONTACT_EMAIL,
      primaryDomain: TENANT_PRIMARY_DOMAIN,
      siteType: 'wfy-city-dir',
      status: 'active',
    })
    .onConflictDoUpdate({
      target: tenants.slug,
      set: {
        name: sql`excluded.name`,
        contactEmail: sql`excluded.contact_email`,
        primaryDomain: sql`excluded.primary_domain`,
        siteType: sql`excluded.site_type`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: tenants.id });

  if (!row?.id) {
    throw new Error('Tenant upsert returned no id — schema regression?');
  }
  return row.id;
}

export async function seedCities(
  db: Database,
  tenantId: string,
  cities: ParsedCity[],
): Promise<number> {
  let count = 0;
  for (const c of cities) {
    await db
      .insert(wfyCityPages)
      .values({
        tenantId,
        slug: c.slug,
        cityName: c.cityName,
        country: 'RU',
        headline: c.title,
        description: c.metaDescription ?? null,
        extras: {
          metaTitle: c.metaTitle,
          metaDescription: c.metaDescription,
        },
        status: 'published',
        ord: c.ord,
      })
      .onConflictDoUpdate({
        target: [wfyCityPages.tenantId, wfyCityPages.slug],
        set: {
          cityName: sql`excluded.city_name`,
          headline: sql`excluded.headline`,
          description: sql`excluded.description`,
          extras: sql`excluded.extras`,
          status: sql`excluded.status`,
          ord: sql`excluded.ord`,
          updatedAt: sql`now()`,
        },
      });
    count++;
  }
  return count;
}

export async function seedPartnerSalons(
  db: Database,
  tenantId: string,
  salons: AcfSalon[],
): Promise<number> {
  // Replace-all: delete then insert. Each tenant's partner_salons fully
  // reflects the source JSON after one run.
  await db.delete(partnerSalons).where(eq(partnerSalons.tenantId, tenantId));

  for (const s of salons) {
    await db.insert(partnerSalons).values({
      tenantId,
      name: s.name,
      description: s.description ?? null,
      address: s.address ?? null,
      phone: s.phone ?? null,
      email: s.email ?? null,
      externalLink: s.link ?? null,
      // logoMediaId deferred to Phase B.2 (WP-attachment → media migration).
      logoMediaId: null,
      ord: s.ord,
    });
  }
  return salons.length;
}

export async function seedOpportunities(
  db: Database,
  tenantId: string,
  opps: AcfOpportunity[],
): Promise<number> {
  await db.delete(wfyOpportunities).where(eq(wfyOpportunities.tenantId, tenantId));

  for (const o of opps) {
    await db.insert(wfyOpportunities).values({
      tenantId,
      title: o.title,
      headline: o.text ?? null,
      description: null,
      // coverImageKey deferred to Phase B.2.
      coverImageKey: null,
      ord: o.ord,
    });
  }
  return opps.length;
}

export async function seedVacancies(db: Database, tenantId: string): Promise<number> {
  for (const v of VACANCIES_FROM_THEME) {
    await db
      .insert(wfyVacancies)
      .values({
        tenantId,
        code: v.code,
        title: v.title,
        summary: null,
        requirements: [],
        conditions: v.conditions,
        ord: v.ord,
      })
      .onConflictDoUpdate({
        target: [wfyVacancies.tenantId, wfyVacancies.code],
        set: {
          title: sql`excluded.title`,
          summary: sql`excluded.summary`,
          requirements: sql`excluded.requirements`,
          conditions: sql`excluded.conditions`,
          ord: sql`excluded.ord`,
          updatedAt: sql`now()`,
        },
      });
  }
  return VACANCIES_FROM_THEME.length;
}

export async function seedAdvantages(db: Database, tenantId: string): Promise<number> {
  await db.delete(wfyAdvantages).where(eq(wfyAdvantages.tenantId, tenantId));

  let ord = 1;
  for (const a of ADVANTAGES_FROM_THEME) {
    await db.insert(wfyAdvantages).values({
      tenantId,
      title: a.title,
      description: a.description,
      iconName: null,
      ord,
    });
    ord++;
  }
  return ADVANTAGES_FROM_THEME.length;
}

// ── parser (thin wrapper over readFileSync) ────────────────────────────────

export function readParsedSources(parsedDir: string): { wxr: ParsedWxr; acf: AcfOptions } {
  const wxrPath = resolve(parsedDir, 'wxr.json');
  const acfPath = resolve(parsedDir, 'acf.json');
  if (!existsSync(wxrPath)) {
    throw new Error(
      `Missing wxr.json at ${wxrPath}. Run \`cd barbie/work4u && npm run -w @work4u/migrator cli parse\` first.`,
    );
  }
  if (!existsSync(acfPath)) {
    throw new Error(
      `Missing acf.json at ${acfPath}. Run \`cd barbie/work4u && npm run -w @work4u/migrator cli parse\` first.`,
    );
  }
  const wxr = JSON.parse(readFileSync(wxrPath, 'utf8')) as ParsedWxr;
  const acf = JSON.parse(readFileSync(acfPath, 'utf8')) as AcfOptions;
  return { wxr, acf };
}

// ── orchestrator ──────────────────────────────────────────────────────────

export async function runSeedWfyTenant(opts?: { parsedDir?: string; db?: Database }): Promise<{
  tenantId: string;
  counts: {
    cities: number;
    partnerSalons: number;
    opportunities: number;
    vacancies: number;
    advantages: number;
  };
}> {
  const parsedDir = opts?.parsedDir ?? DEFAULT_PARSED_DIR;
  const db = opts?.db ?? getDb();

  console.log(`[seed-wfy-tenant] parsedDir=${parsedDir}`);
  const { wxr, acf } = readParsedSources(parsedDir);

  // SECURITY: surface the leaked-secret reminder once per run.
  if (acf.telegramToken || acf.telegramChatId) {
    console.warn(
      '[seed-wfy-tenant] ⚠ acf.json contains telegramToken / telegramChatId. ' +
        'These values are NOT written to NAS by design — token is leaked in ' +
        'source repo and MUST be rotated before any production deploy. ' +
        '(memory: `project_work4u`)',
    );
  }

  const tenantId = await upsertTenant(db);
  console.log(`[seed-wfy-tenant] tenant ${TENANT_SLUG} id=${tenantId}`);

  const cities = await seedCities(db, tenantId, wxr.cities);
  console.log(`[seed-wfy-tenant] wfy_city_pages: ${cities} rows`);

  const partner = await seedPartnerSalons(db, tenantId, acf.salons);
  console.log(`[seed-wfy-tenant] partner_salons: ${partner} rows`);

  const opps = await seedOpportunities(db, tenantId, acf.opportunities);
  console.log(`[seed-wfy-tenant] wfy_opportunities: ${opps} rows`);

  const vac = await seedVacancies(db, tenantId);
  console.log(`[seed-wfy-tenant] wfy_vacancies: ${vac} rows`);

  const adv = await seedAdvantages(db, tenantId);
  console.log(`[seed-wfy-tenant] wfy_advantages: ${adv} rows`);

  return {
    tenantId,
    counts: {
      cities,
      partnerSalons: partner,
      opportunities: opps,
      vacancies: vac,
      advantages: adv,
    },
  };
}

// ── entry point (only runs when this file is executed directly) ────────────

async function main(): Promise<void> {
  try {
    const result = await runSeedWfyTenant();
    console.log(
      `[seed-wfy-tenant] ✓ done · tenantId=${result.tenantId} ` +
        `cities=${result.counts.cities} ` +
        `partnerSalons=${result.counts.partnerSalons} ` +
        `opportunities=${result.counts.opportunities} ` +
        `vacancies=${result.counts.vacancies} ` +
        `advantages=${result.counts.advantages}`,
    );
  } catch (err) {
    console.error('[seed-wfy-tenant] ❌', err);
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}

if (require.main === module) {
  void main();
}
