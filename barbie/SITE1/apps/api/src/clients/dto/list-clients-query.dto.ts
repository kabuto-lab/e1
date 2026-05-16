/**
 * ListClientsQueryDto — query-params для GET /v1/clients.
 *
 * Фильтры:
 *   - status     — точное совпадение по client.status
 *   - q          — ilike %q% по name OR phone OR email (PII-поиск по тенанту)
 *   - tag        — фильтр по наличию тега в jsonb tags (нормализуется lowercase+trim)
 *   - hasUser    — true → userId IS NOT NULL; false → userId IS NULL
 *   - limit/offset — пагинация (как в salons/tenants)
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import type { ClientStatus } from '@barbie-site1/db';

export class ListClientsQueryDto {
  @ApiPropertyOptional({ enum: ['active', 'blocked', 'archived'] })
  @IsOptional()
  @IsIn(['active', 'blocked', 'archived'])
  status?: ClientStatus;

  @ApiPropertyOptional({ description: 'Поиск по name / phone / email (ilike %q%).' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;

  @ApiPropertyOptional({
    description: 'Фильтр по тегу (точное совпадение в jsonb tags, lowercase).',
    example: 'vip',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  tag?: string;

  @ApiPropertyOptional({
    description: 'Только клиенты с привязанным user (true) / без user (false).',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true' || value === '1' || value === 1) return true;
    if (value === false || value === 'false' || value === '0' || value === 0) return false;
    return value;
  })
  @IsBoolean()
  hasUser?: boolean;

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
