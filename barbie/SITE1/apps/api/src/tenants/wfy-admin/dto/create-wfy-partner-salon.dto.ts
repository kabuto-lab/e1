/**
 * CreateWfyPartnerSalonDto — payload для POST /v1/wfy-admin/partner-salons.
 *
 * tenantId не принимается с клиента — резолвится из TenantContext (Layer 1).
 * logoMediaId если задан — service проверяет media.tenant_id === current tenantId
 * (закрытие cross-tenant media leak; см. partner-salons.ts:9-11 schema docstring).
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateWfyPartnerSalonDto {
  @ApiProperty({ minLength: 1, maxLength: 255, example: 'Imperium Spa Москва' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ maxLength: 20000 })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string;

  @ApiPropertyOptional({ maxLength: 500, example: 'Москва, ул. Тверская 1' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ maxLength: 64, example: '+7 (495) 123-45-67' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string;

  @ApiPropertyOptional({ maxLength: 320, example: 'info@imperiumspa.ru' })
  @IsOptional()
  @IsString()
  @MaxLength(320)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'URL партнёрского сайта. Протокол обязателен (https/http) — защита от javascript:/data: XSS.',
    maxLength: 2048,
    example: 'https://imperiumspa.ru',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  externalLink?: string;

  @ApiPropertyOptional({
    description: 'UUID медиа в общей nas.media. Service проверяет принадлежность тенанту.',
  })
  @IsOptional()
  @IsUUID()
  logoMediaId?: string;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ord?: number;
}
