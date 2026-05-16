import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateTenantDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 120 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ enum: ['active', 'suspended', 'archived'] })
  @IsOptional()
  @IsIn(['active', 'suspended', 'archived'])
  status?: 'active' | 'suspended' | 'archived';

  @ApiPropertyOptional({ example: 'aurelia.com', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  primaryDomain?: string;
}
