import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateEmployeePermissionsDto {
  @IsOptional()
  @IsBoolean()
  canManagePayouts?: boolean;

  @IsOptional()
  @IsBoolean()
  canEditModels?: boolean;
}
