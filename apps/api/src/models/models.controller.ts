/**
 * Models Controller - endpoints для каталога моделей
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ModelsService } from './models.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { ModelProfile } from '@escort/db';

// DTOs
class CreateModelProfileDto {
  displayName: string;
  slug?: string;
}

class UpdateModelProfileDto {
  displayName?: string;
  rateHourly?: string;
  rateOvernight?: string;
  psychotypeTags?: string[];
  languages?: string[];
  physicalAttributes?: any;
  videoWalkthroughUrl?: string;
}

@ApiTags('Models')
@Controller('models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  @Get()
  @ApiOperation({ summary: 'Каталог моделей с фильтрами' })
  @ApiQuery({ name: 'availabilityStatus', required: false, enum: ['offline', 'online', 'in_shift', 'busy'] })
  @ApiQuery({ name: 'verificationStatus', required: false, enum: ['pending', 'verified', 'rejected'] })
  @ApiQuery({ name: 'eliteStatus', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'orderBy', required: false, enum: ['rating', 'createdAt', 'displayName'] })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  async getCatalog(@Query() query: any): Promise<ModelProfile[]> {
    const filters = {
      availabilityStatus: query.availabilityStatus,
      verificationStatus: query.verificationStatus,
      eliteStatus: query.eliteStatus === 'true',
      limit: query.limit ? parseInt(query.limit) : 50,
      offset: query.offset ? parseInt(query.offset) : 0,
      orderBy: query.orderBy as 'rating' | 'createdAt' | 'displayName',
      order: query.order as 'asc' | 'desc',
    };

    console.log('📋 [ModelsController.getCatalog] Filters:', filters);
    const results = await this.modelsService.getCatalog(filters);
    console.log('📋 [ModelsController.getCatalog] Results:', results.length, 'models');
    if (results.length > 0) {
      console.log('📋 [ModelsController.getCatalog] First model mainPhotoUrl:', results[0].mainPhotoUrl);
    }
    return results;
  }

  @Get('stats')
  @ApiOperation({ summary: 'Статистика по моделям' })
  async getStats(): Promise<any> {
    return this.modelsService.getStats();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Профиль модели по slug' })
  @ApiResponse({ status: 200, description: 'Профиль найден' })
  @ApiResponse({ status: 404, description: 'Профиль не найден' })
  async getBySlug(@Param('slug') slug: string): Promise<ModelProfile | null> {
    return this.modelsService.findBySlug(slug);
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Профиль модели по ID' })
  async getById(@Param('id') id: string): Promise<ModelProfile | null> {
    return this.modelsService.findById(id);
  }

  @Post()
  // @UseGuards(JwtAuthGuard)  // Temporarily disabled for development
  // @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать профиль модели' })
  @ApiResponse({ status: 201, description: 'Профиль создан' })
  async create(@Body() body: CreateModelProfileDto): Promise<ModelProfile> {
    console.log('📝 [ModelsController.create] Received body:', JSON.stringify(body));
    console.log('📝 [ModelsController.create] displayName:', body?.displayName);
    console.log('📝 [ModelsController.create] displayName length:', body?.displayName?.length);
    
    const displayName = body?.displayName?.trim();
    if (!displayName || displayName.length === 0) {
      console.error('❌ [ModelsController.create] displayName is required');
      throw new BadRequestException('displayName is required');
    }

    // For development, create without user association
    // TODO: Get userId from JWT token when auth is enabled
    const userId = undefined; // No user associated yet
    return this.modelsService.createProfile(userId as any, displayName, body.slug);
  }

  @Put(':id')
  // @UseGuards(JwtAuthGuard)  // Temporarily disabled for development
  // @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить профиль модели' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateModelProfileDto,
  ): Promise<ModelProfile> {
    return this.modelsService.updateProfile(id, body);
  }

  @Put(':id/set-main-photo')
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  @ApiOperation({ summary: 'Установить главное фото модели' })
  async setMainPhoto(
    @Param('id') modelId: string,
    @Body() body: { photoUrl: string },
  ): Promise<ModelProfile> {
    return this.modelsService.setMainPhoto(modelId, body.photoUrl);
  }

  @Put(':id/availability')
  // @UseGuards(JwtAuthGuard)  // Temporarily disabled for development
  // @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить статус доступности' })
  async updateAvailability(
    @Param('id') id: string,
    @Body('status') status: 'offline' | 'online' | 'in_shift' | 'busy',
  ): Promise<ModelProfile> {
    const profile = await this.modelsService.findById(id);
    if (!profile || !profile.userId) {
      throw new BadRequestException('Profile not found');
    }
    return this.modelsService.updateAvailability(profile.userId, status);
  }

  @Delete(':id')
  // @UseGuards(JwtAuthGuard)  // Temporarily disabled for development
  // @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить профиль модели' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.modelsService.deleteProfile(id);
  }
}
