/* eslint-disable no-console */
/**
 * Seed-скрипт: platform-admin + 10 тенантов из data/tenants-real-content.json.
 *
 * Создаёт:
 *   1. Platform-admin user (Александр К.) → platform_admins.
 *   2. Для каждого из 10 тенантов:
 *        a. tenants row — slug = domain без .ru/.com, primaryDomain = домен.
 *           settings.landingContent — полный rich-контент (programs/rooms/staff/etc.).
 *        b. tenant_design_tokens row — цвета/шрифты из JSON.
 *        c. admin@<domain> user с дефолтным паролем.
 *        d. tenant_users row с role='tenant-admin'.
 *
 * Идемпотентность:
 *   - Tenant lookup сначала по primaryDomain (стабильный), потом по slug.
 *   - Если slug в DB устаревший (старая seed-итерация), обновим до нового.
 *   - design tokens, settings.landingContent, admin link — upsert.
 *
 * Запуск:
 *   npm run seed:admin             # из корня SITE1
 *   npm run seed:admin --workspace=@barbie-site1/api
 */
import 'reflect-metadata';
import { config as loadDotenv } from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as bcrypt from 'bcrypt';
import { and, eq, sql } from 'drizzle-orm';

import {
  getDb,
  closeDb,
  tenants,
  tenantDesignTokens,
  tenantMenuItems,
  tenantUsers,
  users,
  platformAdmins,
} from '@barbie-site1/db';

// ── загрузить корневой .env SITE1 ────────────────────────────────────────────
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

// ── константы ────────────────────────────────────────────────────────────────
const BCRYPT_ROUNDS = 12;

const PLATFORM_ADMIN = {
  email: (process.env.PLATFORM_ADMIN_EMAIL ?? 'admin@barbie-site1.local').toLowerCase(),
  password: process.env.PLATFORM_ADMIN_PASSWORD ?? 'Admin123!ChangeMe',
  name: 'Александр К.',
};

const DEFAULT_TENANT_ADMIN_PASSWORD = 'TenantAdmin123!';

// ── load tenants-real-content.json (single source of truth) ──────────────────
interface ContentTenant {
  domain: string;
  brand: string;
  tagline: string;
  positioning: string;
  address: { city: string | null; street: string | null; metro: string | null };
  phones: string[];
  workingHours: string | null;
  programs: { name: string; duration: string | null; price: string | null; description: string }[];
  rooms: { name: string; description: string }[];
  staff: { name: string; tag: string; age: number | null }[];
  designTokens: {
    bg: string;
    headColor: string;
    headFont: string;
    accColor: string;
    accFont: string;
    bodyColor: string;
    bodyFont: string;
  };
  navigation: string[];
  social: { telegram: string | null; instagram: string | null; whatsapp: string | null };
  aesthetic: string;
}

function loadContent(): ContentTenant[] {
  // SITE1/data/tenants-real-content.json — два уровня вверх от apps/api/dist при build,
  // и четыре уровня от ts-node src/scripts. Ищем по подъёму.
  for (let depth = 0; depth < 8; depth++) {
    const base = depth === 0 ? process.cwd() : resolve(process.cwd(), ...Array(depth).fill('..'));
    const p = resolve(base, 'data', 'tenants-real-content.json');
    if (existsSync(p)) {
      const raw = JSON.parse(readFileSync(p, 'utf8')) as { tenants: ContentTenant[] };
      return raw.tenants;
    }
  }
  throw new Error('tenants-real-content.json not found above process.cwd()');
}

function domainToSlug(domain: string): string {
  return domain.replace(/\.(ru|com)$/, '');
}

// ── helpers ──────────────────────────────────────────────────────────────────
async function getOrCreateUser(
  db: ReturnType<typeof getDb>,
  args: { email: string; password: string; name: string },
): Promise<{ id: string; created: boolean }> {
  const email = args.email.toLowerCase().trim();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { id: existing.id, created: false };

  const hash = await bcrypt.hash(args.password, BCRYPT_ROUNDS);
  const [created] = await db
    .insert(users)
    .values({ email, passwordHash: hash, name: args.name, status: 'active' })
    .returning({ id: users.id });
  return { id: created.id, created: true };
}

async function ensurePlatformAdmin(
  db: ReturnType<typeof getDb>,
  userId: string,
): Promise<{ created: boolean }> {
  const [existing] = await db
    .select({ id: platformAdmins.id })
    .from(platformAdmins)
    .where(eq(platformAdmins.userId, userId))
    .limit(1);
  if (existing) return { created: false };

  await db.insert(platformAdmins).values({ userId, role: 'platform-admin' });
  return { created: true };
}

interface SeedResult {
  tenantId: string;
  action: 'created' | 'updated' | 'unchanged';
}

async function seedTenant(
  db: ReturnType<typeof getDb>,
  c: ContentTenant,
  contactEmail: string,
): Promise<SeedResult> {
  const slug = domainToSlug(c.domain);
  const landingContent = {
    brand: c.brand,
    tagline: c.tagline,
    positioning: c.positioning,
    aesthetic: c.aesthetic,
    address: c.address,
    phones: c.phones,
    workingHours: c.workingHours,
    programs: c.programs,
    rooms: c.rooms,
    staff: c.staff,
    navigation: c.navigation,
    social: c.social,
  };

  // 1. Resolve existing tenant: try primaryDomain first (stable), then legacy slug.
  let existingId: string | null = null;
  const [byDomain] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.primaryDomain, c.domain))
    .limit(1);
  if (byDomain) existingId = byDomain.id;

  if (!existingId) {
    // Possibly seeded with old slug (e.g., 'dacha' instead of 'dachaspa')
    const [bySlug] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);
    if (bySlug) existingId = bySlug.id;
  }

  if (existingId) {
    // Update slug, name, primaryDomain, contactEmail, settings.landingContent.
    await db
      .update(tenants)
      .set({
        slug,
        name: c.brand,
        primaryDomain: c.domain,
        contactEmail,
        status: 'active',
        // jsonb merge: keep existing TenantSettings keys (features/bookingPolicy/etc.),
        // override landingContent. Use sql() raw for the merge.
        settings: sql`COALESCE(${tenants.settings}, '{}'::jsonb) || ${JSON.stringify({ landingContent })}::jsonb`,
        updatedAt: sql`now()`,
      })
      .where(eq(tenants.id, existingId));
    return { tenantId: existingId, action: 'updated' };
  }

  const [created] = await db
    .insert(tenants)
    .values({
      slug,
      name: c.brand,
      status: 'active',
      primaryDomain: c.domain,
      contactEmail,
      settings: { landingContent } as never,
    })
    .returning({ id: tenants.id });
  return { tenantId: created.id, action: 'created' };
}

async function upsertDesignTokens(
  db: ReturnType<typeof getDb>,
  tenantId: string,
  c: ContentTenant,
): Promise<'created' | 'updated'> {
  const values = {
    tenantId,
    bg: c.designTokens.bg,
    headColor: c.designTokens.headColor,
    headFont: c.designTokens.headFont,
    accColor: c.designTokens.accColor,
    accFont: c.designTokens.accFont,
    bodyColor: c.designTokens.bodyColor,
    bodyFont: c.designTokens.bodyFont,
    navTemplate: 'top-classic' as const,
  };
  const [existing] = await db
    .select({ tenantId: tenantDesignTokens.tenantId })
    .from(tenantDesignTokens)
    .where(eq(tenantDesignTokens.tenantId, tenantId))
    .limit(1);

  if (existing) {
    await db.update(tenantDesignTokens).set(values).where(eq(tenantDesignTokens.tenantId, tenantId));
    return 'updated';
  }
  await db.insert(tenantDesignTokens).values(values);
  return 'created';
}

async function seedMenuItemsIfEmpty(
  db: ReturnType<typeof getDb>,
  tenantId: string,
  slug: string,
  navigation: string[],
): Promise<{ created: number; skipped: boolean }> {
  const existing = await db
    .select({ id: tenantMenuItems.id })
    .from(tenantMenuItems)
    .where(eq(tenantMenuItems.tenantId, tenantId))
    .limit(1);

  if (existing.length > 0) {
    return { created: 0, skipped: true };
  }

  if (navigation.length === 0) return { created: 0, skipped: false };

  // href must start with "/" or "http(s)://" per tenant_menu_items_href_check.
  // Use slug-prefixed path + anchor so links work from any page.
  await db.insert(tenantMenuItems).values(
    navigation.map((label, i) => ({
      tenantId,
      parentId: null,
      label,
      href: `/${slug}#section-${i}`,
      sortOrder: i,
      locale: 'ru',
      status: 'active' as const,
      payload: {} as Record<string, never>,
    })),
  );
  return { created: navigation.length, skipped: false };
}

async function ensureTenantAdminLink(
  db: ReturnType<typeof getDb>,
  tenantId: string,
  userId: string,
): Promise<'created' | 'exists'> {
  const [existing] = await db
    .select({ id: tenantUsers.id })
    .from(tenantUsers)
    .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)))
    .limit(1);
  if (existing) return 'exists';
  await db.insert(tenantUsers).values({
    tenantId,
    userId,
    role: 'tenant-admin',
    status: 'active',
  });
  return 'created';
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error('[seed] DATABASE_URL is not set — скопируй .env.example в .env');
    process.exit(1);
  }

  const content = loadContent();
  const db = getDb();

  console.log('━'.repeat(72));
  console.log(' NAS · Network Administration System — seed:admin');
  console.log(`   Source: data/tenants-real-content.json (${content.length} tenants)`);
  console.log('━'.repeat(72));

  // 1. Platform-admin
  console.log('\n[1/2] Platform-admin user');
  const adminUser = await getOrCreateUser(db, PLATFORM_ADMIN);
  const platformLink = await ensurePlatformAdmin(db, adminUser.id);
  console.log(`  user:           ${adminUser.created ? '✓ created' : '· already exists'}  ${PLATFORM_ADMIN.email}`);
  console.log(`  platform_admin: ${platformLink.created ? '✓ created' : '· already exists'}  role=super-admin`);
  if (adminUser.created) {
    console.log(`  password:       ${PLATFORM_ADMIN.password}`);
    console.log('  ↑ запиши этот пароль или сразу смени через UI/API');
  }

  // 2. Tenants
  console.log('\n[2/2] Tenants from tenants-real-content.json (×' + content.length + ')');
  console.log('  ' + 'slug'.padEnd(14) + 'domain'.padEnd(20) + 'tenant'.padEnd(12) + 'tokens'.padEnd(12) + 'menu'.padEnd(12) + 'admin-link');

  for (const c of content) {
    const slug = domainToSlug(c.domain);
    const adminEmail = `admin@${c.domain}`;
    const t = await seedTenant(db, c, adminEmail);
    const tokAction = await upsertDesignTokens(db, t.tenantId, c);
    const menu = await seedMenuItemsIfEmpty(db, t.tenantId, slug, c.navigation);
    const tenantAdmin = await getOrCreateUser(db, {
      email: adminEmail,
      password: DEFAULT_TENANT_ADMIN_PASSWORD,
      name: `Админ ${c.brand}`,
    });
    const linkAction = await ensureTenantAdminLink(db, t.tenantId, tenantAdmin.id);

    const menuLabel = menu.skipped
      ? '· kept'
      : menu.created > 0
        ? `✓ ${menu.created} items`
        : '· empty';

    console.log(
      '  ' +
        slug.padEnd(14) +
        c.domain.padEnd(20) +
        ({ created: '✓ created', updated: '↑ updated', unchanged: '· unchanged' }[t.action]).padEnd(12) +
        (tokAction === 'created' ? '✓ created' : '↑ updated').padEnd(12) +
        menuLabel.padEnd(12) +
        (linkAction === 'created' ? `✓ ${adminEmail}` : `· ${adminEmail}`),
    );
  }

  console.log('\n' + '━'.repeat(72));
  console.log(' Seed complete.');
  console.log(`   Platform-admin: ${PLATFORM_ADMIN.email} / ${PLATFORM_ADMIN.password}`);
  console.log(`   Tenant-admins:  admin@<domain> / ${DEFAULT_TENANT_ADMIN_PASSWORD}`);
  console.log(' Public landing endpoint:');
  console.log('   curl http://localhost:3010/v1/public/tenants/by-slug/pentagon');
  console.log(' Login (tenant-scope):');
  console.log('   curl -X POST http://localhost:3010/v1/auth/login \\');
  console.log('     -H "X-Tenant-Slug: pentagon" -H "Content-Type: application/json" \\');
  console.log(`     -d '{"email":"admin@pentagon.ru","password":"${DEFAULT_TENANT_ADMIN_PASSWORD}"}'`);
  console.log('━'.repeat(72));
}

main()
  .catch((err) => {
    console.error('[seed] FAILED:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
