import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Min, MinLength, MaxLength } from 'class-validator';
import { MastersService } from './masters.service';
import { MinioService } from '../../profiles/minio.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../../auth/guards/roles.guard';
import type { MassageMaster } from '@escort/db';

const PHOTO_MAX_BYTES = 15 * 1024 * 1024;
const PHOTO_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic', 'image/heif']);

class CreateMasterDto {
  @IsString() @MinLength(1) @MaxLength(100) displayName: string;
  @IsOptional() @IsString() @MaxLength(100) slug?: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @IsOptional() @IsNumber() @Min(0) priceFrom?: number;
  @IsOptional() @IsString() mainPhotoUrl?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) photoUrls?: string[];
  @IsOptional() @IsBoolean() isPopular?: boolean;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}

class UpdateMasterDto {
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(0) priceFrom?: number;
  @IsOptional() @IsString() mainPhotoUrl?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) photoUrls?: string[];
  @IsOptional() @IsString() availabilityStatus?: 'available' | 'busy' | 'unavailable';
  @IsOptional() @IsBoolean() isPopular?: boolean;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}

@ApiTags('massage-masters')
@Controller('massage/masters')
export class MastersController {
  constructor(
    private readonly mastersService: MastersService,
    private readonly minioService: MinioService,
  ) {}

  @Post('photo-presign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Presigned PUT для загрузки фото мастера в хранилище (staff)' })
  async presignPhoto(
    @Body() body: { fileName?: string; mimeType?: string; fileSize?: number },
  ): Promise<{ uploadUrl: string; storageKey: string; cdnUrl: string; expiresAt: string }> {
    const fileName = typeof body?.fileName === 'string' ? body.fileName.trim() : '';
    const mimeType = typeof body?.mimeType === 'string' ? body.mimeType.trim().toLowerCase() : '';
    const fileSize = typeof body?.fileSize === 'number' ? body.fileSize : NaN;
    if (!fileName || fileName.length > 200) {
      throw new BadRequestException('Invalid fileName');
    }
    if (!mimeType || !PHOTO_MIME.has(mimeType)) {
      throw new BadRequestException('Разрешены изображения: JPEG, PNG, WebP, GIF, AVIF, HEIC');
    }
    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > PHOTO_MAX_BYTES) {
      throw new BadRequestException(`Размер файла не более ${PHOTO_MAX_BYTES / 1024 / 1024} МБ`);
    }
    const result = await this.minioService.generateUploadUrl(fileName, mimeType, fileSize);
    return {
      uploadUrl: result.uploadUrl,
      storageKey: result.storageKey,
      cdnUrl: result.cdnUrl,
      expiresAt: result.expiresAt.toISOString(),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Публичный список мастеров (только опубликованные)' })
  async getCatalog(): Promise<MassageMaster[]> {
    return this.mastersService.getPublicCatalog();
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Все мастера, включая неопубликованных (staff)' })
  async getAll(): Promise<MassageMaster[]> {
    return this.mastersService.getAll();
  }

  /** Строго до @Get(':slug') — иначе Nest может неверно сопоставить сегмент. */
  @Get('id/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Мастер по ID, включая неопубликованных (staff, для страницы редактирования)' })
  async getById(@Param('id') id: string): Promise<MassageMaster> {
    const master = await this.mastersService.findById(id);
    if (!master) throw new NotFoundException('Мастер не найден');
    return master;
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Профиль мастера по slug (публично, только опубликованные)' })
  async getBySlug(@Param('slug') slug: string): Promise<MassageMaster> {
    const master = await this.mastersService.findBySlugPublic(slug);
    if (!master) throw new NotFoundException('Мастер не найден');
    return master;
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать мастера (staff)' })
  async create(@Body() body: CreateMasterDto): Promise<MassageMaster> {
    return this.mastersService.create(body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить мастера (staff)' })
  async update(@Param('id') id: string, @Body() body: UpdateMasterDto): Promise<MassageMaster> {
    return this.mastersService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить мастера (staff)' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.mastersService.delete(id);
  }
}
