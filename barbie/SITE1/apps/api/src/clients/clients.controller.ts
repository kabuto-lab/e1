/**
 * /v1/clients — tenant-scoped CRUD над CRM-карточками клиентов салона.
 *
 * TenantGuard — резолвит контекст (subdomain / X-Tenant-Slug) и проверяет, что
 * тенант active. RolesGuard — проверяет JWT-роль против @RequireRole(...).
 *
 * Phase 1 role-map:
 *   - POST   /            — tenant-admin, salon-manager, master
 *                           (master тоже может создать клиента при ручной записи на ресепшене)
 *   - GET    /            — tenant-admin, salon-manager, master
 *   - GET    /:id         — tenant-admin, salon-manager, master
 *   - PATCH  /:id         — tenant-admin, salon-manager
 *   - DELETE /:id (arch.) — tenant-admin
 *
 * platform:super-admin проходит всё (god-mode в RolesGuard).
 *
 * Защита PII: notes возвращается только в GET /:id; в list endpoint используется
 * ClientListItemDto без notes.
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

import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';
import {
  ClientResponseDto,
  ListClientsResponseDto,
} from './dto/client-response.dto';

@ApiTags('clients')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller({ path: 'clients', version: '1' })
export class ClientsController {
  constructor(private readonly service: ClientsService) {}

  @Post()
  @RequireRole('tenant-admin', 'salon-manager', 'master')
  @ApiOperation({
    summary: 'Создать клиента в текущем тенанте',
    description:
      'При конфликте по phone (uniq per tenant) — 409 CLIENT_PHONE_TAKEN с existing.id, ' +
      'чтобы UI мог предложить «использовать существующего».',
  })
  create(@Body() dto: CreateClientDto): Promise<ClientResponseDto> {
    return this.service.createClient(dto);
  }

  @Get()
  @RequireRole('tenant-admin', 'salon-manager', 'master')
  @ApiOperation({
    summary: 'Список клиентов тенанта с фильтрами/пагинацией',
    description: 'notes НЕ возвращается в list endpoint (защита PII).',
  })
  list(@Query() query: ListClientsQueryDto): Promise<ListClientsResponseDto> {
    return this.service.listClients(query);
  }

  @Get(':id')
  @RequireRole('tenant-admin', 'salon-manager', 'master')
  @ApiOperation({ summary: 'Детали клиента по id (только в рамках текущего тенанта)' })
  get(@Param('id', new ParseUUIDPipe()) id: string): Promise<ClientResponseDto> {
    return this.service.getClient(id);
  }

  @Patch(':id')
  @RequireRole('tenant-admin', 'salon-manager')
  @ApiOperation({
    summary: 'Обновить поля клиента (любое подмножество, включая status)',
    description:
      'На смену phone — повторная проверка uniqueness; при конфликте 409 + existing.id.',
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateClientDto,
  ): Promise<ClientResponseDto> {
    return this.service.updateClient(id, dto);
  }

  @Delete(':id')
  @RequireRole('tenant-admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-archive (status=archived). Физического удаления нет.' })
  archive(@Param('id', new ParseUUIDPipe()) id: string): Promise<ClientResponseDto> {
    return this.service.archiveClient(id);
  }
}
