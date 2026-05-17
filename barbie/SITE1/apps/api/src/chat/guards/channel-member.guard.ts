/**
 * ChannelMemberGuard — после TenantGuard проверяет, что req.user — member канала.
 *
 * Запускается на endpoint'ах с `:channelId` в params. Tenant scoping берётся
 * из TenantContextService (ALS) — это canonical-источник, согласован с
 * ChatService. Дополнительный фильтр `tenantId` на member-lookup — defence
 * in depth (ENTITY §2.2): даже если где-то в коде окажется member-row с
 * чужим tenant_id, guard его не увидит.
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import type { Database } from '@barbie-site1/db';
import { chatChannelMembers } from '@barbie-site1/db';

import { DRIZZLE } from '../../database/database.module';
import { TenantContextService } from '../../tenant-context/tenant-context.service';
import type { AuthenticatedUser } from '../../auth/types/jwt-payload';

@Injectable()
export class ChannelMemberGuard implements CanActivate {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly tenantCtx: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = req.user;
    if (!user) throw new UnauthorizedException({ code: 'NO_AUTH' });

    const channelId: string | undefined =
      req.params?.channelId ?? req.params?.id ?? req.body?.channelId;
    if (!channelId) {
      throw new ForbiddenException({ code: 'CHANNEL_ID_REQUIRED' });
    }

    const tenantId = this.tenantCtx.requireTenantId();

    const [row] = await this.db
      .select({ userId: chatChannelMembers.userId })
      .from(chatChannelMembers)
      .where(
        and(
          eq(chatChannelMembers.channelId, channelId),
          eq(chatChannelMembers.userId, user.id),
          eq(chatChannelMembers.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!row) {
      throw new ForbiddenException({
        code: 'CHANNEL_MEMBER_REQUIRED',
        message: 'Доступ к каналу разрешён только его участникам.',
      });
    }

    return true;
  }
}
