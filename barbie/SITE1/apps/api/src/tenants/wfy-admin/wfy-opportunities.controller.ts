/**
 * /v1/wfy-admin/opportunities — admin CRUD над wfy_opportunities.
 *
 * Доступно только тенантам с `site_type='wfy-city-dir'` (enforce через
 * WfyTenantCapabilityGuard — 409 для остальных).
 *
 * Role map (MVP — Phase D step 3.3):
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

import { WfyOpportunitiesService } from './wfy-opportunities.service';
import { CreateWfyOpportunityDto } from './dto/create-wfy-opportunity.dto';
import { UpdateWfyOpportunityDto } from './dto/update-wfy-opportunity.dto';
import { ListWfyOpportunitiesQueryDto } from './dto/list-wfy-opportunities-query.dto';
import {
  ListWfyOpportunitiesResponseDto,
  WfyOpportunityResponseDto,
} from './dto/wfy-opportunity-response.dto';

@ApiTags('wfy-admin · opportunities')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard, WfyTenantCapabilityGuard)
@Controller({ path: 'wfy-admin/opportunities', version: '1' })
export class WfyOpportunitiesController {
  constructor(private readonly service: WfyOpportunitiesService) {}

  @Post()
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Создать opportunity (требует site_type=wfy-city-dir)' })
  create(@Body() dto: CreateWfyOpportunityDto): Promise<WfyOpportunityResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Список opportunities с фильтрами/пагинацией' })
  list(@Query() query: ListWfyOpportunitiesQueryDto): Promise<ListWfyOpportunitiesResponseDto> {
    return this.service.list(query);
  }

  @Get(':id')
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Получить opportunity по id' })
  get(@Param('id', new ParseUUIDPipe()) id: string): Promise<WfyOpportunityResponseDto> {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Обновить поля opportunity (любое подмножество)' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWfyOpportunityDto,
  ): Promise<WfyOpportunityResponseDto> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequireRole('tenant-admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить opportunity (hard delete)' })
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
