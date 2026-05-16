import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * PATCH /v1/cms/pages/:id — точечное редактирование.
 * status управляется через /publish и /unpublish (отдельные endpoint'ы),
 * сюда статус не выносим чтобы исключить случайный rollback опубликованного.
 */
export class UpdatePageDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({
    description: 'Новое body (валидируется Zod). При передаче — полностью заменяет старое.',
    type: 'array',
    items: { type: 'object' },
  })
  @IsOptional()
  @IsArray()
  @Type(() => Object)
  body?: Record<string, unknown>[];

  @ApiPropertyOptional({ enum: ['ru', 'en'] })
  @IsOptional()
  @IsIn(['ru', 'en'])
  locale?: 'ru' | 'en';

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  metaTitle?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  metaDescription?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImageKey?: string;
}
