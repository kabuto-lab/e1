/**
 * CreateWfyVacancyDto — payload для POST /v1/wfy-admin/vacancies.
 *
 * tenantId не принимается с клиента — резолвится из TenantContext.
 * `code` — машинное имя позиции (slug, уникально в пределах тенанта); формат
 * совпадает с CHECK-констрейнтом схемы `wfy_vacancies_code_format_check`.
 * requirements/conditions — массивы строк-пунктов (jsonb), default [].
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

/** Совпадает с CHECK `wfy_vacancies_code_format_check` в схеме. */
export const WFY_VACANCY_CODE_REGEX = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$|^[a-z0-9]$/;

export class CreateWfyVacancyDto {
  @ApiProperty({ maxLength: 64, example: 'massazhistka', description: 'slug-код позиции' })
  @IsString()
  @MaxLength(64)
  @Matches(WFY_VACANCY_CODE_REGEX, {
    message: 'code должен быть lower-kebab slug ([a-z0-9-], 1–64 символа, без -- по краям)',
  })
  code!: string;

  @ApiProperty({ minLength: 1, maxLength: 255, example: 'Массажистка' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ maxLength: 20000 })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  summary?: string;

  @ApiPropertyOptional({ type: [String], description: 'Требования к кандидату (пункты)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  requirements?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Условия / что предлагают (пункты)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  conditions?: string[];

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ord?: number;
}
