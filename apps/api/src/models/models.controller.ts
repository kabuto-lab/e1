/**
 * Models Controller - endpoints для каталога моделей
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum, IsArray, IsObject, IsBoolean, MinLength, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ModelsService } from './models.service';
import { MediaService } from '../media/media.service';
import { JwtAuthGuard, type RequestWithUser } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../auth/guards/roles.guard';
import { BotSecretGuard } from '../auth/guards/bot-secret.guard';
import { TelegramRelayService } from '../telegram-relay/telegram-relay.service';
import type { ModelProfile } from '@escort/db';

type CatalogMedia = { id: string; url: string; fileType: 'photo' | 'video' };
type CatalogModelProfile = ModelProfile & { media: CatalogMedia[] };

class ContactRequestDto {
  @IsString() telegramId: string;
  @IsOptional() @IsString() telegramUsername?: string;
}

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
  @IsOptional() @IsString() country?: string;
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
  /** Контакт менеджера (показывается клиенту после оплаты эскроу) */
  @IsOptional() @IsString() contactTelegram?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsString() contactWhatsapp?: string;
  @IsOptional() @IsString() contactEmail?: string;
  /** Доля менеджера (0..1) от 95%-пула; только ADMIN может её менять (см. update() ниже). */
  @IsOptional() @IsString() managerCommissionRate?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => HeroSliderTypographyDto)
  heroSliderTypography?: HeroSliderTypographyDto;
}

@ApiTags('Models')
@Controller('models')
export class ModelsController {
  constructor(
    private readonly modelsService: ModelsService,
    private readonly mediaService: MediaService,
    private readonly telegramRelayService: TelegramRelayService,
  ) {}

  /** Батч-приложение публичных фото/видео к списку профилей (для каталога). */
  private async withMedia(profiles: ModelProfile[]): Promise<CatalogModelProfile[]> {
    const mediaByModel = await this.mediaService.getPublicMediaForModels(profiles.map((p) => p.id));
    return profiles.map((p) => ({
      ...p,
      media: (mediaByModel[p.id] ?? []).map((f) => ({
        id: f.id,
        url: f.cdnUrl ?? '',
        fileType: f.fileType as 'photo' | 'video',
      })),
    }));
  }

  @Get()
  @ApiOperation({ summary: 'Каталог моделей с фильтрами' })
  @ApiQuery({ name: 'availabilityStatus', required: false, enum: ['offline', 'online', 'in_shift', 'busy'] })
  @ApiQuery({ name: 'verificationStatus', required: false, enum: ['pending', 'verified', 'rejected'] })
  @ApiQuery({ name: 'eliteStatus', required: false, type: Boolean })
  @ApiQuery({ name: 'city', required: false, type: String, description: 'Точное совпадение с physicalAttributes.city' })
  @ApiQuery({ name: 'country', required: false, type: String, description: 'Точное совпадение с physicalAttributes.country' })
  @ApiQuery({ name: 'ageMin', required: false, type: Number })
  @ApiQuery({ name: 'ageMax', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'orderBy', required: false, enum: ['rating', 'createdAt', 'displayName'] })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  async getCatalog(@Query() query: any): Promise<CatalogModelProfile[]> {
    const filters = {
      availabilityStatus: query.availabilityStatus,
      verificationStatus: query.verificationStatus,
      eliteStatus: query.eliteStatus === 'true',
      city: query.city || undefined,
      country: query.country || undefined,
      ageMin: query.ageMin ? parseInt(query.ageMin) : undefined,
      ageMax: query.ageMax ? parseInt(query.ageMax) : undefined,
      limit: query.limit ? parseInt(query.limit) : 50,
      offset: query.offset ? parseInt(query.offset) : 0,
      orderBy: query.orderBy as 'rating' | 'createdAt' | 'displayName',
      order: query.order as 'asc' | 'desc',
    };

    const profiles = await this.modelsService.getCatalog(filters);
    return this.withMedia(profiles);
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

    if (user.role === 'admin' || user.role === 'moderator') {
      filters.includeDrafts = true;
    } else {
      filters.managerId = user.userId;
    }

    return this.modelsService.getCatalog(filters);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Анкета текущей модели по JWT' })
  @ApiResponse({ status: 200, description: 'Анкета найдена' })
  @ApiResponse({ status: 404, description: 'Анкета не привязана к аккаунту' })
  async getMe(@Request() req: RequestWithUser): Promise<ModelProfile> {
    const profile = await this.modelsService.findByUserId(req.user!.userId);
    if (!profile) {
      throw new NotFoundException('Model profile not linked to this account');
    }
    return profile;
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

  /** Строго до @Get(':slug') */
  @Get(':slug/contacts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Контакты менеджера по модели — только если есть funded/confirmed бронирование',
  })
  async getContacts(
    @Param('slug') slug: string,
    @Request() req: RequestWithUser,
  ): Promise<{ contactTelegram: string | null; contactPhone: string | null; contactWhatsapp: string | null }> {
    const userId = req.user!.userId;
    const result = await this.modelsService.getContactsForUser(slug, userId);
    if (!result) {
      throw new ForbiddenException('Contacts are available only after escrow is funded');
    }
    return result;
  }

  /** Строго до @Get(':slug') */
  @Get(':id/telegram-availability')
  @ApiOperation({ summary: 'Есть ли у анкеты доступный relay-канал в Telegram (для disable кнопки на фронте)' })
  async getTelegramAvailability(@Param('id') id: string): Promise<{ available: boolean }> {
    return { available: await this.telegramRelayService.isAvailable(id) };
  }

  /** Строго до @Get(':slug') */
  @Post(':id/telegram-contact-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Одноразовый deep-link на бота для анонимной relay-переписки по анкете (не раскрывает telegram ни одной из сторон)',
  })
  async getTelegramContactToken(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<{ deepLink: string | null }> {
    return this.telegramRelayService.createContactToken(id, req.user!.userId);
  }

  @Post(':id/contact-request')
  @UseGuards(BotSecretGuard)
  @ApiOperation({ summary: 'Клиент открыл /start model_<id> в боте — уведомить менеджера/модель (bot-only)' })
  async contactRequest(
    @Param('id') id: string,
    @Body() body: ContactRequestDto,
  ): Promise<{ notified: boolean; displayName: string }> {
    return this.modelsService.sendContactRequestNotification(id, body.telegramId, body.telegramUsername);
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.MODEL, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить профиль модели' })
  async update(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: UpdateModelProfileDto,
  ): Promise<ModelProfile> {
    const patch: UpdateModelProfileDto = { ...body };
    // managerCommissionRate — только ADMIN/MODERATOR (страница «Пользователи → Доли»);
    // менеджер не должен назначать долю себе сам.
    const canSetShare = req.user?.role === Role.ADMIN || req.user?.role === Role.MODERATOR;
    if (patch.managerCommissionRate !== undefined && !canSetShare) {
      delete patch.managerCommissionRate;
    }
    return this.modelsService.updateProfile(id, patch);
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
    @Body('nextAvailableAt') nextAvailableAt?: string,
  ): Promise<ModelProfile> {
    const profile = await this.modelsService.findById(id);
    if (!profile || !profile.userId) {
      throw new BadRequestException('Profile not found');
    }
    return this.modelsService.updateAvailability(profile.userId, status, nextAvailableAt ? new Date(nextAvailableAt) : undefined);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить профиль модели (Admin/Moderator — любой, Manager — только свои анкеты)' })
  @ApiResponse({ status: 200, description: 'Профиль удалён' })
  @ApiResponse({ status: 403, description: 'Manager пытается удалить не свою анкету' })
  @ApiResponse({ status: 404, description: 'Профиль не найден' })
  async delete(@Param('id') id: string, @Request() req: RequestWithUser): Promise<void> {
    const profile = await this.modelsService.findById(id);
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    if (req.user!.role === 'manager' && profile.managerId !== req.user!.userId) {
      throw new ForbiddenException('Not your model');
    }
    return this.modelsService.deleteProfile(id);
  }
}
