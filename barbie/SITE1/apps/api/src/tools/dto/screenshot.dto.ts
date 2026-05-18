/**
 * ScreenshotDto / ScreenshotResultDto — POST /v1/tools/screenshot.
 *
 * Используется wizard'ом «Простой HTML импорт» и /admin/tools для предпросмотра
 * сайта-донора перед фактическим импортом. Headless Chromium → PNG → MinIO S3.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class ScreenshotDto {
  @ApiProperty({ example: 'https://example.com', description: 'URL to capture.' })
  @IsString()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2000)
  url!: string;

  @ApiPropertyOptional({
    description:
      'Если true — full-page screenshot (scrolling stitch). Иначе только viewport 1280×800. ' +
      'Full-page может быть существенно тяжелее (несколько MB).',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  fullPage?: boolean;
}

export class ScreenshotResultDto {
  @ApiProperty({ description: 'Публичный URL картинки в MinIO.' })
  url!: string;

  @ApiProperty({ description: 'S3 key (tools/screenshots/<sha>.png).' })
  key!: string;

  @ApiProperty({ description: 'Размер PNG в байтах.' })
  sizeBytes!: number;

  @ApiProperty({ description: 'Width × Height скриншота.' })
  width!: number;
  @ApiProperty()
  height!: number;

  @ApiProperty({ description: 'true если отдан из кеша, не делали Chromium-проход заново.' })
  cached!: boolean;

  @ApiProperty({ description: 'Сколько ms ушло на capture (если cached=true → 0).' })
  durationMs!: number;
}
