/**
 * StaffResponseDto — публичная форма staff row.
 *
 * `services?: string[]` — список service.id, привязанных через staff_services.
 * Заполняется при getStaff(id) через JOIN; в listStaff обычно опускается
 * (избегаем N+1). Если потребуется — поднимем отдельным эндпоинтом
 * GET /v1/staff/:id/services.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { StaffSchedule } from '@barbie-site1/db';
import type { StaffStatus } from './update-staff.dto';

export class StaffResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() salonId!: string;

  @ApiPropertyOptional() userId?: string | null;

  @ApiProperty() name!: string;
  @ApiPropertyOptional() bio?: string | null;
  @ApiPropertyOptional() photoKey?: string | null;

  @ApiProperty({ type: [String] })
  specialties!: string[];

  @ApiProperty({
    description: 'StaffSchedule jsonb — расписание мастера.',
    type: 'object',
    additionalProperties: true,
  })
  schedule!: StaffSchedule;

  @ApiProperty({ enum: ['active', 'on_leave', 'archived'] })
  status!: StaffStatus;

  @ApiProperty() sortOrder!: number;

  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;

  @ApiPropertyOptional({
    description: 'service.id привязанных услуг (если запрошено детально).',
    type: [String],
  })
  services?: string[];
}

export class ListStaffResponseDto {
  @ApiProperty({ type: [StaffResponseDto] })
  data!: StaffResponseDto[];

  @ApiProperty() total!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() offset!: number;
}
