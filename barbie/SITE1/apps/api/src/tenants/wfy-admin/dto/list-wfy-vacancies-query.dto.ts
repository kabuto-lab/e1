/**
 * ListWfyVacanciesQueryDto — query params для GET /v1/wfy-admin/vacancies.
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class ListWfyVacanciesQueryDto {
  @ApiPropertyOptional({ description: 'Подстрока для ILIKE по title' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
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
