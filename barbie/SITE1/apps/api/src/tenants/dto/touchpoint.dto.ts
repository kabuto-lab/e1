/**
 * DTO точек касания (tenant_touchpoints) — редактор в деке /admin/projects
 * (platform-admin) + публичный read для рендера сайта.
 *
 * key — path-параметр (один из 7), валидируется в сервисе по TOUCHPOINT_KEYS.
 * Patch точечный: присылаем только меняемые поля. imageKey=null очищает картинку.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertTouchpointDto {
  @ApiPropertyOptional({ description: 'Показывать точку на публичном сайте' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Текст кнопки/CTA', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @ApiPropertyOptional({
    description: 'Цель: ссылка / якорь / телефон / @username / триггер',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  value?: string;

  @ApiPropertyOptional({
    description: 'MinIO-ключ картинки. null — очистить. Обычно ставится через POST …/image.',
    maxLength: 500,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageKey?: string | null;

  @ApiPropertyOptional({ description: 'Цвет кнопки (hex), напр. #D4AF37. null — дефолт сайта.', maxLength: 16, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  color?: string | null;
}

export class TouchpointResponseDto {
  @ApiProperty({ enum: ['booking', 'operator', 'footer', 'callWidget', 'telegram', 'quiz', 'popup'] })
  key!: string;
  @ApiProperty() enabled!: boolean;
  @ApiProperty() label!: string;
  @ApiProperty() value!: string;
  @ApiPropertyOptional({ nullable: true }) imageKey!: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'Публичный URL картинки (если есть)' })
  imageUrl!: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'Цвет кнопки (hex)' }) color!: string | null;
}

export class TouchpointImageResultDto {
  @ApiProperty() key!: string;
  @ApiProperty() imageKey!: string;
  @ApiProperty() imageUrl!: string;
}
