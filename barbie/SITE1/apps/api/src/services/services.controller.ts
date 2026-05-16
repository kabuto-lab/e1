/**
 * /v1/services — tenant-scoped CRUD для каталога услуг.
 *
 * Tenant определяется TenantResolverMiddleware (subdomain / X-Tenant-Slug header)
 * и проверяется TenantGuard. RolesGuard проверяет JWT-роль.
 *
 * Мэппинг ролей:
 *   POST   /         — tenant-admin, salon-manager
 *   GET    /         — tenant-admin, salon-manager, master, client
 *   GET    /:id      — tenant-admin, salon-manager, master, client
 *   PATCH  /:id      — tenant-admin, salon-manager
 *   DELETE /:id      — tenant-admin, salon-manager (soft archive)
 *
 * platform:super-admin проходит везде (god-mode из RolesGuard).
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
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ListServicesQueryDto } from './dto/list-services-query.dto';
import {
  ListServicesResponseDto,
  ServiceResponseDto,
} from './dto/service-response.dto';

@ApiTags('services')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller({ path: 'services', version: '1' })
export class ServicesController {
  constructor(private readonly service: ServicesService) {}

  @Post()
  @RequireRole('tenant-admin', 'salon-manager')
  @ApiOperation({ summary: 'Создать услугу (глобальную либо привязанную к салону)' })
  create(@Body() dto: CreateServiceDto): Promise<ServiceResponseDto> {
    return this.service.createService(dto);
  }

  @Get()
  @RequireRole('tenant-admin', 'salon-manager', 'master', 'client')
  @ApiOperation({ summary: 'Список услуг с фильтрами/пагинацией' })
  list(@Query() query: ListServicesQueryDto): Promise<ListServicesResponseDto> {
    return this.service.listServices(query);
  }

  @Get(':id')
  @RequireRole('tenant-admin', 'salon-manager', 'master', 'client')
  @ApiOperation({ summary: 'Детали услуги по id' })
  get(@Param('id', new ParseUUIDPipe()) id: string): Promise<ServiceResponseDto> {
    return this.service.getService(id);
  }

  @Patch(':id')
  @RequireRole('tenant-admin', 'salon-manager')
  @ApiOperation({ summary: 'Обновить услугу (любое поле + status)' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateServiceDto,
  ): Promise<ServiceResponseDto> {
    return this.service.updateService(id, dto);
  }

  @Delete(':id')
  @RequireRole('tenant-admin', 'salon-manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-archive (status=archived). Физического удаления нет.' })
  archive(@Param('id', new ParseUUIDPipe()) id: string): Promise<ServiceResponseDto> {
    return this.service.archiveService(id);
  }
}
