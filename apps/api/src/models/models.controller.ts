/**
 * Models Controller - endpoints для каталога моделей
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum, IsArray, IsObject, IsBoolean, MinLength, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ModelsService } from './models.service';
import { JwtAuthGuard, type RequestWithUser } from '../auth/guards/jwt-auth.guard';
import type { ModelProfile } from '@escort/db';

class PhysicalAttributesDto {
  @IsOptional() @IsNumber() age?: number;
  @IsOptional() @IsNumber() height?: number;
  @IsOptional() @IsNumber() weight?: number;
  @IsOptional() @IsNumber() bustSize?: number;
  @IsOptional() @IsEnum(['natural', 'silicone']) bustType?: string;
  @IsOptional() @IsEnum(['slim', 'curvy', 'bbw', 'pear', 'fit']) bodyType?: string;
  @IsOptional() @IsEnum(['gentle', 'active', 'adaptable']) temperament?: string;
  @IsOptional() @IsEnum(['active', 'passive', 'universal']) sexuality?: string;
  @IsOptional() @IsString() hairColor?: string;
  @IsOptional() @IsString() eyeColor?: string;
  @IsOptional() @IsString() city?: string;
}

class CreateModelProfileDto {
  @IsString() @MinLength(1) @MaxLength(100)
  displayName: string;

  @IsOptional() @IsString() @MaxLength(100)
  slug?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  biography?: string;

  @IsOptional() @ValidateNested() @Type(() => PhysicalAttributesDto)
  physicalAttributes?: PhysicalAttributesDto;

  @IsOptional() @IsArray() @IsString({ each: true })
  languages?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  psychotypeTags?: string[];

  @IsOptional() @IsNumber() @Min(0)
  rateHourly?: number;

  @IsOptional() @IsNumber() @Min(0)
  rateOvernight?: number;
}

class HeroSliderTypographyDto {
  @IsOptional()
  @IsEnum(['unbounded', 'inter', 'playfair', 'space_grotesk', 'system'])
  fontKey?: 'unbounded' | 'inter' | 'playfair' | 'space_grotesk' | 'system';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  textColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  metaColor?: string;
}

class UpdateModelProfileDto {
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() rateHourly?: string;
  @IsOptional() @IsString() rateOvernight?: string;
  @IsOptional() @IsArray() psychotypeTags?: string[];
  @IsOptional() @IsArray() languages?: string[];
  @IsOptional() @ValidateNested() @Type(() => PhysicalAttributesDto) physicalAttributes?: any;
  @IsOptional() @IsString() videoWalkthroughUrl?: string;
  @IsOptional() @IsString() biography?: string;
  @IsOptional() @IsBoolean() isPublished?: boolean;
  /** Пустая строка — сбросить главное фото в профиле */
  @IsOptional() @IsString() mainPhotoUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => HeroSliderTypographyDto)
  heroSliderTypography?: HeroSliderTypographyDto;
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

    return await this.modelsService.getCatalog(filters);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Модели текущего пользователя (admin видит все, manager — только свои)' })
  async getMyModels(@Request() req: RequestWithUser, @Query() query: any): Promise<ModelProfile[]> {
    const user = req.user!;
    const filters: any = {
      limit: query.limit ? parseInt(query.limit) : 50,
      offset: query.offset ? parseInt(query.offset) : 0,
      orderBy: query.orderBy as 'rating' | 'createdAt' | 'displayName',
      order: query.order as 'asc' | 'desc',
    };

    if (user.role !== 'admin') {
      filters.managerId = user.userId;
    } else {
      filters.includeDrafts = true;
    }

    return this.modelsService.getCatalog(filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Статистика по моделям' })
  async getStats(): Promise<any> {
    return this.modelsService.getStats();
  }

  /** Строго до @Get(':slug') — иначе Nest может неверно сопоставить сегмент `id`. */
  @Get('id/:id')
  @ApiOperation({ summary: 'Профиль модели по ID' })
  @ApiResponse({ status: 404, description: 'Профиль не найден' })
  async getById(@Param('id') id: string): Promise<ModelProfile> {
    const profile = await this.modelsService.findById(id);
    if (!profile) {
      throw new NotFoundException('Model profile not found');
    }
    return profile;
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Профиль модели по slug (только опубликованные и верифицированные)' })
  @ApiResponse({ status: 200, description: 'Профиль найден' })
  @ApiResponse({ status: 404, description: 'Профиль не найден' })
  async getBySlug(@Param('slug') slug: string): Promise<ModelProfile> {
    const profile = await this.modelsService.findBySlugPublic(slug);
    if (!profile) {
      throw new NotFoundException('Model profile not found');
    }
    return profile;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать профиль модели' })
  @ApiResponse({ status: 201, description: 'Профиль создан' })
  async create(@Request() req: RequestWithUser, @Body() body: CreateModelProfileDto): Promise<ModelProfile> {
    return this.modelsService.createFullProfile({
      ...body,
      managerId: req.user!.userId,
    });
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
