/**
 * /v1/employees — управление сотрудниками тенанта (tenant_users): список + правка
 * прав/роли/статуса. Только tenant-admin. Tenant-scoped (TenantGuard).
 */
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { TenantGuard } from '../tenant-context/tenant.guard';
import { RequireRole } from '../common/decorators/require-role.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

import { EmployeesService } from './employees.service';
import type { EmployeeDto } from './dto/employee-response.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller({ path: 'employees', version: '1' })
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Get()
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Список сотрудников тенанта (с правами)' })
  list(): Promise<EmployeeDto[]> {
    return this.service.list();
  }

  @Patch(':id')
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Обновить права / роль / статус сотрудника' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateEmployeeDto,
  ): Promise<EmployeeDto> {
    return this.service.update(id, dto);
  }
}
