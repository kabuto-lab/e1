/**
 * /v1/wfy-admin/advantages — admin CRUD над wfy_advantages.
 *
 * Доступно только тенантам с `site_type='wfy-city-dir'` (enforce через
 * WfyTenantCapabilityGuard — 409 для остальных).
 *
 * Role map (MVP — Phase D step 3.4):
 *   - GET/POST/PATCH/DELETE — tenant-admin (platform:super-admin god-mode через RolesGuard).
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

import { WfyAdvantagesService } from './wfy-advantages.service';
import { CreateWfyAdvantageDto } from './dto/create-wfy-advantage.dto';
import { UpdateWfyAdvantageDto } from './dto/update-wfy-advantage.dto';
import { ListWfyAdvantagesQueryDto } from './dto/list-wfy-advantages-query.dto';
import {
  ListWfyAdvantagesResponseDto,
  WfyAdvantageResponseDto,
} from './dto/wfy-advantage-response.dto';

@ApiTags('wfy-admin · advantages')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard, WfyTenantCapabilityGuard)
@Controller({ path: 'wfy-admin/advantages', version: '1' })
export class WfyAdvantagesController {
  constructor(private readonly service: WfyAdvantagesService) {}

  @Post()
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Создать advantage (требует site_type=wfy-city-dir)' })
  create(@Body() dto: CreateWfyAdvantageDto): Promise<WfyAdvantageResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Список advantages с фильтрами/пагинацией' })
  list(@Query() query: ListWfyAdvantagesQueryDto): Promise<ListWfyAdvantagesResponseDto> {
    return this.service.list(query);
  }

  @Get(':id')
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Получить advantage по id' })
  get(@Param('id', new ParseUUIDPipe()) id: string): Promise<WfyAdvantageResponseDto> {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Обновить поля advantage (любое подмножество)' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWfyAdvantageDto,
  ): Promise<WfyAdvantageResponseDto> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequireRole('tenant-admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить advantage (hard delete)' })
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
