/**
 * ClientResponseDto / ClientListItemDto / ListClientsResponseDto.
 *
 * tenantId НЕ возвращаем — он подразумевается из контекста (subdomain).
 * notes — PII; НЕ отдаём в list endpoint. Отдельный ClientListItemDto без notes.
 * Даты сериализуем в ISO string. totalSpentKopecks — bigint → string (JSON-safe).
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { ClientStatus } from '@barbie-site1/db';

export class ClientResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;

  @ApiProperty() name!: string;
  @ApiProperty({ example: '+79991234567' }) phone!: string;
  @ApiPropertyOptional() email?: string | null;

  @ApiPropertyOptional({
    description: 'ISO date string (YYYY-MM-DD), без времени.',
    example: '1990-05-21',
  })
  birthdate?: string | null;

  @ApiPropertyOptional({ description: 'Заметки администратора (PII).' })
  notes?: string | null;

  @ApiProperty({ type: [String] }) tags!: string[];

  @ApiPropertyOptional({
    description: 'Привязка к платформенному user, если есть.',
    format: 'uuid',
  })
  userId?: string | null;

  @ApiProperty({ enum: ['active', 'blocked', 'archived'] })
  status!: ClientStatus;

  @ApiPropertyOptional({ description: 'ISO timestamp первого визита (агрегат).' })
  firstVisitAt?: string | null;

  @ApiPropertyOptional({ description: 'ISO timestamp последнего визита (агрегат).' })
  lastVisitAt?: string | null;

  @ApiProperty({
    description: 'Сумма всех завершённых appointment в копейках (bigint → string).',
    example: '125000',
  })
  totalSpentKopecks!: string;

  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

/**
 * Версия для list endpoint — БЕЗ notes (защита PII при массовой выдаче).
 */
export class ClientListItemDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() phone!: string;
  @ApiPropertyOptional() email?: string | null;
  @ApiPropertyOptional() birthdate?: string | null;
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiPropertyOptional({ format: 'uuid' }) userId?: string | null;
  @ApiProperty({ enum: ['active', 'blocked', 'archived'] }) status!: ClientStatus;
  @ApiPropertyOptional() firstVisitAt?: string | null;
  @ApiPropertyOptional() lastVisitAt?: string | null;
  @ApiProperty() totalSpentKopecks!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ListClientsResponseDto {
  @ApiProperty({ type: [ClientListItemDto] })
  data!: ClientListItemDto[];

  @ApiProperty() total!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() offset!: number;
}

/**
 * Payload 409-конфликта при дубле phone — фронт может предложить «использовать
 * существующего клиента».
 */
export class ClientPhoneConflictDto {
  @ApiProperty({ example: 'CLIENT_PHONE_TAKEN' }) code!: string;
  @ApiProperty() message!: string;
  @ApiProperty({ description: 'Existing client с тем же phone в этом тенанте.' })
  existing!: { id: string };
}
