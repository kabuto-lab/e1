import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePageDto {
  @ApiProperty({
    description: 'URL slug в пределах тенанта (3–80 символов, lowercase + цифры + дефисы)',
    example: 'pricing',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  @Matches(/^[a-z0-9](?:[a-z0-9/-]{1,78}[a-z0-9])?$/, {
    message: 'slug: lowercase + цифры + дефис + слэш (для вложенных)',
  })
  slug!: string;

  @ApiPropertyOptional({ enum: ['ru', 'en'], default: 'ru' })
  @IsOptional()
  @IsIn(['ru', 'en'])
  locale?: 'ru' | 'en';

  @ApiProperty({ minLength: 1, maxLength: 500 })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title!: string;

  @ApiProperty({
    description:
      'Массив блоков (см. blocks.schema.ts: hero/text/gallery/services/cta/custom). Валидируется Zod в сервисе.',
    type: 'array',
    items: { type: 'object' },
    example: [
      { type: 'hero', data: { title: 'Welcome', subtitle: 'Spa for you' } },
      { type: 'cta', data: { label: 'Book now', href: '/booking', style: 'primary' } },
    ],
  })
  @IsArray()
  @Type(() => Object)
  body!: Record<string, unknown>[];

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

  @ApiPropertyOptional({ description: 'S3 key обложки (см. MediaModule)', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImageKey?: string;
}
