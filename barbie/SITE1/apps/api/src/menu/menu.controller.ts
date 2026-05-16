/**
 * /v1/menu — tenant-scoped admin endpoints для главного меню.
 *
 * Доступ: tenant-admin, salon-manager. Требует X-Tenant-Slug или subdomain
 * (через TenantResolverMiddleware), JWT (через JwtAuthGuard глобально),
 * TenantGuard (user.tenantId === ALS.tenantId), RolesGuard.
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
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { TenantGuard } from '../tenant-context/tenant.guard';
import { RequireRole } from '../common/decorators/require-role.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

import { MenuService } from './menu.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { ReorderMenuDto } from './dto/reorder-menu.dto';
import { UpdateNavTemplateDto } from './dto/update-template.dto';
import {
  MenuItemResponseDto,
  MenuTreeItemDto,
} from './dto/menu-item-response.dto';

@ApiTags('menu')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller({ path: 'menu', version: '1' })
export class MenuController {
  constructor(private readonly service: MenuService) {}

  @Get('items')
  @RequireRole('tenant-admin', 'salon-manager')
  @ApiOperation({ summary: 'Flat list of menu items for the current tenant' })
  list(): Promise<MenuItemResponseDto[]> {
    return this.service.listForCurrentTenant();
  }

  @Get('tree')
  @RequireRole('tenant-admin', 'salon-manager')
  @ApiOperation({ summary: 'Hierarchical menu tree (depth ≤ 2)' })
  tree(): Promise<MenuTreeItemDto[]> {
    return this.service.treeForCurrentTenant();
  }

  @Post('items')
  @RequireRole('tenant-admin', 'salon-manager')
  @ApiOperation({ summary: 'Create a menu item' })
  create(@Body() dto: CreateMenuItemDto): Promise<MenuItemResponseDto> {
    return this.service.create(dto);
  }

  @Patch('items/:id')
  @RequireRole('tenant-admin', 'salon-manager')
  @ApiOperation({ summary: 'Update a menu item (partial)' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateMenuItemDto,
  ): Promise<MenuItemResponseDto> {
    return this.service.update(id, dto);
  }

  @Delete('items/:id')
  @RequireRole('tenant-admin', 'salon-manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a menu item. FK cascades to children.' })
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<{ deletedIds: string[] }> {
    return this.service.remove(id);
  }

  @Post('reorder')
  @RequireRole('tenant-admin', 'salon-manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atomic bulk reorder (drag-and-drop)' })
  reorder(@Body() dto: ReorderMenuDto): Promise<MenuTreeItemDto[]> {
    return this.service.reorder(dto);
  }

  @Get('template')
  @RequireRole('tenant-admin', 'salon-manager')
  @ApiOperation({ summary: 'Get current nav template' })
  getTemplate(): Promise<{ navTemplate: 'top-classic' | 'mega-images' | 'vertical-side' }> {
    return this.service.getCurrentTenantTemplate();
  }

  @Put('template')
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Switch nav template (tenant_design_tokens.nav_template)' })
  setTemplate(
    @Body() dto: UpdateNavTemplateDto,
  ): Promise<{ navTemplate: 'top-classic' | 'mega-images' | 'vertical-side' }> {
    return this.service.setCurrentTenantTemplate(dto.navTemplate);
  }
}
