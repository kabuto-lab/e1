/**
 * AuthService — login flow.
 *
 *   1. POST /v1/auth/login { email, password }
 *   2. Найти user по email
 *   3. bcrypt.compare(password, password_hash) → 401 если не совпало
 *   4. Если TenantContext есть (subdomain или X-Tenant-Slug):
 *       - найти tenant_users(user_id, tenant_id) → роль/salonId
 *       - подписать JWT kind='tenant'
 *      Иначе:
 *       - найти platform_admins(user_id) → роль
 *       - подписать JWT kind='platform'
 *      Если ни там ни там — 403 (user exists, но не привязан ни к платформе, ни к этому тенанту)
 *
 * Refresh token TODO Stage 7b — отдельный endpoint /auth/refresh.
 */
import { Inject, Injectable, Logger, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { and, eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

import type { Database } from '@barbie-site1/db';
import { users, platformAdmins, tenantUsers } from '@barbie-site1/db';

import { DRIZZLE } from '../database/database.module';
import { TenantContextService } from '../tenant-context/tenant-context.service';
import type { JwtPayload } from './types/jwt-payload';
import type { LoginResponseDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessTtlSec: number;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly tenantCtx: TenantContextService,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {
    // парсим '15m' → 900 для отдачи в LoginResponseDto.expiresIn
    const ttlRaw = config.get<string>('jwt.expiresIn') ?? '15m';
    this.accessTtlSec = AuthService.parseDurationSec(ttlRaw);
  }

  async login(email: string, password: string): Promise<LoginResponseDto> {
    const normalized = email.trim().toLowerCase();

    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        status: users.status,
      })
      .from(users)
      .where(eq(users.email, normalized))
      .limit(1);

    if (!user || !user.passwordHash) {
      // Не раскрываем 'user not found' vs 'wrong password' — оба 401
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS' });
    }

    if (user.status && user.status !== 'active') {
      throw new ForbiddenException({ code: 'USER_NOT_ACTIVE', status: user.status });
    }

    const tenantContext = this.tenantCtx.getContext();

    let payload: JwtPayload;
    if (tenantContext) {
      // Tenant scope: ищем tenant_users
      const [link] = await this.db
        .select({
          role: tenantUsers.role,
          salonId: tenantUsers.salonId,
          status: tenantUsers.status,
        })
        .from(tenantUsers)
        .where(
          and(eq(tenantUsers.tenantId, tenantContext.tenantId), eq(tenantUsers.userId, user.id)),
        )
        .limit(1);

      if (!link) {
        throw new ForbiddenException({
          code: 'NOT_TENANT_MEMBER',
          message: `User не привязан к тенанту '${tenantContext.tenantSlug}'.`,
        });
      }
      if (link.status && link.status !== 'active') {
        throw new ForbiddenException({ code: 'TENANT_USER_INACTIVE', status: link.status });
      }

      payload = {
        sub: user.id,
        email: user.email,
        kind: 'tenant',
        tenantId: tenantContext.tenantId,
        salonId: link.salonId ?? undefined,
        role: link.role,
      };
    } else {
      // Platform scope: ищем platform_admins
      const [pa] = await this.db
        .select({ role: platformAdmins.role })
        .from(platformAdmins)
        .where(eq(platformAdmins.userId, user.id))
        .limit(1);

      if (!pa) {
        throw new ForbiddenException({
          code: 'NOT_PLATFORM_ADMIN',
          message: 'Login без tenant scope доступен только platform-админам.',
        });
      }

      payload = {
        sub: user.id,
        email: user.email,
        kind: 'platform',
        role: pa.role,
      };
    }

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('jwt.secret'),
      expiresIn: (this.config.get<string>('jwt.expiresIn') ?? '15m') as any,
    });
    const refreshToken = await this.jwt.signAsync(
      { sub: payload.sub, kind: payload.kind, type: 'refresh' },
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: (this.config.get<string>('jwt.refreshExpiresIn') ?? '30d') as any,
      },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTtlSec,
      kind: payload.kind,
      role: payload.role,
      email: payload.email,
    };
  }

  /** '15m' → 900, '1h' → 3600, '30d' → 2592000, '900s' → 900. */
  private static parseDurationSec(raw: string): number {
    const m = /^(\d+)([smhd])$/.exec(raw.trim());
    if (!m) return 900;
    const n = Number(m[1]);
    switch (m[2]) {
      case 's': return n;
      case 'm': return n * 60;
      case 'h': return n * 3600;
      case 'd': return n * 86_400;
      default:  return 900;
    }
  }
}
