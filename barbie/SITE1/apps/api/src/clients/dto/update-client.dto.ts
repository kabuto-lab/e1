/**
 * UpdateClientDto — PATCH /v1/clients/:id payload.
 *
 * Все поля create-client-dto делаем optional + дополнительно разрешаем менять status
 * (active | blocked | archived). На смену phone — повторная проверка uniqueness
 * (tenant_id, phone) в сервисе → 409 + existing.id при конфликте.
 */
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import type { ClientStatus } from '@barbie-site1/db';

import { CreateClientDto } from './create-client.dto';

export class UpdateClientDto extends PartialType(CreateClientDto) {
  @ApiPropertyOptional({ enum: ['active', 'blocked', 'archived'] })
  @IsOptional()
  @IsIn(['active', 'blocked', 'archived'])
  status?: ClientStatus;
}
