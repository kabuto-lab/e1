/**
 * /v1/salons — tenant-scoped CRUD над салонами.
 *
 * TenantGuard — резолвит контекст (subdomain / X-Tenant-Slug) и проверяет, что
 * тенант active. RolesGuard — проверяет JWT-роль против @RequireRole(...).
 *
 * Phase 0 role-map:
 *   - POST   /            — tenant-admin
 *   - GET    /            — tenant-admin, salon-manager
 *   - GET    /:id         — tenant-admin, salon-manager, master
 *   - PATCH  /:id         — tenant-admin
 *   - DELETE /:id (arch.) — tenant-admin
 *
 * platform:super-admin проходит всё (god-mode в RolesGuard).
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

import { SalonsService } from './salons.service';
import { CreateSalonDto } from './dto/create-salon.dto';
import { UpdateSalonDto } from './dto/update-salon.dto';
import { ListSalonsQueryDto } from './dto/list-salons-query.dto';
import { ListSalonsResponseDto, SalonResponseDto } from './dto/salon-response.dto';

@ApiTags('salons')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller({ path: 'salons', version: '1' })
export class SalonsController {
  constructor(private readonly service: SalonsService) {}

  @Post()
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Создать салон в текущем тенанте' })
  create(@Body() dto: CreateSalonDto): Promise<SalonResponseDto> {
    return this.service.createSalon(dto);
  }

  @Get()
  @RequireRole('tenant-admin', 'salon-manager')
  @ApiOperation({ summary: 'Список салонов тенанта с фильтрами/пагинацией' })
  list(@Query() query: ListSalonsQueryDto): Promise<ListSalonsResponseDto> {
    return this.service.listSalons(query);
  }

  @Get(':id')
  @RequireRole('tenant-admin', 'salon-manager', 'master')
  @ApiOperation({ summary: 'Детали салона по id (только в рамках текущего тенанта)' })
  get(@Param('id', new ParseUUIDPipe()) id: string): Promise<SalonResponseDto> {
    return this.service.getSalon(id);
  }

  @Patch(':id')
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Обновить поля салона (любое подмножество)' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSalonDto,
  ): Promise<SalonResponseDto> {
    return this.service.updateSalon(id, dto);
  }

  @Delete(':id')
  @RequireRole('tenant-admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-archive (status=archived). Физического удаления нет.' })
  archive(@Param('id', new ParseUUIDPipe()) id: string): Promise<SalonResponseDto> {
    return this.service.archiveSalon(id);
  }
}
