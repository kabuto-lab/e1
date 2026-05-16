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

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { RequireRole } from '../common/decorators/require-role.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../tenant-context/tenant.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload';
import { CmsService } from './cms.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { ListPagesQueryDto } from './dto/list-pages-query.dto';
import { ListPagesResponseDto, PageResponseDto } from './dto/page-response.dto';

@ApiTags('cms')
@UseGuards(TenantGuard, RolesGuard)
@Controller({ path: 'cms/pages', version: '1' })
export class CmsController {
  constructor(private readonly service: CmsService) {}

  @Post()
  @ApiBearerAuth()
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Создать страницу (всегда status=draft). body валидируется Zod.' })
  create(
    @Body() dto: CreatePageDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PageResponseDto> {
    return this.service.createPage(dto, user.id);
  }

  @Get()
  @ApiBearerAuth()
  @RequireRole('tenant-admin', 'salon-manager')
  @ApiOperation({ summary: 'Список страниц (любого статуса) с фильтрами' })
  list(@Query() query: ListPagesQueryDto): Promise<ListPagesResponseDto> {
    return this.service.listPages(query);
  }

  @Get(':id')
  @ApiBearerAuth()
  @RequireRole('tenant-admin', 'salon-manager')
  @ApiOperation({ summary: 'Детали страницы по id (incl. draft)' })
  get(@Param('id', new ParseUUIDPipe()) id: string): Promise<PageResponseDto> {
    return this.service.getPage(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @RequireRole('tenant-admin')
  @ApiOperation({ summary: 'Точечное редактирование. body передаётся целиком (заменяет старое).' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePageDto,
  ): Promise<PageResponseDto> {
    return this.service.updatePage(id, dto);
  }

  @Post(':id/publish')
  @ApiBearerAuth()
  @RequireRole('tenant-admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Опубликовать (status=published, publishedAt=now)' })
  publish(@Param('id', new ParseUUIDPipe()) id: string): Promise<PageResponseDto> {
    return this.service.publishPage(id);
  }

  @Post(':id/unpublish')
  @ApiBearerAuth()
  @RequireRole('tenant-admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Снять с публикации (status=draft, publishedAt=null)' })
  unpublish(@Param('id', new ParseUUIDPipe()) id: string): Promise<PageResponseDto> {
    return this.service.unpublishPage(id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @RequireRole('tenant-admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Архивировать (soft delete, status=archived)' })
  archive(@Param('id', new ParseUUIDPipe()) id: string): Promise<PageResponseDto> {
    return this.service.archivePage(id);
  }

  /**
   * Публичный рендер — без auth, но с tenant context (resolves through subdomain
   * или X-Tenant-Slug). Отдаёт только status='published'.
   */
  @Public()
  @Get('public/by-slug/:slug')
  @ApiOperation({
    summary: 'Публичный рендер страницы по slug+locale (без auth, только published)',
  })
  publicBySlug(
    @Param('slug') slug: string,
    @Query('locale') locale?: 'ru' | 'en',
  ): Promise<PageResponseDto> {
    return this.service.getPublishedBySlug(slug, locale ?? 'ru');
  }
}
