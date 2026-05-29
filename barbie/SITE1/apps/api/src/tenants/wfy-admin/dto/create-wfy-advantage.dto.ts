/**
 * CreateWfyAdvantageDto — payload для POST /v1/wfy-admin/advantages.
 *
 * tenantId не принимается с клиента — резолвится из TenantContext.
 * iconName — lucide-icon name или внутренний symbol-key (varchar 64), рендерится
 * блоком AdvantagesGrid в ED-редакторе.
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

export class CreateWfyAdvantageDto {
  @ApiProperty({ minLength: 1, maxLength: 255, example: 'Стабильный доход' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ maxLength: 20000 })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string;

  @ApiPropertyOptional({
    description: 'lucide-icon name или symbol-key (varchar 64)',
    maxLength: 64,
    example: 'wallet',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  iconName?: string;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ord?: number;
}
