import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../auth/guards/roles.guard';
import type { RequestWithUser } from '../auth/guards/jwt-auth.guard';
import { EmployeesService, type EmployeeRow } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeePermissionsDto } from './dto/update-employee-permissions.dto';

@ApiTags('manager/employees')
@Controller('manager/employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MANAGER)
@ApiBearerAuth()
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @ApiOperation({ summary: 'Создать сотрудника (чаты/статусы/расписание своих анкет)' })
  async create(@Request() req: RequestWithUser, @Body() dto: CreateEmployeeDto): Promise<EmployeeRow> {
    return this.employeesService.createEmployee(req.user!.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Список своих сотрудников' })
  async list(@Request() req: RequestWithUser): Promise<EmployeeRow[]> {
    return this.employeesService.listEmployees(req.user!.userId);
  }

  @Patch(':userId/permissions')
  @ApiOperation({ summary: 'Настроить доп. права сотрудника (выплаты/верификация/редактирование анкет)' })
  async updatePermissions(
    @Request() req: RequestWithUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateEmployeePermissionsDto,
  ): Promise<EmployeeRow> {
    return this.employeesService.updatePermissions(req.user!.userId, userId, dto);
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Удалить сотрудника' })
  async remove(@Request() req: RequestWithUser, @Param('userId') userId: string): Promise<{ ok: true }> {
    await this.employeesService.deleteEmployee(req.user!.userId, userId);
    return { ok: true };
  }
}
