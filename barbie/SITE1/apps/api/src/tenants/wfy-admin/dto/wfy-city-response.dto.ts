/**
 * Response DTO для wfy-cities эндпоинтов.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { WfyCityExtras, WfyCityPageStatus } from '@barbie-site1/db';

export class WfyCityResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() cityName!: string;
  @ApiPropertyOptional({ nullable: true }) region!: string | null;
  @ApiProperty() country!: string;
  @ApiPropertyOptional({ nullable: true }) headline!: string | null;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ type: Object }) extras!: WfyCityExtras;
  @ApiProperty({ enum: ['draft', 'published', 'archived'] }) status!: WfyCityPageStatus;
  @ApiProperty() ord!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ListWfyCitiesResponseDto {
  @ApiProperty({ type: [WfyCityResponseDto] }) data!: WfyCityResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() offset!: number;
}
