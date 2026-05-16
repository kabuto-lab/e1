/**
 * CreateClientDto — payload для POST /v1/clients.
 *
 * tenantId сюда НЕ кладём — он берётся из TenantContext (subdomain / X-Tenant-Slug).
 * phone уникален в пределах тенанта (uniq index `clients_tenant_phone_uniq`); при
 * конфликте сервис вернёт 409 + existing.id (чтобы UI предложил «использовать
 * существующего»).
 *
 * Поля:
 *   - name        — отображаемое имя клиента
 *   - phone       — E.164-style, `^\+?[0-9]{7,15}$`
 *   - email       — optional, НЕ уникален per-tenant
 *   - birthdate   — optional, ISO date string (YYYY-MM-DD)
 *   - notes       — optional, free-text (PII — не отдаётся в list endpoint)
 *   - tags        — optional string[], нормализуем в lowercase+trim в сервисе
 *   - userId      — optional UUID, привязка к users.id (личный кабинет)
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateClientDto {
  @ApiProperty({ example: 'Анна Иванова', minLength: 1, maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description: 'Телефон в E.164-style: опциональный +, далее 7–15 цифр.',
    example: '+79991234567',
  })
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'phone должен быть в E.164-style: опциональный + и 7-15 цифр',
  })
  phone!: string;

  @ApiPropertyOptional({ example: 'anna@example.com', format: 'email', maxLength: 320 })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @ApiPropertyOptional({
    description: 'Дата рождения в ISO-формате (YYYY-MM-DD).',
    example: '1990-05-21',
  })
  @IsOptional()
  @IsDateString()
  birthdate?: string;

  @ApiPropertyOptional({ description: 'Заметки администратора. Не отдаются в list endpoint.' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Теги клиента (свободные ярлыки). Нормализуются в lowercase+trim.',
    type: [String],
    example: ['vip', 'постоянный'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'UUID платформенного user, если у клиента есть личный кабинет.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
