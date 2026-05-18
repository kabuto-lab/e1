/**
 * BootstrapWpDto — payload для POST /v1/platform/tenants/bootstrap-wp.
 *
 * Async-операция: response — `{ jobId }`. Прогресс доставляется через
 * GET /v1/platform/tenants/bootstrap-wp/:jobId/stream (SSE) — см.
 * WpJobStore.
 */
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WpImportOptionsDto {
  @ApiProperty({ description: 'Импортировать ли WP pages → cms_pages.' })
  @IsBoolean()
  pages!: boolean;

  @ApiProperty({ description: 'Импортировать ли WP media → S3 + media table.' })
  @IsBoolean()
  media!: boolean;

  @ApiProperty({ description: 'Импортировать ли WP nav menu → tenant_menu_items.' })
  @IsBoolean()
  menu!: boolean;

  @ApiProperty({ description: 'Импортировать ли WP posts → cms_pages с slug `blog-<wp-slug>`.' })
  @IsBoolean()
  posts!: boolean;
}

export class BootstrapWpDto {
  @ApiProperty({
    description: 'URL сайта-донора. Должен пройти WP-probe (isWp=true).',
    example: 'https://example-spa.ru',
  })
  @IsString()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2000)
  sourceUrl!: string;

  @ApiProperty({
    description: 'URL-safe slug нового тенанта (2-64).',
    example: 'example-spa',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/, {
    message: 'slug: lowercase + цифры + дефисы',
  })
  slug!: string;

  @ApiProperty({ example: 'Example SPA', minLength: 1, maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({
    description: 'Custom brand-домен поверх slug.spa.me. UNIQUE среди не-NULL.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  customDomain?: string;

  @ApiProperty({ type: WpImportOptionsDto })
  @IsObject()
  @ValidateNested()
  @Type(() => WpImportOptionsDto)
  importOptions!: WpImportOptionsDto;

  @ApiPropertyOptional({
    description: 'Максимум media-items (защита от слишком больших галерей). Default 200.',
    minimum: 1,
    maximum: 1000,
    default: 200,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  maxMediaItems?: number = 200;
}

export class BootstrapWpKickoffDto {
  @ApiProperty({
    description: 'ID async-job. Открой GET /platform/tenants/bootstrap-wp/:jobId/stream для прогресса.',
  })
  jobId!: string;
}
