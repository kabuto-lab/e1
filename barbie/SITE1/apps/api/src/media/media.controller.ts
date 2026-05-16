import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireRole } from '../common/decorators/require-role.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../tenant-context/tenant.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload';
import { MediaService } from './media.service';
import { UploadMediaDto } from './dto/upload-media.dto';
import { ListMediaQueryDto } from './dto/list-media-query.dto';
import { ListMediaResponseDto, MediaResponseDto } from './dto/media-response.dto';

@ApiTags('media')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller({ path: 'media', version: '1' })
export class MediaController {
  constructor(private readonly service: MediaService) {}

  @Post('upload')
  @RequireRole('tenant-admin', 'salon-manager', 'master')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Загрузка файла (multipart/form-data) — image/jpeg|png|webp|gif|svg+xml или application/pdf, ≤ 25 MB',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'module'],
      properties: {
        file: { type: 'string', format: 'binary' },
        module: { type: 'string', enum: ['logo', 'tenant', 'cms', 'menu', 'staff', 'service', 'salon', 'client', 'misc'] },
        entityId: { type: 'string', format: 'uuid' },
        alt: { type: 'string' },
        caption: { type: 'string' },
      },
    },
  })
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMediaDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MediaResponseDto> {
    return this.service.uploadFile(file, dto, user.id);
  }

  @Get()
  @RequireRole('tenant-admin', 'salon-manager', 'master', 'client')
  @ApiOperation({ summary: 'Список медиа с фильтрами' })
  list(@Query() query: ListMediaQueryDto): Promise<ListMediaResponseDto> {
    return this.service.listMedia(query);
  }

  @Get(':id')
  @RequireRole('tenant-admin', 'salon-manager', 'master', 'client')
  @ApiOperation({ summary: 'Детали media-объекта + public URL' })
  get(@Param('id', new ParseUUIDPipe()) id: string): Promise<MediaResponseDto> {
    return this.service.getMedia(id);
  }

  @Delete(':id')
  @RequireRole('tenant-admin', 'salon-manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-archive (S3-объект сохраняется для возможного восстановления)' })
  archive(@Param('id', new ParseUUIDPipe()) id: string): Promise<MediaResponseDto> {
    return this.service.archiveMedia(id);
  }
}
