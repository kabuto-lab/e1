/**
 * /v1/girls — управление глобальным каталогом моделей (Class-G).
 *
 * Глобальный ресурс (без tenant-контекста). Защищён глобальным JwtAuthGuard
 * (любой аутентифицированный админ). Ужесточение до platform-admin —
 * fast-follow (ADR-008: каталог правит platform-admin).
 *
 * MVP: list / get / update (правка данных карточки + порядок/видимость фото).
 */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SkipTenant } from '../tenant-context/tenant.decorator';
import { GirlsService } from './girls.service';
import { UpdateGirlDto } from './dto/update-girl.dto';
import { ReorderGirlsDto } from './dto/reorder-girls.dto';
import { ListGirlsQueryDto } from './dto/list-girls-query.dto';
import { GirlResponseDto, ListGirlsResponseDto } from './dto/girl-response.dto';

/** Multipart-фильтр: принимаем только растровые изображения (sharp всё равно re-encode'ит в webp). */
const IMAGE_MIME = /^image\/(jpe?g|png|webp|gif|avif|heic|heif|tiff|bmp)$/i;
/** Видео — только web-native контейнеры (без транскода). */
const VIDEO_MIME = /^video\/(mp4|webm|quicktime)$/i;

@ApiTags('girls — global catalog')
@ApiBearerAuth()
@SkipTenant()
@Controller({ path: 'girls', version: '1' })
export class GirlsController {
  constructor(private readonly service: GirlsService) {}

  @Get()
  @ApiOperation({ summary: 'Список моделей (глобальный каталог)' })
  list(@Query() query: ListGirlsQueryDto): Promise<ListGirlsResponseDto> {
    return this.service.list(query);
  }

  @Post('reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Полный ре-ордер каталога (ord по позиции). Глобально — на всех сайтах.' })
  reorder(@Body() dto: ReorderGirlsDto): Promise<{ updated: number }> {
    return this.service.reorder(dto.ids);
  }

  @Post(':id/photos')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FilesInterceptor('files', 30, {
      limits: { fileSize: 25 * 1024 * 1024, files: 30 },
      fileFilter: (_req, file, cb) =>
        IMAGE_MIME.test(file.mimetype)
          ? cb(null, true)
          : cb(new BadRequestException({ code: 'UNSUPPORTED_MEDIA_TYPE', mimetype: file.mimetype }), false),
    }),
  )
  @ApiOperation({ summary: 'Загрузить фото в карточку (конвертируются в WebP, ≤30 файлов · ≤25 MB каждый)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['files'],
      properties: { files: { type: 'array', items: { type: 'string', format: 'binary' } } },
    },
  })
  addPhotos(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<{ added: string[]; girl: GirlResponseDto }> {
    return this.service.addPhotos(id, files);
  }

  @Post(':id/videos')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: { fileSize: 200 * 1024 * 1024, files: 10 },
      fileFilter: (_req, file, cb) =>
        VIDEO_MIME.test(file.mimetype)
          ? cb(null, true)
          : cb(new BadRequestException({ code: 'UNSUPPORTED_VIDEO_TYPE', mimetype: file.mimetype }), false),
    }),
  )
  @ApiOperation({ summary: 'Загрузить видео в карточку (mp4/webm, без транскода, ≤10 файлов · ≤200 MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['files'],
      properties: { files: { type: 'array', items: { type: 'string', format: 'binary' } } },
    },
  })
  addVideos(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<{ added: string[]; girl: GirlResponseDto }> {
    return this.service.addVideos(id, files);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Модель по id' })
  get(@Param('id', new ParseUUIDPipe()) id: string): Promise<GirlResponseDto> {
    return this.service.get(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить карточку: имя/описание/params/порядок фото' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateGirlDto,
  ): Promise<GirlResponseDto> {
    return this.service.update(id, dto);
  }
}
