/**
 * SalonResponseDto / ListSalonsResponseDto.
 *
 * tenantId НЕ возвращаем — он подразумевается из контекста (запрос пришёл с конкретного
 * subdomain'а). Даты сериализуем в ISO string.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { SalonStatus, WorkingHours } from '@barbie-site1/db';

export class SalonResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;

  @ApiProperty() address!: string;
  @ApiProperty() city!: string;
  @ApiPropertyOptional() region?: string | null;
  @ApiProperty() country!: string;
  @ApiPropertyOptional() postalCode?: string | null;

  @ApiPropertyOptional() geoLat?: string | null;
  @ApiPropertyOptional() geoLng?: string | null;

  @ApiPropertyOptional() phone?: string | null;
  @ApiPropertyOptional() email?: string | null;

  @ApiPropertyOptional({ description: 'Недельное расписание + exceptions.' })
  workingHours?: WorkingHours | null;

  @ApiProperty({ enum: ['active', 'paused', 'archived'] })
  status!: SalonStatus;

  @ApiPropertyOptional() coverImageKey?: string | null;
  @ApiPropertyOptional() description?: string | null;

  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ListSalonsResponseDto {
  @ApiProperty({ type: [SalonResponseDto] })
  data!: SalonResponseDto[];

  @ApiProperty() total!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() offset!: number;
}
