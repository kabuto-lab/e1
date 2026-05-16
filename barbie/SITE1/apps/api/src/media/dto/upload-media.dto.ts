import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** Допустимые модули — соответствуют контекстам использования media в платформе. */
export const MEDIA_MODULES = [
  'logo',
  'tenant',
  'cms',
  'menu',
  'staff',
  'service',
  'salon',
  'client',
  'misc',
] as const;
export type MediaModule = (typeof MEDIA_MODULES)[number];

/** Multipart form fields (помимо самого файла). Файл — отдельный @UploadedFile() параметр. */
export class UploadMediaDto {
  @ApiProperty({
    enum: MEDIA_MODULES,
    description: 'Контекст использования. Влияет на S3 префикс и доступ.',
    example: 'staff',
  })
  @IsIn([...MEDIA_MODULES])
  module!: MediaModule;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'ID родительской сущности (staff.id, service.id и т.п.) — для group-by в галерее.',
  })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({ description: 'alt-текст для accessibility', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  alt?: string;

  @ApiPropertyOptional({ description: 'Подпись / caption' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  caption?: string;
}
