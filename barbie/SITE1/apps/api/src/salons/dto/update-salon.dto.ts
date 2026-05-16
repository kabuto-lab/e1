/**
 * UpdateSalonDto — PATCH /v1/salons/:id payload.
 *
 * Все поля create-salon-dto делаем optional + дополнительно разрешаем менять status
 * (active | paused | archived). slug менять тоже можно, но осторожно — он входит в URL'ы.
 */
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import type { SalonStatus } from '@barbie-site1/db';

import { CreateSalonDto } from './create-salon.dto';

export class UpdateSalonDto extends PartialType(CreateSalonDto) {
  @ApiPropertyOptional({ enum: ['active', 'paused', 'archived'] })
  @IsOptional()
  @IsIn(['active', 'paused', 'archived'])
  status?: SalonStatus;
}
