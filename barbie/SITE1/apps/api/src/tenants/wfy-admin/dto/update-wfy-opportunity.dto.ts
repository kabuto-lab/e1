/**
 * UpdateWfyOpportunityDto — PATCH /v1/wfy-admin/opportunities/:id.
 *
 * Все поля опциональны; пустой body даёт fallback to get() (no .set()).
 * Nullable: headline/description/coverImageKey (можно очистить через null).
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateWfyOpportunityDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ maxLength: 255, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  headline?: string | null;

  @ApiPropertyOptional({ maxLength: 20000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string | null;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImageKey?: string | null;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ord?: number;
}
