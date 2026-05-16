import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TenantResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ['active', 'suspended', 'archived'] })
  status!: 'active' | 'suspended' | 'archived';
  @ApiPropertyOptional() primaryDomain?: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class TenantWithAdminDto extends TenantResponseDto {
  @ApiProperty({ description: 'Только при создании — credentials первого админа.' })
  admin!: {
    id: string;
    email: string;
  };
}

export class ListTenantsResponseDto {
  @ApiProperty({ type: [TenantResponseDto] })
  data!: TenantResponseDto[];

  @ApiProperty() total!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() offset!: number;
}
