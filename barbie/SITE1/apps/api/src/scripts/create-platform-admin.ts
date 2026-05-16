/* eslint-disable no-console */
/**
 * Seed-скрипт: platform-admin + 10 тенантов из dashboard-2077.html PROJECTS.
 *
 * Создаёт:
 *   1. Platform-admin user (Александр К. — соответствует mock'у в боковой панели CRM)
 *      → platform_admins row с role='super-admin'
 *   2. Для каждого из 10 тенантов (Pentagon / Dacha / Barbie / Nebesa / Imperium /
 *      Etalon / Vanilia / Podium / Roxy / Soho):
 *        a. tenants row (slug, name, primaryDomain, status='active')
 *        b. tenant_design_tokens row (bg/heading/accent/body colors+fonts из PROJECTS,
 *           nav_template='top-classic')
 *        c. admin@<domain> user с дефолтным паролем
 *        d. tenant_users row с role='tenant-admin'
 *
 * Идемпотентность: каждое INSERT обёрнуто в check-then-insert по unique-ключу.
 * Повторный запуск НЕ создаёт дубликатов и НЕ ломается.
 *
 * Запуск:
 *   npm run seed:admin           # из корня SITE1
 *   npm run seed:admin --workspace=@barbie-site1/api
 */
import 'reflect-metadata';
import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import * as bcrypt from 'bcrypt';
import { and, eq } from 'drizzle-orm';

import {
  getDb,
  closeDb,
  tenants,
  tenantDesignTokens,
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

// Дефолтный пароль для первого tenant-admin каждого тенанта.
// Меняй на сильный или регенерируй на UI после первого логина.
const DEFAULT_TENANT_ADMIN_PASSWORD = 'TenantAdmin123!';

// 10 тенантов из dashboard-2077.html PROJECTS (PR-копия — единый источник истины
// при будущем refactor'е стоит вынести в data/seed-tenants.json и читать обоим).
interface ProjectSeed {
  id: string;
  domain: string;
  name: string;
  tagline: string;
  bg: string;
  headColor: string;
  headFont: string;
  accColor: string;
  accFont: string;
  bodyColor: string;
  bodyFont: string;
}

const PROJECTS: ProjectSeed[] = [
  { id: 'pentagon', domain: 'pentagon.ru', name: 'PENTAGON', tagline: 'Тактический эскорт · 24/7',
    bg: '#0A0A0C', headColor: '#FFFFFF', headFont: 'Montserrat Alternates',
    accColor: '#DC2626', accFont: 'Space Grotesk',
    bodyColor: '#9CA3AF', bodyFont: 'Space Grotesk' },
  { id: 'dacha', domain: 'dachaspa.ru', name: 'DACHA', tagline: 'Wellness retreat · Истра',
    bg: '#FAFAF7', headColor: '#3A3A3A', headFont: 'Cormorant Garamond',
    accColor: '#B8634D', accFont: 'Cormorant Garamond',
    bodyColor: '#5A5651', bodyFont: 'Inter' },
  { id: 'barbie', domain: 'barbiespa.ru', name: 'BARBIE SPA', tagline: 'Luxury feminine glamour',
    bg: '#FFB6D9', headColor: '#FF1493', headFont: 'Outfit',
    accColor: '#FFFFFF', accFont: 'Playfair Display',
    bodyColor: '#3A1F2C', bodyFont: 'Outfit' },
  { id: 'nebesa', domain: 'nebesaspa.com', name: 'NEBESA', tagline: 'Воздушный массаж · 25-й этаж',
    bg: '#F4F8FC', headColor: '#3A3A3A', headFont: 'Cormorant Garamond',
    accColor: '#7090B0', accFont: 'Cormorant Garamond',
    bodyColor: '#6A737D', bodyFont: 'Inter' },
  { id: 'imperium', domain: 'imperiumspa.ru', name: 'IMPERIUM', tagline: 'Private members club · MMXXVI',
    bg: '#0B0908', headColor: '#F0EBE0', headFont: 'Bodoni Moda',
    accColor: '#C9A961', accFont: 'Cormorant Garamond',
    bodyColor: '#9C9189', bodyFont: 'Inter' },
  { id: 'etalon', domain: 'etalonspa.ru', name: 'ETALON', tagline: 'Performance · Discretion · 24/7',
    bg: '#000000', headColor: '#FFFFFF', headFont: 'Bebas Neue',
    accColor: '#E11D2C', accFont: 'Space Mono',
    bodyColor: '#A8AAB0', bodyFont: 'Oswald' },
  { id: 'vanilia', domain: '5massage.ru', name: 'VANILIA', tagline: 'Тёплый дом для особенных вечеров',
    bg: '#FAF3E6', headColor: '#7A5B3A', headFont: 'Quicksand',
    accColor: '#C89B6B', accFont: 'Caveat',
    bodyColor: '#4A3826', bodyFont: 'Varela Round' },
  { id: 'podium', domain: 'eroticmassaj.ru', name: 'PODIUM', tagline: 'Театр желания · с 1999',
    bg: '#3D0F1A', headColor: '#F0E6D2', headFont: 'Playfair Display',
    accColor: '#D4A856', accFont: 'Cormorant Garamond',
    bodyColor: '#C9B89A', bodyFont: 'Cormorant Garamond' },
  { id: 'roxy', domain: 'roxy-spa.ru', name: 'ROXY', tagline: 'Cyberpunk nights · 2077',
    bg: '#0A0F2C', headColor: '#22D3EE', headFont: 'Orbitron',
    accColor: '#EC4899', accFont: 'Orbitron',
    bodyColor: '#A5B4C9', bodyFont: 'Exo 2' },
  { id: 'soho', domain: 'soho-spa.com', name: 'SOHO', tagline: 'Артистический бутик-лофт',
    bg: '#2A2724', headColor: '#EFE9DF', headFont: 'Inter',
    accColor: '#B26A3F', accFont: 'Cormorant Garamond',
    bodyColor: '#A8A29D', bodyFont: 'Inter' },
];

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

async function getOrCreateTenant(
  db: ReturnType<typeof getDb>,
  p: ProjectSeed,
  contactEmail: string,
): Promise<{ id: string; created: boolean }> {
  const [existing] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, p.id))
    .limit(1);
  if (existing) return { id: existing.id, created: false };

  const [created] = await db
    .insert(tenants)
    .values({
      slug: p.id,
      name: p.name,
      status: 'active',
      primaryDomain: p.domain,
      contactEmail,
    })
    .returning({ id: tenants.id });
  return { id: created.id, created: true };
}

async function ensureDesignTokens(
  db: ReturnType<typeof getDb>,
  tenantId: string,
  p: ProjectSeed,
): Promise<{ created: boolean }> {
  const [existing] = await db
    .select({ tenantId: tenantDesignTokens.tenantId })
    .from(tenantDesignTokens)
    .where(eq(tenantDesignTokens.tenantId, tenantId))
    .limit(1);
  if (existing) return { created: false };

  await db.insert(tenantDesignTokens).values({
    tenantId,
    bg: p.bg,
    headColor: p.headColor,
    headFont: p.headFont,
    accColor: p.accColor,
    accFont: p.accFont,
    bodyColor: p.bodyColor,
    bodyFont: p.bodyFont,
    navTemplate: 'top-classic',
  });
  return { created: true };
}

async function ensureTenantAdminLink(
  db: ReturnType<typeof getDb>,
  tenantId: string,
  userId: string,
): Promise<{ created: boolean }> {
  const [existing] = await db
    .select({ id: tenantUsers.id })
    .from(tenantUsers)
    .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)))
    .limit(1);
  if (existing) return { created: false };

  await db.insert(tenantUsers).values({
    tenantId,
    userId,
    role: 'tenant-admin',
    status: 'active',
  });
  return { created: true };
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error('[seed] DATABASE_URL is not set — скопируй .env.example в .env');
    process.exit(1);
  }

  const db = getDb();

  console.log('━'.repeat(72));
  console.log(' NAS · Network Administration System — seed:admin');
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

  // 2. 10 тенантов
  console.log('\n[2/2] Tenants from dashboard PROJECTS (×10)');
  console.log('  ' + 'slug'.padEnd(12) + 'domain'.padEnd(20) + 'tenant'.padEnd(12) + 'tokens'.padEnd(12) + 'admin-link');

  for (const p of PROJECTS) {
    const adminEmail = `admin@${p.domain}`;
    const t = await getOrCreateTenant(db, p, adminEmail);
    const tok = await ensureDesignTokens(db, t.id, p);
    const tenantAdmin = await getOrCreateUser(db, {
      email: adminEmail,
      password: DEFAULT_TENANT_ADMIN_PASSWORD,
      name: `Админ ${p.name}`,
    });
    const link = await ensureTenantAdminLink(db, t.id, tenantAdmin.id);

    console.log(
      '  ' +
        p.id.padEnd(12) +
        p.domain.padEnd(20) +
        (t.created ? '✓ created' : '· exists').padEnd(12) +
        (tok.created ? '✓ created' : '· exists').padEnd(12) +
        (link.created ? `✓ ${adminEmail}` : `· ${adminEmail}`),
    );
  }

  console.log('\n' + '━'.repeat(72));
  console.log(' Seed complete.');
  console.log(`   Platform-admin: ${PLATFORM_ADMIN.email} / ${PLATFORM_ADMIN.password}`);
  console.log(`   Tenant-admins:  admin@<domain> / ${DEFAULT_TENANT_ADMIN_PASSWORD}`);
  console.log(' Логин (tenant-scope):');
  console.log('   curl -X POST http://localhost:3010/v1/auth/login \\');
  console.log('     -H "X-Tenant-Slug: pentagon" -H "Content-Type: application/json" \\');
  console.log(`     -d '{"email":"admin@pentagon.ru","password":"${DEFAULT_TENANT_ADMIN_PASSWORD}"}'`);
  console.log(' Логин (platform-scope, без tenant header):');
  console.log('   curl -X POST http://localhost:3010/v1/auth/login \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log(`     -d '{"email":"${PLATFORM_ADMIN.email}","password":"${PLATFORM_ADMIN.password}"}'`);
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
