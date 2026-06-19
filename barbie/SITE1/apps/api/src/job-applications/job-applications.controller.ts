import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { SkipTenant } from '../tenant-context/tenant.decorator';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { JobApplicationsService } from './job-applications.service';

const MAX_PHOTOS = 8;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB на фото
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

/**
 * Публичная форма «Хочешь работать у нас?».
 * POST /v1/public/job-applications (multipart/form-data) — без auth и без tenant.
 * Поля: fullName, contact, message?, tenantSlug? + photos[] (до 8 изображений).
 * Отправляет письмо с фото-вложениями на адрес из cfg.mail.jobApplicationTo.
 */
@ApiTags('public · job-applications')
@Public()
@SkipTenant()
@Controller({ path: 'public/job-applications', version: '1' })
export class JobApplicationsController {
  constructor(private readonly service: JobApplicationsService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('photos', MAX_PHOTOS, {
      limits: { fileSize: MAX_PHOTO_BYTES, files: MAX_PHOTOS },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.includes(file.mimetype)) {
          cb(new BadRequestException(`Недопустимый тип файла: ${file.mimetype}`), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  @ApiOperation({ summary: 'Заявка на работу с публичного сайта (ФИО + контакты + фото) → письмо на почту' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['fullName', 'contact'],
      properties: {
        fullName: { type: 'string' },
        contact: { type: 'string' },
        message: { type: 'string' },
        tenantSlug: { type: 'string' },
        photos: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  submit(
    @Body() dto: CreateJobApplicationDto,
    @UploadedFiles() photos?: Express.Multer.File[],
  ): Promise<{ ok: true; photos: number }> {
    return this.service.submit(dto, photos ?? []);
  }
}
