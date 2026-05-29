/**
 * /v1/wfy-admin/partner-salons — admin CRUD над partner_salons.
 *
 * Доступно только тенантам с `site_type='wfy-city-dir'` (enforce через
 * WfyTenantCapabilityGuard — 409 для остальных).
 *
 * Role map (MVP — Phase D step 3.2):
 *   - GET     /  /:id            — tenant-admin
 *   - POST    /                  — tenant-admin
 *   - PATCH   /:id               — tenant-admin
 *   - DELETE  /:id               — tenant-admin
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

import { RequireRole } from '../../common/decorators/require-role.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../tenant-context/tenant.guard';
import { WfyTenantCapabilityGuard } from './wfy-tenant-capability.guard';

import { WfyPartnerSalonsService } from './wfy-partner-salons.service';
import { CreateWfyPartnerSalonDto } from './dto/create-wfy-partner-salon.dto';
import { UpdateWfyPartnerSalonDto } from './dto/update-wfy-partner-salon.dto';
import { ListWfyPartnerSalonsQueryDto } from './dto/list-wfy-partner-salons-query.dto';
import {
  ListWfyPartnerSalonsResponseDto,
  WfyPartnerSalonResponseDto,
} from './dto/wfy-partner-salon-response.dto';

@ApiTags('wfy-admin · partner-salons')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard, WfyTenantCapabilityGuard)
@Controller({ path: 'wfy-admin/partner-salons', version: '1' })
export class WfyPartnerSalonsController {
  constructor(private readonly service: WfyPartnerSalonsService) {}

  @Post()
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Создать partner-salon в текущем тенанте (требует site_type=wfy-city-dir)' })
  create(@Body() dto: CreateWfyPartnerSalonDto): Promise<WfyPartnerSalonResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Список partner-salons с фильтрами/пагинацией' })
  list(@Query() query: ListWfyPartnerSalonsQueryDto): Promise<ListWfyPartnerSalonsResponseDto> {
    return this.service.list(query);
  }

  @Get(':id')
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Получить partner-salon по id (только в рамках текущего тенанта)' })
  get(@Param('id', new ParseUUIDPipe()) id: string): Promise<WfyPartnerSalonResponseDto> {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Обновить поля partner-salon (любое подмножество)' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWfyPartnerSalonDto,
  ): Promise<WfyPartnerSalonResponseDto> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequireRole('tenant-admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить partner-salon (hard delete)' })
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
