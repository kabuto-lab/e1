/**
 * ListWfyCitiesQueryDto — query params для GET /v1/wfy-admin/cities.
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

import type { WfyCityPageStatus } from '@barbie-site1/db';

export class ListWfyCitiesQueryDto {
  @ApiPropertyOptional({ enum: ['draft', 'published', 'archived'] })
  @IsOptional()
  @IsIn(['draft', 'published', 'archived'])
  status?: WfyCityPageStatus;

  @ApiPropertyOptional({ description: 'Подстрока для ILIKE по cityName' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  q?: string;

  @ApiPropertyOptional({ default: 100, minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
