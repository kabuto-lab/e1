/**
 * ListServicesQueryDto — фильтры/пагинация для GET /v1/services.
 *
 *   ?status=active|draft|archived
 *   ?salonId=<uuid>            — только этого салона; не указан → все (включая глобальные)
 *   ?category=manicure
 *   ?q=маник                   — ilike по name/slug
 *   ?limit=50&offset=0
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { ServiceStatus } from '@barbie-site1/db';

export class ListServicesQueryDto {
  @ApiPropertyOptional({ enum: ['active', 'draft', 'archived'] })
  @IsOptional()
  @IsIn(['active', 'draft', 'archived'])
  status?: ServiceStatus;

  @ApiPropertyOptional({ description: 'UUID салона; если не указан — все услуги тенанта' })
  @IsOptional()
  @IsUUID()
  salonId?: string;

  @ApiPropertyOptional({ description: 'Категория (точное совпадение)', maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @ApiPropertyOptional({ description: 'Поиск по name/slug (ilike %q%)' })
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
