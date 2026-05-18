/**
 * BootstrapTenantDto — payload для POST /v1/platform/tenants/bootstrap.
 *
 * Используется wizard'ом «импорт тенанта из URL»: site-analyzer (`/v1/tools/analyze-site`)
 * вытягивает design+menu+favicon → user редактирует в UI → submit → этот DTO.
 *
 * Соглашения:
 *   - `sourceUrl` сохраняется в `tenants.bootstrap_source_url` для аудита.
 *   - `customDomain` (опц.) → `tenants.custom_domain`. UNIQUE среди не-NULL.
 *     Реальное routing через Caddy on-demand TLS — отдельная VPS-задача.
 *   - `faviconUrl` (опц.): сервер скачает через `ToolsService.fetchSafeBinary`
 *     (SSRF-protected) и сохранит как media-row + `tenant_design_tokens.faviconKey`.
 *   - `menuItems`: max 30; href валидируется как relative-path (`/...`) или
 *     absolute URL (`https?://...`) — совпадает с `tenant_menu_items_href_check`.
 *
 * Валидация — class-validator (а не Zod как было в handoff'е). Reason:
 * остальные tenants/* DTO используют class-validator + global ValidationPipe;
 * вложенные структуры здесь flat-типированы (не discriminated union как CMS blocks)
 * и class-validator их обрабатывает чисто. Сохранили project convention.
 */
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6,8}$/;
const HREF_REGEX = /^(\/|https?:\/\/)/;

export class BootstrapDesignDto {
  @ApiProperty({ example: '#FFFFFF' })
  @IsString()
  @Matches(HEX_COLOR_REGEX, { message: 'bg должен быть hex-цветом (#RRGGBB[AA])' })
  bg!: string;

  @ApiProperty({ example: '#0A0A0A' })
  @IsString()
  @Matches(HEX_COLOR_REGEX)
  headColor!: string;

  @ApiProperty({ example: 'Unbounded' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  headFont!: string;

  @ApiProperty({ example: '#D4AF37' })
  @IsString()
  @Matches(HEX_COLOR_REGEX)
  accColor!: string;

  @ApiProperty({ example: 'Unbounded' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  accFont!: string;

  @ApiProperty({ example: '#1A1A1A' })
  @IsString()
  @Matches(HEX_COLOR_REGEX)
  bodyColor!: string;

  @ApiProperty({ example: 'Inter' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  bodyFont!: string;
}

export class BootstrapMenuItemDto {
  @ApiProperty({ example: 'Услуги' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @ApiProperty({ example: '/services' })
  @IsString()
  @MaxLength(500)
  @Matches(HREF_REGEX, {
    message: 'href должен начинаться с `/` или `http(s)://`',
  })
  href!: string;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  sortOrder!: number;
}

export class BootstrapTenantDto {
  @ApiProperty({
    description: 'URL-safe slug (2-64), будет частью {slug}.spa.me',
    example: 'barbiespa',
    minLength: 2,
    maxLength: 64,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/, {
    message: 'slug: lowercase letters, digits, hyphens; не начинаться/заканчиваться дефисом',
  })
  slug!: string;

  @ApiProperty({ example: 'Barbie Spa', minLength: 1, maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description: 'URL исходного сайта (для аудита и downstream tooling)',
    example: 'https://barbiespa.ru',
  })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2000)
  sourceUrl!: string;

  @ApiPropertyOptional({
    description: 'Custom brand-домен поверх slug.spa.me. UNIQUE среди не-NULL.',
    example: 'barbiespa.ru',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  customDomain?: string;

  @ApiProperty({ type: BootstrapDesignDto })
  @ValidateNested()
  @Type(() => BootstrapDesignDto)
  design!: BootstrapDesignDto;

  @ApiProperty({ type: [BootstrapMenuItemDto], description: 'Max 30 пунктов' })
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => BootstrapMenuItemDto)
  menuItems!: BootstrapMenuItemDto[];

  @ApiPropertyOptional({
    description:
      'URL favicon (сервер скачает через SSRF-protected ToolsService.fetchSafeBinary, ' +
      'сохранит как media + faviconKey в tenant_design_tokens).',
    example: 'https://barbiespa.ru/favicon.ico',
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2000)
  faviconUrl?: string;
}

export class BootstrapTenantResultDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty() bootstrapSourceUrl!: string;
  @ApiPropertyOptional() customDomain?: string | null;
  @ApiProperty({ description: 'Кол-во вставленных tenant_menu_items' })
  menuItemsCreated!: number;
  @ApiPropertyOptional({ description: 'Если faviconUrl был указан и скачался' })
  faviconKey?: string;
  @ApiPropertyOptional({ description: 'Если favicon не удалось скачать — причина' })
  faviconError?: string;
  @ApiProperty() createdAt!: string;
}
