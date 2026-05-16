/**
 * CreateSalonDto — payload для POST /v1/salons.
 *
 * tenantId сюда НЕ кладём — он берётся из TenantContext (subdomain / X-Tenant-Slug).
 * slug уникален в пределах тенанта (uniq index `salons_tenant_slug_uniq`).
 * workingHours — недельное расписание + exceptions (см. schema/salons.ts WorkingHours).
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import type { WorkingHours } from '@barbie-site1/db';

export class CreateSalonDto {
  @ApiProperty({ example: 'SPA на Истре', minLength: 2, maxLength: 255 })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description: 'URL-safe slug, уникальный per-tenant (например, `spa-na-istre`).',
    example: 'spa-na-istre',
    minLength: 2,
    maxLength: 64,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/, {
    message: 'slug должен быть lowercase + цифры + дефисы, не начинаться/заканчиваться дефисом',
  })
  slug!: string;

  @ApiProperty({ example: 'г. Москва, ул. Тверская, д. 1' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  address!: string;

  @ApiProperty({ example: 'Москва', maxLength: 128 })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  city!: string;

  @ApiPropertyOptional({ example: 'Московская область', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  region?: string;

  @ApiPropertyOptional({ example: 'RU', maxLength: 2, default: 'RU' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({ example: '125009', maxLength: 16 })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  postalCode?: string;

  @ApiPropertyOptional({ example: '+7 495 123-45-67', maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ example: 'info@spa-istra.ru', maxLength: 320 })
  @IsOptional()
  @IsString()
  @MaxLength(320)
  email?: string;

  @ApiPropertyOptional({
    description: 'Недельное расписание + исключения. См. WorkingHours в @barbie-site1/db.',
    example: {
      mon: { open: '10:00', close: '22:00' },
      sun: { open: '11:00', close: '20:00', closed: false },
    },
  })
  @IsOptional()
  @IsObject()
  workingHours?: WorkingHours;

  @ApiPropertyOptional({ description: 'S3/MinIO key обложки.', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImageKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;
}
