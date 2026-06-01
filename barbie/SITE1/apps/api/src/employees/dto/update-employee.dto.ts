import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional } from 'class-validator';
import type { TenantUserRole, TenantUserStatus } from '@barbie-site1/db';

const ROLES: TenantUserRole[] = ['tenant-admin', 'salon-manager', 'master', 'client'];
const STATUSES: TenantUserStatus[] = ['active', 'invited', 'suspended', 'archived'];

export class UpdateEmployeeDto {
  /** Карта прав { ключ: boolean }. Заменяется целиком. */
  @ApiPropertyOptional({ type: 'object', additionalProperties: { type: 'boolean' } })
  @IsOptional()
  @IsObject()
  permissions?: Record<string, boolean>;

  @ApiPropertyOptional({ enum: ROLES })
  @IsOptional()
  @IsIn(ROLES)
  role?: TenantUserRole;

  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: TenantUserStatus;
}
