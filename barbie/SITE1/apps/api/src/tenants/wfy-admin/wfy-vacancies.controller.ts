/**
 * /v1/wfy-admin/vacancies — admin CRUD над wfy_vacancies.
 *
 * Доступно только тенантам с `site_type='wfy-city-dir'` (enforce через
 * WfyTenantCapabilityGuard — 409 для остальных).
 *
 * Role map (MVP — Phase D step 3.5):
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

import { WfyVacanciesService } from './wfy-vacancies.service';
import { CreateWfyVacancyDto } from './dto/create-wfy-vacancy.dto';
import { UpdateWfyVacancyDto } from './dto/update-wfy-vacancy.dto';
import { ListWfyVacanciesQueryDto } from './dto/list-wfy-vacancies-query.dto';
import {
  ListWfyVacanciesResponseDto,
  WfyVacancyResponseDto,
} from './dto/wfy-vacancy-response.dto';

@ApiTags('wfy-admin · vacancies')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard, WfyTenantCapabilityGuard)
@Controller({ path: 'wfy-admin/vacancies', version: '1' })
export class WfyVacanciesController {
  constructor(private readonly service: WfyVacanciesService) {}

  @Post()
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Создать вакансию (требует site_type=wfy-city-dir)' })
  create(@Body() dto: CreateWfyVacancyDto): Promise<WfyVacancyResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Список вакансий с фильтрами/пагинацией' })
  list(@Query() query: ListWfyVacanciesQueryDto): Promise<ListWfyVacanciesResponseDto> {
    return this.service.list(query);
  }

  @Get(':id')
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Получить вакансию по id' })
  get(@Param('id', new ParseUUIDPipe()) id: string): Promise<WfyVacancyResponseDto> {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Обновить поля вакансии (любое подмножество)' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWfyVacancyDto,
  ): Promise<WfyVacancyResponseDto> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequireRole('tenant-admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить вакансию (hard delete)' })
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
