/**
 * UpdateWfyVacancyDto — PATCH /v1/wfy-admin/vacancies/:id.
 *
 * Все поля опциональны; пустой body даёт fallback to get() (no .set()).
 * Nullable: summary (можно очистить через null). requirements/conditions
 * заменяются целиком (не merge) когда переданы. `code` менять можно, но он
 * остаётся уникальным в пределах тенанта (409 при коллизии).
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { WFY_VACANCY_CODE_REGEX } from './create-wfy-vacancy.dto';

export class UpdateWfyVacancyDto {
  @ApiPropertyOptional({ maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(WFY_VACANCY_CODE_REGEX, {
    message: 'code должен быть lower-kebab slug ([a-z0-9-], 1–64 символа, без -- по краям)',
  })
  code?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ maxLength: 20000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  summary?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  requirements?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  conditions?: string[];

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ord?: number;
}
