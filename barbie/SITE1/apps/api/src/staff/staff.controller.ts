/**
 * /v1/staff — tenant-scoped CRUD над мастерами.
 *
 * Guards: TenantGuard + RolesGuard. JwtAuthGuard глобальный (см. app.module.ts).
 *
 * Роли (см. require-role.decorator.ts):
 *   - POST   /v1/staff        → tenant-admin, salon-manager
 *   - GET    /v1/staff        → tenant-admin, salon-manager, master, client
 *   - GET    /v1/staff/:id    → tenant-admin, salon-manager, master, client
 *   - PATCH  /v1/staff/:id    → tenant-admin, salon-manager
 *   - DELETE /v1/staff/:id    → tenant-admin, salon-manager (soft archive)
 *
 * Доступ "чужой" staff (другой тенант) → 404, не 403 (см. service).
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRole } from '../common/decorators/require-role.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../tenant-context/tenant.guard';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { ListStaffQueryDto } from './dto/list-staff-query.dto';
import {
  ListStaffResponseDto,
  StaffResponseDto,
} from './dto/staff-response.dto';

@ApiTags('staff')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller({ path: 'staff', version: '1' })
export class StaffController {
  constructor(private readonly service: StaffService) {}

  @Post()
  @RequireRole('tenant-admin', 'salon-manager')
  @ApiOperation({ summary: 'Создать мастера (+ привязать к услугам в той же транзакции).' })
  create(@Body() dto: CreateStaffDto): Promise<StaffResponseDto> {
    return this.service.createStaff(dto);
  }

  @Get()
  @RequireRole('tenant-admin', 'salon-manager', 'master', 'client')
  @ApiOperation({ summary: 'Список мастеров текущего тенанта с фильтрами/пагинацией.' })
  list(@Query() query: ListStaffQueryDto): Promise<ListStaffResponseDto> {
    return this.service.listStaff(query);
  }

  @Get(':id')
  @RequireRole('tenant-admin', 'salon-manager', 'master', 'client')
  @ApiOperation({ summary: 'Карточка мастера + список service.id (через JOIN на staff_services).' })
  get(@Param('id', new ParseUUIDPipe()) id: string): Promise<StaffResponseDto> {
    return this.service.getStaff(id);
  }

  @Patch(':id')
  @RequireRole('tenant-admin', 'salon-manager')
  @ApiOperation({
    summary:
      'Обновить мастера. Если serviceIds передан — M2M связки заменяются атомарно (DELETE+INSERT в транзакции).',
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStaffDto,
  ): Promise<StaffResponseDto> {
    return this.service.updateStaff(id, dto);
  }

  @Delete(':id')
  @RequireRole('tenant-admin', 'salon-manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-archive (status=archived). M2M связки сохраняются.' })
  archive(@Param('id', new ParseUUIDPipe()) id: string): Promise<StaffResponseDto> {
    return this.service.archiveStaff(id);
  }
}
