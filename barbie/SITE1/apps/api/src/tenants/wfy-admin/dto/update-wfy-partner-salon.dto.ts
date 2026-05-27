/**
 * UpdateWfyPartnerSalonDto — PATCH /v1/wfy-admin/partner-salons/:id.
 *
 * Все поля опциональны; пустой body даёт 400 (валидация на уровне controller).
 * Nullable-поля можно очистить, передав null. logoMediaId если задан — service
 * проверяет media.tenant_id === current tenantId.
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateWfyPartnerSalonDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ maxLength: 20000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string | null;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @ApiPropertyOptional({ maxLength: 64, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string | null;

  @ApiPropertyOptional({ maxLength: 320, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(320)
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional({
    description: 'URL партнёрского сайта. Протокол обязателен (https/http).',
    maxLength: 2048,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  externalLink?: string | null;

  @ApiPropertyOptional({
    description: 'UUID медиа в nas.media. Service проверяет принадлежность тенанту. Передайте null для удаления логотипа.',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  logoMediaId?: string | null;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ord?: number;
}
