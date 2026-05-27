/**
 * CreateWfyCityDto — payload для POST /v1/wfy-admin/cities.
 *
 * tenantId не принимается с клиента — резолвится из TenantContext (Layer 1).
 * slug уникален per-tenant (uniq index `wfy_city_pages_tenant_slug_uniq`).
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import type { WfyCityExtras, WfyCityPageStatus } from '@barbie-site1/db';

export class CreateWfyCityDto {
  @ApiProperty({
    description: 'URL-safe slug, уникальный per-tenant (`moskva`, `sankt-peterburg`).',
    minLength: 2,
    maxLength: 64,
    example: 'moskva',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/, {
    message: 'slug должен быть lowercase + цифры + дефисы, не начинаться/заканчиваться дефисом',
  })
  slug!: string;

  @ApiProperty({ minLength: 1, maxLength: 128, example: 'Москва' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  cityName!: string;

  @ApiPropertyOptional({ maxLength: 128, example: 'Московская область' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  region?: string;

  @ApiPropertyOptional({ maxLength: 2, default: 'RU', example: 'RU' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  headline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Доп. поля: metaTitle, metaDescription, heroImageKey, customBlocks',
    example: { metaTitle: 'Работа в Москве', metaDescription: 'Вакансии массажистки в Москве' },
  })
  @IsOptional()
  @IsObject()
  extras?: WfyCityExtras;

  @ApiPropertyOptional({ enum: ['draft', 'published', 'archived'], default: 'draft' })
  @IsOptional()
  @IsIn(['draft', 'published', 'archived'])
  status?: WfyCityPageStatus;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ord?: number;
}
