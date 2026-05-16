/**
 * CreateServiceDto — payload для POST /v1/services.
 *
 * Особенности:
 *  - `priceKopecks` принимается как строка (regex `^\d+$`) и конвертируется в BigInt
 *    в сервисе. JSON не умеет BigInt — клиент тоже передаёт/получает строку.
 *  - `salonId` опционален: null/undefined → услуга доступна во всех салонах тенанта.
 *    Если передан UUID — сервис проверит, что салон принадлежит текущему тенанту.
 *  - `slug` валидируется паттерном `^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$`
 *    (URL-safe lowercase, 1-40 символов, не начинается/заканчивается дефисом).
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ example: 'Маникюр классический', minLength: 1, maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description: 'URL-safe slug (1-40 символов, lowercase, цифры, дефисы)',
    example: 'manicure-classic',
    minLength: 1,
    maxLength: 40,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  @Matches(/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/, {
    message:
      'slug должен быть lowercase + цифры + дефисы, не начинаться/заканчиваться дефисом',
  })
  slug!: string;

  @ApiPropertyOptional({ description: 'Описание услуги' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Категория услуги (свободный текст)',
    example: 'manicure',
    minLength: 1,
    maxLength: 64,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  category!: string;

  @ApiProperty({
    description: 'Длительность в минутах (5–1440)',
    example: 60,
    minimum: 5,
    maximum: 1440,
  })
  @IsInt()
  @Min(5)
  @Max(1440)
  durationMin!: number;

  @ApiProperty({
    description:
      'Цена в копейках, как строка (BigInt-safe). Пример "150000" = 1500 руб.',
    example: '150000',
  })
  @IsString()
  @Matches(/^\d+$/, { message: 'priceKopecks должен быть строкой из цифр (без знака)' })
  @MaxLength(20)
  priceKopecks!: string;

  @ApiPropertyOptional({
    description:
      'UUID салона, к которому привязана услуга. Если не передан — услуга глобальна для всех салонов тенанта.',
  })
  @IsOptional()
  @IsUUID()
  salonId?: string | null;
}
