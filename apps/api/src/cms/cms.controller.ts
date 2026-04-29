import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Request, HttpCode,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';
import { CmsService } from './cms.service';
import { JwtAuthGuard, type RequestWithUser } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../auth/guards/roles.guard';

class CreateCmsPageDto {
  @IsOptional() @IsString() @IsIn(['page', 'post']) type?: string;
  @IsString() title: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() content?: any;
  @IsOptional() @IsString() excerpt?: string;
  @IsOptional() @IsString() @IsIn(['draft', 'published', 'trash']) status?: string;
  @IsOptional() @IsString() featuredImageUrl?: string;
  @IsOptional() @IsString() metaTitle?: string;
  @IsOptional() @IsString() metaDescription?: string;
}

class UpdateCmsPageDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() content?: any;
  @IsOptional() @IsString() excerpt?: string;
  @IsOptional() @IsString() @IsIn(['draft', 'published', 'trash']) status?: string;
  @IsOptional() @IsString() featuredImageUrl?: string;
  @IsOptional() @IsString() metaTitle?: string;
  @IsOptional() @IsString() metaDescription?: string;
}

@ApiTags('CMS')
@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get('pages/by-slug/:slug')
  @ApiOperation({ summary: 'Публичная страница по slug (только published)' })
  async getBySlug(@Param('slug') slug: string) {
    return this.cmsService.findBySlug(slug);
  }

  @Get('pages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Список страниц/записей (admin)' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAll(@Query('type') type?: string, @Query('status') status?: string) {
    return this.cmsService.findAll(type, status);
  }

  @Get('pages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Страница по ID (admin)' })
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.cmsService.findById(id);
  }

  @Post('pages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать страницу/запись (admin)' })
  async create(@Body() body: CreateCmsPageDto, @Request() req: RequestWithUser) {
    return this.cmsService.create({ ...body, authorId: req.user?.userId });
  }

  @Put('pages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить страницу (admin)' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateCmsPageDto,
  ) {
    return this.cmsService.update(id, body);
  }

  @Delete('pages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @HttpCode(204)
  @ApiOperation({ summary: 'Удалить страницу (admin)' })
  async delete(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    await this.cmsService.delete(id);
  }
}
