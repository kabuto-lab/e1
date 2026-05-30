/**
 * UpdateGirlDto — PATCH /v1/girls/:id. Все поля опциональны.
 *
 * `params` — свободный jsonb (age/height/weight/breast/silicon + active +
 * inactiveMedia[]). Заменяется целиком при передаче.
 * `mediaKeys` — полный упорядоченный список фото (публичные пути/ключи);
 * заменяется целиком (переупорядочивание/удаление — на клиенте).
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsObject, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateGirlDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 20000 })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, description: 'Свободные параметры карточки (jsonb)' })
  @IsOptional()
  @IsObject()
  params?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [String], description: 'Полный упорядоченный список ключей фото' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  mediaKeys?: string[];

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ord?: number;
}
