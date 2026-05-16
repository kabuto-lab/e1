/**
 * ListStaffQueryDto — фильтры для GET /v1/staff.
 *
 * Все поля опциональные; tenant_id берётся из контекста (TenantGuard).
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import type { StaffStatus } from './update-staff.dto';

export class ListStaffQueryDto {
  @ApiPropertyOptional({ description: 'Фильтр по салону.', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  salonId?: string;

  @ApiPropertyOptional({ enum: ['active', 'on_leave', 'archived'] })
  @IsOptional()
  @IsIn(['active', 'on_leave', 'archived'])
  status?: StaffStatus;

  @ApiPropertyOptional({ description: 'Поиск по name (ilike %q%).' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
