/**
 * ListWfyPartnerSalonsQueryDto — query params для GET /v1/wfy-admin/partner-salons.
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class ListWfyPartnerSalonsQueryDto {
  @ApiPropertyOptional({ description: 'Подстрока для ILIKE по name' })
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
