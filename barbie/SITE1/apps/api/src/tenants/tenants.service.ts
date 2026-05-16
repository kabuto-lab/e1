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
import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

import type { Database } from '@barbie-site1/db';
import { tenants, tenantDesignTokens, tenantUsers, users } from '@barbie-site1/db';

import { DRIZZLE } from '../database/database.module';
import type { CreateTenantDto } from './dto/create-tenant.dto';
import type { UpdateTenantDto } from './dto/update-tenant.dto';
import type { ListTenantsQueryDto } from './dto/list-tenants-query.dto';
import type {
  TenantResponseDto,
  TenantWithAdminDto,
  ListTenantsResponseDto,
} from './dto/tenant-response.dto';

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

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

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
      const [tenant] = await tx
        .insert(tenants)
        .values({
          slug: dto.slug,
          name: dto.name,
          status: 'active',
          primaryDomain: dto.primaryDomain ?? null,
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
      const normalizedEmail = dto.adminEmail.trim().toLowerCase();
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
    const conditions = [];
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
