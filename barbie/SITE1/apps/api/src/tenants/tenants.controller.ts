/**
 * /v1/platform/tenants — cross-tenant управление, только platform-admin.
 *
 * @SkipTenant() — эти эндпоинты не должны требовать tenant context
 *                 (поскольку они САМИ управляют тенантами).
 * @RequireRole('platform-admin', 'platform-support') — RolesGuard проверяет JWT.
 */
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SkipTenant } from '../tenant-context/tenant.decorator';
import { RequireRole } from '../common/decorators/require-role.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { ListTenantsQueryDto } from './dto/list-tenants-query.dto';
import {
  ListTenantsResponseDto,
  TenantResponseDto,
  TenantWithAdminDto,
} from './dto/tenant-response.dto';
import {
  BootstrapTenantDto,
  BootstrapTenantResultDto,
} from './dto/bootstrap-tenant.dto';

@ApiTags('platform · tenants')
@ApiBearerAuth()
@SkipTenant()
@UseGuards(RolesGuard)
@Controller({ path: 'platform/tenants', version: '1' })
export class TenantsController {
  constructor(private readonly service: TenantsService) {}

  @Post()
  @RequireRole('platform-admin')
  @ApiOperation({ summary: 'Создать тенант + первого tenant-admin (одной транзакцией)' })
  create(@Body() dto: CreateTenantDto): Promise<TenantWithAdminDto> {
    return this.service.createTenant(dto);
  }

  @Post('bootstrap')
  @RequireRole('platform-admin')
  @ApiOperation({
    summary: 'Bootstrap тенант из URL: создать с готовыми design tokens + menu items + favicon',
    description:
      'Принимает payload из site-analyzer wizard. Атомарно вставляет tenants + tenant_design_tokens + tenant_menu_items. ' +
      'Если указан faviconUrl — сервер скачает (SSRF-protected) и положит в media + tenant_design_tokens.faviconKey. ' +
      'Тенант создаётся БЕЗ admin user — добавь его отдельным вызовом POST /platform/tenants или POST /tenant-users.',
  })
  bootstrap(@Body() dto: BootstrapTenantDto): Promise<BootstrapTenantResultDto> {
    return this.service.bootstrap(dto);
  }

  @Get()
  @RequireRole('platform-admin', 'platform-support')
  @ApiOperation({ summary: 'Список тенантов с фильтрами/пагинацией' })
  list(@Query() query: ListTenantsQueryDto): Promise<ListTenantsResponseDto> {
    return this.service.listTenants(query);
  }

  @Get(':id')
  @RequireRole('platform-admin', 'platform-support')
  @ApiOperation({ summary: 'Детали тенанта по id' })
  get(@Param('id', new ParseUUIDPipe()) id: string): Promise<TenantResponseDto> {
    return this.service.getTenant(id);
  }

  @Patch(':id')
  @RequireRole('platform-admin')
  @ApiOperation({ summary: 'Обновить name / status / primaryDomain' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    return this.service.updateTenant(id, dto);
  }

  @Delete(':id')
  @RequireRole('platform-admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-archive (status=archived). Физического удаления нет.' })
  archive(@Param('id', new ParseUUIDPipe()) id: string): Promise<TenantResponseDto> {
    return this.service.archiveTenant(id);
  }
}
