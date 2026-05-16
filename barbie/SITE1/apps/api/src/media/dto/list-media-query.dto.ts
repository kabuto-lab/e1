import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { MEDIA_MODULES, MediaModule } from './upload-media.dto';

export class ListMediaQueryDto {
  @ApiPropertyOptional({ enum: MEDIA_MODULES })
  @IsOptional()
  @IsIn([...MEDIA_MODULES])
  module?: MediaModule;

  @ApiPropertyOptional({ format: 'uuid', description: 'Фильтр по entity_id (например, все фото мастера)' })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({ enum: ['uploading', 'ready', 'archived'], default: 'ready' })
  @IsOptional()
  @IsIn(['uploading', 'ready', 'archived'])
  status?: 'uploading' | 'ready' | 'archived';

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
