/**
 * UpdateServiceDto — PATCH /v1/services/:id.
 *
 * Все поля create-dto становятся опциональными + добавляется `status`.
 * `salonId` менять можно (null → глобализовать, uuid → переназначить салон),
 * сервис валидирует принадлежность tenant'у.
 */
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { CreateServiceDto } from './create-service.dto';
import type { ServiceStatus } from '@barbie-site1/db';

export class UpdateServiceDto extends PartialType(CreateServiceDto) {
  @ApiPropertyOptional({ enum: ['active', 'draft', 'archived'] })
  @IsOptional()
  @IsIn(['active', 'draft', 'archived'])
  status?: ServiceStatus;
}
