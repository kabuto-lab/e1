/**
 * Media Controller - endpoints для медиафайлов
 */

import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MediaService } from './media.service';

class CreateMediaDto {
  fileType: 'photo' | 'video' | 'document';
  storageKey: string;
  cdnUrl?: string;
  mimeType: string;
  fileSize?: number;
  metadata?: any;
}

class UpdateVisibilityDto {
  isPublicVisible?: boolean;
  albumCategory?: 'portfolio' | 'vip' | 'elite' | 'verified';
  sortOrder?: number;
}

class BulkUpdateVisibilityDto {
  mediaIds: string[];
  isPublicVisible?: boolean;
  albumCategory?: 'portfolio' | 'vip' | 'elite' | 'verified';
}

class JwtAuthGuard {
  canActivate(@Request() req) {
    req.user = { userId: 'demo-user-id', role: 'client' };
    return true;
  }
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
  @UseGuards(JwtAuthGuard)
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
  ) {
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
    return this.mediaService.bulkUpdateVisibility(body.mediaIds, body, req.user.userId);
  }
}
