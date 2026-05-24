/**
 * UpdateDesignTokensDto — payload для `PATCH /v1/platform/tenants/:slug/design-tokens`.
 *
 * Все поля опциональны (точечный patch — обновляем только то, что прислали).
 * Хексы валидируются паттерном `/^#[0-9A-Fa-f]{6,8}$/` (3-значный hex
 * нормализуется на бэке — см. `normalizeHex` в TenantsService для bootstrap).
 * navTemplate — один из трёх готовых лейаутов.
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, Matches } from 'class-validator';

const HEX_RE = /^#[0-9A-Fa-f]{6,8}$/;

export class UpdateDesignTokensDto {
  @ApiPropertyOptional({ example: '#0A0A0C' })
  @IsOptional()
  @IsString()
  @Matches(HEX_RE, { message: 'bg must be a 6/8-digit hex color (e.g. #0A0A0C)' })
  bg?: string;

  @ApiPropertyOptional({ example: '#FFFFFF' })
  @IsOptional()
  @IsString()
  @Matches(HEX_RE)
  headColor?: string;

  @ApiPropertyOptional({ example: 'Montserrat Alternates' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  headFont?: string;

  @ApiPropertyOptional({ example: '#D4AF37' })
  @IsOptional()
  @IsString()
  @Matches(HEX_RE)
  accColor?: string;

  @ApiPropertyOptional({ example: 'Space Grotesk' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  accFont?: string;

  @ApiPropertyOptional({ example: '#E6E7EA' })
  @IsOptional()
  @IsString()
  @Matches(HEX_RE)
  bodyColor?: string;

  @ApiPropertyOptional({ example: 'Inter' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  bodyFont?: string;

  @ApiPropertyOptional({ example: 'tenant-logos/pentagon.svg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  logoAlt?: string;

  @ApiPropertyOptional({ example: 'tenant-favicons/pentagon.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  faviconKey?: string;

  @ApiPropertyOptional({ enum: ['top-classic', 'mega-images', 'vertical-side'] })
  @IsOptional()
  @IsIn(['top-classic', 'mega-images', 'vertical-side'])
  navTemplate?: 'top-classic' | 'mega-images' | 'vertical-side';

  // customCss / extras — отложено до Phase B; без них преимуществ от patch'а нет.
}

export class DesignTokensResponseDto {
  @ApiPropertyOptional() tenantId!: string;
  @ApiPropertyOptional() bg!: string;
  @ApiPropertyOptional() headColor!: string;
  @ApiPropertyOptional() headFont!: string;
  @ApiPropertyOptional() accColor!: string;
  @ApiPropertyOptional() accFont!: string;
  @ApiPropertyOptional() bodyColor!: string;
  @ApiPropertyOptional() bodyFont!: string;
  @ApiPropertyOptional() logoKey?: string | null;
  @ApiPropertyOptional() logoAlt?: string | null;
  @ApiPropertyOptional() faviconKey?: string | null;
  @ApiPropertyOptional() navTemplate!: string;
  @ApiPropertyOptional({ format: 'date-time' }) updatedAt!: string;
}
