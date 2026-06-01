import { ApiProperty } from '@nestjs/swagger';
import type { TenantUserRole, TenantUserStatus } from '@barbie-site1/db';

export class EmployeeDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty() role!: TenantUserRole;
  @ApiProperty() status!: TenantUserStatus;
  @ApiProperty({ type: 'object', additionalProperties: { type: 'boolean' } })
  permissions!: Record<string, boolean>;
}
