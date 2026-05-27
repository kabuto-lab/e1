/**
 * /v1/wfy-admin/cities — admin CRUD над wfy_city_pages.
 *
 * Доступно только тенантам с `site_type='wfy-city-dir'` (enforce в сервисе
 * через requireWfyTenant() — 409 для остальных).
 *
 * Role map (MVP — Phase D step 3.1):
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

import { WfyCitiesService } from './wfy-cities.service';
import { CreateWfyCityDto } from './dto/create-wfy-city.dto';
import { UpdateWfyCityDto } from './dto/update-wfy-city.dto';
import { ListWfyCitiesQueryDto } from './dto/list-wfy-cities-query.dto';
import {
  ListWfyCitiesResponseDto,
  WfyCityResponseDto,
} from './dto/wfy-city-response.dto';

@ApiTags('wfy-admin · cities')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller({ path: 'wfy-admin/cities', version: '1' })
export class WfyCitiesController {
  constructor(private readonly service: WfyCitiesService) {}

  @Post()
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Создать city-page в текущем тенанте (требует site_type=wfy-city-dir)' })
  create(@Body() dto: CreateWfyCityDto): Promise<WfyCityResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Список city-pages с фильтрами/пагинацией' })
  list(@Query() query: ListWfyCitiesQueryDto): Promise<ListWfyCitiesResponseDto> {
    return this.service.list(query);
  }

  @Get(':id')
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Получить city-page по id (только в рамках текущего тенанта)' })
  get(@Param('id', new ParseUUIDPipe()) id: string): Promise<WfyCityResponseDto> {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Обновить поля city-page (любое подмножество)' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWfyCityDto,
  ): Promise<WfyCityResponseDto> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequireRole('tenant-admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить city-page (hard delete; FK ON DELETE CASCADE)' })
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
