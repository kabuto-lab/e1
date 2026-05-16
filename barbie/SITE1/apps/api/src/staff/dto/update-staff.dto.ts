/**
 * UpdateStaffDto — PartialType(CreateStaffDto) + status.
 *
 * Замечания:
 *   - `salonId` через PartialType остаётся изменяемым; если меняется — сервис
 *     обязан проверить новый салон в том же тенанте (см. service.updateStaff).
 *   - Если в payload пришёл `serviceIds` — сервис делает DELETE+INSERT в M2M
 *     одной транзакцией. `serviceIds === undefined` — M2M не трогаем.
 */
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { CreateStaffDto } from './create-staff.dto';

export type StaffStatus = 'active' | 'on_leave' | 'archived';

export class UpdateStaffDto extends PartialType(CreateStaffDto) {
  @ApiPropertyOptional({ enum: ['active', 'on_leave', 'archived'] })
  @IsOptional()
  @IsIn(['active', 'on_leave', 'archived'])
  status?: StaffStatus;
}
