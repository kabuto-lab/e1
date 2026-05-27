/**
 * CreateWfyOpportunityDto — payload для POST /v1/wfy-admin/opportunities.
 *
 * tenantId не принимается с клиента — резолвится из TenantContext (Layer 1).
 * coverImageKey — S3 key (varchar 500), denormalized ref на nas.media с
 * module='wfy-opp'. Format-validation `^tenant/{tenantId}/...` — Productor-debt.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateWfyOpportunityDto {
  @ApiProperty({ minLength: 1, maxLength: 255, example: 'Заработай на новую машину' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({
    description: 'Сумма / краткое описание награды',
    maxLength: 255,
    example: '1 500 000 ₽',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  headline?: string;

  @ApiPropertyOptional({ maxLength: 20000 })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string;

  @ApiPropertyOptional({
    description: 'S3 key изображения (через module=wfy-opp в /v1/media/upload). varchar 500.',
    maxLength: 500,
    example: 'tenant/abc.../wfy-opp/cover-car.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImageKey?: string;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ord?: number;
}
