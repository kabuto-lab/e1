/**
 * Media Controller - endpoints для медиафайлов
 */

import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../auth/guards/roles.guard';

const STAFF_ROLES = new Set<string>([Role.ADMIN, Role.MANAGER]);

class CreateMediaDto {
  fileType: 'photo' | 'video' | 'document';
  storageKey: string;
  cdnUrl?: string;
  mimeType: string;
  fileSize?: number;
  metadata?: any;
}

class UpdateVisibilityDto {
  @IsOptional()
  @IsBoolean()
  isPublicVisible?: boolean;

  @IsOptional()
  @IsIn(['portfolio', 'vip', 'elite', 'verified'])
  albumCategory?: 'portfolio' | 'vip' | 'elite' | 'verified';

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

class BulkUpdateVisibilityDto {
  @IsUUID('4', { each: true })
  mediaIds: string[];

  @IsOptional()
  @IsBoolean()
  isPublicVisible?: boolean;

  @IsOptional()
  @IsIn(['portfolio', 'vip', 'elite', 'verified'])
  albumCategory?: 'portfolio' | 'vip' | 'elite' | 'verified';
}

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Статистика медиа' })
  async getStats() {
    return this.mediaService.getStats();
  }

  @Get('model/:modelId')
  @ApiOperation({ summary: 'Фото модели' })
  async getModelPhotos(@Param('modelId') modelId: string) {
    return this.mediaService.getModelPhotos(modelId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Файл по ID' })
  async getById(@Param('id') id: string) {
    return this.mediaService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Добавить файл' })
  async create(@Body() body: CreateMediaDto, @Request() req) {
    return this.mediaService.createFile({
      ...body,
      ownerId: req.user.userId,
    });
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Утвердить файл (модерация)' })
  async approve(@Param('id') id: string) {
    return this.mediaService.approve(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить файл' })
  async delete(@Param('id') id: string) {
    return this.mediaService.delete(id);
  }

  @Post(':id/visibility')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить видимость файла' })
  async updateVisibility(
    @Param('id') id: string,
    @Body() body: UpdateVisibilityDto,
    @Request() req,
  ) {
    const file = await this.mediaService.findById(id);
    if (!file) throw new NotFoundException('File not found');
    const isStaff = STAFF_ROLES.has(req.user.role);
    if (!isStaff && file.ownerId !== req.user.userId) throw new ForbiddenException('Not your file');
    return this.mediaService.updateVisibility(id, body);
  }

  @Post('bulk-visibility')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Массовое обновление видимости' })
  async bulkUpdateVisibility(
    @Body() body: BulkUpdateVisibilityDto,
    @Request() req,
  ) {
    const isStaff = STAFF_ROLES.has(req.user.role);
    return this.mediaService.bulkUpdateVisibility(body.mediaIds, body, req.user.userId, isStaff);
  }
}
