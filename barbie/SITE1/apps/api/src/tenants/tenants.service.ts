/**
 * TenantsService — platform-admin CRUD над `tenants`.
 *
 * createTenant() — атомарная транзакция:
 *   1. INSERT tenants
 *   2. INSERT tenant_design_tokens (default tokens)
 *   3. UPSERT users (по email) — re-use уже существующего user если такой есть
 *   4. INSERT tenant_users (role='tenant-admin')
 *   5. Возврат tenant + admin info
 *
 * Список зарезервированных slug'ов в RESERVED_SLUGS — нельзя создать tenant с этими.
 */
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

import type { Database } from '@barbie-site1/db';
import {
  tenants,
  tenantDesignTokens,
  tenantMenuItems,
  tenantUsers,
  users,
  wfyCityPages,
  wfyOpportunities,
  wfyAdvantages,
  wfyVacancies,
  partnerSalons,
  tenantTouchpoints,
  TOUCHPOINT_KEYS,
  type TouchpointKey,
  type WfyCityPage,
  type WfyOpportunity,
  type WfyAdvantage,
  type WfyVacancy,
  type PartnerSalon,
} from '@barbie-site1/db';

import { DRIZZLE } from '../database/database.module';
import { MediaService } from '../media/media.service';
import type { CreateTenantDto } from './dto/create-tenant.dto';
import type { UpdateTenantDto } from './dto/update-tenant.dto';
import type {
  UpdateDesignTokensDto,
  DesignTokensResponseDto,
} from './dto/update-design-tokens.dto';
import type {
  UpsertTouchpointDto,
  TouchpointResponseDto,
  TouchpointImageResultDto,
} from './dto/touchpoint.dto';
import type { ListTenantsQueryDto } from './dto/list-tenants-query.dto';
import type {
  TenantResponseDto,
  TenantWithAdminDto,
  ListTenantsResponseDto,
} from './dto/tenant-response.dto';
import type {
  PublicTenantResponseDto,
  TenantLandingContent,
} from './dto/public-tenant.dto';
import type {
  BootstrapTenantDto,
  BootstrapTenantResultDto,
} from './dto/bootstrap-tenant.dto';

const RESERVED_SLUGS = new Set([
  'www', 'api', 'admin', 'app', 'cdn', 'mail', 'crm', 'platform',
  'static', 'public', 'assets', 'images', 'media', 'cms',
  'auth', 'login', 'logout', 'register', 'help', 'support', 'docs',
  'status', 'health', 'metrics', 'system', 'root', 'localhost',
]);

const BCRYPT_ROUNDS = 12;

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly media: MediaService,
  ) {}

  /**
   * Bootstrap-create: создаёт тенант с уже заполненными design tokens + menu items.
   *
   * Транзакционная часть (всё-или-ничего):
   *   1. CHECK slug — reserved + collision (409 ConflictException)
   *   2. CHECK customDomain — collision (409)
   *   3. INSERT tenants (status='active', bootstrap_source_url, custom_domain)
   *   4. INSERT tenant_design_tokens (присланные tokens)
   *   5. INSERT tenant_menu_items batch (если есть)
   *
   * Post-tx (вне транзакции, чтобы S3-латенция не держала row-locks):
   *   - Если faviconUrl задан → media.fetchAndStoreUrl → UPDATE
   *     tenant_design_tokens.faviconKey. Ошибка скачивания НЕ откатывает тенанта
   *     (он уже создан) — пишем в результат `faviconError`, оператор увидит и
   *     может загрузить favicon вручную позже.
   *
   * Admin user НЕ создаётся — bootstrap делает только сайт-инфраструктуру.
   * Tenant-admin'а добавляет отдельный шаг wizard'а (POST /platform/tenants/:id/users
   * или классический POST /platform/tenants с adminEmail).
   */
  async bootstrap(dto: BootstrapTenantDto): Promise<BootstrapTenantResultDto> {
    if (RESERVED_SLUGS.has(dto.slug)) {
      throw new ConflictException({
        code: 'SLUG_RESERVED',
        message: `Slug '${dto.slug}' зарезервирован.`,
      });
    }

    // contactEmail у tenants NOT NULL — bootstrap не получает email, кладём
    // placeholder, который позже перепишет POST /platform/tenants/:id/users.
    const placeholderEmail = `bootstrap+${dto.slug}@nas.invalid`;

    const tenantRow = await this.db.transaction(async (tx) => {
      const [slugCollision] = await tx
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.slug, dto.slug))
        .limit(1);
      if (slugCollision) {
        throw new ConflictException({ code: 'SLUG_TAKEN', slug: dto.slug });
      }

      if (dto.customDomain) {
        const [domainCollision] = await tx
          .select({ id: tenants.id })
          .from(tenants)
          .where(eq(tenants.customDomain, dto.customDomain))
          .limit(1);
        if (domainCollision) {
          throw new ConflictException({
            code: 'CUSTOM_DOMAIN_TAKEN',
            customDomain: dto.customDomain,
          });
        }
      }

      const [tenant] = await tx
        .insert(tenants)
        .values({
          slug: dto.slug,
          name: dto.name,
          status: 'active',
          contactEmail: placeholderEmail,
          bootstrapSourceUrl: dto.sourceUrl,
          customDomain: dto.customDomain ?? null,
        })
        .returning();

      await tx.insert(tenantDesignTokens).values({
        tenantId: tenant.id,
        bg: dto.design.bg,
        headColor: dto.design.headColor,
        headFont: dto.design.headFont,
        accColor: dto.design.accColor,
        accFont: dto.design.accFont,
        bodyColor: dto.design.bodyColor,
        bodyFont: dto.design.bodyFont,
        navTemplate: 'top-classic',
      });

      if (dto.menuItems.length > 0) {
        await tx.insert(tenantMenuItems).values(
          dto.menuItems.map((mi) => ({
            tenantId: tenant.id,
            label: mi.label,
            href: mi.href,
            sortOrder: mi.sortOrder,
          })),
        );
      }

      this.logger.log(
        `Tenant bootstrapped: ${tenant.slug} (id=${tenant.id}) from ${dto.sourceUrl}, ` +
          `menu=${dto.menuItems.length} items, customDomain=${dto.customDomain ?? '-'}`,
      );

      return tenant;
    });

    let faviconKey: string | undefined;
    let faviconError: string | undefined;
    if (dto.faviconUrl) {
      try {
        const fetched = await this.media.fetchAndStoreUrl(
          dto.faviconUrl,
          tenantRow.id,
          'logo',
        );
        await this.db
          .update(tenantDesignTokens)
          .set({ faviconKey: fetched.key, updatedAt: sql`now()` })
          .where(eq(tenantDesignTokens.tenantId, tenantRow.id));
        faviconKey = fetched.key;
      } catch (err) {
        faviconError = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Favicon fetch failed for tenant=${tenantRow.id}, url=${dto.faviconUrl}: ${faviconError}`,
        );
      }
    }

    return {
      id: tenantRow.id,
      slug: tenantRow.slug,
      name: tenantRow.name,
      bootstrapSourceUrl: dto.sourceUrl,
      customDomain: tenantRow.customDomain ?? null,
      menuItemsCreated: dto.menuItems.length,
      faviconKey,
      faviconError,
      createdAt:
        tenantRow.createdAt instanceof Date
          ? tenantRow.createdAt.toISOString()
          : String(tenantRow.createdAt),
    };
  }

  async createTenant(dto: CreateTenantDto): Promise<TenantWithAdminDto> {
    if (RESERVED_SLUGS.has(dto.slug)) {
      throw new ConflictException({
        code: 'SLUG_RESERVED',
        message: `Slug '${dto.slug}' зарезервирован.`,
      });
    }

    const passwordHash = await bcrypt.hash(dto.adminPassword, BCRYPT_ROUNDS);

    return this.db.transaction(async (tx) => {
      // 1. INSERT tenants (slug + primaryDomain должны быть unique — БД отловит)
      const normalizedAdminEmail = dto.adminEmail.trim().toLowerCase();
      const [tenant] = await tx
        .insert(tenants)
        .values({
          slug: dto.slug,
          name: dto.name,
          status: 'active',
          primaryDomain: dto.primaryDomain ?? null,
          contactEmail: normalizedAdminEmail,
        })
        .returning();

      // 2. INSERT default design tokens
      await tx.insert(tenantDesignTokens).values({
        tenantId: tenant.id,
        // дефолты — заполняем минимумом, конкретный визуал тенант редактирует
        bg: '#FFFFFF',
        headColor: '#0A0A0B',
        headFont: 'Inter',
        accColor: '#D4AF37',
        accFont: 'Inter',
        bodyColor: '#2A2A2D',
        bodyFont: 'Inter',
        navTemplate: 'top-classic',
      });

      // 3. UPSERT user — если email уже есть в системе, переиспользуем (он может быть
      // tenant-admin'ом для нескольких тенантов).
      const normalizedEmail = normalizedAdminEmail;
      const [existing] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      let adminUserId: string;
      if (existing) {
        adminUserId = existing.id;
      } else {
        const [created] = await tx
          .insert(users)
          .values({
            email: normalizedEmail,
            passwordHash,
            name: dto.adminName ?? dto.adminEmail.split('@')[0],
            status: 'active',
          })
          .returning({ id: users.id });
        adminUserId = created.id;
      }

      // 4. INSERT tenant_users
      await tx.insert(tenantUsers).values({
        tenantId: tenant.id,
        userId: adminUserId,
        role: 'tenant-admin',
        status: 'active',
      });

      this.logger.log(`Tenant created: ${tenant.slug} (id=${tenant.id})`);

      return {
        ...this.toResponse(tenant),
        admin: { id: adminUserId, email: normalizedEmail },
      };
    });
  }

  async listTenants(query: ListTenantsQueryDto): Promise<ListTenantsResponseDto> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const conditions: SQL[] = [];
    if (query.status) conditions.push(eq(tenants.status, query.status));
    if (query.q) {
      const pattern = `%${query.q.trim()}%`;
      conditions.push(or(ilike(tenants.slug, pattern), ilike(tenants.name, pattern))!);
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(tenants)
        .where(where as any)
        .orderBy(desc(tenants.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ value: count() })
        .from(tenants)
        .where(where as any),
    ]);

    return {
      data: rows.map((r) => this.toResponse(r)),
      total: Number(totalRows[0]?.value ?? 0),
      limit,
      offset,
    };
  }

  async getTenant(id: string): Promise<TenantResponseDto> {
    const [row] = await this.db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    if (!row) {
      throw new NotFoundException({ code: 'TENANT_NOT_FOUND', id });
    }
    return this.toResponse(row);
  }

  async updateTenant(id: string, dto: UpdateTenantDto): Promise<TenantResponseDto> {
    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.primaryDomain !== undefined) patch.primaryDomain = dto.primaryDomain;

    if (Object.keys(patch).length === 0) {
      return this.getTenant(id);
    }
    patch.updatedAt = sql`now()`;

    const [row] = await this.db
      .update(tenants)
      .set(patch)
      .where(eq(tenants.id, id))
      .returning();

    if (!row) {
      throw new NotFoundException({ code: 'TENANT_NOT_FOUND', id });
    }
    return this.toResponse(row);
  }

  /** Soft archive: status='archived'. Не удаляем физически (нужно для аудита/восстановления). */
  async archiveTenant(id: string): Promise<TenantResponseDto> {
    return this.updateTenant(id, { status: 'archived' });
  }

  /**
   * Read design tokens by slug — для admin-UI редактора (/admin/projects).
   * Возвращает row из tenant_design_tokens с дефолтами от schema, если
   * почему-то не было INSERT'а (например legacy-тенант, созданный до того
   * как design_tokens прикручивались автоматически).
   */
  async getDesignTokensBySlug(slug: string): Promise<DesignTokensResponseDto> {
    const [row] = await this.db
      .select({
        tenantId: tenants.id,
        tokens: tenantDesignTokens,
      })
      .from(tenants)
      .leftJoin(tenantDesignTokens, eq(tenantDesignTokens.tenantId, tenants.id))
      .where(eq(tenants.slug, slug))
      .limit(1);

    if (!row) {
      throw new NotFoundException({ code: 'TENANT_NOT_FOUND', slug });
    }

    const t = row.tokens;
    return {
      tenantId: row.tenantId,
      bg: t?.bg ?? '#FFFFFF',
      headColor: t?.headColor ?? '#0A0A0A',
      headFont: t?.headFont ?? 'Unbounded',
      accColor: t?.accColor ?? '#D4AF37',
      accFont: t?.accFont ?? 'Unbounded',
      bodyColor: t?.bodyColor ?? '#1A1A1A',
      bodyFont: t?.bodyFont ?? 'Inter',
      logoKey: t?.logoKey ?? null,
      logoAlt: t?.logoAlt ?? null,
      faviconKey: t?.faviconKey ?? null,
      navTemplate: t?.navTemplate ?? 'top-classic',
      updatedAt: (t?.updatedAt ?? new Date()).toISOString(),
    };
  }

  /**
   * Partial update tenant_design_tokens by slug. Только присланные поля.
   * Если в tenant_design_tokens нет row'а (легаси) — делаем INSERT с defaults
   * + patch'ем поверх.
   */
  async updateDesignTokensBySlug(
    slug: string,
    dto: UpdateDesignTokensDto,
  ): Promise<DesignTokensResponseDto> {
    const [tenantRow] = await this.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);

    if (!tenantRow) {
      throw new NotFoundException({ code: 'TENANT_NOT_FOUND', slug });
    }
    const tenantId = tenantRow.id;

    const patch: Record<string, unknown> = {};
    if (dto.bg !== undefined) patch.bg = dto.bg;
    if (dto.headColor !== undefined) patch.headColor = dto.headColor;
    if (dto.headFont !== undefined) patch.headFont = dto.headFont;
    if (dto.accColor !== undefined) patch.accColor = dto.accColor;
    if (dto.accFont !== undefined) patch.accFont = dto.accFont;
    if (dto.bodyColor !== undefined) patch.bodyColor = dto.bodyColor;
    if (dto.bodyFont !== undefined) patch.bodyFont = dto.bodyFont;
    if (dto.logoKey !== undefined) patch.logoKey = dto.logoKey;
    if (dto.logoAlt !== undefined) patch.logoAlt = dto.logoAlt;
    if (dto.faviconKey !== undefined) patch.faviconKey = dto.faviconKey;
    if (dto.navTemplate !== undefined) patch.navTemplate = dto.navTemplate;

    if (Object.keys(patch).length === 0) {
      return this.getDesignTokensBySlug(slug);
    }
    patch.updatedAt = sql`now()`;

    // INSERT-or-UPDATE: используем ON CONFLICT (tenantId PRIMARY KEY).
    // Если row'а нет — вставим с defaults (через onConflictDoUpdate); если
    // есть — patch'нем.
    await this.db
      .insert(tenantDesignTokens)
      .values({ tenantId, ...patch })
      .onConflictDoUpdate({ target: tenantDesignTokens.tenantId, set: patch });

    return this.getDesignTokensBySlug(slug);
  }

  // ─── Touchpoints (точки касания) ────────────────────────────────────────────
  // Слаговый адрес, как у design-tokens — дека /admin/projects работает со slug'ами.

  private async tenantIdBySlug(slug: string): Promise<string> {
    const [row] = await this.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);
    if (!row) throw new NotFoundException({ code: 'TENANT_NOT_FOUND', slug });
    return row.id;
  }

  private assertTouchpointKey(key: string): TouchpointKey {
    if (!(TOUCHPOINT_KEYS as readonly string[]).includes(key)) {
      throw new BadRequestException({
        code: 'INVALID_TOUCHPOINT_KEY',
        key,
        allowed: TOUCHPOINT_KEYS,
      });
    }
    return key as TouchpointKey;
  }

  private touchpointResponse(
    key: TouchpointKey,
    row: typeof tenantTouchpoints.$inferSelect | null,
  ): TouchpointResponseDto {
    return {
      key,
      enabled: row?.enabled ?? false,
      label: row?.label ?? '',
      value: row?.value ?? '',
      imageKey: row?.imageKey ?? null,
      imageUrl: row?.imageKey ? this.media.publicUrlForKey(row.imageKey) : null,
      color: row?.color ?? null,
    };
  }

  /** Все 7 точек тенанта (с дефолтами для незаданных) — для admin-редактора деки. */
  async getTouchpointsBySlug(slug: string): Promise<TouchpointResponseDto[]> {
    const tenantId = await this.tenantIdBySlug(slug);
    const rows = await this.db
      .select()
      .from(tenantTouchpoints)
      .where(eq(tenantTouchpoints.tenantId, tenantId));
    const byKey = new Map(rows.map((r) => [r.key, r]));
    return TOUCHPOINT_KEYS.map((k) => this.touchpointResponse(k, byKey.get(k) ?? null));
  }

  /** Upsert одной точки по slug+key. Точечный patch (ON CONFLICT tenant_id,key). */
  async upsertTouchpointBySlug(
    slug: string,
    key: string,
    dto: UpsertTouchpointDto,
  ): Promise<TouchpointResponseDto> {
    const tenantId = await this.tenantIdBySlug(slug);
    const k = this.assertTouchpointKey(key);

    const patch: Record<string, unknown> = {};
    if (dto.enabled !== undefined) patch.enabled = dto.enabled;
    if (dto.label !== undefined) patch.label = dto.label;
    if (dto.value !== undefined) patch.value = dto.value;
    if (dto.imageKey !== undefined) patch.imageKey = dto.imageKey; // null очищает
    if (dto.color !== undefined) patch.color = dto.color;
    patch.updatedAt = sql`now()`;

    await this.db
      .insert(tenantTouchpoints)
      .values({ tenantId, key: k, ...patch })
      .onConflictDoUpdate({
        target: [tenantTouchpoints.tenantId, tenantTouchpoints.key],
        set: patch,
      });

    const [row] = await this.db
      .select()
      .from(tenantTouchpoints)
      .where(and(eq(tenantTouchpoints.tenantId, tenantId), eq(tenantTouchpoints.key, k)))
      .limit(1);
    return this.touchpointResponse(k, row ?? null);
  }

  /** Загрузка картинки точки касания в MinIO (platform-scoped) + проставление image_key. */
  async uploadTouchpointImageBySlug(
    slug: string,
    key: string,
    file: Express.Multer.File,
  ): Promise<TouchpointImageResultDto> {
    const tenantId = await this.tenantIdBySlug(slug);
    const k = this.assertTouchpointKey(key);
    const uploaded = await this.media.uploadForTenant(file, tenantId, 'tenant');

    await this.db
      .insert(tenantTouchpoints)
      .values({ tenantId, key: k, imageKey: uploaded.key })
      .onConflictDoUpdate({
        target: [tenantTouchpoints.tenantId, tenantTouchpoints.key],
        set: { imageKey: uploaded.key, updatedAt: sql`now()` },
      });

    return { key: k, imageKey: uploaded.key, imageUrl: uploaded.url };
  }

  /** Public: только enabled-точки активного тенанта — для рендера публичного сайта. */
  async getPublicTouchpointsBySlug(slug: string): Promise<TouchpointResponseDto[]> {
    const [t] = await this.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(and(eq(tenants.slug, slug), eq(tenants.status, 'active')))
      .limit(1);
    if (!t) throw new NotFoundException({ code: 'TENANT_NOT_FOUND', slug });

    const rows = await this.db
      .select()
      .from(tenantTouchpoints)
      .where(and(eq(tenantTouchpoints.tenantId, t.id), eq(tenantTouchpoints.enabled, true)));
    return rows.map((r) => this.touchpointResponse(r.key as TouchpointKey, r));
  }

  /**
   * Public read: tenant landing data by slug. No auth.
   * Joins tenants + tenant_design_tokens; landing content из tenants.settings.landingContent.
   * Возвращает только активных тенантов (status='active') — suspended/archived → 404.
   */
  async getPublicTenantBySlug(slug: string): Promise<PublicTenantResponseDto> {
    const [row] = await this.db
      .select({
        tenant: tenants,
        tokens: tenantDesignTokens,
      })
      .from(tenants)
      .leftJoin(tenantDesignTokens, eq(tenantDesignTokens.tenantId, tenants.id))
      .where(and(eq(tenants.slug, slug), eq(tenants.status, 'active')))
      .limit(1);

    if (!row) {
      throw new NotFoundException({ code: 'TENANT_NOT_FOUND', slug });
    }

    const settings = (row.tenant.settings ?? {}) as { landingContent?: TenantLandingContent };
    const lc = settings.landingContent ?? {};
    const tokens = row.tokens;

    return {
      id: row.tenant.id,
      slug: row.tenant.slug,
      name: row.tenant.name,
      siteType: row.tenant.siteType,
      brand: lc.brand ?? row.tenant.name,
      primaryDomain: row.tenant.primaryDomain,
      domain: row.tenant.primaryDomain ?? row.tenant.slug,
      tagline: lc.tagline ?? '',
      positioning: lc.positioning ?? '',
      aesthetic: lc.aesthetic ?? 'default',
      address: {
        city: lc.address?.city ?? null,
        street: lc.address?.street ?? null,
        metro: lc.address?.metro ?? null,
      },
      phones: lc.phones ?? [],
      workingHours: lc.workingHours ?? null,
      programs: lc.programs ?? [],
      rooms: lc.rooms ?? [],
      staff: lc.staff ?? [],
      navigation: lc.navigation ?? [],
      social: {
        telegram: lc.social?.telegram ?? null,
        instagram: lc.social?.instagram ?? null,
        whatsapp: lc.social?.whatsapp ?? null,
      },
      designTokens: tokens
        ? {
            bg: tokens.bg,
            headColor: tokens.headColor,
            headFont: tokens.headFont,
            accColor: tokens.accColor,
            accFont: tokens.accFont,
            bodyColor: tokens.bodyColor,
            bodyFont: tokens.bodyFont,
            navTemplate: tokens.navTemplate,
          }
        : {
            bg: '#FFFFFF',
            headColor: '#0A0A0A',
            headFont: 'Inter',
            accColor: '#D4AF37',
            accFont: 'Inter',
            bodyColor: '#1A1A1A',
            bodyFont: 'Inter',
            navTemplate: 'top-classic',
          },
    };
  }

  /**
   * Public read: бандл всех данных work-for-you-style тенанта для рендера
   * (tenants)/{slug}/* публичных страниц. Возвращает:
   *  - tenant (id + slug + name + primary_domain + site_type)
   *  - cities ordered by ord (only status='published')
   *  - opportunities ordered by ord
   *  - advantages ordered by ord
   *  - partnerSalons ordered by ord
   *  - vacancies ordered by ord
   * 404 если тенант не существует / не active / site_type не wfy-city-dir.
   */
  async getWfyBundle(slug: string): Promise<{
    tenant: { id: string; slug: string; name: string; primaryDomain: string | null; siteType: string };
    cities: WfyCityPage[];
    opportunities: WfyOpportunity[];
    advantages: WfyAdvantage[];
    partnerSalons: PartnerSalon[];
    vacancies: WfyVacancy[];
  }> {
    const [tenantRow] = await this.db
      .select()
      .from(tenants)
      .where(and(eq(tenants.slug, slug), eq(tenants.status, 'active')))
      .limit(1);

    if (!tenantRow) {
      throw new NotFoundException({ code: 'TENANT_NOT_FOUND', slug });
    }
    if (tenantRow.siteType !== 'wfy-city-dir') {
      throw new NotFoundException({
        code: 'TENANT_WRONG_TYPE',
        slug,
        expected: 'wfy-city-dir',
        actual: tenantRow.siteType,
      });
    }

    const tenantId = tenantRow.id;

    const [cities, opportunities, advantages, partnerSalonRows, vacancies] = await Promise.all([
      this.db.select().from(wfyCityPages)
        .where(and(eq(wfyCityPages.tenantId, tenantId), eq(wfyCityPages.status, 'published')))
        .orderBy(asc(wfyCityPages.ord)),
      this.db.select().from(wfyOpportunities)
        .where(eq(wfyOpportunities.tenantId, tenantId))
        .orderBy(asc(wfyOpportunities.ord)),
      this.db.select().from(wfyAdvantages)
        .where(eq(wfyAdvantages.tenantId, tenantId))
        .orderBy(asc(wfyAdvantages.ord)),
      this.db.select().from(partnerSalons)
        .where(eq(partnerSalons.tenantId, tenantId))
        .orderBy(asc(partnerSalons.ord)),
      this.db.select().from(wfyVacancies)
        .where(eq(wfyVacancies.tenantId, tenantId))
        .orderBy(asc(wfyVacancies.ord)),
    ]);

    return {
      tenant: {
        id: tenantRow.id,
        slug: tenantRow.slug,
        name: tenantRow.name,
        primaryDomain: tenantRow.primaryDomain,
        siteType: tenantRow.siteType,
      },
      cities,
      opportunities,
      advantages,
      partnerSalons: partnerSalonRows,
      vacancies,
    };
  }

  private toResponse(row: typeof tenants.$inferSelect): TenantResponseDto {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      status: row.status as TenantResponseDto['status'],
      primaryDomain: row.primaryDomain,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    };
  }
}
