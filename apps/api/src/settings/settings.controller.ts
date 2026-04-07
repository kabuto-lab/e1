import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { MinioService } from '../profiles/minio.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../auth/guards/roles.guard';

const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']);

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly minioService: MinioService,
  ) {}

  @Get('public')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  @ApiOperation({ summary: 'Публичный брендинг (логотип, стиль кнопок) для сайта без JWT' })
  async getPublic(): Promise<{
    textLogo: string;
    textLogoBlink: boolean;
    publicGlassButtons: boolean;
  }> {
    return this.settingsService.getPublicBranding();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить сохранённые настройки платформы (staff)' })
  async get(): Promise<Record<string, unknown>> {
    return this.settingsService.get();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @UsePipes(
    new ValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: false,
      transform: false,
    }),
  )
  @ApiOperation({ summary: 'Сохранить настройки платформы (staff)' })
  async save(@Body() body: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.settingsService.save(body ?? {});
  }

  @Post('logo-presign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Presigned PUT для загрузки логотипа сайта в хранилище (без записи в media_files)' })
  async presignLogo(
    @Body() body: { fileName?: string; mimeType?: string; fileSize?: number },
  ): Promise<{ uploadUrl: string; storageKey: string; cdnUrl: string; expiresAt: string }> {
    const fileName = typeof body?.fileName === 'string' ? body.fileName.trim() : '';
    const mimeType = typeof body?.mimeType === 'string' ? body.mimeType.trim().toLowerCase() : '';
    const fileSize = typeof body?.fileSize === 'number' ? body.fileSize : NaN;
    if (!fileName || fileName.length > 200) {
      throw new BadRequestException('Invalid fileName');
    }
    if (!mimeType || !LOGO_MIME.has(mimeType)) {
      throw new BadRequestException('Разрешены изображения: JPEG, PNG, WebP, SVG, GIF');
    }
    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > LOGO_MAX_BYTES) {
      throw new BadRequestException(`Размер файла не более ${LOGO_MAX_BYTES / 1024 / 1024} МБ`);
    }
    const result = await this.minioService.generateUploadUrl(fileName, mimeType, fileSize);
    return {
      uploadUrl: result.uploadUrl,
      storageKey: result.storageKey,
      cdnUrl: result.cdnUrl,
      expiresAt: result.expiresAt.toISOString(),
    };
  }
}
