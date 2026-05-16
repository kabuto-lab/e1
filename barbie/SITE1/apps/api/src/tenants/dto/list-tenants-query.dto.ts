import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListTenantsQueryDto {
  @ApiPropertyOptional({ enum: ['active', 'suspended', 'archived'] })
  @IsOptional()
  @IsIn(['active', 'suspended', 'archived'])
  status?: 'active' | 'suspended' | 'archived';

  @ApiPropertyOptional({ description: 'Поиск по slug или name (ilike %q%)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
