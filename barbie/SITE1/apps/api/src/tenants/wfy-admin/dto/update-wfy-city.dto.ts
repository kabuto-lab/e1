/**
 * UpdateWfyCityDto — PATCH /v1/wfy-admin/cities/:id.
 *
 * Все поля опциональны; пустой body даёт 400. slug рекомендуется не менять
 * (URL ломается), но не запрещено — операторская задача.
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import type { WfyCityExtras, WfyCityPageStatus } from '@barbie-site1/db';

export class UpdateWfyCityDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 64 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/, {
    message: 'slug должен быть lowercase + цифры + дефисы, не начинаться/заканчиваться дефисом',
  })
  slug?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 128 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  cityName?: string;

  @ApiPropertyOptional({ maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  region?: string | null;

  @ApiPropertyOptional({ maxLength: 2 })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  headline?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  extras?: WfyCityExtras;

  @ApiPropertyOptional({ enum: ['draft', 'published', 'archived'] })
  @IsOptional()
  @IsIn(['draft', 'published', 'archived'])
  status?: WfyCityPageStatus;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ord?: number;
}
